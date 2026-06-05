# 性能优化与监控教程

GoWind Admin 提供完善的性能优化和监控能力，包括后端性能分析、数据库优化、前端加载优化、链路追踪等。本教程深入讲解如何提升系统性能和排查性能问题。

## 一、后端性能分析

### 1.1 pprof 性能分析

GoWind Admin 内置 pprof 支持（`server.yaml`）：

```yaml
server:
  rest:
    enable_pprof: true  # 启用 pprof
```

访问 pprof 端点：<http://localhost:7788/debug/pprof/>

### 1.2 CPU 性能分析

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

**常见优化点**：
- 减少不必要的循环
- 使用并发处理独立任务
- 缓存计算结果

### 1.3 内存性能分析

```shell
# 获取堆内存快照
curl -o heap.prof http://localhost:7788/debug/pprof/heap

# 分析内存分配
go tool pprof heap.prof

# 查看内存泄漏
(pprof) top --inuse_space
(pprof) list allocateFunction
```

**常见优化点**：
- 及时释放不再使用的对象
- 避免大对象频繁创建
- 使用 sync.Pool 复用对象

### 1.4 Goroutine 分析

```shell
# 查看 goroutine 数量
curl http://localhost:7788/debug/pprof/goroutine?debug=1

# 获取 goroutine stack trace
curl -o goroutine.prof http://localhost:7788/debug/pprof/goroutine
go tool pprof goroutine.prof
```

**常见问题**：
- Goroutine 泄漏：未正确关闭 channel 或 context
- Goroutine 爆炸：并发度过高导致资源耗尽

## 二、数据库优化

### 2.1 慢查询日志

启用 PostgreSQL 慢查询日志：

```sql
-- postgresql.conf
log_min_duration_statement = 1000  -- 记录超过 1 秒的查询
log_statement = 'none'
```

查看慢查询：

```shell
tail -f /var/log/postgresql/postgresql-*.log | grep "duration:"
```

### 2.2 EXPLAIN 分析

使用 EXPLAIN 分析查询计划：

```sql
EXPLAIN ANALYZE
SELECT * FROM articles
WHERE tenant_id = 1
  AND status = 1
ORDER BY created_at DESC
LIMIT 10;
```

**输出示例**：

```
Limit  (cost=0.43..12.68 rows=10 width=512) (actual time=0.050..0.055 rows=10 loops=1)
  ->  Index Scan using idx_articles_tenant_status on articles  (cost=0.43..120.50 rows=100 width=512) (actual time=0.048..0.053 rows=10 loops=1)
        Index Cond: ((tenant_id = 1) AND (status = 1))
```

**关键指标**：
- `actual time`：实际执行时间
- `rows`：返回行数
- `loops`：循环次数

### 2.3 索引优化

#### 添加索引

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

#### 检查索引使用情况

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

#### 删除无用索引

```sql
DROP INDEX idx_unused_index;
```

### 2.4 查询优化

#### 避免 SELECT *

```sql
-- ❌ 错误做法
SELECT * FROM articles;

-- ✅ 正确做法
SELECT id, title, created_at FROM articles;
```

#### 使用分页

```sql
-- ❌ 错误做法：一次性加载所有数据
SELECT * FROM articles;

-- ✅ 正确做法：分页查询
SELECT id, title FROM articles
ORDER BY created_at DESC
LIMIT 10 OFFSET 0;
```

#### 批量操作

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

#### 使用连接池

在 `data.yaml` 中配置连接池：

```yaml
data:
  database:
    max_idle_connections: 25     # 最大空闲连接
    max_open_connections: 100    # 最大打开连接
    connection_max_lifetime: 300s  # 连接最大生命周期
```

### 2.5 N+1 查询问题

**问题**：循环查询导致大量数据库请求。

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

## 三、Redis 缓存优化

### 3.1 缓存策略

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| **Cache-Aside** | 先查缓存，miss 后查 DB 并写入缓存 | 读多写少 |
| **Write-Through** | 写缓存同时写 DB | 强一致性要求 |
| **Write-Behind** | 先写缓存，异步写 DB | 高性能要求 |

### 3.2 缓存热点数据

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

### 3.3 缓存穿透防护

**问题**：查询不存在的数据，缓存永远 miss，请求直达 DB。

**解决方案**：缓存空值。

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

### 3.4 缓存雪崩防护

**问题**：大量缓存同时过期，请求全部打到 DB。

**解决方案**：随机 TTL。

```go
// 随机 TTL（1-2 小时）
ttl := time.Duration(60+rand.Intn(60)) * time.Minute
redis.Set(ctx, cacheKey, data, ttl)
```

### 3.5 缓存击穿防护

**问题**：热点 key 过期瞬间，大量并发请求打到 DB。

**解决方案**：互斥锁。

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

## 四、前端性能优化

### 4.1 首屏加载优化

#### 路由懒加载

Vben Admin 默认启用路由懒加载：

```typescript
const routes: RouteRecordRaw[] = [
  {
    path: '/app/article',
    component: () => import('#/views/app/article/index.vue'),  // 懒加载
  },
];
```

#### 组件懒加载

```vue
<script setup>
import { defineAsyncComponent } from 'vue';

const HeavyComponent = defineAsyncComponent(() =>
  import('@/components/HeavyComponent.vue')
);
</script>
```

#### 图片懒加载

```vue
<template>
  <img 
    v-lazy="imageUrl" 
    :alt="altText"
    loading="lazy"
  />
</template>
```

### 4.2 代码分割

Vite 自动进行代码分割，也可以手动配置：

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

