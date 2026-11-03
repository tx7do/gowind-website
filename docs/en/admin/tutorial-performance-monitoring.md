# Performance Optimization and Monitoring

GoWind Admin provides comprehensive performance optimization and monitoring capabilities, including backend profiling, database optimization, frontend loading optimization, and distributed tracing. This tutorial explains how to improve system performance and troubleshoot performance issues in depth.

## 1. Backend Profiling

### 1.1 pprof Profiling

GoWind Admin has built-in pprof support (`server.yaml`):

```yaml
server:
  rest:
    enable_pprof: true  # 启用 pprof
```

Visit the pprof endpoint: <http://localhost:7788/debug/pprof/>

### 1.2 CPU Profiling

```shell
# 采集 30 秒的 CPU profile
curl -o cpu.prof http://localhost:7788/debug/pprof/profile?seconds=30

# 分析 profile
go tool pprof cpu.prof

# 进入交互式界面后
(pprof) top 10          # 查看最耗 CPU 的 10 个函数
(pprof) list FunctionName  # 查看具体函数的源码
(pprof) web             # 生成可视化火焰图（需要 Graphviz）
```

**Common optimization points**:
- Reduce unnecessary loops
- Use concurrency for independent tasks
- Cache computation results

### 1.3 Memory Profiling

```shell
# 获取堆内存快照
curl -o heap.prof http://localhost:7788/debug/pprof/heap

# 分析内存分配
go tool pprof heap.prof

# 查看内存泄漏
(pprof) top --inuse_space
(pprof) list allocateFunction
```

**Common optimization points**:
- Release objects that are no longer used in time
- Avoid frequently creating large objects
- Use sync.Pool to reuse objects

### 1.4 Goroutine Analysis

```shell
# 查看 goroutine 数量
curl http://localhost:7788/debug/pprof/goroutine?debug=1

# 获取 goroutine stack trace
curl -o goroutine.prof http://localhost:7788/debug/pprof/goroutine
go tool pprof goroutine.prof
```

**Common issues**:
- Goroutine leaks: channels or contexts not closed correctly
- Goroutine explosion: excessive concurrency exhausting resources

## 2. Database Optimization

### 2.1 Slow Query Logs

Enable the PostgreSQL slow query log:

```sql
-- postgresql.conf
log_min_duration_statement = 1000  -- 记录超过 1 秒的查询
log_statement = 'none'
```

View slow queries:

```shell
tail -f /var/log/postgresql/postgresql-*.log | grep "duration:"
```

### 2.2 EXPLAIN Analysis

Use EXPLAIN to analyze the query plan:

```sql
EXPLAIN ANALYZE
SELECT * FROM articles
WHERE tenant_id = 1
  AND status = 1
ORDER BY created_at DESC
LIMIT 10;
```

**Example output**:

```
Limit  (cost=0.43..12.68 rows=10 width=512) (actual time=0.050..0.055 rows=10 loops=1)
  ->  Index Scan using idx_articles_tenant_status on articles  (cost=0.43..120.50 rows=100 width=512) (actual time=0.048..0.053 rows=10 loops=1)
        Index Cond: ((tenant_id = 1) AND (status = 1))
```

**Key metrics**:
- `actual time`: the actual execution time
- `rows`: the number of rows returned
- `loops`: the number of loop iterations

### 2.3 Index Optimization

#### Adding Indexes

```sql
-- 单列索引
CREATE INDEX idx_articles_tenant_id ON articles(tenant_id);

-- 复合索引
CREATE INDEX idx_articles_tenant_status ON articles(tenant_id, status);

-- 部分索引（只索引活跃数据）
CREATE INDEX idx_articles_active ON articles(created_at) WHERE status = 1;

-- GIN 索引（JSONB 字段）
CREATE INDEX idx_users_metadata ON users USING GIN (metadata);
```

#### Checking Index Usage

```sql
-- 查看未被使用的索引
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY tablename, indexname;
```

#### Dropping Unused Indexes

```sql
DROP INDEX idx_unused_index;
```

### 2.4 Query Optimization

#### Avoid SELECT *

```sql
-- ❌ 错误做法
SELECT * FROM articles;

-- ✅ 正确做法
SELECT id, title, created_at FROM articles;
```

#### Use Pagination

```sql
-- ❌ 错误做法：一次性加载所有数据
SELECT * FROM articles;

-- ✅ 正确做法：分页查询
SELECT id, title FROM articles
ORDER BY created_at DESC
LIMIT 10 OFFSET 0;
```

#### Batch Operations

