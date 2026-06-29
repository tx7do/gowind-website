# UBA 后端模块总览

本文档梳理 GoWind UBA 后端的代码结构、三服务 service 层清单、公共包（pkg）以及目录速查，帮助二次开发者快速定位代码。

---

## 一、后端目录结构

```
backend/
├── api/                            # Protobuf API 定义与生成代码
│   ├── protos/                     # .proto 源文件（按领域分层）
│   │   ├── admin/service/v1/       # 管理后台 HTTP 网关 proto（生成 TS 客户端的唯一输入）
│   │   ├── uba/service/v1/         # UBA 领域消息 + gRPC 服务契约
│   │   └── <其他领域>/             # authentication / dict / permission / identity ...
│   └── gen/go/                     # buf 生成的 Go 代码
├── app/                            # 服务应用
│   ├── admin/service/              # Admin 服务（管理后台 BFF，薄转发）
│   ├── collector/service/          # Collector 服务（埋点采集 BFF）
│   └── core/service/               # Core 服务（核心业务逻辑）
│       └── internal/
│           ├── data/               # 数据层（ent repo / OLAP repo / client）
│           │   ├── ent/schema/     # ent 实体定义（改这里 → make ent）
│           │   ├── doris/          # Doris repo（含 schema/ 事实表定义）
│           │   └── clickhouse/     # ClickHouse repo（含 schema/ 事实表定义）
│           ├── service/            # 业务 service 实现
│           └── server/             # grpc / rest server 注册
├── pkg/                            # 公共包
├── sql/                            # 数据库脚本（clickhouse / doris / postgresql）
├── scripts/                        # 部署脚本（deploy / docker / env）
└── Makefile                        # 代码生成 / 构建命令
```

每个服务目录下都遵循 kratos 标准布局：`cmd/server/`（入口）+ `configs/`（YAML 配置）+ `internal/{conf,data,server,service}/`。

---

## 二、Core Service（核心业务）

目录：`backend/app/core/service/internal/service/`，承载几乎所有业务逻辑。按职责分组如下：

### 数据采集与事件

| Service | 对应 proto | 职责 |
|---------|-----------|------|
| `BehaviorEventService` | `behavior_event.proto` | 行为事件入库（`Create`/`BatchCreate`）、`List`/`Get` |
| `SessionService` | `session.proto` | 会话事实表 CRUD |
| `EventPathService` | `event_path.proto` | 用户路径事实表 CRUD |
| `EventSchemaService` | `event_schema.proto` | 事件 Schema 管理（事件名/属性校验登记） |
| `ObjectService` | `object.proto` | 行为对象（object_type/object_id）管理 |
| `ApplicationService` | `application.proto` | UBA 应用管理（生成 appId/appKey/appSecret） |

### 分析建模

| Service | 对应 proto | 职责 |
|---------|-----------|------|
| `AnalyticsService` | `analytics.proto` | **25 个分析模型**：覆盖基础聚合、转化路径、用户深度、生命周期、营收价值、会话异常、游戏专属七大场景（详见 [后端 API · 分析聚合服务](./backend-api.md)）。按 `UseClickHouse` 编译期常量分支选 Doris / ClickHouse repo |

### 风险与标签

| Service | 对应 proto | 职责 |
|---------|-----------|------|
| `RiskEventService` | `risk_event.proto` | 风险事件结果存取（`Create`/`BatchCreate`/`List`） |
| `RiskRuleService` | `risk_rule.proto` | 风险规则定义 CRUD |
| `TagDefinitionService` | `tag_definition.proto` | 标签定义 CRUD |
| `UserTagService` | `user_tag.proto` | 用户标签关联 |
| `IdMappingService` | `id_mapping.proto` | 跨平台 ID 映射（身份图） |
| `UserBehaviorProfileService` | `user_behavior_profile.proto` | 用户行为画像事实表 CRUD |
| `WebhookService` | `webhook.proto` | Webhook 配置（风险告警推送） |

### 组织与权限

