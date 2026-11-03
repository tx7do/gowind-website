# Backend API & Protobuf Definitions

The GoWind Admin backend follows a **Protobuf First** API development model: all endpoints are defined in Protobuf, and the Buf toolchain automatically generates the Go server code, TypeScript client code, and OpenAPI documentation.

## 1. Protobuf Organization

All Protobuf definition files are located under the `backend/api/protos/` directory, organized by business domain:

```
api/protos/
├── admin/service/v1/       # Admin service interface definitions (HTTP routes, request/response messages)
├── audit/                  # Audit log message definitions
├── authentication/         # Authentication message definitions
├── dict/                   # Dictionary management message definitions
├── identity/               # Identity management message definitions (user, role, org, tenant, etc.)
├── internal_message/       # Internal message definitions
├── permission/             # Permission management message definitions
├── storage/                # File storage message definitions
└── task/                   # Task scheduling message definitions
```

### Module Descriptions

| Module Directory        | Responsibilities                                                    |
|---------------------|-------------------------------------------------------|
| `admin/service/v1/` | Defines RPC services and HTTP route mappings; the entry-point definitions of the API                |
| `authentication/`   | Login request/response, token payload, user credentials, and other messages                                |
| `identity/`         | Entity messages for User, Role, OrgUnit, Tenant, department, position, etc. |
| `permission/`       | Permission, PermissionGroup, Menu, and other messages    |
| `dict/`             | DictType and DictEntry messages                    |
| `audit/`            | Various audit log messages                                            |
| `internal_message/` | Internal messages, message categories, message recipients                                    |
| `storage/`          | File upload/download messages                                          |
| `task/`             | Task scheduling messages                                            |

## 2. Service Definition Conventions

Using the authentication service as an example of a standard Service definition:

```protobuf
syntax = "proto3";

package admin.service.v1;

import "gnostic/openapi/v3/annotations.proto";
import "google/api/annotations.proto";
import "google/protobuf/empty.proto";
import "authentication/service/v1/authentication.proto";

// Backend login authentication service
service AuthenticationService {
  // Login
  rpc Login (authentication.service.v1.LoginRequest) returns (authentication.service.v1.LoginResponse) {
    option (google.api.http) = {
      post: "/admin/v1/login"
      body: "*"
    };
    option(gnostic.openapi.v3.operation) = {
      security: {}
    };
  }

  // Logout
  rpc Logout (google.protobuf.Empty) returns (google.protobuf.Empty) {
    option (google.api.http) = {
      post: "/admin/v1/logout"
      body: "*"
    };
  }
}
```

### Key Conventions

1. **HTTP route mapping**: the HTTP method and path are specified via the `google.api.http` annotation
2. **Unified prefix**: all Admin API routes are prefixed with `/admin/v1/`
3. **OpenAPI security annotation**: endpoints that require no authentication are annotated with `security: {}` (e.g. login, captcha)
4. **Package naming**: `admin.service.v1` is used for Service definitions; other messages are packaged by domain

## 3. API Endpoint List

### 1. Authentication Service (AuthenticationService)

| Method   | Route                         | Description    |
|------|----------------------------|-------|
| POST | `/admin/v1/login`          | User login  |
| POST | `/admin/v1/logout`         | User logout  |
| POST | `/admin/v1/register`       | User registration  |
| POST | `/admin/v1/refresh-token`  | Refresh token  |
| GET  | `/admin/v1/captcha`        | Generate captcha |
| POST | `/admin/v1/captcha/verify` | Verify captcha |

### 2. User Management Service

| Method     | Route                    | Description     |
|--------|-----------------------|--------|
| POST   | `/admin/v1/user`      | Create user   |
| PUT    | `/admin/v1/user/{id}` | Update user   |
| DELETE | `/admin/v1/user/{id}` | Delete user   |
| GET    | `/admin/v1/user/{id}` | Get user details |
| GET    | `/admin/v1/user`      | User list query |

### 3. Tenant Management Service

| Method     | Route                      | Description     |
|--------|-------------------------|--------|
| POST   | `/admin/v1/tenant`      | Create tenant   |
| PUT    | `/admin/v1/tenant/{id}` | Update tenant   |
| DELETE | `/admin/v1/tenant/{id}` | Delete tenant   |
| GET    | `/admin/v1/tenant/{id}` | Get tenant details |
| GET    | `/admin/v1/tenant`      | Tenant list query |