```sql
-- ❌ 错误做法：循环插入
INSERT INTO articles (title) VALUES ('Article 1');
INSERT INTO articles (title) VALUES ('Article 2');
...

-- ✅ 正确做法：批量插入
INSERT INTO articles (title) VALUES
  ('Article 1'),
  ('Article 2'),
  ('Article 3');
```

#### Use Connection Pooling

Configure the connection pool in `data.yaml`:

```yaml
data:
  database:
    max_idle_connections: 25     # 最大空闲连接
    max_open_connections: 100    # 最大打开连接
    connection_max_lifetime: 300s  # 连接最大生命周期
```

### 2.5 The N+1 Query Problem

**Problem**: loop queries cause a large number of database requests.

```go
// ❌ 错误做法：N+1 查询
articles, _ := articleRepo.List(ctx)
for _, article := range articles {
    author, _ := userRepo.Get(ctx, article.AuthorID)  // 每次循环都查询
    article.Author = author
}

// ✅ 正确做法：批量查询
articles, _ := articleRepo.List(ctx)
authorIDs := make([]uint32, 0, len(articles))
for _, article := range articles {
    authorIDs = append(authorIDs, article.AuthorID)
}
authors, _ := userRepo.BatchGet(ctx, authorIDs)  // 一次查询
```

## 3. Redis Cache Optimization

### 3.1 Caching Strategies

| Strategy | Description | Applicable Scenarios |
|------|------|----------|
| **Cache-Aside** | Query the cache first; on miss, query the DB and write to the cache | Read-heavy, write-light |
| **Write-Through** | Write to the cache and the DB simultaneously | Strong consistency requirements |
| **Write-Behind** | Write to the cache first, then to the DB asynchronously | High performance requirements |

### 3.2 Caching Hot Data

```go
// 缓存用户信息
func GetUserWithCache(ctx context.Context, userID uint32) (*User, error) {
    cacheKey := fmt.Sprintf("user:%d", userID)
    
    // 1. 尝试从缓存获取
    cached, err := redis.Get(ctx, cacheKey).Result()
    if err == nil {
        var user User
        json.Unmarshal([]byte(cached), &user)
        return &user, nil
    }
    
    // 2. 从数据库查询
    user, err := userRepo.Get(ctx, userID)
    if err != nil {
        return nil, err
    }
    
    // 3. 写入缓存（TTL 1 小时）
    data, _ := json.Marshal(user)
    redis.Set(ctx, cacheKey, data, time.Hour)
    
    return user, nil
}
```

### 3.3 Cache Penetration Protection

**Problem**: querying non-existent data always misses the cache, and requests reach the DB directly.

**Solution**: cache null values.

```go
func GetUserWithCache(ctx context.Context, userID uint32) (*User, error) {
    cacheKey := fmt.Sprintf("user:%d", userID)
    
    cached, err := redis.Get(ctx, cacheKey).Result()
    if err == nil {
        if cached == "NULL" {
            return nil, errors.New("user not found")
        }
        
        var user User
        json.Unmarshal([]byte(cached), &user)
        return &user, nil
    }
    
    user, err := userRepo.Get(ctx, userID)
    if err != nil {
        if err == ErrNotFound {
            // 缓存空值，TTL 5 分钟
            redis.Set(ctx, cacheKey, "NULL", 5*time.Minute)
            return nil, err
        }
        return nil, err
    }
    
    data, _ := json.Marshal(user)
    redis.Set(ctx, cacheKey, data, time.Hour)
    
    return user, nil
}
```

### 3.4 Cache Avalanche Protection

**Problem**: a large number of cache entries expire at the same time, and all requests hit the DB.

**Solution**: random TTLs.

```go
// 随机 TTL（1-2 小时）
ttl := time.Duration(60+rand.Intn(60)) * time.Minute
redis.Set(ctx, cacheKey, data, ttl)
```

### 3.5 Cache Breakdown Protection

**Problem**: at the moment a hot key expires, a large number of concurrent requests hit the DB.

**Solution**: a mutex lock.

```go
import "sync"

var mu sync.Mutex

func GetUserWithLock(ctx context.Context, userID uint32) (*User, error) {
    cacheKey := fmt.Sprintf("user:%d", userID)
    
    cached, _ := redis.Get(ctx, cacheKey).Result()
    if cached != "" {
        var user User
        json.Unmarshal([]byte(cached), &user)
        return &user, nil
    }
    
    // 加锁
    mu.Lock()
    defer mu.Unlock()
    
    // 双重检查
    cached, _ = redis.Get(ctx, cacheKey).Result()
    if cached != "" {
        var user User
        json.Unmarshal([]byte(cached), &user)
        return &user, nil
    }
    
    // 从 DB 查询
    user, _ := userRepo.Get(ctx, userID)
    data, _ := json.Marshal(user)
    redis.Set(ctx, cacheKey, data, time.Hour)
    
    return user, nil
}
```

