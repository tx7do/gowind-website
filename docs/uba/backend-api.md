# UBA 后端 API 契约

本文档基于真实的 Protobuf 定义（`backend/api/protos/`）梳理 UBA 对外/对内 API 契约，是二次开发与 SDK 联调的权威参考。

> 接口契约优先：所有 API 由 `.proto` 定义，经 buf 生成 Go / TypeScript / OpenAPI 代码。详见 [代码生成管线](./tutorial-codegen.md)。

---

## 一、proto 分层

```
api/protos/
├── uba/service/v1/        # UBA 领域消息 + gRPC 服务契约（Core 实现）
│   ├── analytics.proto     # 分析聚合
│   ├── behavior_event.proto# 行为事件
│   ├── report.proto        # 上报服务（Collector 实现）
│   ├── session.proto / event_path.proto
│   ├── risk_event.proto / risk_rule.proto
│   ├── application.proto / event_schema.proto / object.proto
│   ├── tag_definition.proto / user_tag.proto / id_mapping.proto
│   ├── user_behavior_profile.proto / webhook.proto
│   ├── common.proto / uba_error.proto
├── admin/service/v1/      # 管理后台 HTTP 网关（Admin 转发实现，i_ 前缀）
│   ├── i_analytics.proto / i_behavior_event.proto / i_application.proto
│   ├── i_session.proto / i_event_path.proto / i_event_schema.proto
│   ├── i_risk_event.proto / i_risk_rule.proto / i_webhook.proto
│   ├── i_tag_definition.proto / i_user_tag.proto / i_id_mapping.proto
│   ├── i_user.proto / i_role.proto / i_permission*.proto / i_menu.proto
│   ├── i_authentication.proto / i_login_policy.proto / i_tenant.proto
│   ├── i_dict_*.proto / i_language.proto / i_file*.proto / i_task.proto
│   ├── i_internal_message*.proto / i_org_unit.proto / i_position.proto
│   └── i_*_audit_log.proto / i_admin_portal.proto
└── <其他领域>/            # authentication / permission / dict / identity ...
```

> **只有 `admin/service/v1/*.proto` 会生成前端 TypeScript 客户端**（见 `api/buf.admin.typescript.gen.yaml` 的 `inputs.paths`）。

---

## 二、上报服务（Collector）

### `ReportService`（`uba/service/v1/report.proto`）

| RPC | 说明 |
|-----|------|
| `PostReport(PostReportRequest) returns (PostReportResponse)` | 统一上报接口，支持混合上报行为/风险事件 |

### HTTP 端点

- `POST /uba/v1/report`

### 鉴权

- `appId` + `appSecret` 放在**请求体**（非 Header），无 Authorization token。
- 鉴权失败返回 `401`，SDK **不重试**。

### 请求体结构（camelCase，protojson 编码）

```jsonc
{
  "appId": "your_app_id",
  "appSecret": "your_app_secret",
  "clientInfo": { "userAgent": "...", "referer": "..." },
  "events": [
    {
      "eventType": "BEHAVIOR",        // BEHAVIOR | RISK
      "eventId": "uuid",              // SDK 自动生成，唯一
      "eventName": "click",           // 必填
      "eventTime": "RFC3339",         // SDK 自动补全
      "deviceId": "...",              // SDK 持久化，同设备稳定
      "sessionId": "...",             // 会话级
      "platform": "web",              // SDK 探测
      "userId": 1001,                 // identify 后自动带
      "properties": { "button": "buy" },
      "behavior": { "objectType": "button", "objectId": "btn_buy" }
    }
  ]
}
```

> `tenantId` **不上报**，服务端根据 appId 权威识别并覆盖，保证多租户隔离。

### 事件类型（events 元素的 oneof payload）

| 类型 | 字段 | 触发 API |
|------|------|---------|
| 行为事件（`BEHAVIOR`） | `behavior` + `properties` | SDK `track` / `trackBehavior` |
| 风险事件（`RISK`） | `risk`（riskType / riskLevel / riskScore / description） | SDK `trackRisk` |

