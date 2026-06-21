# UBA Protobuf API 定义

GoWind UBA 采用 **Protobuf First** 的 API 开发模式，所有接口通过 Protobuf 定义，借助 Buf 工具链自动生成 Go 服务端代码、TypeScript 客户端代码和 OpenAPI 文档。

## 一、API 路由前缀

| 服务 | 路由前缀 | 说明 |
|------|----------|------|
| Collector Service | `/uba/v1/` | 数据采集接口（SDK 调用） |
| Admin Service | `/admin/v1/` | 管理后台接口 |

## 二、Collector Service API

Collector 是数据采集入口，接收 SDK 上报的事件数据。

| RPC | 方法 | 路由 | 说明 |
|-----|------|------|------|
| PostReport | POST | `/uba/v1/report` | 统一事件上报（支持批量、混合类型） |
| HealthCheck | GET | `/uba/v1/health` | 服务健康检查 |

### 2.1 事件上报请求

```protobuf
// collector/service/v1/i_report.proto
service ReportService {
  rpc PostReport(PostReportRequest) returns (PostReportResponse) {
    option (google.api.http) = {
      post: "/uba/v1/report"
      body: "*"
    };
  }
}

message PostReportRequest {
  optional string app_id = 1 [json_name = "app_id"];
  optional string app_secret = 2 [json_name = "app_secret"];
  repeated ReportEvent events = 3;
  optional ClientInfo client = 4;
}

message ReportEvent {
  optional EventType event_type = 1;
  oneof payload {
    BehaviorEvent behavior = 10;
    RiskEvent risk = 11;
  }
}

enum EventType {
  BEHAVIOR = 0;
  RISK = 1;
}
```

### 2.2 事件上报响应

```protobuf
message PostReportResponse {
  optional bool success = 1;
  optional string message = 2;
  optional uint32 success_count = 3;
  optional uint32 failed_count = 4;
  optional RiskAction risk_action = 5;  // 实时风控决策
}
```

## 三、Admin Service API

Admin Service 提供 40+ 个 Service，覆盖完整的后台管理功能。

### 3.1 UBA 核心服务

| Service | 路由 | 说明 |
|---------|------|------|
| ApplicationService | `/admin/v1/apps` | 应用管理（AppID/AppKey/AppSecret） |
| SessionService | `/admin/v1/sessions` | 会话查询 |
| EventPathService | `/admin/v1/event-paths` | 用户路径分析 |
| UserBehaviorProfileService | `/admin/v1/user-behavior-profiles` | 用户行为画像 |
| ObjectService | `/admin/v1/objects` | 对象维度管理 |
| IDMappingService | `/admin/v1/id-mappings` | 跨平台 ID 映射 |

### 3.2 风控服务

| Service | 路由 | 说明 |
|---------|------|------|
| RiskRuleService | `/admin/v1/risk-rules` | 风控规则管理 |
| RiskEventService | `/admin/v1/risk-events` | 风险事件管理 |
| WebhookService | `/admin/v1/webhooks` | Webhook 配置 |

### 3.3 标签服务

| Service | 路由 | 说明 |
|---------|------|------|
| TagDefinitionService | `/admin/v1/tag-definitions` | 标签定义管理 |
| UserTagService | `/admin/v1/user-tags` | 用户标签管理 |

### 3.4 组织与权限

| Service | 路由 | 说明 |
|---------|------|------|
| UserService | `/admin/v1/users` | 用户管理 |
| RoleService | `/admin/v1/roles` | 角色管理 |
| TenantService | `/admin/v1/tenants` | 租户管理 |
| OrgUnitService | `/admin/v1/org-units` | 部门管理 |
| PositionService | `/admin/v1/positions` | 职位管理 |
| PermissionService | `/admin/v1/permissions` | 权限管理 |
| MenuService | `/admin/v1/menus` | 菜单管理 |

### 3.5 系统管理

