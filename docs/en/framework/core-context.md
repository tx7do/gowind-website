# Context Propagation

The Context module of go-wind provides request-scoped metadata propagation, including TraceID, UserID, and ColorTag (canary release tag), protected against data races through deep copies.

## 1. Context Design

All request-scoped metadata is stored in a single `Metadata` map, attached to the context via an unexported context key to avoid conflicts with other context values:

```go
// context.go
type metadataKey struct{}        // Unexported key, preventing key collisions

// Metadata is a string key-value map carrying request-scoped attributes
type Metadata map[string]string

// Standard propagation headers (used across service boundaries)
const (
    HeaderTraceID  = "x-wind-trace-id"
    HeaderUserID   = "x-wind-user-id"
    HeaderColorTag = "x-wind-color-tag"
)
```

Two groups of APIs are provided:

| Category | Functions |
|------|------|
| Metadata | `NewMetadataContext` / `MetadataFromContext` / `GetMetadata` |
| Mutation | `WithMetadata` / `WithMetadatas` / `WithoutMetadata` (always operate on a private copy) |
| Convenience wrappers | `WithTraceID` / `GetTraceID`, `WithUserID` / `GetUserID`, `WithColorTag` / `GetColorTag` |

## 2. Propagated Metadata

| Standard Header Key | Set/Get | Description |
|-----|------|------|
| `x-wind-trace-id` | `WithTraceID` / `GetTraceID` | Distributed tracing ID, spanning the entire request chain |
| `x-wind-user-id` | `WithUserID` / `GetUserID` | Current user ID |
| `x-wind-color-tag` | `WithColorTag` / `GetColorTag` | Canary release/coloring tag used for traffic routing |
| Any custom key | `WithMetadata` / `GetMetadata` | Custom metadata |

Beyond the standard headers, `Metadata` can carry arbitrary custom key-value pairs.

## 3. Usage

### 3.1 Setting and Getting

```go
// Set at the request entry point
ctx := wind.WithTraceID(ctx, generateTraceID())
ctx = wind.WithUserID(ctx, "user_123")
ctx = wind.WithColorTag(ctx, "gray")

// Get in business logic
traceID := wind.GetTraceID(ctx)   // "abc-123"
userID := wind.GetUserID(ctx)     // "user_123"

// Custom metadata
ctx = wind.WithMetadata(ctx, "tenant", "acme")
tenant := wind.GetMetadata(ctx, "tenant")
```

### 3.2 Middleware Injection

```go
func TraceMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Extract or generate the TraceID from request headers
        traceID := r.Header.Get("X-Trace-ID")
        if traceID == "" {
            traceID = uuid.New().String()
        }

        // Inject it into the Context
        ctx := wind.WithTraceID(r.Context(), traceID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### 3.3 Cross-Service Propagation

```go
// gRPC client: inject the TraceID into outgoing metadata
func injectTraceID(ctx context.Context) context.Context {
    traceID := wind.GetTraceID(ctx)
    return metadata.AppendToOutgoingContext(ctx, wind.HeaderTraceID, traceID)
}

// gRPC server: extract the TraceID from incoming metadata
func extractTraceID(ctx context.Context) context.Context {
    md, _ := metadata.FromIncomingContext(ctx)
    if vals := md.Get(wind.HeaderTraceID); len(vals) > 0 {
        return wind.WithTraceID(ctx, vals[0])
    }
    return ctx
}
```

## 4. Deep Copy and Concurrency Safety

The `Metadata` stored in a context is always a deep copy: `WithMetadata` / `WithMetadatas` / `WithoutMetadata` clone the entire map before mutating it, preventing data races caused by concurrent modification:

```go
// WithMetadata mutates a private copy (cloneMetadata performs a deep copy)
func WithMetadata(ctx context.Context, key, value string) context.Context {
    existing, _ := MetadataFromContext(ctx)
    copied := cloneMetadata(existing) // deep copy
    copied[key] = value
    return context.WithValue(ctx, metadataKey{}, copied)
}
```

Note: the map returned by `MetadataFromContext` is shared with the context and **must be treated as read-only**; to modify it, use the `WithMetadata` family of functions, which always operate on private copies.

## Related Documentation

- [Core Framework Introduction](./core-intro.md)
- [App Lifecycle Management](./core-lifecycle.md)
- [Transport Abstraction](./core-transport.md)
- [Tracing Plugin](./plugins-tracer.md)
