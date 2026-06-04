# 后端 API 与 Protobuf 定义

GoWind Admin 后端采用 **Protobuf First** 的 API 开发模式，所有接口通过 Protobuf 定义，借助 Buf 工具链自动生成 Go 服务端代码、TypeScript 客户端代码和 OpenAPI 文档。

## 一、Protobuf 组织结构

所有 Protobuf 定义文件位于 `backend/api/protos/` 目录下，按业务领域划分：

```
api/protos/
├── admin/service/v1/       # Admin 服务接口定义（HTTP 路由、请求/响应消息）
├── audit/                  # 审计日志消息定义
├── authentication/         # 认证相关消息定义
├── dict/                   # 字典管理消息定义
├── identity/               # 身份管理消息定义（用户、角色、组织、租户等）
├── internal_message/       # 站内信消息定义
├── permission/             # 权限管理消息定义
├── storage/                # 文件存储消息定义
└── task/                   # 任务调度消息定义
```

### 各模块说明

| 模块目录 | 职责 |
|----------|------|
| `admin/service/v1/` | 定义 RPC Service 和 HTTP 路由映射，是 API 的入口定义 |
| `authentication/` | 定义登录请求/响应、令牌载荷、用户凭证等消息 |
| `identity/` | 定义用户（User）、角色（Role）、组织（OrgUnit）、租户（Tenant）、部门、职位等实体消息 |
| `permission/` | 定义权限（Permission）、权限分组（PermissionGroup）、菜单（Menu）等消息 |
| `dict/` | 定义字典类型（DictType）和字典条目（DictEntry）消息 |
| `audit/` | 定义各类审计日志消息 |
| `internal_message/` | 定义站内信、消息分类、消息接收者消息 |
| `storage/` | 定义文件上传下载相关消息 |
| `task/` | 定义任务调度相关消息 |

## 二、Service 定义规范

以认证服务为例，展示标准 Service 定义：

```protobuf
syntax = "proto3";

package admin.service.v1;

import "gnostic/openapi/v3/annotations.proto";
import "google/api/annotations.proto";
import "google/protobuf/empty.proto";
import "authentication/service/v1/authentication.proto";

// 用户后台登录认证服务
service AuthenticationService {
  // 登录
  rpc Login (authentication.service.v1.LoginRequest) returns (authentication.service.v1.LoginResponse) {
    option (google.api.http) = {
      post: "/admin/v1/login"
      body: "*"
    };
    option(gnostic.openapi.v3.operation) = {
      security: {}
    };
  }

  // 登出
  rpc Logout (google.protobuf.Empty) returns (google.protobuf.Empty) {
    option (google.api.http) = {
      post: "/admin/v1/logout"
      body: "*"
    };
  }
}
```

### 关键约定

1. **HTTP 路由映射**：通过 `google.api.http` 注解指定 HTTP 方法和路径
2. **统一前缀**：所有 Admin API 路由以 `/admin/v1/` 为前缀
3. **OpenAPI 安全标注**：不需要认证的接口标注 `security: {}`（如登录、验证码）
4. **包名规范**：`admin.service.v1` 用于 Service 定义，其他消息按领域分包

## 三、API 接口清单

### 1. 认证服务（AuthenticationService）

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/admin/v1/login` | 用户登录 |
| POST | `/admin/v1/logout` | 用户登出 |
| POST | `/admin/v1/register` | 用户注册 |
| POST | `/admin/v1/refresh-token` | 刷新令牌 |
| GET | `/admin/v1/captcha` | 生成验证码 |
| POST | `/admin/v1/captcha/verify` | 验证验证码 |

### 2. 用户管理服务

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/admin/v1/user` | 创建用户 |
| PUT | `/admin/v1/user/{id}` | 更新用户 |
| DELETE | `/admin/v1/user/{id}` | 删除用户 |
| GET | `/admin/v1/user/{id}` | 获取用户详情 |
| GET | `/admin/v1/user` | 用户列表查询 |

