# Security and Authentication Plugins

go-wind-plugins provides three blocks of security capability: authentication (authn), authorization (authz), and encryption/decryption (crypto). Authentication engines cover 10 kinds including JWT, OAuth2, and OIDC; authorization engines cover 9 kinds including Casbin, Cedar, Cerbos, OPA, and Zanzibar — 20 modules in total.

## 1. Plugin Overview

### Authentication Engines (under `security/authn/`)

| Plugin | Import Path | Engine/Notes |
|--------|------------|--------------|
| JWT | `plugins/security/authn/jwt` | golang-jwt/jwt |
| OAuth2 | `plugins/security/authn/oauth2` | OAuth2 client credentials (token introspection) |
| OIDC | `plugins/security/authn/oidc` | OpenID Connect (delegated authentication to an external IdP) |
| API Key | `plugins/security/authn/apikey` | API key comparison |
| HTTP Basic | `plugins/security/authn/basicauth` | HTTP Basic authentication |
| HMAC | `plugins/security/authn/hmac` | HMAC signature verification (timestamp + key anti-replay) |
| mTLS | `plugins/security/authn/mtls` | Mutual TLS client certificates |
| Pre-shared Key | `plugins/security/authn/presharedkey` | Static pre-shared key comparison |
| Session | `plugins/security/authn/session` | Server-side sessions (cookie/session store) |
| Noop | `plugins/security/authn/noop` | No-op implementation (default engine for dev/test) |

### Authorization Engines (under `security/authz/`)

| Plugin | Import Path | Engine/Notes |
|--------|------------|--------------|
| Casbin | `plugins/security/authz/casbin` | casbin/casbin |
| Cedar | `plugins/security/authz/cedar` | Cedar policy engine |
| Cerbos | `plugins/security/authz/cerbos` | Cerbos policy engine |
| OPA | `plugins/security/authz/opa` | Open Policy Agent (Rego) |
| Zanzibar | `plugins/security/authz/zanzibar` | ReBAC relation tuples (keto / openfga integration) |
| ACL | `plugins/security/authz/acl` | Static ACL |
| RBAC | `plugins/security/authz/rbac` | Role-based access control |
| AWS IAM | `plugins/security/authz/awsiam` | AWS IAM policy delegation evaluation |
| Noop | `plugins/security/authz/noop` | No-op implementation (default engine for dev/test) |

### Crypto Module

| Plugin | Import Path | Description |
|--------|------------|-------------|
| Crypto | `plugins/security/crypto` | Unified registry for encryption/decryption, hashing, and signing (AES, RSA, SM2/SM3/SM4, HMAC, ECDSA, ECDH) |

## 2. Authentication Adapters

### 2.1 JWT

```go
import jwtPlugin "github.com/tx7do/go-wind-plugins/security/authn/jwt"

authenticator, _ := jwtPlugin.NewAuthenticator(
    jwtPlugin.WithSigningMethod("HS256"),
    jwtPlugin.WithKey("my-secret-key"),
)
```

#### Issuing Tokens

```go
claims := engine.AuthClaims{
    "user_id":  "123",
    "username": "alice",
    "roles":    []string{"admin"},
}

token, _ := authenticator.CreateIdentity(claims)
```

#### Verifying Tokens

```go
claims, err := authenticator.AuthenticateToken(tokenString)
if err != nil {
    // invalid or expired token
}
```

#### YAML Configuration

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

It integrates with external OAuth2/OIDC authorization servers via token introspection (RFC 7662); `AuthenticateToken` returns the standard Claims mapped from the introspection result, and `WithExtraClaimsKeys` allows passing through additional claim fields.

## 3. Authorization Adapters

### 3.1 Casbin RBAC

```go
import casbinPlugin "github.com/tx7do/go-wind-plugins/security/authz/casbin"

enforcer, _ := casbinPlugin.NewEngine(
    context.Background(),
    casbinPlugin.WithFileModel("rbac_model.conf"),
    casbinPlugin.WithPolicyAdapter(policyAdapter),
)
```

#### Permission Model

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

#### Permission Checks

```go
// Check whether the user has permission
allowed, _ := enforcer.IsAuthorized(ctx, subject, action, resource, project)

// Bulk injection after policies are loaded
enforcer.SetPolicies(ctx, policyMap, roleMap)
```

Beyond Casbin, the authorization side also offers engines such as Cedar / Cerbos / OPA (Rego) / Zanzibar (ReBAC, integrating keto and openfga), plus built-in ACL and RBAC implementations; all engines implement the same `authz.Engine` interface and can be created by type through the factory (`engine.NewEngine(ctx, typ, opts...)`).

### 3.2 Middleware Integration

```go
// JWT authentication middleware
authMiddleware := authnMiddleware.Middleware(authenticator,
    authnMiddleware.WithSkipFunc(func(r *http.Request) bool {
        return r.URL.Path == "/login" || r.URL.Path == "/register"
    }),
)

// Authorization middleware
authzMiddleware := authzMiddleware.Middleware(authorizer)

// Combined usage
router.Use(authMiddleware, authzMiddleware)
```

Both HTTP and gRPC provide identically named middleware modules: `transport/http/middleware/authn`, `transport/http/middleware/authz`, `transport/grpc/middleware/authn`, and `transport/grpc/middleware/authz`.

## 4. Passwords and Encryption

Encryption/decryption is provided uniformly by `security/crypto`. It re-exports the five interface families — `Cipher` / `Hasher` / `Signer` / `Verifier` / `KeyExchanger` — from go-utils/crypto, and provides a global registry for registration and lookup by name, just like encoding.

```go
import "github.com/tx7do/go-wind-plugins/security/crypto"

// Built-in implementations: AES, RSA, SM2, SM4, HMAC, SM3/SHA256, ECDSA, ECDH
cipher, _ := crypto.NewAESCipher(key, nil)
encrypted, _ := cipher.Encrypt(plaintext)
decrypted, _ := cipher.Decrypt(encrypted)

// Register and look up by name
crypto.RegisterCipher(cipher)
c := crypto.GetCipher("aes")
```

## 5. TLS/SSL

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

## 6. CORS

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

## 7. Rate Limiting for Security

```go
import ratelimitPlugin "github.com/tx7do/go-wind-plugins/ratelimit/tokenbucket"

limiter := ratelimitPlugin.New(
    ratelimitPlugin.WithRate(100),       // 100 requests
    ratelimitPlugin.WithBurst(50),       // burst 50
    ratelimitPlugin.WithPer("minute"),   // per minute
)
```

## Recent Updates

- **OPA** (`security/authz/opa`): fixed a data race between `SetPolicies` and the read path.

## Related Documents

- [Plugin Configuration System](./plugins-config.md)
- [Rate Limiting Plugins](./plugins-ratelimit.md)
- [Bootstrap Middleware Orchestration](./bootstrap-middleware.md)