| Service | 路由 | 说明 |
|---------|------|------|
| AuthenticationService | `/admin/v1/login` | 登录认证 |
| AdminPortalService | `/admin/v1/portal` | 管理门户 |
| DictTypeService / DictEntryService | `/admin/v1/dict-types` `/admin/v1/dict-entries` | 字典管理 |
| TaskService | `/admin/v1/tasks` | 任务调度 |
| FileService / FileTransferService | `/admin/v1/files` | 文件管理 |
| LanguageService | `/admin/v1/languages` | 语言管理 |
| InternalMessageService | `/admin/v1/internal-messages` | 站内信 |
| LoginPolicyService | `/admin/v1/login-policies` | 登录策略 |

### 3.6 审计日志

| Service | 路由 | 说明 |
|---------|------|------|
| ApiAuditLogService | `/admin/v1/api-audit-logs` | API 审计日志 |
| LoginAuditLogService | `/admin/v1/login-audit-logs` | 登录日志 |
| OperationAuditLogService | `/admin/v1/operation-audit-logs` | 操作日志 |
| DataAccessAuditLogService | `/admin/v1/data-access-audit-logs` | 数据访问日志 |
| PermissionAuditLogService | `/admin/v1/permission-audit-logs` | 权限审计日志 |
| PolicyEvaluationLogService | `/admin/v1/policy-evaluation-logs` | 策略评估日志 |

## 四、Protobuf 目录结构

```
backend/api/protos/
├── uba/                             # UBA 领域定义
│   └── service/v1/
│       ├── behavior_event.proto      # 行为事件模型
│       ├── session.proto             # 会话模型
│       ├── event_path.proto          # 路径分析模型
│       ├── user_behavior_profile.proto # 用户行为画像
│       ├── user_tag.proto            # 用户标签
│       ├── tag_definition.proto      # 标签定义
│       ├── id_mapping.proto          # ID 映射
│       ├── object.proto              # 对象维度
│       ├── risk_event.proto          # 风险事件
│       ├── risk_rule.proto           # 风控规则
│       ├── webhook.proto             # Webhook 配置
│       ├── application.proto         # 应用管理
│       ├── report.proto              # 事件上报服务
│       ├── common.proto              # 公共类型
│       └── uba_error.proto           # 错误定义
├── collector/                       # 采集服务
│   └── service/v1/
│       ├── i_report.proto            # 上报接口
│       └── collector_error.proto
├── admin/                           # 管理后台服务
│   └── service/v1/
│       ├── i_application.proto       # 应用管理接口
│       ├── i_session.proto           # 会话接口
│       ├── i_event_path.proto        # 路径接口
│       ├── i_risk_rule.proto         # 风控规则接口
│       ├── i_risk_event.proto        # 风险事件接口
│       ├── i_webhook.proto           # Webhook 接口
│       ├── i_tag_definition.proto    # 标签定义接口
│       ├── i_user_tag.proto          # 用户标签接口
│       ├── i_user_behavior_profile.proto # 用户画像接口
│       ├── i_id_mapping.proto        # ID 映射接口
│       ├── i_object.proto            # 对象维度接口
│       └── ...                       # 组织/权限/系统管理
├── identity/                        # 身份管理
├── permission/                      # 权限管理
├── authentication/                  # 认证服务
├── audit/                           # 审计日志
├── dict/                            # 字典管理
├── resource/                        # 资源管理
├── storage/                         # 存储管理
├── task/                            # 任务调度
└── internal_message/                # 站内信
```

## 五、代码生成

```shell
cd backend

# 生成 Protobuf Go 代码
make api

# 生成 OpenAPI v3 文档
make openapi

# 生成 Ent ORM 代码
make ent

# 生成 Wire 依赖注入
make wire

# 一键生成全部代码
make gen
```

## 六、Swagger 文档

```bash
# Collector API Swagger
http://localhost:9800/docs/

# Admin API Swagger
http://localhost:9700/docs/
```

## 相关文档

- [UBA 后端架构总览](./backend-architecture.md)
- [UBA 后端模块总览](./backend-modules.md)
- [UBA 配置与部署指南](./backend-config-deploy.md)
- [API 客户端代码生成](./tutorial-codegen.md)