### 3. 租户管理服务

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/admin/v1/tenant` | 创建租户 |
| PUT | `/admin/v1/tenant/{id}` | 更新租户 |
| DELETE | `/admin/v1/tenant/{id}` | 删除租户 |
| GET | `/admin/v1/tenant/{id}` | 获取租户详情 |
| GET | `/admin/v1/tenant` | 租户列表查询 |

### 4. 角色管理服务

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/admin/v1/role` | 创建角色 |
| PUT | `/admin/v1/role/{id}` | 更新角色 |
| DELETE | `/admin/v1/role/{id}` | 删除角色 |
| GET | `/admin/v1/role/{id}` | 获取角色详情 |
| GET | `/admin/v1/role` | 角色列表查询 |

### 5. 权限管理服务

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/admin/v1/permission` | 创建权限 |
| PUT | `/admin/v1/permission/{id}` | 更新权限 |
| DELETE | `/admin/v1/permission/{id}` | 删除权限 |
| GET | `/admin/v1/permission/{id}` | 获取权限详情 |
| GET | `/admin/v1/permission` | 权限列表查询 |

### 6. 菜单管理服务

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/admin/v1/menu` | 创建菜单 |
| PUT | `/admin/v1/menu/{id}` | 更新菜单 |
| DELETE | `/admin/v1/menu/{id}` | 删除菜单 |
| GET | `/admin/v1/menu/{id}` | 获取菜单详情 |
| GET | `/admin/v1/menu` | 菜单列表查询 |

### 7. 组织管理服务

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/admin/v1/org-unit` | 创建组织 |
| PUT | `/admin/v1/org-unit/{id}` | 更新组织 |
| DELETE | `/admin/v1/org-unit/{id}` | 删除组织 |
| GET | `/admin/v1/org-unit/{id}` | 获取组织详情 |
| GET | `/admin/v1/org-unit` | 组织列表查询 |

### 8. 字典管理服务

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/admin/v1/dict-type` | 创建字典类型 |
| PUT | `/admin/v1/dict-type/{id}` | 更新字典类型 |
| DELETE | `/admin/v1/dict-type/{id}` | 删除字典类型 |
| GET | `/admin/v1/dict-type` | 字典类型列表查询 |
| POST | `/admin/v1/dict-entry` | 创建字典条目 |
| PUT | `/admin/v1/dict-entry/{id}` | 更新字典条目 |
| DELETE | `/admin/v1/dict-entry/{id}` | 删除字典条目 |
| GET | `/admin/v1/dict-entry` | 字典条目列表查询 |

### 9. 文件管理服务

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/admin/v1/file` | 创建文件记录 |
| PUT | `/admin/v1/file/{id}` | 更新文件记录 |
| DELETE | `/admin/v1/file/{id}` | 删除文件 |
| GET | `/admin/v1/file/{id}` | 获取文件详情 |
| GET | `/admin/v1/file` | 文件列表查询 |
| POST | `/admin/v1/file/upload` | 上传文件 |
| GET | `/admin/v1/file/download/{id}` | 下载文件 |

### 10. 站内信服务

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/admin/v1/internal-message` | 创建消息 |
| PUT | `/admin/v1/internal-message/{id}` | 更新消息 |
| DELETE | `/admin/v1/internal-message/{id}` | 删除消息 |
| GET | `/admin/v1/internal-message/{id}` | 获取消息详情 |
| GET | `/admin/v1/internal-message` | 消息列表查询 |
| POST | `/admin/v1/internal-message-category` | 创建消息分类 |
| GET | `/admin/v1/internal-message-category` | 消息分类列表 |

### 11. 任务调度服务

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/admin/v1/task` | 创建任务 |
| PUT | `/admin/v1/task/{id}` | 更新任务 |
| DELETE | `/admin/v1/task/{id}` | 删除任务 |
| GET | `/admin/v1/task/{id}` | 获取任务详情 |
| GET | `/admin/v1/task` | 任务列表查询 |

### 12. 仪表盘服务（AdminPortalService）

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/admin/v1/portal/dashboard` | 获取仪表盘数据 |

