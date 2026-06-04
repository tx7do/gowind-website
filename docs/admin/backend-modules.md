# 后端核心模块详解

本文档深入剖析 GoWind Admin 后端各个核心业务模块的设计与实现，涵盖认证授权、用户管理、租户管理、权限体系、字典管理等模块。

## 一、认证与授权模块

认证（Authentication）和授权（Authorization）是后端安全体系的核心，GoWind Admin 在此模块做了大量设计。

### 1. 认证服务（AuthenticationService）

认证服务位于 `internal/service/authentication_service.go`，负责处理用户登录、登出、令牌刷新、验证码等核心流程。

#### 登录流程

系统支持多种 OAuth 2.0 授权类型（Grant Type）：

| Grant Type | 说明 | 实现状态 |
|------------|------|----------|
| `password` | 用户名密码登录 | ✅ 已实现 |
| `refresh_token` | 刷新令牌 | ✅ 已实现 |
| `client_credentials` | 客户端凭据 | ❌ 预留接口 |

**密码登录的完整流程**：

1. 验证验证码（可选）
2. 通过 `UserCredentialRepo` 验证用户凭证（用户名 + 密码）
3. 获取用户信息，检查用户状态
4. 解析用户权限信息（`resolveUserAuthority`）：
   - 检查用户是否被禁用
   - 获取用户角色列表
   - 获取角色关联的权限列表
   - 验证是否拥有后台访问权限（`SystemAccessBackendPermissionCode`）
5. 生成 JWT Access Token 和 Refresh Token
6. 返回令牌信息

#### 验证码机制

系统内置验证码生成与验证功能，支持图形验证码：

- `GenerateCaptcha`：生成验证码图片（Base64 编码）
- `VerifyCaptcha`：验证用户输入的验证码

#### 令牌管理

- **Access Token**：用于 API 请求认证，有效期较短
- **Refresh Token**：用于刷新 Access Token，有效期较长
- 令牌缓存通过 `UserTokenCache` 管理，基于 Redis 实现

### 2. 认证中间件

认证中间件位于 `pkg/middleware/auth/`，在 REST Server 中通过 Selector 中间件模式注入：

```go
// 白名单机制：以下接口不需要认证
rpc.AddWhiteList(
    adminV1.OperationAuthenticationServiceLogin,
    adminV1.OperationAuthenticationServiceGenerateCaptcha,
    adminV1.OperationAuthenticationServiceVerifyCaptcha,
)
```

中间件核心功能：
- 从请求 Header 中提取 JWT Token
- 验证 Token 有效性
- 解析用户信息（UserId、TenantId、Roles 等）注入到 Context
- 支持 Ent Viewer 上下文注入，实现数据级别的隔离

### 3. 授权引擎

授权模块位于 `pkg/authorizer/`，封装了多种权限策略引擎：

| 引擎 | 配置值 | 说明 |
|------|--------|------|
| Casbin | `casbin` | 轻量级权限控制，支持 ACL、RBAC 等模型 |
| OPA | `opa` | Open Policy Agent，强大的策略引擎 |
| Zanzibar | `zanzibar` | Google Zanzibar 模型，支持 Keto 和 OpenFGA |
| Noop | `noop` | 空实现，不进行权限校验 |

通过 `auth.yaml` 配置切换授权引擎：

```yaml
authz:
  type: "noop"  # casbin, opa, zanzibar, noop
```

### 4. 审计日志中间件

审计日志中间件位于 `pkg/middleware/logging/`，自动记录：
- **API 审计日志**：记录每次 API 请求的详细信息
- **登录日志**：记录用户登录行为（成功/失败）

中间件通过回调函数将日志写入数据库：

```go
applogging.Server(
    applogging.WithWriteApiLogFunc(func(ctx context.Context, data *auditV1.ApiAuditLog) error {
        return apiAuditLogRepo.Create(ctx, &auditV1.CreateApiAuditLogRequest{Data: data})
    }),
    applogging.WithWriteLoginLogFunc(func(ctx context.Context, data *auditV1.LoginAuditLog) error {
        return loginLogRepo.Create(ctx, &auditV1.CreateLoginAuditLogRequest{Data: data})
    }),
)
```