| Service | 职责 |
|---------|------|
| `TenantService` | 多租户管理 |
| `UserService` / `UserCredentialService` | 用户全生命周期、登录凭据 |
| `RoleService` / `PermissionService` / `PermissionGroupService` | 角色、权限、权限组 |
| `OrgUnitService` / `PositionService` | 组织架构、岗位 |
| `MenuService` | 菜单节点 |
| `DictTypeService` / `DictEntryService` | 数据字典 |
| `LanguageService` | 多语言 |
| `LoginPolicyService` | 登录策略 |
| `ApiService` | API 元数据登记 |

### 系统运维

| Service | 职责 |
|---------|------|
| `AuthenticationService` | 登录认证、令牌签发 |
| `FileService` / `FileTransferService` | 文件存储（MinIO）、文件传输 |
| `InternalMessageService`（+ Category / Recipient） | 站内消息 |
| `TaskService` | 异步任务（Asynq） |
| 审计日志（5 类） | `LoginAuditLogService` / `OperationAuditLogService` / `ApiAuditLogService` / `PermissionAuditLogService` / `DataAccessAuditLogService` / `PolicyEvaluationLogService` |

> 完整 proto 契约见 [后端 API 契约](./backend-api.md)。

---

## 三、Admin Service（管理后台 BFF）

目录：`backend/app/admin/service/internal/service/`。**全部是薄转发实现**：实现 `adminV1.XxxHTTPServer`，方法体内调用对应的 Core gRPC client（`ubaV1.XxxClient`），不含业务逻辑。

Admin service 与 Core service 一一对应：`analytics_service.go`、`application_service.go`、`behavior_event_service.go`、`risk_event_service.go`、`user_service.go`、`role_service.go` 等约 40+ 转发实现。

> 新增对外 HTTP 能力的完整步骤见 [新增对外服务教程](./tutorial-new-service.md)。

---

## 四、Collector Service（采集 BFF）

目录：`backend/app/collector/service/`。职责单一：接收 `POST /uba/v1/report`，做应用鉴权、字段校验补全，然后 Publish 到 Kafka。本身无业务 service 层，逻辑集中在 transport 层与 `pkg/topic`（Kafka topic 管理）。

---

## 五、公共包（pkg）

目录：`backend/pkg/`，被三服务共享：

| 包 | 职责 |
|----|------|
| `authorizer` | 鉴权引擎封装（Casbin / OPA） |
| `constants` | 常量定义 |
| `crypto` | 加密工具（AES-GCM 等） |
| `jwt` | JWT 工具（签发/校验） |
| `metadata` | 请求元数据管理（tenantId 注入等） |
| `middleware` | 中间件（鉴权/日志/Ent/元数据） |
| `oss` | 对象存储（MinIO / S3 兼容） |
| `serviceid` | 服务标识 |
| `task` | 异步任务（Asynq 封装） |
| `topic` | Kafka Topic 管理（`uba_events_raw` / `uba_risk_events`） |
| `utils` | 通用工具 |
| `entgo` | Ent 扩展（go-crud Repository 泛型封装、mixin 等） |

---

## 六、数据层要点

### PostgreSQL（Ent）

- 实体定义在 `app/core/service/internal/data/ent/schema/`，表名通过 `entsql.Annotation{Table: ...}` 声明。
- **没有手写的 `schema.sql`**——表结构由 `make ent` 生成；`sql/postgresql/` 下仅有字典种子数据（`default-data.sql`）与演示数据。
- 业务表前缀：`sys_`（系统/RBAC/i18n/字典）、`uba_`（UBA 业务）、其余如 `files`、`internal_messages`。

### OLAP（Doris / ClickHouse）

- 事实表 schema 在 `app/core/service/internal/data/{clickhouse,doris}/schema/` 镜像定义，与 `sql/{clickhouse,doris}/` 脚本一致。
- 主要事实表：`events_fact`、`sessions_fact`、`risk_events`、`path_features`；维度表：`users_dim`、`objects_dim`、`id_mapping`、`user_tags`。
- 聚合查询走**原生 SQL**（不用 Ent）；维度字段走**白名单**，metric 走 switch，数值强转后拼接以防注入。

---

## 七、相关文档

- [系统架构](./architecture.md)
- [后端 API 契约](./backend-api.md)
- [前端架构](./frontend-architecture.md)
- [代码生成管线](./tutorial-codegen.md)
