# Declarative Middleware Orchestration

go-wind-bootstrap lets you declare middleware chains in YAML without writing middleware initialization by hand in code: middleware is enabled through optional fields of the configuration file, and their parameters are passed in via configuration as well.

## 1. The Middleware Configuration Model

HTTP / gRPC middleware is defined as optional fields of the `Middleware` message in `server.proto` — **the presence of a field enables it** (`recovery: {}` means enabled with default parameters). Registration order follows the proto field order and is independent of the order in which fields are written in YAML.

```yaml
server:
  http:
    addr: ":8080"
    middleware:
      recovery:
        stack_trace: true
      cors:
        allowed_origins:
          - "*"
        allowed_methods:
          - GET
          - POST
      logging:
        skip_paths:
          - /health
      request_id:
        header_name: X-Request-ID
```

## 2. Built-in Middleware

### 2.1 HTTP Middleware

| Middleware | Configuration Field | Description |
|--------|---------|------|
| Recovery | `recovery` | Panic recovery, optional `stack_trace` (log the stack, default true) |
| CORS | `cors` | Cross-origin resource sharing: `allowed_origins` / `allowed_methods` / `allowed_headers` / `exposed_headers` / `allow_credentials` / `max_age` |
| Logging | `logging` | Request logging, optional `skip_paths` |
| Request ID | `request_id` | Request ID injection, optional `header_name` (default `X-Request-Id`) |
| Tracing | `tracing` | OpenTelemetry distributed tracing; uses the global TracerProvider automatically, no extra parameters |
| Rate Limit | `rate_limit` | Rate limiting: `rate` (requests per second) / `burst` (burst capacity) / `wait` (waiting mode) |
| Timeout | `timeout` | Request timeout: `default_timeout_ms` / `status_code` (default 503) |

### 2.2 gRPC Middleware

gRPC middleware are all switch-type (empty message body; presence enables them):

| Middleware | Configuration Field | Description |
|--------|---------|------|
| Recovery | `recovery` | Panic recovery, returns an Internal error |
| Logging | `logging` | Request logging |
| Tracing | `tracing` | OpenTelemetry distributed tracing |
| Validate | `validate` | Request validation |

```yaml
server:
  grpc:
    addr: ":9000"
    middleware:
      recovery: {}
      logging: {}
      tracing: {}
      validate: {}
```

## 3. Execution Order

HTTP middleware is registered in proto field order, forming the onion model:

```text
recovery → cors → logging → request_id → tracing → rate_limit → timeout
    ↓ requests pass through each layer in order
  → → → Handler → → →
  ← ← ← responses return in reverse order ← ← ←
```

That is, Recovery catches panics first, and Timeout sits closest to the business Handler.

## 4. Custom Middleware

Middleware beyond the configuration surface (business auditing, custom authentication, etc.) is attached via the adapter's append-style registration API: callbacks registered with `RegisterServerSetup` run after the configured middleware has been mounted; inside the callback you can add custom middleware via `srv.Use` and register routes with methods such as `srv.GET`.

```go
package main

import (
    "net/http"

    httpAdapter "github.com/tx7do/go-wind-bootstrap/transport/http"
)

// A custom middleware with type func(http.Handler) http.Handler
func auditLog(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Write audit logs...
        next.ServeHTTP(w, r)
    })
}

func init() {
    httpAdapter.RegisterServerSetup(func(srv *httpAdapter.Server) {
        srv.Use(auditLog)
        srv.GET("/health", func(w http.ResponseWriter, r *http.Request) {
            w.WriteHeader(http.StatusOK)
        })
    })
}
```

`RegisterServerSetup` registration is **append-style** and supports multiple call sites (code generators and hand-written code coexist); callbacks execute in registration order. For related route registration patterns, see [Bootstrap Practical Examples](./bootstrap-examples.md).

## Related Documentation

- [Bootstrap Introduction](./bootstrap-intro.md)
- [The Bootstrap Configuration System](./bootstrap-config.md)
- [Bootstrap Practical Examples](./bootstrap-examples.md)
- [Security and Authentication Plugins](./plugins-security.md)
- [Rate Limiting Plugin](./plugins-ratelimit.md)
