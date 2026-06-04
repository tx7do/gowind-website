# 后端扩展开发

本文档介绍如何在 GoWind Admin 后端进行扩展开发，包括 Lua 脚本扩展、事件总线、加密工具、对象存储、自定义中间件等。

## 一、Lua 脚本引擎

GoWind Admin 内置 Lua 脚本引擎，支持在不修改核心代码的前提下扩展业务逻辑。Lua 引擎位于 `pkg/lua/` 目录。

### 1. 引擎架构

```
pkg/lua/
├── engine.go          # Lua 引擎核心
├── context.go         # Lua 上下文管理
├── loader.go          # 脚本加载器
├── script.go          # 脚本定义
├── hook/              # 钩子机制
├── api/               # 内置 Lua API 模块
│   ├── cache.go       # 缓存操作 API
│   ├── crypto.go      # 加密操作 API
│   ├── eventbus.go    # 事件总线 API
│   ├── hook.go        # 钩子 API
│   ├── logger.go      # 日志 API
│   ├── oss.go         # 对象存储 API
│   ├── task.go        # 任务 API
│   └── util.go        # 工具函数 API
└── examples/          # Lua 脚本示例
```

### 2. 内置 Lua API 模块

| 模块 | 功能 |
|------|------|
| `cache` | Redis 缓存读写操作 |
| `crypto` | AES-GCM 加密解密 |
| `eventbus` | 事件发布与订阅 |
| `hook` | 钩子注册与触发 |
| `logger` | 日志记录 |
| `oss` | 对象存储文件操作 |
| `task` | 异步任务投递 |
| `util` | 通用工具函数 |

### 3. Lua 脚本开发

#### 基本结构

```lua
-- my_module.lua
-- 自定义 Lua API 模块

local M = {}

function M.hello(name)
    logger.info("Hello, " .. name .. "!")
    return "greeting sent"
end

return M
```

#### 使用内置 API

```lua
-- 使用缓存 API
local value = cache.get("user:1001")
cache.set("user:1001", "updated_value", 3600)

-- 使用日志 API
logger.info("Processing request...")
logger.error("Something went wrong!")

-- 使用对象存储 API
local url = oss.get_presigned_url("bucket", "file.pdf", 3600)

-- 使用加密 API
local encrypted = crypto.encrypt("sensitive data")
local decrypted = crypto.decrypt(encrypted)
```

#### 注册自定义 API

在 Go 代码中注册自定义 Lua API：

```go
func (e *Engine) registerAPIs(L *lua.LState) {
    api.RegisterMyAPI(L, e.myService, e.logger)
}
```

### 4. 钩子机制

Lua 引擎支持钩子（Hook）机制，可以在特定事件触发时执行 Lua 脚本：

```lua
-- 注册钩子
hook.register("on_user_created", function(user_id)
    logger.info("New user created: " .. tostring(user_id))
    -- 执行自定义逻辑
    cache.set("new_user:" .. tostring(user_id), "true", 3600)
end)
```

### 5. 脚本加载

Lua 脚本支持自动加载和手动加载两种方式：

- **自动加载**：将脚本放到指定目录，引擎启动时自动加载
- **手动加载**：通过 `loader.go` 手动指定脚本路径

## 二、事件总线

事件总线位于 `pkg/eventbus/`，提供发布/订阅模式的事件驱动机制。

### 1. 核心概念

| 概念 | 说明 |
|------|------|
| Event | 事件定义，包含事件类型和载荷数据 |
| Handler | 事件处理器，处理特定类型的事件 |
| Middleware | 事件中间件，在事件处理前后执行（如日志、重试等） |
| Manager | 事件管理器，管理事件注册和处理 |

### 2. 使用方式

```go
// 定义事件
event := eventbus.NewEvent("user.created", map[string]interface{}{
    "user_id": 123,
    "username": "john",
})

// 发布事件
eventbus.Publish(event)

// 订阅事件
eventbus.Subscribe("user.created", func(e *eventbus.Event) error {
    // 处理事件
    return nil
})
```

### 3. 中间件

事件总线支持中间件，可以用于：
- 日志记录
- 错误重试
- 性能监控
- 事件过滤

### 4. 与 Lua 集成

Lua 脚本可以通过 `eventbus` API 模块参与事件驱动：

```lua
-- 订阅事件
eventbus.subscribe("order.created", function(event)
    logger.info("Order created: " .. event.order_id)
    -- 处理订单逻辑
end)
```

## 三、加密工具

加密工具位于 `pkg/crypto/`，提供 AES-GCM 加密能力。

### 1. 核心功能

| 功能 | 说明 |
|------|------|
| AES-GCM 加密 | 对称加密算法，提供数据机密性和完整性保护 |
| 密钥管理 | 支持通过环境变量配置加密密钥 |
| 载荷加密 | 支持对 Protobuf 消息字段进行加密 |

### 2. 使用方式

