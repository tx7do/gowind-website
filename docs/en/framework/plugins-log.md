# Logging Adapter Plugins

go-wind-plugins provides a variety of logging adapters implementing the `log.Logger` interface. Each adapter wraps the native logger of its logging engine, so business code goes through the unified `log.Logger` facade.

## 1. Adapter List

| Adapter | Import Path | Engine |
|---------|------------|--------|
| Zap | `plugins/log/zap` | uber-go/zap |
| Zerolog | `plugins/log/zerolog` | rs/zerolog |
| Logrus | `plugins/log/logrus` | sirupsen/logrus |
| Phuslu | `plugins/log/phuslu` | phuslu/log |
| Charm | `plugins/log/charm` | charmbracelet/log |
| Glog | `plugins/log/glog` | golang/glog |
| Hclog | `plugins/log/hclog` | hashicorp/go-hclog |
| Loki | `plugins/log/loki` | Grafana Loki |
| Fluent | `plugins/log/fluent` | Fluentd |
| Sentry | `plugins/log/sentry` | getsentry/sentry-go |
| CloudWatch | `plugins/log/cloudwatch` | AWS CloudWatch Logs |
| Aliyun SLS | `plugins/log/aliyun` | Alibaba Cloud Log Service SLS |
| Tencent CLS | `plugins/log/tencent` | Tencent Cloud Log Service CLS |

The `log/` root package also ships with: a **slog adapter** (the default Logger), a **LevelFilter** log-level filter, and **MultiLogger**, a multiplexing logger that writes one log entry to multiple backends simultaneously.

## 2. Zap Adapter

### 2.1 Basic Usage

```go
import (
    "context"

    zap "go.uber.org/zap"
    zaplog "github.com/tx7do/go-wind-plugins/log/zap"
)

// Build the native zap.Logger first, then wrap it into the unified log.Logger
zlog, _ := zap.NewProduction()
logger := zaplog.NewZapLogger(zlog)
defer logger.Close()

logger.Info(context.Background(), "service started", "port", 8080)
logger.With("module", "auth").Error(context.Background(), "token expired")
```

### 2.2 YAML Configuration (bootstrap wiring)

### 2.3 YAML Configuration

```yaml
log:
  zap:
    level: info
    format: json
    output: stdout
    # file logging
    file:
      enabled: true
      filename: logs/app.log
      max_size: 100        # MB
      max_backups: 7
      max_age: 30          # days
      compress: true
```

## 3. Zerolog Adapter

```go
import _ "github.com/tx7do/go-wind-plugins/log/zerolog"
```

```yaml
log:
  zerolog:
    level: info
    format: json           # zerolog defaults to JSON
    output: stdout
    time_format: rfc3339   # unix | rfc3339 | rfc3339nano
    no_color: false
```

Highlights:
- Zero allocations, extremely high performance
- Native JSON output
- Well suited for high-throughput scenarios

## 4. Logrus Adapter

```go
import _ "github.com/tx7do/go-wind-plugins/log/logrus"
```

```yaml
log:
  logrus:
    level: info
    format: text           # text | json
    output: stdout
    report_caller: true
    full_timestamp: true
```

Highlights:
- The richest community ecosystem
- Extensible via the hook mechanism
- The best compatibility

## 5. Loki Remote Logging

```go
import _ "github.com/tx7do/go-wind-plugins/log/loki"
```

```yaml
log:
  loki:
    level: info
    url: "http://loki:3100/loki/api/v1/push"
    labels:
      service: my-service
      env: production
    batch_size: 100
    batch_timeout: 5s
    buffer_size: 10000
```

Highlights:
- Pushes logs directly to Grafana Loki
- Supports label-based filtering
- Batches pushes to reduce network overhead

## 6. Sentry Error Tracking

```go
import _ "github.com/tx7do/go-wind-plugins/log/sentry"
```

```yaml
log:
  sentry:
    level: error           # reports error level and above only
    dsn: "https://xxx@sentry.io/123"
    environment: production
    release: "v1.0.0"
    sample_rate: 1.0       # sampling rate
```

Highlights:
- Reports error level and above to Sentry
- Automatically captures stack traces
- Supports sampling-rate control

## 7. CloudWatch

```go
import _ "github.com/tx7do/go-wind-plugins/log/cloudwatch"
```

```yaml
log:
  cloudwatch:
    level: info
    region: us-east-1
    log_group: /ecs/my-service
    log_stream: app-2024-01-01
    batch_size: 100
    batch_timeout: 5s
```

## 8. Aliyun SLS and Tencent Cloud CLS

```go
import _ "github.com/tx7do/go-wind-plugins/log/aliyun"   // Alibaba Cloud SLS
import _ "github.com/tx7do/go-wind-plugins/log/tencent"  // Tencent Cloud CLS
```

```yaml
log:
  aliyun:
    level: info
    endpoint: "cn-hangzhou.log.aliyuncs.com"
    project: my-project
    logstore: app-logs
    access_key_id: ${ALIYUN_AK}
    access_key_secret: ${ALIYUN_SK}

  tencent:
    level: info
    endpoint: "ap-guangzhou.cls.tencentcs.com"
    topic_id: my-topic-id
    secret_id: ${TENCENT_SECRET_ID}
    secret_key: ${TENCENT_SECRET_KEY}
```

## 9. Performance Comparison

| Adapter | Throughput (ops/s) | Allocations/op | Typical Use |
|---------|-------------------|----------------|-------------|
| Zap | ~2,000,000 | 0 | High-performance services |
| Zerolog | ~2,500,000 | 0 | Ultra-high throughput |
| Logrus | ~300,000 | 5 | General purpose |
| Loki | network-bound | N/A | Log aggregation |
| Sentry | network-bound | N/A | Error monitoring |

## Related Documents

- [Log Facade Interface](./core-logging.md)
- [Plugin Configuration System](./plugins-config.md)
- [Plugin Overview](./plugins-intro.md)
