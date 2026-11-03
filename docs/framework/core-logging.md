# Log 门面接口

go-wind 的 Log 模块是一个极简日志门面，只定义接口不提供实现。核心内置 nop 空实现兜底，具体适配器（slog adapter、LevelFilter、MultiLogger 等）由 go-wind-plugins 提供，适配 slog / zap / zerolog 等日志后端只需几行胶水代码。

## 一、Logger 接口

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
    // 4 个日志方法：第一个参数恒为 context.Context，
    // 便于日志后端自动提取 TraceID 等请求级元数据
    Debug(ctx context.Context, msg string, args ...any)
    Info(ctx context.Context, msg string, args ...any)
    Warn(ctx context.Context, msg string, args ...any)
    Error(ctx context.Context, msg string, args ...any)

    // Enabled 在构造昂贵参数前检查级别，避免无谓开销
    Enabled(level Level) bool

    // With 返回携带固定键值对的子 Logger
    With(args ...any) Logger
}
```

级别从低到高为 `LevelDebug → LevelInfo → LevelWarn → LevelError`，每个 `Level` 都有可读的 `String()` 表示。

## 二、使用方式

### 2.1 全局 Logger

```go
import windlog "github.com/tx7do/go-wind/log"

// 包级便捷函数，第一个参数为 ctx
windlog.Info(ctx, "service started", "addr", ":8080")
windlog.Error(ctx, "connection failed", "error", err)
windlog.Debug(ctx, "debug info", "count", 42)
```

### 2.2 Enabled 守卫

昂贵参数构造前先检查级别：

```go
logger := windlog.GetLogger()
if logger.Enabled(windlog.LevelDebug) {
    logger.Debug(ctx, "detail", computeExpensiveData())
}
```

### 2.3 带固定字段的子 Logger

```go
logger := windlog.With("service", "order", "trace_id", traceID)
logger.Info(ctx, "processing order") // 自动携带 service 和 trace_id
logger.Error(ctx, "order failed", "error", err)
```

### 2.4 App 级别日志器

```go
app := wind.New(wind.WithLogger(myLogger), ...)

// App 级别日志器，未设置时回退到全局 logger
app.Logger().Info(ctx, "starting")
```

## 三、全局注册

```go
// log/global.go
var global Logger = &nopLogger{} // 默认 nop，未设置时静默丢弃

func SetLogger(l Logger) { ... } // 安装全局 logger（并发安全）
func GetLogger() Logger { ... }  // 获取全局 logger
```

接入你的日志后端只需实现 6 个方法，一行注册：

```go
windlog.SetLogger(myZapAdapter{})

// 或使用 go-wind-plugins 提供的适配器：
//   import pluginslog "github.com/tx7do/go-wind-plugins/log/slog"
//   windlog.SetLogger(pluginslog.New(mySlogLogger))
```

## 四、NoOp 实现

核心框架内置 nopLogger，确保在没有安装任何日志器时不会 panic：

```go
type nopLogger struct{}

func (nopLogger) Debug(context.Context, string, ...any) {}
func (nopLogger) Info(context.Context, string, ...any)  {}
func (nopLogger) Warn(context.Context, string, ...any)  {}
func (nopLogger) Error(context.Context, string, ...any) {}
func (nopLogger) Enabled(Level) bool                    { return false }
func (nopLogger) With(...any) Logger                    { return nopLogger{} }
```

## 五、适配器

| 适配器 | 来源 | 说明 |
|--------|------|------|
| slog adapter | go-wind-plugins | 适配 Go 标准库 slog |
| LevelFilter | go-wind-plugins | 按级别过滤 |
| MultiLogger | go-wind-plugins | 多后端同时输出 |
| 自定义适配 | 自行实现 `log.Logger` | zap / zerolog / logrus / kratos log 等只需几行胶水代码 |

声明式日志配置（zap / zerolog 滚动日志等）见 [Bootstrap 配置系统](./bootstrap-config.md)。

## 相关文档

- [核心框架介绍](./core-intro.md)
- [日志适配插件](./plugins-log.md)
- [声明式启动器介绍](./bootstrap-intro.md)