## 二、用户管理模块

### 1. 用户服务（UserService）

位于 `internal/service/user_service.go`，提供完整的用户 CRUD 管理：

**核心功能**：
- 创建用户（支持多角色、多部门、设置主管）
- 更新用户信息
- 删除用户（支持批量）
- 获取用户详情
- 列表查询（支持分页、高级查询、按部门联动）
- 禁用/启用用户
- 设置/取消主管
- 重置密码
- 配置多角色
- 配置多部门
- 一键登录指定用户

### 2. 用户凭证服务（UserCredentialService）

位于 `internal/service/user_credential_service.go`，管理用户认证凭证：

- 支持多种凭证类型：用户名密码、手机号、邮箱等
- 密码加密存储
- 凭证验证（支持密码解密验证）

### 3. 用户档案服务（UserProfileService）

位于 `internal/service/user_profile_service.go`，管理用户个人资料：

- 查看/修改个人信息
- 查看最后登录信息
- 修改密码

### 4. 数据层

用户数据层位于 `internal/data/`，核心 Repo 包括：

| Repo | 文件 | 说明 |
|------|------|------|
| `UserRepo` | `user_repo.go` | 用户主表操作 |
| `UserCredentialRepo` | `user_credential_repo.go` | 用户凭证操作 |
| `UserRoleRepo` | `user_role_repo.go` | 用户-角色关联 |
| `UserOrgUnitRepo` | `user_org_unit_repo.go` | 用户-组织关联 |
| `UserPositionRepo` | `user_position_repo.go` | 用户-职位关联 |
| `UserTokenCache` | `user_token_cache.go` | 用户令牌缓存（Redis） |

## 三、租户管理模块

### 租户服务（TenantService）

位于 `internal/service/tenant_service.go`，提供多租户管理能力：

**核心功能**：
- 创建租户（自动初始化租户部门、默认角色和管理员）
- 管理租户套餐
- 禁用/启用租户
- 一键登录租户管理员

**租户创建流程**：
1. 创建租户记录
2. 自动创建租户默认部门
3. 创建租户默认角色
4. 创建租户管理员账号
5. 将管理员关联到角色和部门

### 多租户关系模型

系统支持两种租户关系模型，通过 `constants.DefaultUserTenantRelationType` 配置：

**一对一模型**（`UserTenantRelationOneToOne`）：
- 一个用户只属于一个租户
- 登录时直接根据用户的 `TenantId` 获取权限

**一对多模型**（`UserTenantRelationOneToMany`）：
- 一个用户可以属于多个租户
- 通过 `MembershipRepo` 管理多租户关系
- 登录时需要遍历所有活跃的成员身份，合并权限

## 四、权限体系模块

GoWind Admin 的权限体系包含菜单权限、接口权限、数据权限三个维度。

### 1. 权限服务（PermissionService）

位于 `internal/service/permission_service.go`，管理权限点和权限分组：

- 创建/更新/删除权限
- 权限分组管理
- 权限与 API 接口关联
- 权限与菜单关联
- 权限策略管理

### 2. 角色服务（RoleService）

位于 `internal/service/role_service.go`，管理角色和角色分组：

- 创建/更新/删除角色
- 角色分组管理
- 角色关联权限
- 角色关联用户
- 按角色联动用户
- 批量添加/移除员工

### 3. 菜单服务（MenuService）

位于 `internal/service/menu_service.go`，管理系统菜单：

- 支持三种菜单类型：目录、菜单、按钮
- 树形结构管理
- 菜单关联权限

### 4. API 接口服务（ApiService）

位于 `internal/service/api_service.go`，管理后端 API 接口：

- 接口注册与管理
- 接口同步功能（从路由自动同步）
- 接口关联权限点
- 支持树形列表展示
- 操作日志请求参数和响应结果配置

### 5. 数据权限

数据权限通过角色配置，支持以下数据范围：

| 数据范围 | 说明 |
|----------|------|
| `SELF` | 仅本人数据 |
| `UNIT_ONLY` | 本部门数据 |
| `UNIT_AND_CHILD` | 本部门及下级部门数据 |
| `SELECTED_UNITS` | 指定部门数据 |
| `ALL` | 全部数据 |