### 响应约定

- HTTP `200` 也可能含**部分失败**：响应体 `failedCount > 0` 或 `errorsByType` 非空时，SDK 记录 warn。
- 错误码：`400` 校验失败、`401` 鉴权失败（不重试）、`500` 服务端错误（重试）。
- 错误体遵循 Kratos error envelope 格式。

---

## 三、分析聚合服务（Analytics）

### `AnalyticsService`（`uba/service/v1/analytics.proto`）

共 **25 个**分析模型 RPC（按场景分组，对应 proto 第 11-83 行）：

| 场景 | RPC | 用途 |
|------|-----|------|
| **基础聚合** | `EventTrend` | 事件量趋势（时间分桶） |
| | `GroupBy` | 维度分组聚合（白名单维度 + 指标） |
| | `ActiveUsers` | DAU / WAU / MAU（日级 HLL 滚动窗口真值） |
| **转化与路径** | `Funnel` | 漏斗分析（多步转化） |
| | `Retention` | 同期群留存矩阵 |
| | `PathSankey` | 热门转化路径（桑基图） |
| | `BehaviorSequence` | 行为序列分析 |
| **用户深度** | `Attribution` | 归因分析（首触/末触） |
| | `Distribution` | 分布分析（时长分桶 + 分位） |
| | `Segmentation` | 用户分群 / 圈选 |
| | `Click` | 点击热力图 |
| | `Interval` | 间隔时间分析 |
| **生命周期** | `Lifecycle` | 用户生命周期 |
| | `Churn` | 流失与回流分析 |
| | `NewVsOld` | 新老用户对比 |
| | `Matrix` | 矩阵 / 象限分析 |
| **营收与价值** | `Revenue` | 营收分析（ARPU/ARPPU/GMV） |
| | `WhaleTier` | 付费分层（鲸鱼用户） |
| | `LTV` | 历史生命周期价值 |
| **会话与异常** | `SessionAnalysis` | 会话分析（跳出率/深度/分位） |
| | `Anomaly` | 同比环比 / 异常检测 |
| **游戏专属** | `LevelAnalysis` | 关卡 / 数值平衡分析 |
| | `ServerRetention` | 滚服留存（按区服） |
| | `OnlineStats` | 同时在线 PCU / ACU |
| | `Economy` | 经济系统 / 代币流向 |

### 公共消息

- `AnalyticsGranularity` 枚举：`UNSPECIFIED=0`、`HOUR=1`、`DAY=2`、`WEEK=3`、`MONTH=4`。
- `TimeRange`：`start_ms`（含）、`end_ms`（含），Unix 毫秒。未传时默认结束=现在、开始=7 天前。
- `TimeSeriesPoint`：`timestamp`（ms）、`value`（double）。

### 各请求要点

25 个模型的请求消息（`*Request`）遵循统一约定：

- **公共字段**：`time_range`（`TimeRange`）、可选 `app_id`（在仓库里作为 `tenant_id` 隔离谓词，`0`/缺省表示全部租户）。时间序列类模型另带 `granularity`（`AnalyticsGranularity`）。
- **过滤字段**：按模型语义携带 `event_name` / `platform` / `dimension` 等。`GroupBy` 的 `dimension` 走**白名单**：`platform/channel/country/app_version/event_name/event_category/os/network`（游戏模型另支持 `server_id`/`level` 等）。
- **特有参数**：如 `FunnelRequest.steps`（`repeated string`，**≥2**）、`RetentionRequest.retention_type`（`ACTIVE`/`EVENT`）+ `max_offset_days`、`GroupByRequest.metric`（`COUNT`/`UNIQUE_USER`/`SUM_AMOUNT`）等。

> 25 个模型逐字段的完整定义请查阅 `backend/api/protos/uba/service/v1/analytics.proto`（请求/响应消息与字段注释齐全），或运行 `make openapi` 生成的 Swagger 文档。

