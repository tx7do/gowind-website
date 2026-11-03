# Rate Limiting Plugins

go-wind-plugins provides the unified rate limiting interface `ratelimit.Limiter`, with three built-in algorithms: token bucket, BBR, and Sentinel.

## 1. The Limiter Interface

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

## 2. Adapter List

| Adapter | Import Path | Algorithm |
|---------|------------|-----------|
| Token Bucket | `plugins/ratelimit/tokenbucket` | Token bucket algorithm |
| BBR | `plugins/ratelimit/bbr` | BBR adaptive rate limiting |
| Sentinel | `plugins/ratelimit/sentinel` | alibaba/sentinel-golang |

## 3. Token Bucket

```go
import tbPlugin "github.com/tx7do/go-wind-plugins/ratelimit/tokenbucket"

// Token refill rate and burst capacity
limiter, _ := tbPlugin.New(100, 50)
defer limiter.Close()
```

### Checking the Rate Limit

```go
allowed, err := limiter.Allow()
if !allowed {
    // return 429 Too Many Requests
}
```

### Waiting for a Permit

```go
// Blocks until a token is acquired or ctx is cancelled
err := limiter.Wait(ctx)
if err != nil {
    // timed out
}
```

### YAML Configuration

```yaml
ratelimit:
  tokenbucket:
    rate: 100
    burst: 50
```

## 4. BBR (Adaptive Rate Limiting)

Adjusts automatically based on CPU load and sliding-window QPS, with no preset threshold required:

```go
import bbrPlugin "github.com/tx7do/go-wind-plugins/ratelimit/bbr"

limiter := bbrPlugin.New(
    bbrPlugin.WithCPUThreshold(80),          // CPU threshold (%)
    bbrPlugin.WithWindow(10*time.Second),    // statistics window
    bbrPlugin.WithBucketCount(100),          // number of window buckets
    bbrPlugin.WithMinQPS(800),               // minimum QPS to trigger degradation
)
defer limiter.Close()

if ok, _ := limiter.Allow(); !ok {
    // system overloaded, reject the request
}

// Report the elapsed time after the request finishes, for BBR statistics
limiter.Done(rtt)
```

## 5. Sentinel

```go
import sentinelPlugin "github.com/tx7do/go-wind-plugins/ratelimit/sentinel"

// Create a limiter per resource (backed by alibaba/sentinel-golang)
limiter := sentinelPlugin.New("api.users",
    sentinelPlugin.WithTrafficType(base.Inbound),   // traffic type
    sentinelPlugin.WithWaitInterval(100*time.Millisecond),
)
defer limiter.Close()

allowed, err := limiter.Allow()

// When you need to manage the Entry manually (e.g. to inspect BlockError details):
entry, blockErr := limiter.AllowEntry()
if entry != nil {
    defer limiter.ReleaseEntry(entry)
}
```

Flow-control and circuit breaking rules are loaded through the native Sentinel API (`sentinel.LoadRules`); the plugin focuses on the resource-level Limiter wrapper.

### YAML Configuration

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
        strategy: 2              # error ratio
        threshold: 0.5
        min_request_amount: 5
        time_window: 10
```

## 6. HTTP Middleware

The HTTP/gRPC transport layers ship built-in rate limiting middleware (`transport/http/middleware/ratelimit`, `transport/grpc/middleware/ratelimit`):

```go
import ratelimitMW "github.com/tx7do/go-wind-plugins/transport/http/middleware/ratelimit"

// Global rate limiting
router.Use(ratelimitMW.Middleware(limiter))

// Keyed rate limiting: KeyFunc extracts the dimension, factory creates/reuses a Limiter per key
router.Use(ratelimitMW.MiddlewareKeyed(
    func(r *http.Request) string { return r.RemoteAddr },  // per IP
    func(key string) ratelimit.Limiter { return newLimiterForKey(key) },
))

// Optional behaviors
ratelimitMW.WithWait()                                    // queue instead of rejecting immediately
ratelimitMW.WithSkipFunc(func(r *http.Request) bool {     // skip health checks
    return r.URL.Path == "/health"
})
ratelimitMW.WithErrorHandler(func(w http.ResponseWriter, r *http.Request, err error) {
    w.WriteHeader(http.StatusTooManyRequests)
})
```

## Related Documents

- [Plugin Configuration System](./plugins-config.md)
- [Security and Authentication Plugins](./plugins-security.md)
- [Declarative Middleware Orchestration](./bootstrap-middleware.md)
