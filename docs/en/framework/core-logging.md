# Log Facade Interface

The Log module of go-wind is a minimal logging facade that only defines interfaces without providing implementations. The core ships a nop implementation as a fallback, while concrete adapters (slog adapter, LevelFilter, MultiLogger, etc.) are provided by go-wind-plugins. Adapting logging backends such as slog / zap / zerolog takes only a few lines of glue code.

## 1. The Logger Interface

```go
// log/log.go
type Level int

const (
    LevelDebug Level = iota
    LevelInfo
    LevelWarn
    LevelError
)

type Logger interface {
    // 4 logging methods: the first parameter is always context.Context,
    // allowing logging backends to automatically extract request-scoped
    // metadata such as TraceID
    Debug(ctx context.Context, msg string, args ...any)
    Info(ctx context.Context, msg string, args ...any)
    Warn(ctx context.Context, msg string, args ...any)
    Error(ctx context.Context, msg string, args ...any)

    // Enabled checks the level before constructing expensive arguments,
    // avoiding needless overhead
    Enabled(level Level) bool

    // With returns a child Logger carrying fixed key-value pairs
    With(args ...any) Logger
}
```

Levels run from low to high as `LevelDebug → LevelInfo → LevelWarn → LevelError`, and every `Level` has a readable `String()` representation.

## 2. Usage

### 2.1 Global Logger

```go
import windlog "github.com/tx7do/go-wind/log"

// Package-level convenience functions; the first parameter is ctx
windlog.Info(ctx, "service started", "addr", ":8080")
windlog.Error(ctx, "connection failed", "error", err)
windlog.Debug(ctx, "debug info", "count", 42)
```

### 2.2 Enabled Guard

Check the level before constructing expensive arguments:

```go
logger := windlog.GetLogger()
if logger.Enabled(windlog.LevelDebug) {
    logger.Debug(ctx, "detail", computeExpensiveData())
}
```

### 2.3 Child Logger with Fixed Fields

```go
logger := windlog.With("service", "order", "trace_id", traceID)
logger.Info(ctx, "processing order") // Automatically carries service and trace_id
logger.Error(ctx, "order failed", "error", err)
```

### 2.4 App-Level Logger

```go
app := wind.New(wind.WithLogger(myLogger), ...)

// App-level logger; falls back to the global logger when unset
app.Logger().Info(ctx, "starting")
```

## 3. Global Registration

```go
// log/global.go
var global Logger = &nopLogger{} // Defaults to nop; entries are silently dropped when unset

func SetLogger(l Logger) { ... } // Installs the global logger (concurrency-safe)
func GetLogger() Logger { ... }  // Retrieves the global logger
```

Integrating your logging backend only requires implementing 6 methods and one registration line:

```go
windlog.SetLogger(myZapAdapter{})

// Or use the adapters provided by go-wind-plugins:
//   import pluginslog "github.com/tx7do/go-wind-plugins/log/slog"
//   windlog.SetLogger(pluginslog.New(mySlogLogger))
```

## 4. The NoOp Implementation

The core framework ships a built-in nopLogger, ensuring no panic occurs when no logger has been installed:

```go
type nopLogger struct{}

func (nopLogger) Debug(context.Context, string, ...any) {}
func (nopLogger) Info(context.Context, string, ...any)  {}
func (nopLogger) Warn(context.Context, string, ...any)  {}
func (nopLogger) Error(context.Context, string, ...any) {}
func (nopLogger) Enabled(Level) bool                    { return false }
func (nopLogger) With(...any) Logger                    { return nopLogger{} }
```

## 5. Adapters

| Adapter | Source | Description |
|--------|------|------|
| slog adapter | go-wind-plugins | Adapts the Go standard library slog |
| LevelFilter | go-wind-plugins | Filters by level |
| MultiLogger | go-wind-plugins | Writes to multiple backends simultaneously |
| Custom adaptation | Implement `log.Logger` yourself | zap / zerolog / logrus / kratos log etc. require only a few lines of glue code |

For declarative logging configuration (zap / zerolog rolling logs, etc.), see [The Bootstrap Configuration System](./bootstrap-config.md).

## Related Documentation

- [Core Framework Introduction](./core-intro.md)
- [Log Adapter Plugin](./plugins-log.md)
- [Declarative Bootstrap Introduction](./bootstrap-intro.md)
