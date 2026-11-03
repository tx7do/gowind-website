# Metrics Plugins

go-wind-plugins provides the unified metrics collection and export interface `metrics.Metrics`, with three built-in plugins: Prometheus, OpenTelemetry, and Datadog.

## 1. The Metrics Interface

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

Business code depends only on the interface; concrete implementations (Prometheus / OTel / Datadog) are injected as needed.

## 2. Adapter List

| Adapter | Import Path | Backend |
|---------|------------|---------|
| Prometheus | `plugins/metrics/prometheus` | Prometheus client_golang |
| OpenTelemetry | `plugins/metrics/otel` | OTLP (gRPC/HTTP) |
| Datadog | `plugins/metrics/datadog` | DogStatsD |

## 3. Prometheus

```go
import "github.com/tx7do/go-wind-plugins/metrics/prometheus"

provider, _ := prometheus.New(
    prometheus.WithNamespace("myapp"),
    prometheus.WithSubsystem("api"),
    // prometheus.WithRegistry(customRegistry),  // inject a custom Registerer
)
// Or use the default global registry:
// provider, _ := prometheus.NewWithDefaultRegistry()
```

### Recording Metrics

```go
import "github.com/tx7do/go-wind-plugins/metrics"

labels := map[string]string{"method": "GET", "path": "/api/users"}

// Counter: accumulate a counter
provider.Counter(ctx, "http_requests_total", 1, labels)

// Histogram: record a duration observation
provider.Histogram(ctx, "http_request_duration_seconds", 0.123, labels)

// Gauge: set an instantaneous value
provider.Gauge(ctx, "active_connections", 42, nil)
```

### Exposing the /metrics Endpoint

The provider is based on prometheus client_golang; mount the `/metrics` handler onto an HTTP Server or expose it via `promhttp`, and the Prometheus Server scrapes it at `http://localhost:8080/metrics`.

### Prometheus Scraping Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'my-service'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:8080']
```

### YAML Configuration

```yaml
metrics:
  prometheus:
    enabled: true
    path: /metrics          # scrape path
    namespace: myapp        # metric prefix
    subsystem: api
    labels:
      service: my-service
      env: production
```

## 4. OpenTelemetry

```go
import "github.com/tx7do/go-wind-plugins/metrics/otel"

provider, _ := otel.New(
    otel.WithEndpoint("localhost:4317"),
    otel.WithServiceName("my-service"),
    otel.WithExportInterval(30*time.Second),
    // otel.WithHTTP(),          // OTLP HTTP export
    // otel.WithInsecure(true),
)
```

### YAML Configuration

```yaml
metrics:
  otel:
    endpoint: "localhost:4317"
    service_name: my-service
    export_interval: 30s
```

## 5. Datadog

```go
import "github.com/tx7do/go-wind-plugins/metrics/datadog"

provider, _ := datadog.New(
    datadog.WithAddress("localhost:8125"),   // DogStatsD address
    datadog.WithNamespace("myapp"),
    datadog.WithFlushPeriod(10*time.Second),
    datadog.WithSampleRate(1.0),
)
defer provider.Close()
```

### YAML Configuration

```yaml
metrics:
  datadog:
    enabled: true
    addr: "localhost:8125"       # DogStatsD address
    namespace: myapp
    tags:
      - "service:my-service"
      - "env:production"
    flush_interval: 10s
```

## 6. Common Metric Patterns

### 6.1 HTTP Request Monitoring

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

### 6.2 Business Metrics

```go
// Order metrics
m.Counter(ctx, "orders_created_total", 1,
    map[string]string{"type": "vip"})

// Payment amount
m.Histogram(ctx, "payment_amount", 99.9,
    map[string]string{"currency": "CNY"})

// Queue backlog
m.Gauge(ctx, "queue_size", float64(queue.Len()),
    map[string]string{"queue": "order_events"})
```

## 7. Grafana Dashboards

Recommended Grafana dashboard configuration:

| Panel | PromQL | Type |
|-------|--------|------|
| QPS | `rate(http_requests_total[5m])` | Graph |
| P99 latency | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` | Graph |
| Error rate | `rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])` | Graph |
| Active connections | `active_connections` | Gauge |

## Related Documents

- [Distributed Tracing Plugins](./plugins-tracer.md)
- [Plugin Configuration System](./plugins-config.md)
- [Logging Adapter Plugins](./plugins-log.md)
