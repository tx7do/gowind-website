# Context 传播

go-wind 的 Context 模块提供请求级元数据传播，包括 TraceID、UserID、ColorTag（灰度标识）等，通过深拷贝防止数据竞争。

## 一、Context 设计

```go
// context.go
type contextKey string

const (
    TraceIDKey contextKey = "trace_id"
    UserIDKey  contextKey = "user_id"
    MetadataKey contextKey = "metadata"
)

// 设置和获取 TraceID
func WithTraceID(ctx context.Context, traceID string) context.Context {
    return context.WithValue(ctx, TraceIDKey, traceID)
}

func TraceID(ctx context.Context) string {
    if v, ok := ctx.Value(TraceIDKey).(string); ok {
        return v
    }
    return ""
}
```

## 二、传播的元数据

| Key | 类型 | 说明 |
|-----|------|------|
| `trace_id` | string | 链路追踪 ID，贯穿整个请求链路 |
| `user_id` | string | 当前用户 ID |
| `metadata` | `map[string]string` | 自定义元数据 |
| `color_tag` | string | 灰度/染色标识，用于流量路由 |

## 三、使用方式

### 3.1 设置和获取

```go
// 在请求入口设置
ctx := wind.WithTraceID(ctx, generateTraceID())
ctx = wind.WithUserID(ctx, "user_123")

// 在业务逻辑中获取
traceID := wind.TraceID(ctx)   // "abc-123"
userID := wind.UserID(ctx)     // "user_123"
```

### 3.2 中间件注入

```go
func TraceMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 从请求头提取或生成 TraceID
        traceID := r.Header.Get("X-Trace-ID")
        if traceID == "" {
            traceID = uuid.New().String()
        }

        // 注入到 Context
        ctx := wind.WithTraceID(r.Context(), traceID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### 3.3 跨服务传播

```go
// gRPC 客户端：将 TraceID 注入 metadata
func injectTraceID(ctx context.Context) context.Context {
    traceID := wind.TraceID(ctx)
    return metadata.AppendToOutgoingContext(ctx, "x-trace-id", traceID)
}

// gRPC 服务端：从 metadata 提取 TraceID
func extractTraceID(ctx context.Context) context.Context {
    md, _ := metadata.FromIncomingContext(ctx)
    if vals := md.Get("x-trace-id"); len(vals) > 0 {
        return wind.WithTraceID(ctx, vals[0])
    }
    return ctx
}
```

## 四、深拷贝与并发安全

```go
// Context 的 metadata 使用深拷贝，防止并发修改
func WithMetadata(ctx context.Context, key, value string) context.Context {
    existing := getMetadata(ctx)
    // 深拷贝
    copied := make(map[string]string, len(existing)+1)
    for k, v := range existing {
        copied[k] = v
    }
    copied[key] = value
    return context.WithValue(ctx, MetadataKey, copied)
}
```

## 相关文档

- [核心框架介绍](./core-intro.md)
- [App 生命周期管理](./core-lifecycle.md)
- [Transport 抽象](./core-transport.md)
- [链路追踪插件](./plugins-tracer.md)
