# 限流插件

go-wind-plugins 提供统一的限流接口 `ratelimit.Limiter`，内置令牌桶、BBR、Sentinel 三种算法。

## 一、Limiter 接口

```go
type Limiter interface {
    // Allow returns immediately. ok is false (with ErrLimited) if the
    // rate limit has been exceeded.
    Allow() (ok bool, err error)

    // Wait blocks until a request is permitted or ctx is cancelled.
    Wait(ctx context.Context) error

    Close() error
}
```

## 二、适配器列表

| 适配器 | 导入路径 | 算法 |
|--------|---------|------|
| Token Bucket | `plugins/ratelimit/tokenbucket` | 令牌桶算法 |
| BBR | `plugins/ratelimit/bbr` | BBR 自适应限流 |
| Sentinel | `plugins/ratelimit/sentinel` | alibaba/sentinel-golang |

## 三、Token Bucket

```go
import tbPlugin "github.com/tx7do/go-wind-plugins/ratelimit/tokenbucket"

// 令牌填充速率与突发容量
limiter, _ := tbPlugin.New(100, 50)
defer limiter.Close()
```

### 检查限流

```go
allowed, err := limiter.Allow()
if !allowed {
    // 返回 429 Too Many Requests
}
```

### 等待通过

```go
// 阻塞等待直到获取令牌或 ctx 取消
err := limiter.Wait(ctx)
if err != nil {
    // 超时
}
```

### YAML 配置

```yaml
ratelimit:
  tokenbucket:
    rate: 100
    burst: 50
```

## 四、BBR（自适应限流）

根据 CPU 负载与滑动窗口 QPS 自动调节，无需预设阈值：

```go
import bbrPlugin "github.com/tx7do/go-wind-plugins/ratelimit/bbr"

limiter := bbrPlugin.New(
    bbrPlugin.WithCPUThreshold(80),          // CPU 阈值（%）
    bbrPlugin.WithWindow(10*time.Second),    // 统计窗口
    bbrPlugin.WithBucketCount(100),          // 窗口桶数
    bbrPlugin.WithMinQPS(800),               // 触发降级的最低 QPS
)
defer limiter.Close()

if ok, _ := limiter.Allow(); !ok {
    // 系统过载，拒绝请求
}

// 请求结束后回报耗时，供 BBR 统计
limiter.Done(rtt)
```

## 五、Sentinel

```go
import sentinelPlugin "github.com/tx7do/go-wind-plugins/ratelimit/sentinel"

// 按资源创建限流器（底层为 alibaba/sentinel-golang）
limiter := sentinelPlugin.New("api.users",
    sentinelPlugin.WithTrafficType(base.Inbound),   // 流量类型
    sentinelPlugin.WithWaitInterval(100*time.Millisecond),
)
defer limiter.Close()

allowed, err := limiter.Allow()

// 需要手动管理 Entry 时（如取 BlockError 详情）：
entry, blockErr := limiter.AllowEntry()
if entry != nil {
    defer limiter.ReleaseEntry(entry)
}
```

流控/熔断等规则通过 Sentinel 原生 API（`sentinel.LoadRules`）加载，插件聚焦资源级的 Limiter 封装。

### YAML 配置

```yaml
ratelimit:
  sentinel:
    flow_rules:
      - resource: "api.users"
        threshold: 100
        stat_interval_ms: 1000
        control_behavior: 0
      - resource: "api.orders"
        threshold: 50
        stat_interval_ms: 1000
    circuit_rules:
      - resource: "service.payment"
        strategy: 2              # 错误比例
        threshold: 0.5
        min_request_amount: 5
        time_window: 10
```

## 六、HTTP 中间件

HTTP/gRPC 传输层内置限流中间件（`transport/http/middleware/ratelimit`、`transport/grpc/middleware/ratelimit`）：

```go
import ratelimitMW "github.com/tx7do/go-wind-plugins/transport/http/middleware/ratelimit"

// 全局限流
router.Use(ratelimitMW.Middleware(limiter))

// 按 Key 限流：KeyFunc 提取维度，factory 按 Key 创建/复用 Limiter
router.Use(ratelimitMW.MiddlewareKeyed(
    func(r *http.Request) string { return r.RemoteAddr },  // 按 IP
    func(key string) ratelimit.Limiter { return newLimiterForKey(key) },
))

// 可选行为
ratelimitMW.WithWait()                                    // 排队等待而非立即拒绝
ratelimitMW.WithSkipFunc(func(r *http.Request) bool {     // 跳过健康检查
    return r.URL.Path == "/health"
})
ratelimitMW.WithErrorHandler(func(w http.ResponseWriter, r *http.Request, err error) {
    w.WriteHeader(http.StatusTooManyRequests)
})
```

## 相关文档

- [插件配置系统](./plugins-config.md)
- [安全与认证插件](./plugins-security.md)
- [声明式中间件编排](./bootstrap-middleware.md)
