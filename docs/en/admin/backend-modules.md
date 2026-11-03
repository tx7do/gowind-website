# Backend Core Modules in Depth

This document takes a deep dive into the design and implementation of each core business module in the GoWind Admin backend, covering authentication & authorization, user management, tenant management, the permission system, dictionary management, and more.

## 1. Authentication & Authorization Module

Authentication and authorization are the core of the backend security system, and GoWind Admin invests heavily in this module.

### 1. Authentication Service (AuthenticationService)

The authentication service is located at `internal/service/authentication_service.go` and handles core flows such as user login, logout, token refresh, and captcha.

#### Login Flow

The system supports multiple OAuth 2.0 grant types:

| Grant Type | Description | Status |
|------------|------|----------|
| `password` | Username/password login | ✅ Implemented |
| `refresh_token` | Refresh token | ✅ Implemented |
| `client_credentials` | Client credentials | ❌ Reserved |

**The complete password login flow**:

1. Verify the captcha (optional)
2. Verify user credentials (username + password) via `UserCredentialRepo`
3. Fetch user info and check the user's status
4. Resolve the user's authority information (`resolveUserAuthority`):
   - Check whether the user is disabled
   - Get the user's role list
   - Get the permission list attached to those roles
   - Verify backend access permission (`SystemAccessBackendPermissionCode`)
5. Generate the JWT access token and refresh token
6. Return the token information

#### Captcha Mechanism

The system has built-in captcha generation and verification, supporting image captchas:

- `GenerateCaptcha`: generates a captcha image (Base64-encoded)
- `VerifyCaptcha`: verifies the captcha entered by the user

#### Token Management

- **Access token**: used to authenticate API requests; short-lived
- **Refresh token**: used to refresh the access token; longer-lived
- Token caching is managed by `UserTokenCache`, implemented on Redis

### 2. Authentication Middleware

The authentication middleware is located at `pkg/middleware/auth/` and is injected into the REST Server via the Selector middleware pattern:

```go
// Whitelist mechanism: the following endpoints require no authentication
rpc.AddWhiteList(
    adminV1.OperationAuthenticationServiceLogin,
    adminV1.OperationAuthenticationServiceGenerateCaptcha,
    adminV1.OperationAuthenticationServiceVerifyCaptcha,
)
```

Core middleware functions:
- Extract the JWT token from the request header
- Validate the token
- Parse user info (UserId, TenantId, Roles, etc.) and inject it into the Context
- Supports Ent Viewer context injection for data-level isolation

### 3. Authorization Engine

The authorization module is located at `pkg/authorizer/`, wrapping multiple permission policy engines:

| Engine | Config Value | Description |
|------|--------|------|
| Casbin | `casbin` | Lightweight permission control supporting ACL, RBAC and other models |
| OPA | `opa` | Open Policy Agent, a powerful policy engine |
| Zanzibar | `zanzibar` | The Google Zanzibar model, with Keto and OpenFGA support |
| Noop | `noop` | No-op implementation; performs no permission checks |

Switch the authorization engine via the `auth.yaml` configuration:

```yaml
authz:
  type: "noop"  # casbin, opa, zanzibar, noop
```

### 4. Audit Log Middleware

The audit log middleware is located at `pkg/middleware/logging/`, automatically recording:
- **API audit log**: detailed information for every API request
- **Login log**: user login behavior (success/failure)

The middleware writes logs to the database via callback functions:

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

## 2. User Management Module

### 1. User Service (UserService)

Located at `internal/service/user_service.go`, providing full user CRUD management:

**Core features**:
- Create users (multiple roles, multiple departments, supervisor assignment)
- Update user info
- Delete users (batch supported)
- Get user details
- List queries (pagination, advanced search, department cascading)
- Disable/enable users
- Set/unset supervisor
- Reset password
- Assign multiple roles
- Assign multiple departments
- One-click login as a specific user

### 2. User Credential Service (UserCredentialService)

Located at `internal/service/user_credential_service.go`, managing user authentication credentials:

- Supports multiple credential types: username/password, phone number, email, etc.
- Passwords stored encrypted
- Credential verification (supports decrypt-to-verify)

### 3. User Profile Service (UserProfileService)

Located at `internal/service/user_profile_service.go`, managing user personal profiles:

- View/edit personal info
- View last login info
- Change password

### 4. Data Layer

The user data layer is located at `internal/data/`; the core Repos include:

| Repo | File | Description |
|------|------|------|
| `UserRepo` | `user_repo.go` | User master table operations |
| `UserCredentialRepo` | `user_credential_repo.go` | User credential operations |
| `UserRoleRepo` | `user_role_repo.go` | User–role associations |
| `UserOrgUnitRepo` | `user_org_unit_repo.go` | User–org associations |
| `UserPositionRepo` | `user_position_repo.go` | User–position associations |
| `UserTokenCache` | `user_token_cache.go` | User token cache (Redis) |

## 3. Tenant Management Module

### Tenant Service (TenantService)

Located at `internal/service/tenant_service.go`, providing multi-tenancy management capabilities:

**Core features**:
- Create tenants (automatically initializes the tenant department, default role, and administrator)
- Manage tenant plans
- Disable/enable tenants
- One-click login as the tenant administrator

**Tenant creation flow**:
1. Create the tenant record
2. Automatically create the tenant's default department
3. Create the tenant's default role
4. Create the tenant administrator account
5. Associate the administrator with the role and department

### Multi-Tenancy Relation Models

The system supports two tenant relation models, configured via `constants.DefaultUserTenantRelationType`:

**One-to-one model** (`UserTenantRelationOneToOne`):
- A user belongs to only one tenant
- At login, permissions are fetched directly from the user's `TenantId`

