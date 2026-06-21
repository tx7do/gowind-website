# 限流插件

go-wind-plugins 提供统一的限流接口，支持令牌桶、滑动窗口、Sentinel 等算法。

## 一、Limiter 接口

```go
type Limiter interface {
    Allow(ctx context.Context, key string) (bool, error)
    Wait(ctx context.Context, key string) error
    Close() error
}
```

## 二、适配器列表

| 适配器 | 导入路径 | 算法 |
|--------|---------|------|
| Token Bucket | `plugins/ratelimit/tokenbucket` | 令牌桶 |
| Sliding Window | `plugins/ratelimit/slidingwindow` | 滑动窗口 |
| Sentinel | `plugins/ratelimit/sentinel` | 阿里 Sentinel 多维度限流 |
| Redis Limiter | `plugins/ratelimit/redis` | 基于 Redis 的分布式限流 |

## 三、Token Bucket

```go
import tbPlugin "github.com/tx7do/go-wind-plugins/ratelimit/tokenbucket"

limiter := tbPlugin.New(
    tbPlugin.WithRate(100),        // 每秒 100 个令牌
    tbPlugin.WithBurst(50),        // 突发容量 50
)
```

### 检查限流

```go
allowed, _ := limiter.Allow(ctx, "user:123")
if !allowed {
    // 返回 429 Too Many Requests
}
```

### 等待通过

```go
// 阻塞等待直到获取令牌或超时
err := limiter.Wait(ctx, "user:123")
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
    key_type: ip               # ip | user_id | global
```

## 四、Sliding Window

```go
import swPlugin "github.com/tx7do/go-wind-plugins/ratelimit/slidingwindow"

limiter := swPlugin.New(
    swPlugin.WithWindow(60*time.Second),  // 窗口 60 秒
    swPlugin.WithLimit(1000),              // 每窗口 1000 次
)
```

### YAML 配置

```yaml
ratelimit:
  slidingwindow:
    window: 60s
    limit: 1000
    key_type: ip
```

## 五、Sentinel

```go
import sentinelPlugin "github.com/tx7do/go-wind-plugins/ratelimit/sentinel"

// 流控规则
sentinelPlugin.AddFlowRule(
    sentinelPlugin.WithResource("api.users"),
    sentinelPlugin.WithThreshold(100),       // 阈值
    sentinelPlugin.WithStatIntervalMs(1000), // 统计窗口
    sentinelPlugin.WithControlBehavior(0),   // 0=直接拒绝 1=匀速等待
)

// 熔断规则
sentinelPlugin.AddCircuitRule(
    sentinelPlugin.WithResource("service.payment"),
    sentinelPlugin.WithStrategy(2),          // 2=错误比例
    sentinelPlugin.WithThreshold(0.5),       // 错误率 > 50%
    sentinelPlugin.WithMinRequestAmount(5),  // 最小请求数
    sentinelPlugin.WithTimeWindow(10),       // 熔断 10 秒
)
```

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
    system_rules:
      - metric: cpu_usage        # 系统级
        threshold: 0.8
```

## 六、Redis 分布式限流

```go
import redisRLPlugin "github.com/tx7do/go-wind-plugins/ratelimit/redis"

limiter := redisRLPlugin.New(
    redisRLPlugin.WithAddr("localhost:6379"),
    redisRLPlugin.WithRate(100),
    redisRLPlugin.WithBurst(50),
    redisRLPlugin.WithPrefix("ratelimit:"),
)
```

### YAML 配置

```yaml
ratelimit:
  redis:
    addr: "localhost:6379"
    rate: 100
    burst: 50
    prefix: "ratelimit:"
    key_type: ip
```

## 七、HTTP 中间件

```go
import ratelimitMW "github.com/tx7do/go-wind-plugins/ratelimit/middleware"

// 全局限流
router.Use(ratelimitMW.Middleware(limiter))

// 路由级限流
router.GET("/api/users", ratelimitMW.Handler(limiter)(userHandler))
```

### 不同 Key 策略

```go
// 按 IP 限流
mw := ratelimitMW.Middleware(limiter, ratelimitMW.WithKeyFunc(func(r *http.Request) string {
    return r.RemoteAddr
}))

// 按用户限流
mw := ratelimitMW.Middleware(limiter, ratelimitMW.WithKeyFunc(func(r *http.Request) string {
    return wind.UserID(r.Context())
}))

// 按 API 路径限流
mw := ratelimitMW.Middleware(limiter, ratelimitMW.WithKeyFunc(func(r *http.Request) string {
    return r.URL.Path
}))
```

## 相关文档

- [插件配置系统](./plugins-config.md)
- [安全与认证插件](./plugins-security.md)
- [声明式中间件编排](./bootstrap-middleware.md)
