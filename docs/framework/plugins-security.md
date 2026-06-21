# 安全与认证插件

go-wind-plugins 提供认证、授权和安全相关的适配器，支持 JWT、OAuth2、Casbin 等。

## 一、认证适配器

### 1.1 JWT

```go
import jwtPlugin "github.com/tx7do/go-wind-plugins/auth/jwt"

authenticator := jwtPlugin.New(
    jwtPlugin.WithSigningMethod("HS256"),
    jwtPlugin.WithKey("my-secret-key"),
    jwtPlugin.WithExpiry(24*time.Hour),
    jwtPlugin.WithIssuer("my-service"),
)
```

#### 签发 Token

```go
claims := map[string]interface{}{
    "user_id":  "123",
    "username": "alice",
    "roles":    []string{"admin"},
}

token, _ := authenticator.Generate(claims)
```

#### 验证 Token

```go
claims, err := authenticator.Verify(tokenString)
if err != nil {
    // 无效或过期的 token
}
```

#### YAML 配置

```yaml
auth:
  jwt:
    signing_method: HS256        # HS256 | RS256 | ES256
    key: ${JWT_SECRET}
    public_key_file: certs/public.pem   # RS256/ES256
    private_key_file: certs/private.pem
    expiry: 24h
    refresh_expiry: 168h         # 7 days
    issuer: my-service
```

### 1.2 OAuth2

```go
import oauth2Plugin "github.com/tx7do/go-wind-plugins/auth/oauth2"

oauth2Server := oauth2Plugin.New(
    oauth2Plugin.WithClientStore(clientStore),
    oauth2Plugin.WithTokenStore(tokenStore),
    oauth2Plugin.WithAccessExp(3600),     // 1 hour
    oauth2Plugin.WithRefreshExp(604800),  // 7 days
)
```

#### 支持的 Grant Type

| Grant Type | 说明 |
|-----------|------|
| `authorization_code` | 授权码模式 |
| `client_credentials` | 客户端凭证 |
| `password` | 密码模式 |
| `refresh_token` | 刷新令牌 |

## 二、授权适配器

### 2.1 Casbin RBAC

```go
import casbinPlugin "github.com/tx7do/go-wind-plugins/auth/casbin"

enforcer, _ := casbinPlugin.New(
    casbinPlugin.WithModelFile("rbac_model.conf"),
    casbinPlugin.WithPolicyAdapter(policyAdapter),
    casbinPlugin.WithAutoSave(true),
)
```

#### 权限模型

```ini
# rbac_model.conf
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where, p.eft == allow)

[matchers]
m = g(r.sub, p.sub) && keyMatch2(r.obj, p.obj) && r.act == p.act
```

#### 权限检查

```go
// 检查用户是否有权限
allowed, _ := enforcer.Enforce("alice", "/api/users/:id", "GET")

// 添加角色
enforcer.AddRoleForUser("alice", "admin")

// 添加策略
enforcer.AddPolicy("admin", "/api/users/*", "GET")
enforcer.AddPolicy("admin", "/api/users/*", "POST")
```

#### YAML 配置

```yaml
auth:
  casbin:
    model_file: configs/rbac_model.conf
    policy:
      driver: mysql          # file | mysql | postgres | redis
      dsn: "user:pass@tcp(localhost:3306)/casbin"
    auto_save: true
    auto_build: true
```

### 2.2 中间件集成

```go
// JWT 认证中间件
authMiddleware := jwtPlugin.Middleware(
    jwtPlugin.WithSkipper(func(r *http.Request) bool {
        return r.URL.Path == "/login" || r.URL.Path == "/register"
    }),
)

// Casbin 授权中间件
authzMiddleware := casbinPlugin.Middleware(enforcer)

// 组合使用
router.Use(authMiddleware, authzMiddleware)
```

## 三、密码安全

### 3.1 BCrypt

```go
import bcryptPlugin "github.com/tx7do/go-wind-plugins/auth/bcrypt"

// 哈希密码
hashed, _ := bcryptPlugin.Hash("mypassword", 10)  // cost = 10

// 验证密码
err := bcryptPlugin.Compare(hashed, "mypassword")  // nil = 匹配
```

### 3.2 Argon2

```go
import argon2Plugin "github.com/tx7do/go-wind-plugins/auth/argon2"

hashed, _ := argon2Plugin.Hash("mypassword", argon2Plugin.WithTime(3),
    argon2Plugin.WithMemory(64*1024), argon2Plugin.WithParallelism(2))
```

## 四、TLS/SSL

```go
// HTTP TLS
httpServer := httpPlugin.NewServer(
    httpPlugin.WithAddr(":8443"),
    httpPlugin.WithTLS("cert.pem", "key.pem"),
)

// gRPC TLS
grpcServer := grpcPlugin.NewServer(
    grpcPlugin.WithAddr(":9443"),
    grpcPlugin.WithTLS("cert.pem", "key.pem"),
)
```

## 五、CORS

```go
httpServer := httpPlugin.NewServer(
    httpPlugin.WithAddr(":8080"),
    httpPlugin.WithCORS(true, []string{"https://app.example.com"}),
)
```

```yaml
server:
  http:
    cors:
      enabled: true
      origins:
        - https://app.example.com
        - https://admin.example.com
      methods: [GET, POST, PUT, DELETE, OPTIONS]
      headers: [Authorization, Content-Type, X-Trace-ID]
      credentials: true
      max_age: 86400
```

## 六、限流安全

```go
import ratelimitPlugin "github.com/tx7do/go-wind-plugins/ratelimit/tokenbucket"

limiter := ratelimitPlugin.New(
    ratelimitPlugin.WithRate(100),       // 100 requests
    ratelimitPlugin.WithBurst(50),       // burst 50
    ratelimitPlugin.WithPer("minute"),   // per minute
)
```

## 相关文档

- [插件配置系统](./plugins-config.md)
- [限流插件](./plugins-ratelimit.md)
- [Bootstrap 中间件编排](./bootstrap-middleware.md)