### Admin HTTP 端点（`admin/service/v1/i_analytics.proto`）

全部 `POST`、`body: "*"`，转发至 Core gRPC，路径规则统一为 `POST /admin/v1/analytics/<kebab-case 方法名>`：

| 方法 | HTTP 路径 |
|------|----------|
| `EventTrend` | `POST /admin/v1/analytics/event-trend` |
| `Funnel` | `POST /admin/v1/analytics/funnel` |
| `Retention` | `POST /admin/v1/analytics/retention` |
| `GroupBy` | `POST /admin/v1/analytics/group-by` |
| `ActiveUsers` | `POST /admin/v1/analytics/active-users` |
| `Attribution` | `POST /admin/v1/analytics/attribution` |
| `Distribution` | `POST /admin/v1/analytics/distribution` |
| `BehaviorSequence` | `POST /admin/v1/analytics/behavior-sequence` |
| `Segmentation` | `POST /admin/v1/analytics/segmentation` |
| `Click` | `POST /admin/v1/analytics/click` |
| `Lifecycle` | `POST /admin/v1/analytics/lifecycle` |
| `Churn` | `POST /admin/v1/analytics/churn` |
| `Interval` | `POST /admin/v1/analytics/interval` |
| `Matrix` | `POST /admin/v1/analytics/matrix` |
| `Revenue` | `POST /admin/v1/analytics/revenue` |
| `SessionAnalysis` | `POST /admin/v1/analytics/session-analysis` |
| `Anomaly` | `POST /admin/v1/analytics/anomaly` |
| `NewVsOld` | `POST /admin/v1/analytics/new-vs-old` |
| `PathSankey` | `POST /admin/v1/analytics/path-sankey` |
| `LevelAnalysis` | `POST /admin/v1/analytics/level-analysis` |
| `WhaleTier` | `POST /admin/v1/analytics/whale-tier` |
| `LTV` | `POST /admin/v1/analytics/ltv` |
| `ServerRetention` | `POST /admin/v1/analytics/server-retention` |
| `OnlineStats` | `POST /admin/v1/analytics/online-stats` |
| `Economy` | `POST /admin/v1/analytics/economy` |

> ⚠️ **已知限制**：`ActiveUsers` 的 `wau`/`mau` 在**日级**已基于 HLL 滚动窗口输出真值；仅 HOUR 粒度因无小时级状态退化为等于 DAU。详见 [附录](./appendix.md)。

---

## 四、行为事件服务

### `BehaviorEventService`（`uba/service/v1/behavior_event.proto`）

| RPC | 说明 |
|-----|------|
| `Create(BehaviorEvent) returns (Empty)` | 单条入库 |
| `BatchCreate(BatchCreateBehaviorEventRequest) returns (Empty)` | 批量入库 |
| `List(PagingRequest) returns (ListBehaviorEventResponse)` | 分页查询 |
| `Get(GetBehaviorEventRequest) returns (BehaviorEvent)` | 单条查询 |

### `BehaviorEvent` 字段全集（对应 `events_fact`）

| 字段 | 类型 | 分组 |
|------|------|------|
| `event_id`, `tenant_id` | string / uint32 | 路由/标识 |
| `user_id`, `device_id`, `account_id`, `global_user_id` | uint32 / string | 主体（Who） |
| `event_time`, `event_ts`, `server_time` | Timestamp / int64 | 时间 |
| `event_category`, `event_name`, `event_action` | string | 行为（What） |
| `object_type`, `object_id`, `object_name` | string | 对象 |
| `session_id`, `session_seq` | string / uint32 | 会话上下文 |
| `platform`, `os`, `app_version`, `channel` | string | 环境 |
| `ip`, `ip_city`, `country`, `network`, `geo`, `user_agent`, `referer` | string | 网络/位置 |
| `context` | map\<string,string\> | 业务上下文 |
| `duration_ms`, `amount`, `quantity`, `score`, `metrics` | uint32/string/int32/map | 指标 |
| `properties` | map\<string,string\> | 扩展属性 |
| `op_result`, `error_code`, `risk_level`, `trace_id` | string | 企业/运维 |
| `click_x`, `click_y`, `element_xpath`, `page_url`, `viewport_width` | uint32 / string | 热力图（autotrack 填充） |
| `server_id`, `level` | string / uint32 | **游戏专属维度**（区服 ID / 玩家等级） |
| `created_at`, `updated_at` | Timestamp | 时间戳 |

