# 新增对外服务教程

本教程演示如何在 UBA 上新增一个对外 HTTP 能力（admin REST 接口 + core 业务实现 + admin 转发），以项目内已实现的 **AnalyticsService（数据分析）** 为参照。这是 UBA 最常见的二开场景。

> 前置：先读 [系统架构](./architecture.md) 的「三层服务架构」与 [代码生成管线](./tutorial-codegen.md)。

---

## 一、目标与模式回顾

UBA 的三层模式：

```
admin/service/v1/i_xxx.proto        # HTTP 网关接口（带 google.api.http 注解）
uba/service/v1/xxx.proto            # 领域消息 + gRPC 服务契约
core/service/internal/service/      # 业务实现（实现 uba gRPC server）
admin/service/internal/service/     # 转发实现（实现 admin HTTP server → 调 uba client）
```

admin 层是**纯转发**，不含业务逻辑；业务逻辑集中在 core。新能力需在两层各加一套。

---

## 二、步骤

### 步骤 1：定义领域 proto

文件：`backend/api/protos/uba/service/v1/xxx.proto`

```proto
syntax = "proto3";
package uba.service.v1;

service XxxService {
  rpc DoSomething(DoSomethingRequest) returns (DoSomethingResponse) {}
}

message DoSomethingRequest {
  // 业务字段
}
message DoSomethingResponse {
  // 业务字段
}
```

要点：

- `package uba.service.v1;`
- 定义 `service XxxService { rpc ... }`（gRPC 契约，**无 http 注解**）
- 定义所有 `message XxxRequest/Response`

### 步骤 2：定义 admin 网关 proto

文件：`backend/api/protos/admin/service/v1/i_xxx.proto`

```proto
syntax = "proto3";
package admin.service.v1;

import "uba/service/v1/xxx.proto";

service XxxService {
  rpc DoSomething(uba.service.v1.DoSomethingRequest) returns (uba.service.v1.DoSomethingResponse) {
    option (google.api.http) = {
      post: "/admin/v1/xxx"
      body: "*"
    };
  }
}
```

要点：

- `package admin.service.v1;`
- `import "uba/service/v1/xxx.proto";` 复用领域消息
- GET 查询用 query 参数：`get: "/admin/v1/xxx"`
- POST 聚合用 body：`post: "/admin/v1/xxx" body: "*"`

### 步骤 3：生成代码

```bash
cd backend && make api && make ts
# 同步 TS（见代码生成管线教程第五节）
```

### 步骤 4：core 层实现业务

目录：`backend/app/core/service/`

1. **service 实现** `internal/service/xxx_service.go`：实现 `ubaV1.UnimplementedXxxServiceServer`，写业务逻辑。
2. **data repo** `internal/data/`：
   - ent 实体 → 用 `go-crud` 的 `Repository` 泛型封装（参考 `uba_tag_definition_repo.go`）。
   - OLAP 聚合 → 原生 SQL（Doris 用 `r.db.SelectContext`，ClickHouse 用 `r.db.Select`；双引擎镜像实现，参考 `analytics_repo.go`）。
3. **gRPC server 注册** `internal/server/grpc_server.go`：`NewGrpcServer` 形参加 service，调 `ubaV1.RegisterXxxServiceServer`。
4. **Provider 注册**：在 `internal/service/providers/wire_set.go` + `internal/data/providers/wire_set.go` 加 provider。
5. **重新生成注入**：

   ```bash
   cd backend/app/core/service && make wire
   ```

### 步骤 5：admin 层转发

目录：`backend/app/admin/service/`

1. **service 转发** `internal/service/xxx_service.go`：实现 `adminV1.XxxServiceHTTPServer`，方法体直接转发：

   ```go
   func (s *XxxService) DoSomething(ctx context.Context, req *ubaV1.DoSomethingRequest) (*ubaV1.DoSomethingResponse, error) {
       return s.client.DoSomething(ctx, req)
   }
   ```

2. **client 工厂** `internal/data/data.go`：加 `NewXxxServiceClient`（仿已有 client 工厂，经 etcd 发现 core）。
3. **REST server 注册** `internal/server/rest_server.go`：`NewRESTServer` 形参加 service，调 `adminV1.RegisterXxxServiceHTTPServer`。
4. **Provider 注册**：`internal/data/providers/wire_set.go` + `internal/service/providers/wire_set.go` 加 provider。
5. **重新生成注入**：

   ```bash
   cd backend/app/admin/service && make wire
   ```

### 步骤 6：验证

```bash
cd backend && go build ./...
```

启动 admin/core 服务后，访问 admin Swagger 验证新接口；或直接 `curl`：

```bash
curl -X POST http://localhost:5600/admin/v1/xxx \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## 三、参照真实实现

| 参照对象 | 文件 |
|---------|------|
| 领域 proto（25 个分析模型） | `api/protos/uba/service/v1/analytics.proto` |
| admin 网关 proto | `api/protos/admin/service/v1/i_analytics.proto` |
| core service（按引擎分支） | `app/core/service/internal/service/analytics_service.go` |
| core OLAP repo（双引擎） | `app/core/service/internal/data/{doris,clickhouse}/analytics_repo.go` |
| admin 转发 | `app/admin/service/internal/service/analytics_service.go` |
| admin client 工厂 | `app/admin/service/internal/data/data.go`（`NewAnalyticsServiceClient`） |

> 分析聚合的 OLAP 实现细节（防注入、白名单维度、双引擎方言差异）见 [OLAP 查询手册](./analyst-olap-cookbook.md)。

---

## 四、常见坑

- **proto 改完前端不生效**：忘了 `make ts` + 手动同步 TS 产物（见 [代码生成管线](./tutorial-codegen.md)）。
- **wire 报「no provider」**：Provider 没加到对应 `wire_set.go`，或加错文件。
- **gRPC 连不上 core**：core 动态端口，确认 etcd 注册正常；admin 的 `remote.yaml` 里 discovery 指向 etcd。
- **OLAP repo 双引擎漏一份**：改了 Doris 实现记得同步 ClickHouse 实现，保持镜像一致。

---

## 五、相关文档

- [系统架构](./architecture.md)
- [代码生成管线](./tutorial-codegen.md)
- [新增业务实体](./tutorial-new-entity.md)
- [新增前端页面](./tutorial-new-page.md)
- [后端 API 契约](./backend-api.md)
