# 声明式中间件编排

go-wind-bootstrap 支持通过 YAML 声明中间件链，无需在代码中手动编排。

## 一、中间件配置

```yaml
server:
  http:
    addr: ":8080"
    middleware:                    # 中间件按顺序执行
      - cors
      - logger
      - recovery
      - request_id
      - tracing
      - rate_limit
      - jwt_auth
      - metrics
```

## 二、内置中间件

### 2.1 基础中间件

| 名称 | 说明 | 配置前缀 |
|------|------|---------|
| `cors` | 跨域资源共享 | `middleware.cors` |
| `logger` | 请求日志 | `middleware.logger` |
| `recovery` | Panic 恢复 | `middleware.recovery` |
| `request_id` | 请求 ID 注入 | `middleware.request_id` |
| `gzip` | 响应压缩 | `middleware.gzip` |

### 2.2 安全中间件

| 名称 | 说明 | 配置前缀 |
|------|------|---------|
| `jwt_auth` | JWT 认证 | `middleware.jwt_auth` |
| `casbin` | RBAC 授权 | `middleware.casbin` |
| `rate_limit` | 限流 | `middleware.rate_limit` |
| `helmet` | 安全头 | `middleware.helmet` |

### 2.3 可观测中间件

| 名称 | 说明 | 配置前缀 |
|------|------|---------|
| `tracing` | 链路追踪 | `middleware.tracing` |
| `metrics` | 指标采集 | `middleware.metrics` |
| `prometheus` | Prometheus 指标 | `middleware.prometheus` |

## 三、中间件配置

### 3.1 CORS

```yaml
middleware:
  cors:
    allow_origins:
      - "https://app.example.com"
      - "https://admin.example.com"
    allow_methods: [GET, POST, PUT, DELETE, OPTIONS]
    allow_headers: [Authorization, Content-Type, X-Trace-ID]
    allow_credentials: true
    expose_headers: [X-Total-Count]
    max_age: 86400
```

### 3.2 Logger

```yaml
middleware:
  logger:
    format: json              # json | text
    skip_paths:               # 不记录的路径
      - /health
      - /metrics
    output: stdout
    fields:                   # 额外字段
      service: my-service
```

### 3.3 Recovery

```yaml
middleware:
  recovery:
    stack_all: false          # 是否打印所有 goroutine 堆栈
    stack_size: 4096          # 堆栈大小
    log_level: error
```

### 3.4 Request ID

```yaml
middleware:
  request_id:
    header: X-Request-ID      # 请求头名称
    generate: true            # 自动生成
    format: uuid              # uuid | nanoid | shortid
```

### 3.5 JWT Auth

```yaml
middleware:
  jwt_auth:
    signing_method: HS256
    key: ${JWT_SECRET}
    skip_paths:               # 不需要认证的路径
      - /api/login
      - /api/register
      - /health
    token_lookup: header:Authorization  # header:xxx | query:xxx | cookie:xxx
    token_prefix: Bearer
```

### 3.6 Rate Limit

```yaml
middleware:
  rate_limit:
    strategy: token_bucket    # token_bucket | sliding_window
    rate: 100
    burst: 50
    key_type: ip              # ip | user_id | path
    skip_paths:
      - /health
      - /metrics
```

### 3.7 Tracing

```yaml
middleware:
  tracing:
    tracer: jaeger
    skip_paths:
      - /health
      - /metrics
```

### 3.8 Metrics

```yaml
middleware:
  metrics:
    path: /metrics
    namespace: myapp
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]  # 延迟分桶
```

## 四、自定义中间件

### 4.1 注册中间件

```go
// middleware/audit_log.go
package audit

import (
    "net/http"
    "github.com/tx7do/go-wind-bootstrap/middleware"
)

func AuditLog(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 记录审计日志
        auditLogger.Log(r.Method, r.URL.Path, r.RemoteAddr)
        next.ServeHTTP(w, r)
    })
}

func init() {
    middleware.Register("audit_log", AuditLog)
}
```

### 4.2 在 YAML 中引用

```yaml
server:
  http:
    middleware:
      - cors
      - jwt_auth
      - audit_log              # 自定义中间件
```

### 4.3 带配置的中间件

```go
type AuditConfig struct {
    LogLevel  string   `yaml:"log_level"`
    SkipPaths []string `yaml:"skip_paths"`
}

func AuditLog(config AuditConfig) middleware.Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            if contains(config.SkipPaths, r.URL.Path) {
                next.ServeHTTP(w, r)
                return
            }
            // 审计逻辑
            next.ServeHTTP(w, r)
        })
    }
}

func init() {
    middleware.RegisterWithConfig("audit_log", func(raw map[string]interface{}) middleware.Middleware {
        cfg := AuditConfig{}
        mapstructure.Decode(raw, &cfg)
        return AuditLog(cfg)
    })
}
```

```yaml
middleware:
  audit_log:
    log_level: info
    skip_paths:
      - /health
```

## 五、中间件执行顺序

```yaml
server:
  http:
    middleware:
      - recovery           # 1. 最外层：捕获 panic
      - cors               # 2. CORS 预检
      - request_id         # 3. 注入 RequestID
      - tracing            # 4. 创建 Span
      - logger             # 5. 记录请求
      - rate_limit         # 6. 限流检查
      - jwt_auth           # 7. 身份认证
      - audit_log          # 8. 审计日志
      # → → → Handler → → →
      # ← ← ← Handler 返回 ← ← ←
      # 8. 审计日志后处理
      # 7. JWT 无后处理
      # 6. 限流无后处理
      # 5. Logger 记录响应
      # 4. Span.End()
      # 3. RequestID 无后处理
      # 2. CORS 无后处理
      # 1. Recovery 无后处理
```

**洋葱模型**：请求按声明顺序穿过每一层，响应按逆序返回。

## 六、路由级中间件

```yaml
routes:
  - path: /api/public/*
    middleware: [cors, logger]
  - path: /api/admin/*
    middleware: [cors, logger, jwt_auth, casbin]   # Admin 需要认证+授权
  - path: /api/internal/*
    middleware: [cors, logger, ip_whitelist]        # 内部 API 需要白名单
```

## 相关文档

- [Bootstrap 介绍](./bootstrap-intro.md)
- [Bootstrap SPI 机制](./bootstrap-spi.md)
- [安全与认证插件](./plugins-security.md)
- [限流插件](./plugins-ratelimit.md)
