# 声明式中间件编排

go-wind-bootstrap 支持通过 YAML 声明中间件链，无需在代码中手动编写中间件初始化：中间件通过配置文件的 optional 字段启用，参数也通过配置传入。

## 一、中间件配置模型

HTTP / gRPC 中间件定义为 `server.proto` 中 `Middleware` 消息的 optional 字段——**字段出现即启用**（`recovery: {}` 表示以默认参数启用）。注册顺序遵循 proto 字段序，与 YAML 书写顺序无关。

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

## 二、内置中间件

### 2.1 HTTP 中间件

| 中间件 | 配置字段 | 说明 |
|--------|---------|------|
| Recovery | `recovery` | 异常恢复，可选 `stack_trace`（记录堆栈，默认 true） |
| CORS | `cors` | 跨域资源共享：`allowed_origins` / `allowed_methods` / `allowed_headers` / `exposed_headers` / `allow_credentials` / `max_age` |
| Logging | `logging` | 请求日志，可选 `skip_paths` |
| Request ID | `request_id` | 请求 ID 注入，可选 `header_name`（默认 `X-Request-Id`） |
| Tracing | `tracing` | OpenTelemetry 链路追踪，自动使用全局 TracerProvider，无需额外参数 |
| Rate Limit | `rate_limit` | 限流：`rate`（每秒请求数）/ `burst`（突发容量）/ `wait`（等待模式） |
| Timeout | `timeout` | 请求超时：`default_timeout_ms` / `status_code`（默认 503） |

### 2.2 gRPC 中间件

gRPC 中间件均为开关型（消息体为空，出现即启用）：

| 中间件 | 配置字段 | 说明 |
|--------|---------|------|
| Recovery | `recovery` | 异常恢复，返回 Internal 错误 |
| Logging | `logging` | 请求日志 |
| Tracing | `tracing` | OpenTelemetry 链路追踪 |
| Validate | `validate` | 请求校验 |

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

## 三、执行顺序

HTTP 中间件按 proto 字段序注册，形成洋葱模型：

```text
recovery → cors → logging → request_id → tracing → rate_limit → timeout
    ↓ 请求按序穿过每一层
  → → → Handler → → →
  ← ← ← 响应按逆序返回 ← ← ←
```

即 Recovery 最先捕获 panic，Timeout 最贴近业务 Handler。

## 四、自定义中间件

配置面之外的中间件（业务审计、自定义认证等）通过适配器的追加式注册 API 挂载：`RegisterServerSetup` 的回调在配置中间件挂载完成后执行，回调内通过 `srv.Use` 添加自定义中间件、`srv.GET` 等方法注册路由。

```go
package main

import (
    "net/http"

    httpAdapter "github.com/tx7do/go-wind-bootstrap/transport/http"
)

// 自定义中间件：类型为 func(http.Handler) http.Handler
func auditLog(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 记录审计日志...
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

`RegisterServerSetup` 是**追加式**注册，支持多处调用（代码生成器与手写代码共存），回调按注册顺序执行。相关路由注册模式见 [Bootstrap 实战示例](./bootstrap-examples.md)。

## 相关文档

- [Bootstrap 介绍](./bootstrap-intro.md)
- [Bootstrap 配置系统](./bootstrap-config.md)
- [Bootstrap 实战示例](./bootstrap-examples.md)
- [安全与认证插件](./plugins-security.md)
- [限流插件](./plugins-ratelimit.md)
