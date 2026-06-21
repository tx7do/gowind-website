# 指标监控插件

go-wind-plugins 提供统一的指标采集和导出接口，支持 Prometheus、Datadog 等。

## 一、Metrics 接口

```go
type Metrics interface {
    Counter(name string, tags ...Tag) Counter
    Gauge(name string, tags ...Tag) Gauge
    Histogram(name string, tags ...Tag) Histogram
    Timer(name string, tags ...Tag) Timer
}
```

## 二、适配器列表

| 适配器 | 导入路径 | 后端 |
|--------|---------|------|
| Prometheus | `plugins/metrics/prometheus` | Prometheus + Grafana |
| Datadog | `plugins/metrics/datadog` | Datadog Agent |
| StatsD | `plugins/metrics/statsd` | StatsD / DogStatsD |
| OTLP | `plugins/metrics/otlp` | OpenTelemetry Collector |

## 三、Prometheus

```go
import _ "github.com/tx7do/go-wind-plugins/metrics/prometheus"
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

### 自定义指标

```go
import "github.com/tx7do/go-wind/metrics"

// Counter（计数器）
requestCount := metrics.Counter("requests_total",
    metrics.Tag("method", "GET"),
    metrics.Tag("path", "/api/users"),
)
requestCount.Inc()

// Gauge（瞬时值）
activeConnections := metrics.Gauge("active_connections")
activeConnections.Set(42)
activeConnections.Inc()
activeConnections.Dec()

// Histogram（直方图）
latency := metrics.Histogram("request_duration_seconds",
    metrics.Tag("path", "/api/users"),
)
latency.Observe(0.123)  // 记录耗时

// Timer（计时器）
timer := metrics.Timer("db_query_duration")
timer.Start()
// ... 执行数据库查询
timer.Stop()
```

### 暴露 /metrics 端点

Prometheus 插件自动在 HTTP Server 上注册 `/metrics` 路径：

```go
// 无需额外代码
// Prometheus 插件 init() 自动注册 /metrics handler
// Prometheus Server 通过 http://localhost:8080/metrics 采集
```

### Prometheus 采集配置

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'my-service'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:8080']
```

## 四、Datadog

```go
import _ "github.com/tx7do/go-wind-plugins/metrics/datadog"
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

## 五、常用指标模式

### 5.1 HTTP 请求监控

```go
func MetricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        next.ServeHTTP(w, r)

        duration := time.Since(start).Seconds()
        status := strconv.Itoa(w.(*responseWriter).statusCode)

        metrics.Counter("http_requests_total",
            metrics.Tag("method", r.Method),
            metrics.Tag("path", r.URL.Path),
            metrics.Tag("status", status),
        ).Inc()

        metrics.Histogram("http_request_duration_seconds",
            metrics.Tag("method", r.Method),
            metrics.Tag("path", r.URL.Path),
        ).Observe(duration)
    })
}
```

### 5.2 业务指标

```go
// 订单指标
metrics.Counter("orders_created_total",
    metrics.Tag("type", "vip"),
).Inc()

// 支付金额
metrics.Histogram("payment_amount",
    metrics.Tag("currency", "CNY"),
).Observe(99.9)

// 队列积压
metrics.Gauge("queue_size",
    metrics.Tag("queue", "order_events"),
).Set(float64(queue.Len()))
```

## 六、Grafana 面板

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
