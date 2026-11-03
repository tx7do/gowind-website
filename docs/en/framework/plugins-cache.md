# Cache Plugins

go-wind-plugins provides the unified cache interface `cache.Cache`, with two built-in plugins: a local cache and Redis.

## 1. The Cache Interface

```go
type Cache interface {
    Get(ctx context.Context, key string) ([]byte, error)               // returns ErrNotFound on miss/expiry
    Set(ctx context.Context, key string, value []byte, ttl time.Duration) error  // a zero TTL means never expires
    SetNX(ctx context.Context, key string, value []byte, ttl time.Duration) (bool, error) // distributed-lock / cache-stampede primitive
    Delete(ctx context.Context, key string) error
    Has(ctx context.Context, key string) (bool, error)
    GetMulti(ctx context.Context, keys []string) ([][]byte, error)
    SetMulti(ctx context.Context, items []Item) error
    Close() error
}
```

## 2. Adapter List

| Adapter | Import Path | Engine |
|---------|------------|--------|
| Local | `plugins/cache/local` | In-process memory cache (FreeCache ring buffer, LRU eviction) |
| Redis | `plugins/cache/redis` | go-redis v9 (UniversalClient; standalone/cluster/sentinel) |

## 3. Redis

The application creates and owns the native go-redis client, and the plugin wraps it into the unified `cache.Cache`; `WithKeyPrefix` namespaces keys on a shared instance:

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

### Basic Operations

```go
// Set
cache.Set(ctx, "user:123", []byte(`{"name":"alice"}`), 10*time.Minute)

// Get
data, err := cache.Get(ctx, "user:123")

// Has / Delete
exists, _ := cache.Has(ctx, "user:123")
cache.Delete(ctx, "user:123")

// SetNX: distributed-lock and cache-stampede primitive
ok, _ := cache.SetNX(ctx, "lock:order:123", []byte("locked"), 30*time.Second)

// Batch read/write (translated into native single-round-trip commands)
_ = cache.SetMulti(ctx, []cache.Item{
    {Key: "user:2", Value: []byte("bob"), TTL: 5 * time.Minute},
})
_, _ = cache.GetMulti(ctx, []string{"user:2", "user:3"})
```

### YAML Configuration

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

## 4. Local (In-Process Cache)

An in-process cache built on FreeCache — preallocated ring buffer, LRU eviction, zero GC pauses, and no external service required:

```go
import "github.com/tx7do/go-wind-plugins/cache/local"

c := local.New(
    local.WithSize(100 * 1024 * 1024),   // 100 MB
    local.WithDefaultTTL(5*time.Minute), // default TTL
)
defer c.Close()

_ = c.Set(ctx, "user:1", []byte("alice"), 10*time.Minute)
_, _ = c.Get(ctx, "user:1")
```

### YAML Configuration

```yaml
cache:
  local:
    size: 268435456        # 256 MB in bytes
    default_ttl: 5m
```

## 5. Multi-Level Cache (Local + Redis Combination)

```yaml
cache:
  l1:                    # local cache (L1)
    driver: local
    size: 134217728      # 128 MB
    ttl: 60s
  l2:                    # distributed cache (L2)
    driver: redis
    addr: localhost:6379
    ttl: 10m
```

```go
// Multi-level cache wrapper
func getCached(ctx context.Context, key string) ([]byte, error) {
    // L1: local cache
    if data, err := l1Cache.Get(ctx, key); err == nil {
        return data, nil
    }

    // L2: Redis
    if data, err := l2Cache.Get(ctx, key); err == nil {
        l1Cache.Set(ctx, key, data, 60*time.Second)
        return data, nil
    }

    // Fall back to the database
    data := loadFromDB(key)
    l1Cache.Set(ctx, key, data, 60*time.Second)
    l2Cache.Set(ctx, key, data, 10*time.Minute)
    return data, nil
}
```

## 6. Selection Guide

| Scenario | Recommendation | Rationale |
|----------|----------------|-----------|
| General distributed caching | Redis | Rich data structures, persistence |
| Local caching of hot data | Local | Zero GC, no network overhead |
| Distributed locks / stampede prevention | Redis SetNX | Native support for the SetNX primitive |
| Batch read/write | Redis GetMulti/SetMulti | Single-round-trip commands |
| Multi-level caching | Local(L1) + Redis(L2) | Balances latency and consistency |

## Related Documents

- [Plugin Configuration System](./plugins-config.md)
- [Plugin Overview](./plugins-intro.md)
- [Database Plugins](./plugins-database.md)