数据权限优先级：`ALL > SELECTED_UNITS > UNIT_AND_CHILD > UNIT_ONLY > SELF`

## 五、组织架构模块

### 1. 组织管理（OrgUnitService）

位于 `internal/service/org_unit_service.go`，管理组织架构：

- 树形结构组织管理
- 支持多级组织层级
- 组织路径自动维护

### 2. 部门管理

部门通过组织架构模块统一管理，支持：
- 树形列表展示
- 按部门联动用户
- 部门关联角色

### 3. 职位管理（PositionService）

位于 `internal/service/position_service.go`，管理用户职务：

- 职位作为用户的标签属性
- 支持用户关联多个职位

## 六、字典管理模块

### 1. 字典类型服务（DictTypeService）

位于 `internal/service/dict_type_service.go`，管理数据字典大类：

- 创建/更新/删除字典大类
- 字典大类与字典条目联动

### 2. 字典条目服务（DictEntryService）

位于 `internal/service/dict_entry_service.go`，管理字典小类/条目：

- 支持按字典大类联动
- 服务端多列排序
- 数据导入和导出
- 国际化支持（`DictEntryI18nRepo`）

## 七、任务调度模块

### 任务服务（TaskService）

位于 `internal/service/task_service.go`，基于 Asynq 实现分布式任务调度：

- 任务新增、修改、删除
- 任务启动、暂停
- 立即执行
- 查看任务运行日志

Asynq Server 配置（`server.yaml`）：

```yaml
asynq:
  uri: "redis://:*Abcd123456@redis:6379/1"
  concurrency: 10
  queues:
    critical: 10
    default: 5
    low: 1
```

## 八、文件管理模块

### 1. 文件服务（FileService）

位于 `internal/service/file_service.go`，管理文件元数据：

- 文件查询、下载、删除
- 复制文件地址
- 图片大图查看

### 2. 文件传输服务（FileTransferService）

位于 `internal/service/file_transfer_service.go`，处理文件上传下载：

- 支持上传到 OSS（MinIO）或本地存储
- 文件下载
- 文件传输路由需要手动注册（不能使用代码生成器的 Handler）

> **注意**：文件传输服务由于涉及 multipart form 数据处理，无法使用 Protobuf 自动生成的 Handler，需要在 `rest_server.go` 中手动注册路由。

## 九、消息管理模块

### 1. 站内信服务（InternalMessageService）

位于 `internal/service/internal_message_service.go`：

- 发送消息给指定用户
- 查看用户已读状态和已读时间
- 消息详细查看、删除
- 标为已读、全部已读

### 2. 消息分类服务（InternalMessageCategoryService）

位于 `internal/service/internal_message_category_service.go`：

- 支持二级自定义消息分类
- 用于消息管理时的分类选择

### 3. 消息接收者服务（InternalMessageRecipientService）

位于 `internal/service/internal_message_recipient_service.go`：

- 管理消息接收者
- 支持指定用户、角色、部门等多种接收范围

## 十、日志审计模块

### 1. 登录审计日志（LoginAuditLogService）

- 记录用户登录成功和失败日志
- 支持 IP 归属地记录

### 2. API 审计日志（ApiAuditLogService）

- 记录 API 请求的详细信息
- 通过中间件自动采集

### 3. 操作审计日志（OperationAuditLogService）

- 记录用户操作日志（正常和异常）
- 支持 IP 归属地记录
- 查看操作日志详情

### 4. 数据访问审计日志（DataAccessAuditLogService）

- 记录数据访问行为

### 5. 权限审计日志（PermissionAuditLogService）

- 记录权限变更操作

### 6. 策略评估日志（PolicyEvaluationLogService）

- 记录权限策略评估过程

## 十一、登录策略模块

### 登录策略服务（LoginPolicyService）

位于 `internal/service/login_policy_service.go`：

- 管理登录策略规则
- 可配置 IP 白名单/黑名单
- 可配置时间限制
- 可配置登录失败锁定策略

## 十二、语言管理模块

### 语言服务（LanguageService）

位于 `internal/service/language_service.go`：

- 管理系统支持的语言列表
- 国际化（i18n）基础数据
- 与字典条目国际化联动