### 13. 审计日志服务

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/admin/v1/login-audit-log` | 登录日志列表查询 |
| GET | `/admin/v1/api-audit-log` | API审计日志列表查询 |
| GET | `/admin/v1/operation-audit-log` | 操作日志列表查询 |
| GET | `/admin/v1/data-access-audit-log` | 数据访问日志列表查询 |

## 四、代码生成

### 1. Buf 配置

Buf 配置文件位于 `api/` 目录：

| 文件 | 说明 |
|------|------|
| `buf.yaml` | 模块定义 |
| `buf.gen.yaml` | Go 代码生成配置 |
| `buf.admin.openapi.gen.yaml` | OpenAPI 文档生成配置 |
| `buf.vue-vben.admin.typescript.gen.yaml` | Vue Vben 版 TypeScript 生成配置 |
| `buf.vue-element.admin.typescript.gen.yaml` | Vue Element 版 TypeScript 生成配置 |
| `buf.react.admin.typescript.gen.yaml` | React 版 TypeScript 生成配置 |

### 2. 生成命令

```shell
# 生成 Go 服务端代码（HTTP Handler、消息类型、错误码）
make api

# 生成 OpenAPI v3 文档
make openapi

# 生成 TypeScript 客户端代码（所有前端版本）
make ts

# 一键生成所有（Ent + Wire + API + OpenAPI）
make gen
```

### 3. 生成代码输出

```
api/gen/go/              # Go 代码
├── admin/service/v1/    # Admin 服务生成代码（HTTP Handler、接口定义）
├── audit/service/v1/    # 审计服务生成代码
├── authentication/      # 认证消息生成代码
├── dict/                # 字典消息生成代码
├── identity/            # 身份消息生成代码
├── internal_message/    # 站内信消息生成代码
├── permission/          # 权限消息生成代码
├── storage/             # 存储消息生成代码
└── task/                # 任务消息生成代码
```

## 五、Swagger UI

开发环境默认启用 Swagger UI，访问地址：<http://localhost:7788/docs/>

Swagger UI 通过 `kratos-swagger-ui` 集成，在 `rest_server.go` 中注册：

```go
if cfg.GetServer().GetRest().GetEnableSwagger() {
    swaggerUI.RegisterSwaggerUIServerWithOption(
        srv,
        swaggerUI.WithTitle("GoWind Admin"),
        swaggerUI.WithMemoryData(assets.OpenApiData, "yaml"),
    )
}
```

OpenAPI 文档访问地址：
- Swagger UI：<http://localhost:7788/docs/>
- OpenAPI YAML：<http://localhost:7788/docs/openapi.yaml>

## 六、错误码定义

错误码通过 Protobuf 定义，自动生成 Go 错误类型。错误码定义文件为 `admin_error.proto`：

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

生成的错误类型支持 HTTP 状态码映射，可直接在 Service 层使用：

```go
return nil, authenticationV1.ErrorInvalidGrantType("invalid grant type")
```

## 七、添加新 API 的流程

### 步骤 1：定义 Protobuf

在 `api/protos/` 对应目录下创建或修改 `.proto` 文件：

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

### 步骤 2：生成代码

```shell
make api
```

### 步骤 3：实现 Service

在 `internal/service/` 下创建 `my_new_service.go`，实现生成的接口。

### 步骤 4：注册到 Server

在 `internal/server/rest_server.go` 中注册新的 Service Handler。

### 步骤 5：重新生成 Wire

```shell
cd app/admin/service/cmd/server
wire
```

## 八、相关文档

- [后端架构总览](./backend-architecture.md)
- [后端核心模块详解](./backend-modules.md)
- [后端配置与部署](./backend-config-deploy.md)
