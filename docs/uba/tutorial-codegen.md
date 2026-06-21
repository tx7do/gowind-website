# API 客户端代码生成教程

GoWind UBA 采用 Protobuf First 的开发模式，通过 Buf 工具链自动生成 Go 服务端代码和 TypeScript 客户端代码。

## 前置条件

- 已阅读 [UBA Protobuf API 定义](./backend-api.md)

## 一、生成命令

```bash
cd backend

# 生成 Protobuf Go 代码
make api

# 生成 OpenAPI v3 文档
make openapi

# 生成 Ent ORM 代码
make ent

# 生成 Wire 依赖注入
make wire

# 生成 TypeScript 代码
make ts

# 一键生成全部
make gen
```

## 二、Buf 配置

### 2.1 Go 代码生成

```yaml
# buf.gen.yaml
version: v1
plugins:
  - plugin: go
    out: api/gen/go
    opt: paths=source_relative

  - plugin: go-grpc
    out: api/gen/go
    opt:
      - paths=source_relative
      - require_unimplemented_servers=false

  - plugin: go-http
    out: api/gen/go
    opt: paths=source_relative
```

### 2.2 TypeScript 代码生成

```yaml
# buf.gen.ts.yaml
version: v1
plugins:
  - plugin: ts
    out: api/gen/ts/admin
    opt:
      - paths=source_relative
      - target=admin
    path: protoc-gen-ts
```

### 2.3 OpenAPI 生成

```yaml
# buf.gen.openapi.yaml
version: v1
plugins:
  - plugin: openapiv2
    out: api/gen/openapi
    opt:
      - logtostderr=true
      - simple_operation_ids=true
```

## 三、生成代码结构

```
api/gen/
├── go/                           # Go 服务端代码
│   ├── admin/service/v1/         # Admin Service 接口
│   │   ├── i_application.pb.go
│   │   ├── i_risk_rule.pb.go
│   │   ├── i_risk_event.pb.go
│   │   └── ...
│   ├── collector/service/v1/     # Collector Service 接口
│   │   └── i_report.pb.go
│   └── uba/service/v1/           # UBA 领域模型
│       ├── behavior_event.pb.go
│       ├── session.pb.go
│       └── ...
├── ts/                           # TypeScript 客户端
│   └── admin/
│       └── service/v1/
│           ├── ApplicationService.ts
│           ├── RiskRuleService.ts
│           └── ...
└── openapi/                      # OpenAPI 文档
    ├── admin/
    │   └── admin.swagger.json
    └── collector/
        └── collector.swagger.json
```

## 四、TypeScript 客户端

```typescript
// 前端使用生成的 API 客户端
import { RiskRuleServiceClient } from '@/api/generated';

const riskRuleService = new RiskRuleServiceClient();

// 查询风控规则
const rules = await riskRuleService.List({
  status: 'PUBLISHED',
  page: 1,
  pageSize: 20,
});

// 创建风控规则
await riskRuleService.Create({
  name: '高频登录失败',
  conditionExpression: 'event_name == "login" && count_in_window("5m") > 10',
  actions: ['BLOCK_DEVICE'],
  riskScore: 75,
});
```

## 五、Swagger UI

```bash
# Admin API Swagger
http://localhost:9700/docs/

# Collector API Swagger
http://localhost:9800/docs/
```

## 六、检查清单

| 检查项 | 说明 |
|--------|------|
| Buf 工具链 | buf 已安装 |
| Go 代码 | make api 生成成功 |
| TS 代码 | make ts 生成成功 |
| OpenAPI | make openapi 生成成功 |
| Swagger | 文档可正常访问 |

## 相关文档

- [UBA Protobuf API 定义](./backend-api.md)
- [UBA 后端架构总览](./backend-architecture.md)
