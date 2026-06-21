# Log 门面接口

go-wind 的 Log 模块是一个极简日志门面，只定义接口不提供实现。具体实现由 go-wind-plugins 的适配器提供（Zap、Zerolog、Logrus 等）。

## 一、Logger 接口

```go
// log/log.go
type Level int

const (
    LevelDebug Level = iota
    LevelInfo
    LevelWarn
    LevelError
    LevelFatal
)

type Logger interface {
    Log(level Level, msg string, fields ...Field)
    Enabled(level Level) bool
    With(fields ...Field) Logger
}

type Field struct {
    Key   string
    Value interface{}
}
```

## 二、使用方式

### 2.1 直接使用全局 Logger

```go
import "github.com/tx7do/go-wind/log"

func main() {
    log.Info("service started", log.String("addr", ":8080"))
    log.Error("connection failed", log.Err(err))
    log.Debug("debug info", log.Int("count", 42))
}
```

### 2.2 字段辅助函数

```go
log.String("key", "value")
log.Int("count", 42)
log.Float64("ratio", 0.95)
log.Bool("enabled", true)
log.Err(err)
log.Duration("elapsed", time.Since(start))
log.Any("data", customValue)
```

### 2.3 带上下文的 Logger

```go
logger := log.With(log.String("service", "order"), log.String("trace_id", traceID))
logger.Info("processing order")     // 自动携带 service 和 trace_id
logger.Error("order failed", log.Err(err))
```

## 三、全局注册

```go
// log/global.go
var global Logger = &nopLogger{}

func SetLogger(l Logger) {
    global = l
}

func Default() Logger {
    return global
}
```

插件通过 init 自动注册：

```go
// go-wind-plugins/log/zap/logger.go
func init() {
    log.SetLogger(NewZapLogger())
}
```

## 四、NoOp 实现

核心框架内置一个空实现的 Logger，确保在没有导入任何日志插件时不会 panic：

```go
type nopLogger struct{}

func (n *nopLogger) Log(level Level, msg string, fields ...Field) {}
func (n *nopLogger) Enabled(level Level) bool { return false }
func (n *nopLogger) With(fields ...Field) Logger { return n }
```

## 五、适配器列表

| 适配器 | 插件路径 | 说明 |
|--------|---------|------|
| Zap | `plugins/log/zap` | 高性能结构化日志 |
| Zerolog | `plugins/log/zerolog` | 零分配 JSON 日志 |
| Logrus | `plugins/log/logrus` | 流行结构化日志 |
| Loki | `plugins/log/loki` | Grafana Loki 远程日志 |
| Sentry | `plugins/log/sentry` | Sentry 错误追踪 |
| CloudWatch | `plugins/log/cloudwatch` | AWS CloudWatch |
| Aliyun SLS | `plugins/log/aliyun_sls` | 阿里云日志服务 |

## 相关文档

- [核心框架介绍](./core-intro.md)
- [日志适配插件](./plugins-log.md)
- [声明式启动器介绍](./bootstrap-intro.md)