## 4. Frontend Performance Optimization

### 4.1 First-Screen Loading Optimization

#### Route Lazy Loading

Vben Admin enables route lazy loading by default:

```typescript
const routes: RouteRecordRaw[] = [
  {
    path: '/app/article',
    component: () => import('#/views/app/article/index.vue'),  // 懒加载
  },
];
```

#### Component Lazy Loading

```vue
<script setup>
import { defineAsyncComponent } from 'vue';

const HeavyComponent = defineAsyncComponent(() =>
  import('@/components/HeavyComponent.vue')
);
</script>
```

#### Image Lazy Loading

```vue
<template>
  <img 
    v-lazy="imageUrl" 
    :alt="altText"
    loading="lazy"
  />
</template>
```

### 4.2 Code Splitting

Vite performs code splitting automatically; you can also configure it manually:

```typescript
// vite.config.mts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          antd: ['ant-design-vue'],
          lodash: ['lodash-es'],
        },
      },
    },
  },
});
```

### 4.3 Build Optimization

#### Gzip Compression

```typescript
// vite.config.mts
import compression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    compression({
      algorithm: 'gzip',
      threshold: 10240,  // 大于 10KB 的文件才压缩
    }),
  ],
});
```

#### Removing console.log

```typescript
// vite.config.mts
export default defineConfig({
  esbuild: {
    drop: ['console', 'debugger'],  // 生产环境移除
  },
});
```

### 4.4 Network Optimization

#### HTTP/2

Configure HTTP/2 in Nginx:

```nginx
server {
    listen 443 ssl http2;
    
    # SSL 配置
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
}
```

#### CDN Acceleration

Deploy static assets to a CDN:

```typescript
// .env.production
VITE_PUBLIC_PATH=https://cdn.example.com/
```

#### Resource Preloading

```html
<!-- index.html -->
<link rel="preload" href="/assets/main.css" as="style" />
<link rel="prefetch" href="/assets/chunk-vendor.js" as="script" />
```

## 5. Distributed Tracing

### 5.1 Jaeger Integration

Enable Jaeger tracing (`docker-compose.yaml`):

```yaml
jaeger:
  image: docker.io/jaegertracing/all-in-one:latest
  ports:
    - "16686:16686"  # Web UI
    - "4317:4317"    # OTLP gRPC
    - "4318:4318"    # OTLP HTTP
```

Visit the Jaeger UI: <http://localhost:16686>

### 5.2 OpenTelemetry Configuration

Enable tracing in Kratos:

```yaml
tracer:
  type: "otlp"
  
  otlp:
    endpoint: "http://jaeger:4317"
    insecure: true
```

### 5.3 Custom Spans

```go
import "go.opentelemetry.io/otel/trace"

func HandleRequest(ctx context.Context, req *Request) error {
    tracer := otel.Tracer("admin-service")
    
    ctx, span := tracer.Start(ctx, "handle_request")
    defer span.End()
    
    // 添加属性
    span.SetAttributes(
        attribute.String("request.id", req.ID),
        attribute.String("request.type", req.Type),
    )
    
    // 业务逻辑
    err := processRequest(ctx, req)
    
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
    }
    
    return err
}
```

### 5.4 Viewing Traces

In the Jaeger UI:
1. Select the service: `admin-service`
2. View the trace list
3. Click a trace to see the detailed chain
4. Analyze the duration of each span

## 6. Log Aggregation

### 6.1 Structured Logging

Use JSON format logs:

```yaml
logger:
  type: zap
  
  zap:
    level: "info"
    filename: "./logs/info.log"
    encoding: "json"  # JSON 格式
```

**Example output**:

```json
{
  "level": "info",
  "ts": "2026-06-04T10:30:00.000Z",
  "msg": "user login success",
  "user_id": 123,
  "ip": "192.168.1.100",
  "trace_id": "abc123"
}
```

### 6.2 The ELK Stack

Deploy the ELK stack (Elasticsearch + Logstash + Kibana) for log aggregation:

```yaml
# docker-compose.logging.yaml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    
  logstash:
    image: docker.elastic.co/logstash/logstash:8.0.0
    
  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
```

Visit Kibana: <http://localhost:5601>

### 6.3 Log Queries

