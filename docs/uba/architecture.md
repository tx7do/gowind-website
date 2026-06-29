# UBA 系统架构

本文档描述 GoWind UBA 的整体架构、三大服务职责、数据流转、存储分层与关键设计模式。建议二次开发者与运维人员在动手前通读本页。

---

## 一、总体架构

UBA 是基于 **go-kratos** 微服务框架的用户行为分析平台，采用「采集 → 入队 → 计算/存储 → 查询/展示」的经典流式数仓架构，由三个微服务组成：

```mermaid
graph TB
    subgraph 客户端
        WebSDK["Web SDK<br/>浏览器 / Node"]
        CSSDK["C# SDK<br/>Unity / Godot / .NET"]
    end

    subgraph 接入层
        Collector["Collector Service<br/>HTTP: 5700<br/>鉴权 · 校验 · 转发"]
    end

    subgraph 消息中间件
        Kafka[("Kafka<br/>uba_events_raw<br/>uba_risk_events")]
    end

    subgraph 计算与存储
        Core["Core Service<br/>gRPC（动态端口，etcd 发现）<br/>建模 · 查询 · 风险 · 标签<br/>（预留微服务消费接口）"]
        PG[("PostgreSQL<br/>业务 / 配置实体")]
        OLAP[("OLAP<br/>Doris 默认 / ClickHouse<br/>虚拟表 / Routine Load 消费 Kafka")]
    end

    subgraph 应用层
        Admin["Admin Service<br/>HTTP: 5600 / SSE: 5601<br/>管理后台 BFF"]
        Frontend["Admin 前端<br/>Vue3 + Vben"]
    end

    subgraph 基础设施
        Etcd[(Etcd 服务发现)]
        Redis[(Redis 缓存/队列)]
    end

    WebSDK -->|"POST /uba/v1/report"| Collector
    CSSDK -->|"POST /uba/v1/report"| Collector
    Collector -->|"Publish"| Kafka
    Kafka -->|"虚拟表 / Routine Load 消费"| OLAP
    Core --> PG
    Core --> OLAP
    Frontend -->|"HTTP / SSE"| Admin
    Admin -->|"gRPC"| Core
    Core -.-> Etcd
    Admin -.-> Etcd
    Collector -.-> Etcd
    Core --> Redis
    Admin --> Redis
```

---

## 二、三大服务职责

### 1. Collector Service（埋点采集 BFF）

| 项 | 说明 |
|----|------|
| 目录 | `backend/app/collector/service/` |
| 服务监听端口 | HTTP **5700** |
| 职责 | 接收 SDK 上报、应用鉴权（appId + appSecret）、字段校验与补全、转发至 Kafka |
| 入口 | `POST /uba/v1/report`（批量事件，混合行为/风险） |
| 输出 | Publish 到 Kafka topic：`uba_events_raw`（行为）/ `uba_risk_events`（风险） |
| 特点 | **无状态**，可水平扩展；本身不落库，只负责「接收 + 转发」 |

### 2. Core Service（核心业务服务）

| 项 | 说明 |
|----|------|
| 目录 | `backend/app/core/service/` |
| 服务监听端口 | gRPC **动态端口**（`0.0.0.0:0`，启动时注册到 etcd，不固定） |
| 职责 | 分析建模、风险检测、标签管理、用户画像、数据同步（**默认不经手事件入库**，事件由 OLAP 引擎虚拟表直接消费 Kafka 落库；Core 侧预留了 broker subscriber 入口，供后续按需启用微服务消费） |
| 数据源 | PostgreSQL（业务实体，走 Ent ORM）+ OLAP 引擎（分析数据） |
| 对外协议 | gRPC（供 admin/collector 调用） |
| 特点 | 承载所有「重」业务逻辑；通过编译期常量 `data.UseClickHouse` 在 ClickHouse / Doris 间二选一 |

### 3. Admin Service（管理后台 BFF）

| 项 | 说明 |
|----|------|
| 目录 | `backend/app/admin/service/` |
| 服务监听端口 | HTTP **5600** / SSE **5601** |
| 职责 | 管理后台的 HTTP 网关，转发请求至 Core，聚合权限/菜单/配置 |
| 模式 | **薄转发层**：实现 `adminV1.XxxHTTPServer`，持有 `ubaV1.XxxClient`，方法体直接转发 |
| 特色 | SSE 推送（站内消息实时通知）、Swagger 文档、CORS |

> 三个服务均通过 **etcd** 注册与发现，跨服务调用走 gRPC。

---

## 三、数据流转

### 事件上报链路（写）

```
SDK 上报
  └─> Collector（5700）
        ├─ 1. appId/appSecret 鉴权（应用级，请求体内）
        ├─ 2. 字段校验 + 补全（eventId/eventTime/deviceId 等）
        ├─ 3. tenantId 权威覆盖（按 appId 识别租户）
        └─ 4. Publish → Kafka topic
              ├─ uba_events_raw   （行为事件）
              └─ uba_risk_events  （风险事件）
                    └─> 由 OLAP 引擎的虚拟表 / Routine Load 直接消费，落入 events_fact / risk_events 等事实表
```

### Kafka 消费入库机制（重要）