---

## 五、CRUD 服务一览

以下服务均提供标准 CRUD（`List`/`Count`/`Get`/`Create`/`Update`/`Delete`，部分含 `BatchCreate`），Admin 层一一对应转发：

| 领域 | Core 服务 / proto | Admin proto |
|------|------------------|-------------|
| 会话 | `SessionService` / `session.proto` | `i_session.proto` |
| 用户路径 | `EventPathService` / `event_path.proto` | `i_event_path.proto` |
| 事件 Schema | `EventSchemaService` / `event_schema.proto` | `i_event_schema.proto` |
| 行为对象 | `ObjectService` / `object.proto` | `i_object.proto` |
| UBA 应用 | `ApplicationService` / `application.proto` | `i_application.proto` |
| 风险事件 | `RiskEventService` / `risk_event.proto` | `i_risk_event.proto` |
| 风险规则 | `RiskRuleService` / `risk_rule.proto` | `i_risk_rule.proto` |
| Webhook | `WebhookService` / `webhook.proto` | `i_webhook.proto` |
| 标签定义 | `TagDefinitionService` / `tag_definition.proto` | `i_tag_definition.proto` |
| 用户标签 | `UserTagService` / `user_tag.proto` | `i_user_tag.proto` |
| ID 映射 | `IdMappingService` / `id_mapping.proto` | `i_id_mapping.proto` |
| 用户行为画像 | `UserBehaviorProfileService` / `user_behavior_profile.proto` | `i_user_behavior_profile.proto` |
| 用户/用户档案 | `UserService` 等 | `i_user.proto` / `i_user_profile.proto` |
| 租户/组织/岗位 | `TenantService` / `OrgUnitService` / `PositionService` | `i_tenant.proto` / `i_org_unit.proto` / `i_position.proto` |
| 角色/权限/菜单 | `RoleService` / `PermissionService` / `MenuService` | `i_role.proto` / `i_permission*.proto` / `i_menu.proto` |
| 字典/语言 | `DictTypeService` / `DictEntryService` / `LanguageService` | `i_dict_*.proto` / `i_language.proto` |
| 认证/登录策略 | `AuthenticationService` / `LoginPolicyService` | `i_authentication.proto` / `i_login_policy.proto` |
| 文件 | `FileService` / `FileTransferService` | `i_file.proto` / `i_file_transfer.proto` |
| 站内消息 | `InternalMessageService`（+ Category/Recipient） | `i_internal_message*.proto` |
| 任务 | `TaskService` | `i_task.proto` |
| 审计日志（6 类） | `*AuditLogService` / `PolicyEvaluationLogService` | `i_*_audit_log.proto` 等 |
| API 元数据 | `ApiService` | `i_api.proto` |

> 完整请求/响应消息定义请直接查阅 `backend/api/protos/` 对应 `.proto` 文件，或运行 `make openapi` 生成的 Swagger 文档。

---

## 六、获取可交互文档

```bash
cd backend
make openapi   # 生成 OpenAPI / Swagger（基于 admin / collector proto）
```

启动 Admin / Collector 服务后（`enable_swagger: true`），访问各自 Swagger UI 浏览与试调接口。

---

## 七、相关文档

- [系统架构](./architecture.md)
- [后端模块总览](./backend-modules.md)
- [代码生成管线](./tutorial-codegen.md)
- [OLAP 查询手册](./analyst-olap-cookbook.md)
