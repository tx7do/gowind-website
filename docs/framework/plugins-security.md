# 安全与认证插件

go-wind-plugins 提供认证（authn）、授权（authz）与加解密（crypto）三大块安全能力，认证引擎覆盖 JWT、OAuth2、OIDC 等 10 种，授权引擎覆盖 Casbin、Cedar、Cerbos、OPA、Zanzibar 等 9 种，共 20 个模块。

## 一、插件总览

### 认证引擎（`security/authn/` 下）

| 插件 | 导入路径 | 引擎/说明 |
|------|---------|------|
| JWT | `plugins/security/authn/jwt` | golang-jwt/jwt |
| OAuth2 | `plugins/security/authn/oauth2` | OAuth2 客户端凭据（Token 自省） |
| OIDC | `plugins/security/authn/oidc` | OpenID Connect（外部 IdP 委托认证） |
| API Key | `plugins/security/authn/apikey` | API Key 比对 |
| HTTP Basic | `plugins/security/authn/basicauth` | HTTP Basic 认证 |
| HMAC | `plugins/security/authn/hmac` | HMAC 签名校验（时间戳+密钥防重放） |
| mTLS | `plugins/security/authn/mtls` | 双向 TLS 客户端证书 |
| 预共享密钥 | `plugins/security/authn/presharedkey` | 静态预共享密钥比对 |
| 会话 | `plugins/security/authn/session` | 服务端会话（cookie/session store） |
| Noop | `plugins/security/authn/noop` | 空实现（开发/测试默认引擎） |

### 授权引擎（`security/authz/` 下）

| 插件 | 导入路径 | 引擎/说明 |
|------|---------|------|
| Casbin | `plugins/security/authz/casbin` | casbin/casbin |
| Cedar | `plugins/security/authz/cedar` | Cedar 策略引擎 |
| Cerbos | `plugins/security/authz/cerbos` | Cerbos 策略引擎 |
| OPA | `plugins/security/authz/opa` | Open Policy Agent（Rego） |
| Zanzibar | `plugins/security/authz/zanzibar` | ReBAC 关系元组（keto / openfga 对接） |
| ACL | `plugins/security/authz/acl` | 静态 ACL |
| RBAC | `plugins/security/authz/rbac` | 基于角色的访问控制 |
| AWS IAM | `plugins/security/authz/awsiam` | AWS IAM 策略委托判定 |
| Noop | `plugins/security/authz/noop` | 空实现（开发/测试默认引擎） |

### 加密模块

| 插件 | 导入路径 | 说明 |
|------|---------|------|
| Crypto | `plugins/security/crypto` | 加解密/哈希/签名统一注册表（AES、RSA、SM2/SM3/SM4、HMAC、ECDSA、ECDH） |

## 二、认证适配器

### 2.1 JWT

```go
import jwtPlugin "github.com/tx7do/go-wind-plugins/security/authn/jwt"

authenticator, _ := jwtPlugin.NewAuthenticator(
    jwtPlugin.WithSigningMethod("HS256"),
    jwtPlugin.WithKey("my-secret-key"),
)
```

#### 签发 Token

```go
claims := engine.AuthClaims{
    "user_id":  "123",
    "username": "alice",
    "roles":    []string{"admin"},
}

token, _ := authenticator.CreateIdentity(claims)
```

#### 验证 Token

```go
claims, err := authenticator.AuthenticateToken(tokenString)
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
```

### 2.2 OAuth2

```go
import oauth2Plugin "github.com/tx7do/go-wind-plugins/security/authn/oauth2"

oauth2Authenticator, _ := oauth2Plugin.NewAuthenticator(
    oauth2Plugin.WithClientCredentials(clientID, clientSecret),
    oauth2Plugin.WithIntrospectURL("https://idp.example.com/oauth2/introspect"),
)
```

通过 Token 自省（RFC 7662）对接外部 OAuth2/OIDC 授权服务器，`AuthenticateToken` 返回自省结果映射出的标准 Claims；`WithExtraClaimsKeys` 可透传额外 Claim 字段。

## 三、授权适配器

### 3.1 Casbin RBAC

```go
import casbinPlugin "github.com/tx7do/go-wind-plugins/security/authz/casbin"

enforcer, _ := casbinPlugin.NewEngine(
    context.Background(),
    casbinPlugin.WithFileModel("rbac_model.conf"),
    casbinPlugin.WithPolicyAdapter(policyAdapter),
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
allowed, _ := enforcer.IsAuthorized(ctx, subject, action, resource, project)

// 策略加载后统一注入
enforcer.SetPolicies(ctx, policyMap, roleMap)
```

除 Casbin 外，授权侧还提供 Cedar / Cerbos / OPA（Rego）/ Zanzibar（ReBAC，对接 keto、openfga）等引擎，以及内置的 ACL、RBAC 实现；所有引擎实现同一 `authz.Engine` 接口，可通过工厂按类型创建（`engine.NewEngine(ctx, typ, opts...)`）。

### 3.2 中间件集成

```go
// JWT 认证中间件
authMiddleware := authnMiddleware.Middleware(authenticator,
    authnMiddleware.WithSkipFunc(func(r *http.Request) bool {
        return r.URL.Path == "/login" || r.URL.Path == "/register"
    }),
)

// 授权中间件
authzMiddleware := authzMiddleware.Middleware(authorizer)

// 组合使用
router.Use(authMiddleware, authzMiddleware)
```

HTTP 与 gRPC 均提供同名中间件模块：`transport/http/middleware/authn`、`transport/http/middleware/authz`、`transport/grpc/middleware/authn`、`transport/grpc/middleware/authz`。

## 四、密码与加解密

加解密统一由 `security/crypto` 提供，它基于 go-utils/crypto 重新导出 `Cipher` / `Hasher` / `Signer` / `Verifier` / `KeyExchanger` 五类接口，并像 encoding 一样提供按名称注册与查找的全局注册表。

```go
import "github.com/tx7do/go-wind-plugins/security/crypto"

// 内置实现：AES、RSA、SM2、SM4、HMAC、SM3/SHA256、ECDSA、ECDH
cipher, _ := crypto.NewAESCipher(key, nil)
encrypted, _ := cipher.Encrypt(plaintext)
decrypted, _ := cipher.Decrypt(encrypted)

// 注册与按名查找
crypto.RegisterCipher(cipher)
c := crypto.GetCipher("aes")
```

## 五、TLS/SSL

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

## 六、CORS

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

## 七、限流安全

```go
import ratelimitPlugin "github.com/tx7do/go-wind-plugins/ratelimit/tokenbucket"

limiter := ratelimitPlugin.New(
    ratelimitPlugin.WithRate(100),       // 100 requests
    ratelimitPlugin.WithBurst(50),       // burst 50
    ratelimitPlugin.WithPer("minute"),   // per minute
)
```

## 近期更新

- **OPA**（`security/authz/opa`）：修复 `SetPolicies` 与读路径之间的数据竞态。

## 相关文档

- [插件配置系统](./plugins-config.md)
- [限流插件](./plugins-ratelimit.md)
- [Bootstrap 中间件编排](./bootstrap-middleware.md)