Query logs in Kibana:

```
# 查询错误日志
level: error

# 查询特定用户的日志
user_id: 123

# 查询特定时间范围的日志
@timestamp: [2026-06-04T00:00:00 TO 2026-06-04T23:59:59]
```

## 7. Monitoring and Alerting

### 7.1 Prometheus Metrics

Kratos exposes Prometheus metrics by default:

```shell
# 访问指标端点
curl http://localhost:7788/metrics
```

**Key metrics**:
- `http_request_duration_seconds`: request duration
- `http_requests_total`: total request count
- `go_goroutines`: the number of goroutines
- `go_memstats_alloc_bytes`: memory allocation

### 7.2 Grafana Dashboards

Deploy Grafana for visual monitoring:

```yaml
# docker-compose.monitoring.yaml
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
```

Visit Grafana: <http://localhost:3000>

Import the official Kratos dashboard template.

### 7.3 Alert Rules

Prometheus alert rules:

```yaml
# alert.rules.yml
groups:
  - name: admin-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
```

## 8. Performance Testing

### 8.1 Load Testing

Use wrk for load testing:

```shell
# 安装 wrk
brew install wrk  # macOS
apt-get install wrk  # Linux

# 压力测试
wrk -t12 -c400 -d30s http://localhost:7788/admin/v1/user

# 输出示例：
# Running 30s test @ http://localhost:7788/admin/v1/user
#   12 threads and 400 connections
#   Thread Stats   Avg      Stdev     Max      +/- Stdev
#     Latency     10.5ms   2.3ms     50.2ms   85.00%
#     Req/Sec     3200     150       3500     90.00%
#   96000 requests in 30s
```

### 8.2 Benchmark Testing

Go has built-in benchmark testing:

```go
// user_repo_test.go
func BenchmarkGetUser(b *testing.B) {
    repo := NewUserRepo(db, logger)
    ctx := context.Background()
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, err := repo.Get(ctx, 1)
        if err != nil {
            b.Fatal(err)
        }
    }
}

// 运行基准测试
go test -bench=BenchmarkGetUser -benchmem
```

**Example output**:

```
BenchmarkGetUser-8    10000    12000 ns/op    512 B/op    10 allocs/op
```

## 9. Performance Optimization Checklist

### 9.1 Backend Optimization

- [ ] Enable pprof and profile performance bottlenecks regularly
- [ ] Add indexes for frequently queried fields
- [ ] Use connection pooling to manage database connections
- [ ] Cache hot data in Redis
- [ ] Avoid the N+1 query problem
- [ ] Use async tasks for time-consuming operations
- [ ] Enable Gzip response compression
- [ ] Configure reasonable timeouts

### 9.2 Frontend Optimization

- [ ] Enable route lazy loading
- [ ] Use code splitting to reduce bundle size
- [ ] Enable Gzip/Brotli compression
- [ ] Use a CDN to accelerate static assets
- [ ] Lazy-load and compress images
- [ ] Remove unused dependencies
- [ ] Enable HTTP/2
- [ ] Configure browser caching policies

### 9.3 Monitoring Optimization

- [ ] Enable distributed tracing (Jaeger)
- [ ] Configure Prometheus metric collection
- [ ] Deploy Grafana dashboards
- [ ] Set up alert rules
- [ ] Aggregate logs into ELK/Loki
- [ ] Run performance tests regularly
- [ ] Monitor key business metrics

## 10. Common Issues

### Q1: How do I locate performance bottlenecks?

1. Use pprof to analyze CPU and memory
2. Check the slow query logs
3. Analyze time-consuming spans in the traces
4. Monitor key metrics (QPS, latency, error rate)

### Q2: How do I handle traffic spikes?

1. Enable rate limiting middleware
2. Use a message queue to smooth out peaks
3. Add a cache layer to reduce DB pressure
4. Scale out service instances horizontally

### Q3: How do I optimize queries on large tables?

1. Partitioned tables (by time or tenant)
2. Archive historical data
3. Use read/write splitting
4. Introduce a search engine (Elasticsearch)

### Q4: What if the frontend first screen loads slowly?

1. Analyze the bundle size (`rollup-plugin-visualizer`)
2. Enable SSR (server-side rendering)
3. Use skeleton screens to improve perceived speed
4. Preload critical resources

## 11. Related Documentation

- [Backend Configuration and Deployment](/en/admin/backend-config-deploy.md)
- [Backend Extension Development](/en/admin/backend-extension.md)
- [Task Scheduling and Asynchronous Processing](/en/admin/tutorial-task-scheduling.md)