### 4.3 打包优化

#### Gzip 压缩

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

#### 移除 console.log

```typescript
// vite.config.mts
export default defineConfig({
  esbuild: {
    drop: ['console', 'debugger'],  // 生产环境移除
  },
});
```

### 4.4 网络优化

#### HTTP/2

Nginx 配置 HTTP/2：

```nginx
server {
    listen 443 ssl http2;
    
    # SSL 配置
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
}
```

#### CDN 加速

将静态资源部署到 CDN：

```typescript
// .env.production
VITE_PUBLIC_PATH=https://cdn.example.com/
```

#### 资源预加载

```html
<!-- index.html -->
<link rel="preload" href="/assets/main.css" as="style" />
<link rel="prefetch" href="/assets/chunk-vendor.js" as="script" />
```

## 五、链路追踪

### 5.1 Jaeger 集成

启用 Jaeger 链路追踪（`docker-compose.yaml`）：

```yaml
jaeger:
  image: docker.io/jaegertracing/all-in-one:latest
  ports:
    - "16686:16686"  # Web UI
    - "4317:4317"    # OTLP gRPC
    - "4318:4318"    # OTLP HTTP
```

访问 Jaeger UI：<http://localhost:16686>

### 5.2 OpenTelemetry 配置

在 Kratos 中启用 tracing：

```yaml
tracer:
  type: "otlp"
  
  otlp:
    endpoint: "http://jaeger:4317"
    insecure: true
```

### 5.3 自定义 Span

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

### 5.4 查看链路

在 Jaeger UI 中：
1. 选择服务：`admin-service`
2. 查看 Trace 列表
3. 点击某个 Trace 查看详细链路
4. 分析每个 Span 的耗时

## 六、日志聚合

### 6.1 结构化日志

使用 JSON 格式日志：

```yaml
logger:
  type: zap
  
  zap:
    level: "info"
    filename: "./logs/info.log"
    encoding: "json"  # JSON 格式
```

**输出示例**：

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

### 6.2 ELK Stack

部署 ELK（Elasticsearch + Logstash + Kibana）进行日志聚合：

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

访问 Kibana：<http://localhost:5601>

### 6.3 日志查询

在 Kibana 中查询日志：

```
# 查询错误日志
level: error

# 查询特定用户的日志
user_id: 123

# 查询特定时间范围的日志
@timestamp: [2026-06-04T00:00:00 TO 2026-06-04T23:59:59]
```

## 七、监控告警

### 7.1 Prometheus 指标

Kratos 内置 Prometheus 指标暴露：

```shell
# 访问指标端点
curl http://localhost:7788/metrics
```

**关键指标**：
- `http_request_duration_seconds`：请求耗时
- `http_requests_total`：请求总数
- `go_goroutines`：Goroutine 数量
- `go_memstats_alloc_bytes`：内存分配

### 7.2 Grafana 仪表盘

部署 Grafana 可视化监控：

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

访问 Grafana：<http://localhost:3000>

导入 Kratos 官方仪表盘模板。

### 7.3 告警规则

Prometheus 告警规则：

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

## 八、性能测试

### 8.1 压力测试

使用 wrk 进行压力测试：

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

### 8.2 基准测试

Go 内置基准测试：

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

**输出示例**：

```
BenchmarkGetUser-8    10000    12000 ns/op    512 B/op    10 allocs/op
```

## 九、性能优化清单

### 9.1 后端优化

- [ ] 启用 pprof 定期分析性能瓶颈
- [ ] 为常用查询字段添加索引
- [ ] 使用连接池管理数据库连接
- [ ] 缓存热点数据到 Redis
- [ ] 避免 N+1 查询问题
- [ ] 使用异步任务处理耗时操作
- [ ] 启用 Gzip 压缩响应
- [ ] 配置合理的超时时间

### 9.2 前端优化

- [ ] 启用路由懒加载
- [ ] 使用代码分割减小包体积
- [ ] 启用 Gzip/Brotli 压缩
- [ ] 使用 CDN 加速静态资源
- [ ] 图片懒加载和压缩
- [ ] 移除未使用的依赖
- [ ] 启用 HTTP/2
- [ ] 配置浏览器缓存策略

### 9.3 监控优化

- [ ] 启用链路追踪（Jaeger）
- [ ] 配置 Prometheus 指标收集
- [ ] 部署 Grafana 仪表盘
- [ ] 设置告警规则
- [ ] 聚合日志到 ELK/Loki
- [ ] 定期进行性能测试
- [ ] 监控关键业务指标

## 十、常见问题

### Q1: 如何定位性能瓶颈？

1. 使用 pprof 分析 CPU 和内存
2. 查看慢查询日志
3. 分析链路追踪中的耗时 Span
4. 监控关键指标（QPS、延迟、错误率）

### Q2: 如何处理突发流量？

1. 启用限流中间件
2. 使用消息队列削峰填谷
3. 增加缓存层减轻 DB 压力
4. 水平扩展服务实例

### Q3: 如何优化大表查询？

1. 分区表（按时间或租户）
2. 归档历史数据
3. 使用读写分离
4. 引入搜索引擎（Elasticsearch）

### Q4: 前端首屏加载慢怎么办？

1. 分析 Bundle 大小（`rollup-plugin-visualizer`）
2. 启用 SSR（服务端渲染）
3. 使用骨架屏提升感知速度
4. 预加载关键资源

## 十一、相关文档

- [后端配置与部署](./backend-config-deploy.md)
- [后端扩展开发](./backend-extension.md)
- [任务调度与异步处理](./tutorial-task-scheduling.md)
