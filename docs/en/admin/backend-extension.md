# Backend Extension Development

This document covers extension development for the GoWind Admin backend, including the script engine, event bus, crypto utilities, object storage, custom middleware, and more.

## 1. Script Engine

GoWind Admin has a built-in script engine supporting two scripting languages, **Lua** and **JavaScript**, allowing business logic to be extended dynamically without modifying core code or restarting services. The engine is built on the `kratos-bootstrap/script_engine` component.

### 1. Engine Architecture

```mermaid
graph TB
    subgraph "GoWind Admin"
        GO["Go business services"]
    end
    subgraph "Script engine pool"
        P["EnginePool<br/>fixed / auto-growing"]
        E1["Engine 1"]
        E2["Engine 2"]
        EN["Engine N"]
    end
    subgraph "Registered resources"
        F["Go functions"]
        V["Global variables"]
    end
    subgraph "Script loading"
        S["String"]
        FL["Local file"]
        R["Remote stream"]
    end
    GO --> P
    P --> E1
    P --> E2
    P --> EN
    F --> E1
    V --> E1
    S --> E1
    FL --> E1
    R --> E1
end
```

### 2. Engine Pool Management

Creating and destroying script engines is a "heavyweight operation"; instances are pooled and reused to avoid performance loss:

- **EnginePool (fixed pool)**: creates a fixed number of engines at initialization, suited to scenarios with stable concurrency
- **AutoGrowEnginePool (auto-growing pool)**: scales up and down dynamically with request volume, suited to "tidal traffic"

```go
// Initialize an auto-growing engine pool
func initScriptEngine() (script_engine.ScriptEngine, error) {
    cfg := &conf.Script{
        Engine: conf.Script_LUA,  // or conf.Script_JAVASCRIPT
        Pool: &conf.Script_Pool{
            Initial:     wrapperspb.Int32(2),   // initial instance count
            Max:         wrapperspb.Int32(10),   // max instance count
            IdleTimeout: wrapperspb.Duration(300), // idle timeout in seconds
        },
    }
    return script_engine.NewAutoGrowScriptEnginePool(cfg)
}
```

### 3. Two-Way Go ↔ Script Interaction

**Go injects capabilities into scripts** (registering functions and variables):

```go
// Register a Go function in the script environment
eng.RegisterFunction("updateUserStatus", userService.UpdateUserStatus)

// Register a global variable
eng.RegisterVariable("SYSTEM_ENV", "production")
```

**Calling Go functions from JavaScript scripts**:

```javascript
const [success, err] = await updateUserStatus(userId, "active");
console.log(`当前环境：${SYSTEM_ENV}`);
```

**Calling Go functions from Lua scripts**:

```lua
local success, err = updateUserStatus(userId, "active")
logger.info("当前环境：" .. SYSTEM_ENV)
```

### 4. Lua Script Development

The Lua engine is located in the `pkg/lua/` directory with rich built-in API modules:

```
pkg/lua/
├── engine.go          # Lua engine core
├── context.go         # Lua context management
├── loader.go          # Script loader
├── hook/              # Hook mechanism
└── api/               # Built-in Lua API modules
    ├── cache.go       # Cache operations
    ├── crypto.go      # Crypto operations
    ├── eventbus.go    # Event bus
    ├── hook.go        # Hook API
    ├── logger.go      # Logging
    ├── oss.go         # Object storage
    ├── task.go        # Task delivery
    └── util.go        # Utility functions
```

#### Using Built-in APIs

```lua
-- Using the cache API
local value = cache.get("user:1001")
cache.set("user:1001", "updated_value", 3600)

-- Using the object storage API
local url = oss.get_presigned_url("bucket", "file.pdf", 3600)

-- Using the crypto API
local encrypted = crypto.encrypt("sensitive data")
```

#### Hook Mechanism

```lua
-- Execute Lua scripts when specific events fire
hook.register("on_user_created", function(user_id)
    logger.info("New user created: " .. tostring(user_id))
    cache.set("new_user:" .. tostring(user_id), "true", 3600)
end)
```

#### Script Loading Methods

- **String**: pass Lua code as a string directly
- **Local file**: `eng.ExecuteFile(ctx, "./scripts/calculate.lua")`
- **Remote stream**: load from a config center or object storage
- **Auto-load**: place scripts in a designated directory; they are loaded automatically at engine startup

## 2. Event Bus

The event bus is located at `pkg/eventbus/`, providing a publish/subscribe event-driven mechanism.

### 1. Core Concepts

| Concept         | Description                       |
|------------|--------------------------|
| Event      | Event definition, containing the event type and payload data         |
| Handler    | Event handler, processing events of a specific type          |
| Middleware | Event middleware, executing before/after event handling (e.g. logging, retries) |
| Manager    | Event manager, managing event registration and processing          |

### 2. Usage

```go
// Define an event
event := eventbus.NewEvent("user.created", map[string]interface{}{
    "user_id": 123,
    "username": "john",
})

// Publish the event
eventbus.Publish(event)

// Subscribe to the event
eventbus.Subscribe("user.created", func(e *eventbus.Event) error {
    // Handle the event
    return nil
})
```

### 3. Middleware

The event bus supports middleware, which can be used for:
- Logging
- Error retries
- Performance monitoring
- Event filtering

### 4. Integration with Lua

Lua scripts can participate in the event-driven flow via the `eventbus` API module:

```lua
-- Subscribe to an event
eventbus.subscribe("order.created", function(event)
    logger.info("Order created: " .. event.order_id)
    -- Handle the order logic
end)
```

## 3. Crypto Utilities

The crypto utilities are located at `pkg/crypto/`, providing AES-GCM encryption.

### 1. Core Features

| Feature         | Description                    |
|------------|-----------------------|
| AES-GCM encryption | Symmetric encryption algorithm providing data confidentiality and integrity  |
| Key management       | Encryption keys configurable via environment variables        |
| Payload encryption       | Supports encrypting Protobuf message fields |

### 2. Usage

```go
import "go-wind-admin/pkg/crypto"

// Create an encryptor
encryptor, err := crypto.NewAesGcmEncryptor(encryptionKey)

// Encrypt
encrypted, err := encryptor.Encrypt(plaintext)

// Decrypt
decrypted, err := encryptor.Decrypt(encrypted)
```

### 3. Encrypted Configuration

The system supports encrypted storage for sensitive configuration items:
- Database passwords
- Redis password
- MinIO keys
- JWT keys

The master key is specified via the `ENCRYPTION_KEY` environment variable.

## 4. Object Storage

The object storage client is located at `pkg/oss/`, wrapping MinIO's S3-compatible operations.

### 1. Core Features

| Feature   | Description           |
|------|--------------|
| File upload | Supports streaming and multipart uploads  |
| File download | Supports presigned URL downloads |
| Bucket management  | Create, delete, list buckets    |
| File management | Delete, list, copy files   |

### 2. Configuration

Configure the MinIO connection information in `oss.yaml`:

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

### 3. Utility Functions

`pkg/oss/utils.go` provides rich file operation utilities:

- File type detection
- File size formatting
- Safe filename handling
- MIME type mapping
- Path joining

## 5. Custom Middleware

### 1. Authentication Middleware

Located at `pkg/middleware/auth/`, supporting:
- JWT token extraction and validation
- User info injection into Context
- Ent Viewer context injection
- Whitelist mechanism

```go
// Use the authentication middleware
ms = append(ms, selector.Server(
    auth.Server(
        auth.WithAccessTokenChecker(accessTokenChecker),
        auth.WithInjectMetadata(false),
        auth.WithInjectEnt(true),
    ),
).Match(rpc.NewRestWhiteListMatcher()).Build())
```

### 2. Audit Log Middleware

Located at `pkg/middleware/logging/`, automatically recording:
- API request logs (request path, parameters, response, latency, etc.)
- Login logs (login success/failure, IP address, etc.)

## 6. JWT Token Payload

The JWT token payload parsing utilities are located at `pkg/jwt/`.

### Token Payload Structure

```go
type UserTokenPayload struct {
    UserId   uint32   // User ID
    TenantId *uint32  // Tenant ID
    Username string   // Username
    Roles    []string // Role code list
    ClientId string   // Client ID
    DeviceId string   // Device ID
}
```

### Usage

```go
// Get operator info from the Context
operator, err := auth.FromContext(ctx)
operator.GetUserId()
operator.GetUsername()
```

## 7. Ent ORM Extensions

Ent-related extensions are located at `pkg/entgo/`:

### 1. Viewer Mechanism

Ent's Viewer mechanism implements data-level access control:

| Viewer                | Description                   |
|-----------------------|----------------------|
| `SystemViewerContext` | System-level view with no data isolation (for system administrators) |
| `UserViewerContext`   | User-level view, isolated according to data permissions     |
| `NoopContext`         | Empty view, for scenarios without user context such as login   |

### 2. Privacy Protection

Ent's Privacy mechanism controls field-level data access:

```go
// Bypass privacy protection (e.g. during login verification)
ctx = privacy.DecisionContext(ctx, privacy.Allow)
```

## 8. Constants & Configuration

Global constants are defined in `pkg/constants/`:

| Constant                                  | Description                 |
|-------------------------------------|--------------------|
| `SystemAccessBackendPermissionCode` | Backend access permission code           |
| `DefaultUserTenantRelationType`     | User–tenant relation type (one-to-one / one-to-many) |
| `IsTenantModeEnabled`               | Whether multi-tenant mode is enabled          |

## 9. Full Workflow for Adding a New Business Module

### Step 1: Define the Protobuf

Define the new Service and message types under `api/protos/`.

### Step 2: Generate the Code

```shell
make api
```

### Step 3: Create the Ent Schema

Define the new Ent Schema under `internal/data/ent/schema/`.

```shell
make ent
```

### Step 4: Implement the Data Layer

Create the new Repo implementation under `internal/data/`.

### Step 5: Implement the Service Layer

Create the new Service implementation under `internal/service/`.

### Step 6: Register with the Server

Register the new Service Handler in `internal/server/rest_server.go`.

### Step 7: Regenerate Wire

```shell
cd app/admin/service/cmd/server
wire
```

### Step 8: Generate the OpenAPI Documentation

```shell
make openapi
```

### Step 9: Generate the TypeScript Code

```shell
make ts
```

## 10. Related Documents

- [Backend Architecture Overview](/en/admin/backend-architecture.md)
- [Backend Core Modules in Depth](/en/admin/backend-modules.md)
- [Backend API & Protobuf Definitions](/en/admin/backend-api.md)
- [Backend Configuration & Deployment](/en/admin/backend-config-deploy.md)
