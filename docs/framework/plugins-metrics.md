# 指标监控插件

go-wind-plugins 提供统一的指标采集和导出接口 `metrics.Metrics`，内置 Prometheus、OpenTelemetry、Datadog 三个插件。

## 一、Metrics 接口

```go
type Metrics interface {
    // Counter increments a monotonically increasing counter by value.
    Counter(ctx context.Context, name string, value float64, labels map[string]string)

    // Histogram records an observation into a histogram distribution.
    Histogram(ctx context.Context, name string, value float64, labels map[string]string)

    // Gauge sets the current value of a gauge.
    Gauge(ctx context.Context, name string, value float64, labels map[string]string)
}

// Closer extends Metrics with graceful shutdown.
type Closer interface {
    Close() error
}
```

业务代码只依赖接口，具体实现（Prometheus / OTel / Datadog）按需注入。

## 二、适配器列表

| 适配器 | 导入路径 | 后端 |
|--------|---------|------|
| Prometheus | `plugins/metrics/prometheus` | Prometheus client_golang |
| OpenTelemetry | `plugins/metrics/otel` | OTLP (gRPC/HTTP) |
| Datadog | `plugins/metrics/datadog` | DogStatsD |

## 三、Prometheus

```go
import "github.com/tx7do/go-wind-plugins/metrics/prometheus"

provider, _ := prometheus.New(
    prometheus.WithNamespace("myapp"),
    prometheus.WithSubsystem("api"),
    // prometheus.WithRegistry(customRegistry),  // 注入自定义 Registerer
)
// 或使用默认全局 Registry：
// provider, _ := prometheus.NewWithDefaultRegistry()
```

### 记录指标

```go
import "github.com/tx7do/go-wind-plugins/metrics"

labels := map[string]string{"method": "GET", "path": "/api/users"}

// Counter：计数器累加
provider.Counter(ctx, "http_requests_total", 1, labels)

// Histogram：记录耗时观测
provider.Histogram(ctx, "http_request_duration_seconds", 0.123, labels)

// Gauge：设置瞬时值
provider.Gauge(ctx, "active_connections", 42, nil)
```

### 暴露 /metrics 端点

Provider 基于 prometheus client_golang，把 `/metrics` handler 挂到 HTTP Server 或使用 `promhttp` 暴露即可，Prometheus Server 通过 `http://localhost:8080/metrics` 采集。

### Prometheus 采集配置

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'my-service'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:8080']
```

### YAML 配置

```yaml
metrics:
  prometheus:
    enabled: true
    path: /metrics          # 采集路径
    namespace: myapp        # 指标前缀
    subsystem: api
    labels:
      service: my-service
      env: production
```

## 四、OpenTelemetry

```go
import "github.com/tx7do/go-wind-plugins/metrics/otel"

provider, _ := otel.New(
    otel.WithEndpoint("localhost:4317"),
    otel.WithServiceName("my-service"),
    otel.WithExportInterval(30*time.Second),
    // otel.WithHTTP(),          // OTLP HTTP 导出
    // otel.WithInsecure(true),
)
```

### YAML 配置

```yaml
metrics:
  otel:
    endpoint: "localhost:4317"
    service_name: my-service
    export_interval: 30s
```

## 五、Datadog

```go
import "github.com/tx7do/go-wind-plugins/metrics/datadog"

provider, _ := datadog.New(
    datadog.WithAddress("localhost:8125"),   // DogStatsD 地址
    datadog.WithNamespace("myapp"),
    datadog.WithFlushPeriod(10*time.Second),
    datadog.WithSampleRate(1.0),
)
defer provider.Close()
```

### YAML 配置

```yaml
metrics:
  datadog:
    enabled: true
    addr: "localhost:8125"       # DogStatsD 地址
    namespace: myapp
    tags:
      - "service:my-service"
      - "env:production"
    flush_interval: 10s
```

## 六、常用指标模式

### 6.1 HTTP 请求监控

```go
func MetricsMiddleware(m metrics.Metrics, next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        next.ServeHTTP(w, r)

        labels := map[string]string{
            "method": r.Method,
            "path":   r.URL.Path,
            "status": strconv.Itoa(w.(*responseWriter).statusCode),
        }
        m.Counter(r.Context(), "http_requests_total", 1, labels)
        m.Histogram(r.Context(), "http_request_duration_seconds",
            time.Since(start).Seconds(), labels)
    })
}
```

### 6.2 业务指标

```go
// 订单指标
m.Counter(ctx, "orders_created_total", 1,
    map[string]string{"type": "vip"})

// 支付金额
m.Histogram(ctx, "payment_amount", 99.9,
    map[string]string{"currency": "CNY"})

// 队列积压
m.Gauge(ctx, "queue_size", float64(queue.Len()),
    map[string]string{"queue": "order_events"})
```

## 七、Grafana 面板

推荐 Grafana 面板配置：

| 面板 | PromQL | 类型 |
|------|--------|------|
| QPS | `rate(http_requests_total[5m])` | Graph |
| 延迟 P99 | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` | Graph |
| 错误率 | `rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])` | Graph |
| 活跃连接 | `active_connections` | Gauge |

## 相关文档

- [链路追踪插件](./plugins-tracer.md)
- [插件配置系统](./plugins-config.md)
- [日志适配插件](./plugins-log.md)