> **默认消费方式 = OLAP 引擎原生消费 Kafka**，无需在 Core 服务内编写消费者：
>
> - **ClickHouse**：使用 **Kafka 引擎虚拟表** 消费 `uba_events_raw`，再通过物化视图写入 `events_fact` 等存储表，建表脚本见 `sql/clickhouse/02_kafka_tables.sql`；
> - **Doris**：使用 **Routine Load** 作业从 Kafka 持续拉取并写入事实表，建表脚本见 `sql/doris/02_kafka_tables.sql`。
>
> 因此 Collector `Publish` 到 Kafka 之后，**数据会由 OLAP 引擎自身持续拉取并落库**，Core 服务默认不参与这条写入路径。
>
> **Core 侧预留了微服务消费接口**（broker subscriber，可调 `BehaviorEventService.BatchCreate` 入库）。在 OLAP 虚拟表吞吐/转换能力不够用时，可作为补充方案按需启用，参考 kratos broker 用法。两种方式二选一即可，不要同时启用以免重复入库。

### 查询链路（读）

```
Admin 前端
  └─> Admin Service（5600，HTTP）
        └─> gRPC 转发 ─> Core Service
              ├─ 业务实体 ─> PostgreSQL（Ent ORM）
              └─ 分析聚合 ─> OLAP（原生 SQL GROUP BY / 分页）
```

---

## 四、数据存储分层

| 存储 | 用途 | 访问方式 |
|------|------|---------|
| **PostgreSQL** | 业务/配置实体（应用、用户、角色、权限、字典、菜单、事件 Schema、风险规则、标签定义等） | Ent ORM，表结构由 schema 注解生成（无手写 schema.sql） |
| **OLAP（Doris 默认 / ClickHouse）** | 分析数据（`events_fact` / `sessions_fact` / `risk_events` / `users_dim` 等事实表） | 原生 SQL + repo 封装 |
| **Redis** | 缓存、异步任务队列（Asynq） | kratos cache + asynq |
| **Kafka** | 事件流缓冲（collector → OLAP 引擎的解耦管道；由 OLAP 虚拟表 / Routine Load 消费） | kratos broker |
| **MinIO** | 对象存储（文件上传） | S3 兼容 |

### OLAP 双引擎设计

- ClickHouse 与 Doris **二选一**，由编译期常量切换：

  ```go
  // backend/app/core/service/internal/data/data.go
  // UseClickHouse 是否使用ClickHouse作为数据存储，否则使用Doris。
  const UseClickHouse bool = false   // 当前默认 false → 使用 Doris
  ```

- **同一份业务模型**，字段、分区、索引、主键定义在两种引擎间保持一致（schema 在 `internal/data/{clickhouse,doris}/schema/` 镜像定义）。
- repo 层按引擎分支：`if data.UseClickHouse { ckRepo } else { dorisRepo }`。
- 切换引擎需修改该常量并重新编译，**不是运行时配置**。

---

## 五、关键设计模式

### 1. 接口契约优先（Protobuf）

所有服务接口由 `.proto` 定义，经 **buf** 生成多端代码：

- Go：`protoc-gen-go` + `protoc-gen-go-grpc`（gRPC stub）+ `protoc-gen-go-http`（kratos REST）
- TypeScript：`protoc-gen-typescript-http`（admin 前端客户端，**仅 admin proto 作为输入**）
- OpenAPI：`protoc-gen-openapi`（Swagger 文档）

> 详见 [代码生成管线](./tutorial-codegen.md)。

### 2. 三层服务架构（admin 转发模式）

新增一个 admin 对外能力时，典型分层：

```
admin/service/v1/i_xxx.proto        # HTTP 网关接口（带 google.api.http 注解）
uba/service/v1/xxx.proto            # 领域消息 + gRPC 服务契约
core/service/internal/service/      # 业务实现（实现 uba gRPC server）
admin/service/internal/service/     # 转发实现（实现 admin HTTP server → 调 uba client）
```

admin 层是**纯转发**，不含业务逻辑；业务逻辑集中在 Core。

### 3. Ent + go-crud 数据层

业务实体（PostgreSQL）走 Ent ORM，配合 `go-crud` 的 `Repository` 泛型封装，统一处理分页（`PagingRequest`）、过滤（`FilterExpr`）、排序、FieldMask。OLAP 数据走原生 SQL repo。

### 4. 服务发现 + 动态端口

Core 服务 gRPC 监听 `0.0.0.0:0`（随机端口），启动时注册到 etcd；admin/collector 通过 etcd 发现 core 并建立 gRPC 连接。这让 Core 可多实例部署、滚动更新。

---

## 六、安全与多租户

| 维度 | 机制 |
|------|------|
| 管理后台认证 | JWT（Core 的 `authenticator.yaml`，HS256，双 profile：admin / collector） |
| SDK 上报鉴权 | appId + appSecret（应用级，请求体内，非 Header） |
| 权限引擎 | Casbin / OPA，菜单/接口/数据三级权限 |
| 多租户隔离 | `tenantId` 字段贯穿；SDK 不上报，服务端按 appId 权威识别并覆盖 |
| 传输 | CORS 配置；生产建议加 TLS |

> ⚠️ 默认口令/密钥（JWT key `some_api_key`、AES key、各中间件密码 `*Abcd123456`）均为开发默认值，**生产部署前必须轮换**。详见 [配置详解 · 安全清单](./deploy-config.md)。

---

## 七、相关文档

- [后端模块总览](./backend-modules.md)
- [后端 API 契约](./backend-api.md)
- [前端架构](./frontend-architecture.md)
- [安装指南](./installation.md)
- [配置详解](./deploy-config.md)