```go
import "go-wind-admin/pkg/crypto"

// 创建加密器
encryptor, err := crypto.NewAesGcmEncryptor(encryptionKey)

// 加密
encrypted, err := encryptor.Encrypt(plaintext)

// 解密
decrypted, err := encryptor.Decrypt(encrypted)
```

### 3. 配置加密

系统支持对敏感配置项进行加密存储：
- 数据库密码
- Redis 密码
- MinIO 密钥
- JWT 密钥

通过 `ENCRYPTION_KEY` 环境变量指定主密钥。

## 四、对象存储

对象存储客户端位于 `pkg/oss/`，封装了 MinIO S3 兼容的操作。

### 1. 核心功能

| 功能 | 说明 |
|------|------|
| 文件上传 | 支持流式上传和分片上传 |
| 文件下载 | 支持预签名 URL 下载 |
| 桶管理 | 创建、删除、列举桶 |
| 文件管理 | 删除、列举、复制文件 |

### 2. 配置

在 `oss.yaml` 中配置 MinIO 连接信息：

```yaml
oss:
  minio:
    endpoint: "minio:9000"
    upload_host: "minio:9000"
    download_host: "minio:9000"
    access_key: "root"
    secret_key: "*Abcd123456"
    use_ssl: false
```

### 3. 工具函数

`pkg/oss/utils.go` 提供了丰富的文件操作工具：

- 文件类型检测
- 文件大小格式化
- 文件名安全处理
- MIME 类型映射
- 路径拼接

## 五、自定义中间件

### 1. 认证中间件

位于 `pkg/middleware/auth/`，支持：
- JWT Token 提取与验证
- 用户信息注入到 Context
- Ent Viewer 上下文注入
- 白名单机制

```go
// 使用认证中间件
ms = append(ms, selector.Server(
    auth.Server(
        auth.WithAccessTokenChecker(accessTokenChecker),
        auth.WithInjectMetadata(false),
        auth.WithInjectEnt(true),
    ),
).Match(rpc.NewRestWhiteListMatcher()).Build())
```

### 2. 审计日志中间件

位于 `pkg/middleware/logging/`，自动记录：
- API 请求日志（请求路径、参数、响应、耗时等）
- 登录日志（登录成功/失败、IP 地址等）

## 六、JWT 令牌载荷

JWT 令牌载荷解析工具位于 `pkg/jwt/`。

### 令牌载荷结构

```go
type UserTokenPayload struct {
    UserId   uint32   // 用户ID
    TenantId *uint32  // 租户ID
    Username string   // 用户名
    Roles    []string // 角色代码列表
    ClientId string   // 客户端ID
    DeviceId string   // 设备ID
}
```

### 使用方式

```go
// 从 Context 获取操作者信息
operator, err := auth.FromContext(ctx)
operator.GetUserId()
operator.GetUsername()
```

## 七、Ent ORM 扩展

Ent 相关扩展位于 `pkg/entgo/`：

### 1. Viewer 机制

Ent 的 Viewer 机制用于实现数据级别的访问控制：

| Viewer | 说明 |
|--------|------|
| `SystemViewerContext` | 系统级视角，无数据隔离（用于系统管理员） |
| `UserViewerContext` | 用户级视角，根据数据权限进行隔离 |
| `NoopContext` | 空视角，用于登录等无用户上下文的场景 |

### 2. 隐私保护

通过 Ent Privacy 机制控制字段级别的数据访问：

```go
// 绕过隐私保护（如登录验证时）
ctx = privacy.DecisionContext(ctx, privacy.Allow)
```

## 八、常量与配置

全局常量定义位于 `pkg/constants/`：

| 常量 | 说明 |
|------|------|
| `SystemAccessBackendPermissionCode` | 后台访问权限代码 |
| `DefaultUserTenantRelationType` | 用户-租户关系类型（一对一/一对多） |
| `IsTenantModeEnabled` | 是否启用多租户模式 |

## 九、添加新业务模块的完整流程

### 步骤 1：定义 Protobuf

在 `api/protos/` 下定义新的 Service 和消息类型。

### 步骤 2：生成代码

```shell
make api
```

### 步骤 3：创建 Ent Schema

在 `internal/data/ent/schema/` 下定义新的 Ent Schema。

```shell
make ent
```

### 步骤 4：实现 Data 层

在 `internal/data/` 下创建新的 Repo 实现。

### 步骤 5：实现 Service 层

在 `internal/service/` 下创建新的 Service 实现。

### 步骤 6：注册到 Server

在 `internal/server/rest_server.go` 中注册新的 Service Handler。

### 步骤 7：重新生成 Wire

```shell
cd app/admin/service/cmd/server
wire
```

### 步骤 8：生成 OpenAPI 文档

```shell
make openapi
```

### 步骤 9：生成 TypeScript 代码

```shell
make ts
```

## 十、相关文档

- [后端架构总览](./backend-architecture.md)
- [后端核心模块详解](./backend-modules.md)
- [后端 API 与 Protobuf 定义](./backend-api.md)
- [后端配置与部署](./backend-config-deploy.md)