### 4. Role Management Service

| Method     | Route                    | Description     |
|--------|-----------------------|--------|
| POST   | `/admin/v1/role`      | Create role   |
| PUT    | `/admin/v1/role/{id}` | Update role   |
| DELETE | `/admin/v1/role/{id}` | Delete role   |
| GET    | `/admin/v1/role/{id}` | Get role details |
| GET    | `/admin/v1/role`      | Role list query |

### 5. Permission Management Service

| Method     | Route                          | Description     |
|--------|-----------------------------|--------|
| POST   | `/admin/v1/permission`      | Create permission   |
| PUT    | `/admin/v1/permission/{id}` | Update permission   |
| DELETE | `/admin/v1/permission/{id}` | Delete permission   |
| GET    | `/admin/v1/permission/{id}` | Get permission details |
| GET    | `/admin/v1/permission`      | Permission list query |

### 6. Menu Management Service

| Method     | Route                    | Description     |
|--------|-----------------------|--------|
| POST   | `/admin/v1/menu`      | Create menu   |
| PUT    | `/admin/v1/menu/{id}` | Update menu   |
| DELETE | `/admin/v1/menu/{id}` | Delete menu   |
| GET    | `/admin/v1/menu/{id}` | Get menu details |
| GET    | `/admin/v1/menu`      | Menu list query |

### 7. Organization Management Service

| Method     | Route                        | Description     |
|--------|---------------------------|--------|
| POST   | `/admin/v1/org-unit`      | Create org unit   |
| PUT    | `/admin/v1/org-unit/{id}` | Update org unit   |
| DELETE | `/admin/v1/org-unit/{id}` | Delete org unit   |
| GET    | `/admin/v1/org-unit/{id}` | Get org unit details |
| GET    | `/admin/v1/org-unit`      | Org unit list query |

### 8. Dictionary Management Service

| Method     | Route                          | Description       |
|--------|-----------------------------|----------|
| POST   | `/admin/v1/dict-type`       | Create dict type   |
| PUT    | `/admin/v1/dict-type/{id}`  | Update dict type   |
| DELETE | `/admin/v1/dict-type/{id}`  | Delete dict type   |
| GET    | `/admin/v1/dict-type`       | Dict type list query |
| POST   | `/admin/v1/dict-entry`      | Create dict entry   |
| PUT    | `/admin/v1/dict-entry/{id}` | Update dict entry   |
| DELETE | `/admin/v1/dict-entry/{id}` | Delete dict entry   |
| GET    | `/admin/v1/dict-entry`      | Dict entry list query |

### 9. File Management Service

| Method     | Route                             | Description     |
|--------|--------------------------------|--------|
| POST   | `/admin/v1/file`               | Create file record |
| PUT    | `/admin/v1/file/{id}`          | Update file record |
| DELETE | `/admin/v1/file/{id}`          | Delete file   |
| GET    | `/admin/v1/file/{id}`          | Get file details |
| GET    | `/admin/v1/file`               | File list query |
| POST   | `/admin/v1/file/upload`        | Upload file   |
| GET    | `/admin/v1/file/download/{id}` | Download file   |

### 10. Internal Message Service

| Method     | Route                                    | Description     |
|--------|---------------------------------------|--------|
| POST   | `/admin/v1/internal-message`          | Create message   |
| PUT    | `/admin/v1/internal-message/{id}`     | Update message   |
| DELETE | `/admin/v1/internal-message/{id}`     | Delete message   |
| GET    | `/admin/v1/internal-message/{id}`     | Get message details |
| GET    | `/admin/v1/internal-message`          | Message list query |
| POST   | `/admin/v1/internal-message-category` | Create message category |
| GET    | `/admin/v1/internal-message-category` | Message category list |

### 11. Task Scheduling Service

| Method     | Route                    | Description     |
|--------|-----------------------|--------|
| POST   | `/admin/v1/task`      | Create task   |
| PUT    | `/admin/v1/task/{id}` | Update task   |
| DELETE | `/admin/v1/task/{id}` | Delete task   |
| GET    | `/admin/v1/task/{id}` | Get task details |
| GET    | `/admin/v1/task`      | Task list query |

### 12. Dashboard Service (AdminPortalService)

| Method  | Route                           | Description      |
|-----|------------------------------|---------|
| GET | `/admin/v1/portal/dashboard` | Get dashboard data |

### 13. Audit Log Service