**One-to-many model** (`UserTenantRelationOneToMany`):
- A user can belong to multiple tenants
- Multi-tenant relations are managed via `MembershipRepo`
- At login, all active memberships must be traversed and permissions merged

## 4. Permission System Module

The GoWind Admin permission system spans three dimensions: menu permissions, API permissions, and data permissions.

### 1. Permission Service (PermissionService)

Located at `internal/service/permission_service.go`, managing permission points and permission groups:

- Create/update/delete permissions
- Permission group management
- Associate permissions with API endpoints
- Associate permissions with menus
- Permission policy management

### 2. Role Service (RoleService)

Located at `internal/service/role_service.go`, managing roles and role groups:

- Create/update/delete roles
- Role group management
- Associate roles with permissions
- Associate roles with users
- View users linked by role
- Batch add/remove employees

### 3. Menu Service (MenuService)

Located at `internal/service/menu_service.go`, managing system menus:

- Three menu types: directory, menu, button
- Tree structure management
- Associate menus with permissions

### 4. API Service (ApiService)

Located at `internal/service/api_service.go`, managing backend API endpoints:

- Endpoint registration and management
- API sync (automatic sync from routes)
- Associate endpoints with permission points
- Tree list display
- Configure operation log request parameters and response results

### 5. Data Permissions

Data permissions are configured on roles and support the following data scopes:

| Data Scope | Description |
|----------|------|
| `SELF` | Own data only |
| `UNIT_ONLY` | Current department's data |
| `UNIT_AND_CHILD` | Current department and its sub-departments' data |
| `SELECTED_UNITS` | Data of specified departments |
| `ALL` | All data |

Data permission precedence: `ALL > SELECTED_UNITS > UNIT_AND_CHILD > UNIT_ONLY > SELF`

## 5. Organization Structure Module

### 1. Organization Management (OrgUnitService)

Located at `internal/service/org_unit_service.go`, managing the organization structure:

- Tree-structured organization management
- Multiple organizational levels supported
- Organization paths maintained automatically

### 2. Department Management

Departments are managed uniformly through the organization structure module, supporting:
- Tree list display
- Users filtered by department
- Departments associated with roles

### 3. Position Management (PositionService)

Located at `internal/service/position_service.go`, managing user job positions:

- Positions serve as tag attributes on users
- A user can be linked to multiple positions

## 6. Dictionary Management Module

### 1. Dictionary Type Service (DictTypeService)

Located at `internal/service/dict_type_service.go`, managing dictionary categories:

- Create/update/delete dictionary categories
- Dictionary categories are linked with dictionary entries

### 2. Dictionary Entry Service (DictEntryService)

Located at `internal/service/dict_entry_service.go`, managing dictionary sub-categories/entries:

- Cascading by dictionary category
- Server-side multi-column sorting
- Data import and export
- i18n support (`DictEntryI18nRepo`)

## 7. Task Scheduling Module

### Task Service (TaskService)

Located at `internal/service/task_service.go`, implementing distributed task scheduling on Asynq:

- Create, modify, delete tasks
- Start, pause tasks
- Run immediately
- View task run logs

Asynq Server configuration (`server.yaml`):

```yaml
asynq:
  uri: "redis://:*Abcd123456@redis:6379/1"
  concurrency: 10
  queues:
    critical: 10
    default: 5
    low: 1
```

## 8. File Management Module

### 1. File Service (FileService)

Located at `internal/service/file_service.go`, managing file metadata:

- File query, download, delete
- Copy file URL
- View images in full size

### 2. File Transfer Service (FileTransferService)

Located at `internal/service/file_transfer_service.go`, handling file upload/download:

- Upload to OSS (MinIO) or local storage
- File download
- File transfer routes must be registered manually (the code generator's Handler cannot be used)

> **Note**: because the file transfer service involves multipart form data processing, it cannot use the Protobuf auto-generated Handler; routes must be registered manually in `rest_server.go`.

## 9. Messaging Module

### 1. Internal Message Service (InternalMessageService)

Located at `internal/service/internal_message_service.go`:

- Send messages to specified users
- View users' read status and read time
- View message details, delete messages
- Mark as read, mark all as read

### 2. Message Category Service (InternalMessageCategoryService)

Located at `internal/service/internal_message_category_service.go`:

- Two-level custom message categories
- Used for category selection in message management

### 3. Message Recipient Service (InternalMessageRecipientService)

Located at `internal/service/internal_message_recipient_service.go`:

- Manage message recipients
- Supports multiple recipient scopes: specified users, roles, departments, etc.

## 10. Log & Audit Module

### 1. Login Audit Log (LoginAuditLogService)

- Records successful and failed user logins
- Supports IP geolocation recording

### 2. API Audit Log (ApiAuditLogService)

- Records detailed API request information
- Collected automatically via middleware

### 3. Operation Audit Log (OperationAuditLogService)

- Records user operation logs (normal and abnormal)
- Supports IP geolocation recording
- View operation log details

### 4. Data Access Audit Log (DataAccessAuditLogService)

- Records data access behavior

### 5. Permission Audit Log (PermissionAuditLogService)

- Records permission change operations

### 6. Policy Evaluation Log (PolicyEvaluationLogService)

- Records permission policy evaluation processes

## 11. Login Policy Module

### Login Policy Service (LoginPolicyService)

Located at `internal/service/login_policy_service.go`:

- Manage login policy rules
- Configurable IP whitelist/blacklist
- Configurable time restrictions
- Configurable login failure lockout policy

## 12. Language Management Module

### Language Service (LanguageService)

Located at `internal/service/language_service.go`:

- Manage the list of languages supported by the system
- Base data for internationalization (i18n)
- Linked with dictionary entry i18n
