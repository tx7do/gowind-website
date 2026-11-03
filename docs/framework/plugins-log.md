# 日志适配插件

go-wind-plugins 提供多种日志适配器，实现 `log.Logger` 接口。适配器包装各日志引擎的原生 Logger，业务代码统一走 `log.Logger` 门面。

## 一、适配器列表

| 适配器 | 导入路径 | 引擎 |
|--------|---------|------|
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
| Aliyun SLS | `plugins/log/aliyun` | 阿里云日志服务 SLS |
| Tencent CLS | `plugins/log/tencent` | 腾讯云日志服务 CLS |

`log/` 根包还内置：**slog 适配器**（默认 Logger）、**LevelFilter** 日志级别过滤器、**MultiLogger** 多路日志器（一条日志同时写多个后端）。

## 二、Zap 适配器

### 2.1 基本使用

```go
import (
    "context"

    zap "go.uber.org/zap"
    zaplog "github.com/tx7do/go-wind-plugins/log/zap"
)

// 先构建原生 zap.Logger，再包装为统一的 log.Logger
zlog, _ := zap.NewProduction()
logger := zaplog.NewZapLogger(zlog)
defer logger.Close()

logger.Info(context.Background(), "service started", "port", 8080)
logger.With("module", "auth").Error(context.Background(), "token expired")
```

### 2.2 YAML 配置（bootstrap 装配）

### 2.3 YAML 配置

```yaml
log:
  zap:
    level: info
    format: json
    output: stdout
    # 文件日志
    file:
      enabled: true
      filename: logs/app.log
      max_size: 100        # MB
      max_backups: 7
      max_age: 30          # days
      compress: true
```

## 三、Zerolog 适配器

```go
import _ "github.com/tx7do/go-wind-plugins/log/zerolog"
```

```yaml
log:
  zerolog:
    level: info
    format: json           # zerolog 默认 JSON
    output: stdout
    time_format: rfc3339   # unix | rfc3339 | rfc3339nano
    no_color: false
```

特点：
- 零分配，性能极高
- 原生 JSON 输出
- 适合高吞吐场景

## 四、Logrus 适配器

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

特点：
- 社区生态最丰富
- Hook 机制支持扩展
- 兼容性最好

## 五、Loki 远程日志

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

特点：
- 日志直接推送到 Grafana Loki
- 支持标签筛选
- 批量推送减少网络开销

## 六、Sentry 错误追踪

```go
import _ "github.com/tx7do/go-wind-plugins/log/sentry"
```

```yaml
log:
  sentry:
    level: error           # 只上报 error 及以上
    dsn: "https://xxx@sentry.io/123"
    environment: production
    release: "v1.0.0"
    sample_rate: 1.0       # 采样率
```

特点：
- Error 及以上级别上报到 Sentry
- 自动捕获堆栈
- 支持采样率控制

## 七、CloudWatch

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

## 八、Aliyun SLS 与腾讯云 CLS

```go
import _ "github.com/tx7do/go-wind-plugins/log/aliyun"   // 阿里云 SLS
import _ "github.com/tx7do/go-wind-plugins/log/tencent"  // 腾讯云 CLS
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

## 九、性能对比

| 适配器 | 吞吐（ops/s） | 分配/次 | 适用场景 |
|--------|-------------|---------|---------|
| Zap | ~2,000,000 | 0 | 高性能服务 |
| Zerolog | ~2,500,000 | 0 | 超高吞吐 |
| Logrus | ~300,000 | 5 | 通用场景 |
| Loki | 网络依赖 | N/A | 日志聚合 |
| Sentry | 网络依赖 | N/A | 错误监控 |

## 相关文档

- [Log 门面接口](./core-logging.md)
- [插件配置系统](./plugins-config.md)
- [插件总览](./plugins-intro.md)
