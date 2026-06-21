# 缓存插件

go-wind-plugins 提供统一的缓存接口，支持 Redis、Memcached、本地缓存等。

## 一、Cache 接口

```go
type Cache interface {
    Get(ctx context.Context, key string) ([]byte, error)
    Set(ctx context.Context, key string, value []byte, ttl time.Duration) error
    Delete(ctx context.Context, key string) error
    Exists(ctx context.Context, key string) (bool, error)
    Keys(ctx context.Context, pattern string) ([]string, error)
}
```

## 二、适配器列表

| 适配器 | 导入路径 | 特点 |
|--------|---------|------|
| Redis | `plugins/cache/redis` | 分布式缓存、丰富的数据结构 |
| Memcached | `plugins/cache/memcached` | 高性能纯内存缓存 |
| FreeCache | `plugins/cache/freecache` | 进程内缓存、零 GC |
| BigCache | `plugins/cache/bigcache` | 进程内缓存、高吞吐 |
| Ristretto | `plugins/cache/ristretto` | 进程内缓存、LFU 策略 |

## 三、Redis

```go
import redisPlugin "github.com/tx7do/go-wind-plugins/cache/redis"

cache := redisPlugin.NewClient(
    redisPlugin.WithAddr("localhost:6379"),
    redisPlugin.WithDB(0),
    redisPlugin.WithPassword(""),
    redisPlugin.WithPoolSize(50),
    redisPlugin.WithMinIdleConns(10),
)
```

### 基本操作

```go
// Set
cache.Set(ctx, "user:123", []byte(`{"name":"alice"}`), 10*time.Minute)

// Get
data, err := cache.Get(ctx, "user:123")

// Delete
cache.Delete(ctx, "user:123")

// Exists
exists, _ := cache.Exists(ctx, "user:123")
```

### YAML 配置

```yaml
cache:
  redis:
    addr: "localhost:6379"
    password: ${REDIS_PASSWORD}
    db: 0
    pool_size: 50
    min_idle_conns: 10
    max_retries: 3
    read_timeout: 3s
    write_timeout: 3s
    key_prefix: "myapp:"
```

### Redis 原生客户端

```go
client := redisPlugin.GetClient()
// 获取 go-redis 原生客户端，支持 HSet, SAdd, ZAdd 等高级操作
client.HSet(ctx, "user:123:profile", "name", "alice", "age", 30)
client.SAdd(ctx, "tags:123", "vip", "active")
client.ZAdd(ctx, "ranking", redis.Z{Score: 100, Member: "alice"})
```

## 四、Memcached

```go
import memcachedPlugin "github.com/tx7do/go-wind-plugins/cache/memcached"

cache := memcachedPlugin.NewClient(
    memcachedPlugin.WithServers("localhost:11211"),
    memcachedPlugin.WithTimeout(2*time.Second),
    memcachedPlugin.WithMaxIdleConns(10),
)
```

### YAML 配置

```yaml
cache:
  memcached:
    servers:
      - "localhost:11211"
      - "localhost:11212"
    timeout: 2s
    max_idle_conns: 10
```

## 五、FreeCache（本地缓存）

```go
import freecachePlugin "github.com/tx7do/go-wind-plugins/cache/freecache"

cache := freecachePlugin.New(
    freecachePlugin.WithSize(256 * 1024 * 1024),  // 256 MB
)
```

### YAML 配置

```yaml
cache:
  freecache:
    size: 268435456   # 256 MB in bytes
```

## 六、多级缓存

```yaml
cache:
  l1:                    # 本地缓存 (L1)
    driver: freecache
    size: 134217728      # 128 MB
    ttl: 60s
  l2:                    # 分布式缓存 (L2)
    driver: redis
    addr: localhost:6379
    ttl: 10m
```

```go
// 多级缓存包装器
func getCached(ctx context.Context, key string) ([]byte, error) {
    // L1: 本地缓存
    if data, err := l1Cache.Get(ctx, key); err == nil {
        return data, nil
    }

    // L2: Redis
    if data, err := l2Cache.Get(ctx, key); err == nil {
        l1Cache.Set(ctx, key, data, 60*time.Second)
        return data, nil
    }

    // DB 回源
    data := loadFromDB(key)
    l1Cache.Set(ctx, key, data, 60*time.Second)
    l2Cache.Set(ctx, key, data, 10*time.Minute)
    return data, nil
}
```

## 七、选择指南

| 场景 | 推荐 | 理由 |
|------|------|------|
| 通用分布式缓存 | Redis | 丰富的数据结构、持久化 |
| 纯内存高性能 | Memcached | 极简、极致性能 |
| 热点数据本地缓存 | FreeCache/BigCache | 零 GC、减少网络开销 |
| 多级缓存 | L1(本地) + L2(Redis) | 兼顾延迟和一致性 |

## 相关文档

- [插件配置系统](./plugins-config.md)
- [插件总览](./plugins-intro.md)
- [数据库插件](./plugins-database.md)
