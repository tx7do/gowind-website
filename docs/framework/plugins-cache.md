# 缓存插件

go-wind-plugins 提供统一的缓存接口 `cache.Cache`，内置本地缓存与 Redis 两个插件。

## 一、Cache 接口

```go
type Cache interface {
    Get(ctx context.Context, key string) ([]byte, error)               // 未命中/过期返回 ErrNotFound
    Set(ctx context.Context, key string, value []byte, ttl time.Duration) error  // 零 TTL 表示永不过期
    SetNX(ctx context.Context, key string, value []byte, ttl time.Duration) (bool, error) // 分布式锁/防击穿原语
    Delete(ctx context.Context, key string) error
    Has(ctx context.Context, key string) (bool, error)
    GetMulti(ctx context.Context, keys []string) ([][]byte, error)
    SetMulti(ctx context.Context, items []Item) error
    Close() error
}
```

## 二、适配器列表

| 适配器 | 导入路径 | 引擎 |
|--------|---------|------|
| Local | `plugins/cache/local` | 本地内存缓存（FreeCache 环形缓冲，LRU 淘汰） |
| Redis | `plugins/cache/redis` | go-redis v9（UniversalClient，单机/集群/哨兵） |

## 三、Redis

应用侧创建并持有原生 go-redis 客户端，插件将其包装为统一的 `cache.Cache`；`WithKeyPrefix` 为共享实例上的键做命名空间隔离：

```go
import (
    goredis "github.com/redis/go-redis/v9"
    "github.com/tx7do/go-wind-plugins/cache/redis"
)

client := goredis.NewClient(&goredis.Options{
    Addr: "localhost:6379",
})
defer client.Close()

cache := redis.New(client,
    redis.WithKeyPrefix("myapp:"),
)
defer cache.Close()
```

### 基本操作

```go
// Set
cache.Set(ctx, "user:123", []byte(`{"name":"alice"}`), 10*time.Minute)

// Get
data, err := cache.Get(ctx, "user:123")

// Has / Delete
exists, _ := cache.Has(ctx, "user:123")
cache.Delete(ctx, "user:123")

// SetNX：分布式锁与防击穿原语
ok, _ := cache.SetNX(ctx, "lock:order:123", []byte("locked"), 30*time.Second)

// 批量读写（翻译为原生单次往返命令）
_ = cache.SetMulti(ctx, []cache.Item{
    {Key: "user:2", Value: []byte("bob"), TTL: 5 * time.Minute},
})
_, _ = cache.GetMulti(ctx, []string{"user:2", "user:3"})
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

## 四、Local（本地缓存）

基于 FreeCache 的进程内缓存——预分配环形缓冲、LRU 淘汰、零 GC 停顿，无需外部服务：

```go
import "github.com/tx7do/go-wind-plugins/cache/local"

c := local.New(
    local.WithSize(100 * 1024 * 1024),   // 100 MB
    local.WithDefaultTTL(5*time.Minute), // 默认 TTL
)
defer c.Close()

_ = c.Set(ctx, "user:1", []byte("alice"), 10*time.Minute)
_, _ = c.Get(ctx, "user:1")
```

### YAML 配置

```yaml
cache:
  local:
    size: 268435456        # 256 MB in bytes
    default_ttl: 5m
```

## 五、多级缓存（Local + Redis 组合）

```yaml
cache:
  l1:                    # 本地缓存 (L1)
    driver: local
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

## 六、选择指南

| 场景 | 推荐 | 理由 |
|------|------|------|
| 通用分布式缓存 | Redis | 丰富的数据结构、持久化 |
| 热点数据本地缓存 | Local | 零 GC、无网络开销 |
| 分布式锁 / 防击穿 | Redis SetNX | 原生支持 SetNX 原语 |
| 批量读写 | Redis GetMulti/SetMulti | 单次往返命令 |
| 多级缓存 | Local(L1) + Redis(L2) | 兼顾延迟和一致性 |

## 相关文档

- [插件配置系统](./plugins-config.md)
- [插件总览](./plugins-intro.md)
- [数据库插件](./plugins-database.md)