| Method  | Route                                | Description          |
|-----|-----------------------------------|-------------|
| GET | `/admin/v1/login-audit-log`       | Login log list query    |
| GET | `/admin/v1/api-audit-log`         | API audit log list query |
| GET | `/admin/v1/operation-audit-log`   | Operation log list query    |
| GET | `/admin/v1/data-access-audit-log` | Data access log list query  |

## 4. Code Generation

### 1. Buf Configuration

Buf configuration files are located in the `api/` directory:

| File                                          | Description                            |
|---------------------------------------------|-------------------------------|
| `buf.yaml`                                  | Module definition                          |
| `buf.gen.yaml`                              | Go code generation configuration                     |
| `buf.admin.openapi.gen.yaml`                | OpenAPI documentation generation configuration                |
| `buf.vue-vben.admin.typescript.gen.yaml`    | TypeScript generation configuration for the Vue Vben edition    |
| `buf.vue-element.admin.typescript.gen.yaml` | TypeScript generation configuration for the Vue Element edition |
| `buf.react.admin.typescript.gen.yaml`       | TypeScript generation configuration for the React edition       |

### 2. Generation Commands

```shell
# Generate Go server code (HTTP handlers, message types, error codes)
make api

# Generate OpenAPI v3 documentation
make openapi

# Generate TypeScript client code (Vue Vben + Vue Element + React)
make ts

# Generate everything in one go (Ent + Wire + API + OpenAPI)
make gen
```

### 3. Generated Code Output

```
api/gen/go/              # Go code
├── admin/service/v1/    # Admin service generated code (HTTP handlers, interface definitions)
├── audit/service/v1/    # Audit service generated code
├── authentication/      # Authentication message code
├── dict/                # Dictionary message code
├── identity/            # Identity message code
├── internal_message/    # Internal message code
├── permission/          # Permission message code
├── storage/             # Storage message code
└── task/                # Task message code
```

## 5. Swagger UI

Swagger UI is enabled by default in the development environment, accessible at: <http://localhost:7788/docs/>

Swagger UI is integrated via `kratos-swagger-ui` and registered in `rest_server.go`:

```go
if cfg.GetServer().GetRest().GetEnableSwagger() {
    swaggerUI.RegisterSwaggerUIServerWithOption(
        srv,
        swaggerUI.WithTitle("GoWind Admin"),
        swaggerUI.WithMemoryData(assets.OpenApiData, "yaml"),
    )
}
```

OpenAPI documentation URLs:
- Swagger UI: <http://localhost:7788/docs/>
- OpenAPI YAML: <http://localhost:7788/docs/openapi.yaml>

## 6. Error Code Definitions

Error codes are defined in Protobuf and automatically generate Go error types. The error code definition file is `admin_error.proto`:

```protobuf
enum ErrorReason {
  option (errors.default_code) = 500;

  INTERNAL_SERVER_ERROR = 0;
  INVALID_GRANT_TYPE = 1;
  INCORRECT_REFRESH_TOKEN = 2;
  FORBIDDEN = 3;
  // ...
}
```

The generated error types support HTTP status code mapping and can be used directly in the Service layer:

```go
return nil, authenticationV1.ErrorInvalidGrantType("invalid grant type")
```

## 7. Adding a New API

### Step 1: Define the Protobuf

Create or modify a `.proto` file under the corresponding directory in `api/protos/`:

```protobuf
syntax = "proto3";
package admin.service.v1;

import "google/api/annotations.proto";

service MyNewService {
  rpc GetMyData (GetMyDataRequest) returns (GetMyDataResponse) {
    option (google.api.http) = {
      get: "/admin/v1/my-data"
    };
  }
}

message GetMyDataRequest {
  uint32 id = 1;
}

message GetMyDataResponse {
  string name = 1;
}
```

### Step 2: Generate the Code

```shell
make api
```

### Step 3: Implement the Service

Create `my_new_service.go` under `internal/service/`, implementing the generated interface.

### Step 4: Register with the Server

Register the new Service Handler in `internal/server/rest_server.go`.

### Step 5: Regenerate Wire

```shell
cd app/admin/service/cmd/server
wire
```

## 8. Related Documents

- [Backend Architecture Overview](/en/admin/backend-architecture.md)
- [Backend Core Modules in Depth](/en/admin/backend-modules.md)
- [Backend Configuration & Deployment](/en/admin/backend-config-deploy.md)
