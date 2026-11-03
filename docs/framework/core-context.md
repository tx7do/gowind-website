# Context 传播

go-wind 的 Context 模块提供请求级元数据传播，包括 TraceID、UserID、ColorTag（灰度标识）等，通过深拷贝防止数据竞争。

## 一、Context 设计

所有请求级元数据统一存放在一个 `Metadata` map 中，通过未导出的 context key 附加到 context 上，避免与其他 context 值冲突：

```go
// context.go
type metadataKey struct{}        // 未导出 key，杜绝键冲突

// Metadata 是字符串键值对，承载请求级属性
type Metadata map[string]string

// 标准传播头（跨服务边界使用）
const (
    HeaderTraceID  = "x-wind-trace-id"
    HeaderUserID   = "x-wind-user-id"
    HeaderColorTag = "x-wind-color-tag"
)
```

提供两组 API：

| 类别 | 函数 |
|------|------|
| 元数据 | `NewMetadataContext` / `MetadataFromContext` / `GetMetadata` |
| 修改 | `WithMetadata` / `WithMetadatas` / `WithoutMetadata`（始终在私有副本上操作） |
| 便捷封装 | `WithTraceID` / `GetTraceID`、`WithUserID` / `GetUserID`、`WithColorTag` / `GetColorTag` |

## 二、传播的元数据

| 标准头 Key | 设置/获取 | 说明 |
|-----|------|------|
| `x-wind-trace-id` | `WithTraceID` / `GetTraceID` | 链路追踪 ID，贯穿整个请求链路 |
| `x-wind-user-id` | `WithUserID` / `GetUserID` | 当前用户 ID |
| `x-wind-color-tag` | `WithColorTag` / `GetColorTag` | 灰度/染色标识，用于流量路由 |
| 自定义任意 key | `WithMetadata` / `GetMetadata` | 自定义元数据 |

除标准头外，`Metadata` 可携带任意自定义键值对。

## 三、使用方式

### 3.1 设置和获取

```go
// 在请求入口设置
ctx := wind.WithTraceID(ctx, generateTraceID())
ctx = wind.WithUserID(ctx, "user_123")
ctx = wind.WithColorTag(ctx, "gray")

// 在业务逻辑中获取
traceID := wind.GetTraceID(ctx)   // "abc-123"
userID := wind.GetUserID(ctx)     // "user_123"

// 自定义元数据
ctx = wind.WithMetadata(ctx, "tenant", "acme")
tenant := wind.GetMetadata(ctx, "tenant")
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
// gRPC 客户端：将 TraceID 注入 outgoing metadata
func injectTraceID(ctx context.Context) context.Context {
    traceID := wind.GetTraceID(ctx)
    return metadata.AppendToOutgoingContext(ctx, wind.HeaderTraceID, traceID)
}

// gRPC 服务端：从 incoming metadata 提取 TraceID
func extractTraceID(ctx context.Context) context.Context {
    md, _ := metadata.FromIncomingContext(ctx)
    if vals := md.Get(wind.HeaderTraceID); len(vals) > 0 {
        return wind.WithTraceID(ctx, vals[0])
    }
    return ctx
}
```

## 四、深拷贝与并发安全

context 中存放的 `Metadata` 始终是深拷贝副本：`WithMetadata` / `WithMetadatas` / `WithoutMetadata` 修改前先克隆整个 map，防止并发修改引发 data race：

```go
// WithMetadata 在私有副本上修改（cloneMetadata 深拷贝）
func WithMetadata(ctx context.Context, key, value string) context.Context {
    existing, _ := MetadataFromContext(ctx)
    copied := cloneMetadata(existing) // 深拷贝
    copied[key] = value
    return context.WithValue(ctx, metadataKey{}, copied)
}
```

注意：`MetadataFromContext` 返回的 map 与 context 共享，**必须只读**；需要修改时使用 `WithMetadata` 系列函数，它们总是操作私有副本。

## 相关文档

- [核心框架介绍](./core-intro.md)
- [App 生命周期管理](./core-lifecycle.md)
- [Transport 抽象](./core-transport.md)
- [链路追踪插件](./plugins-tracer.md)
