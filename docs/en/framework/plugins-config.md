# Plugin Configuration System

Every plugin in go-wind-plugins supports multiple configuration methods: functional options, configuration files, and environment variables. In bootstrap mode, plugins are wired automatically through declarative YAML configuration. The configuration itself can come from the 14 configuration source plugins in the `config/` family (see below).

## 1. Configuration Source Plugins (Config)

The `config/` family implements the unified `config.Source` interface, with 14 plugins in total:

| Plugin | Import Path | Engine |
|--------|------------|--------|
| Apollo | `plugins/config/apollo` | Ctrip Apollo |
| Consul | `plugins/config/consul` | HashiCorp Consul KV |
| Etcd | `plugins/config/etcd` | CoreOS etcd |
| Env | `plugins/config/env` | Environment variables |
| File | `plugins/config/file` | Local files |
| FS | `plugins/config/fs` | fs.FS |
| HTTP | `plugins/config/http` | HTTP remote fetch |
| Kubernetes | `plugins/config/kubernetes` | K8s ConfigMap / Secret |
| Nacos | `plugins/config/nacos` | Alibaba Cloud Nacos |
| OSS | `plugins/config/oss` | Object storage |
| Polaris | `plugins/config/polaris` | Tencent Cloud Polaris |
| Redis | `plugins/config/redis` | Redis KV |
| Vault | `plugins/config/vault` | HashiCorp Vault |
| Zookeeper | `plugins/config/zookeeper` | Apache ZooKeeper |

Multiple configuration sources can be combined: `FallbackReader` tries several sources in priority order, providing multi-source fallback.

## 2. Configuration Hierarchy

```yaml
# config.yaml
server:
  http:
    addr: ":8080"
    timeout: 30s
    cors:
      enabled: true
      origins: ["*"]

database:
  default:                    # database connection name
    driver: mysql
    dsn: "user:pass@tcp(localhost:3306)/db?parseTime=true"
    max_open_conns: 100
    max_idle_conns: 20
    conn_max_lifetime: 300s

cache:
  redis:
    addr: "localhost:6379"
    db: 0
    pool_size: 50

broker:
  kafka:
    addrs: ["localhost:9092"]
    group_id: "my-service"
```

## 3. Functional Options

All plugins provide the `With*` family of functional options:

```go
import (
    httpPlugin "github.com/tx7do/go-wind-plugins/transport/http"
    redisPlugin "github.com/tx7do/go-wind-plugins/cache/redis"
    zapPlugin "github.com/tx7do/go-wind-plugins/log/zap"
)

// Manual construction
httpServer := httpPlugin.NewServer(
    httpPlugin.WithAddr(":8080"),
    httpPlugin.WithHandler(router),
    httpPlugin.WithReadTimeout(10*time.Second),
)

cache := redisPlugin.NewClient(
    redisPlugin.WithAddr("localhost:6379"),
    redisPlugin.WithDB(0),
    redisPlugin.WithPoolSize(50),
)

logger := zapPlugin.NewLogger(
    zapPlugin.WithLevel("info"),
    zapPlugin.WithOutput("stdout"),
    zapPlugin.WithFormat("json"),
)
```

## 4. Bootstrap Auto-Wiring

When using bootstrap, the configuration file is mapped automatically onto plugin options:

```go
import (
    _ "github.com/tx7do/go-wind-plugins/transport/http"     // blank import
    _ "github.com/tx7do/go-wind-plugins/cache/redis"
    _ "github.com/tx7do/go-wind-plugins/log/zap"
    _ "github.com/tx7do/go-wind-plugins/crud/gorm"
)

func main() {
    // bootstrap reads config.yaml automatically
    // creates the HTTP Server from the server.http config
    // creates the Redis Client from the cache.redis config
    // creates data-access clients from the database config
    app := bootstrap.New("config.yaml")
    app.Run()
}
```

## 5. Configuration Structure Mapping

Each plugin defines its own configuration struct:

```go
// transport/http/config.go
package http

type Config struct {
    Addr         string        `yaml:"addr"`
    Timeout      time.Duration `yaml:"timeout"`
    ReadTimeout  time.Duration `yaml:"read_timeout"`
    WriteTimeout time.Duration `yaml:"write_timeout"`
    CORS         CORSConfig    `yaml:"cors"`
    TLS          TLSConfig     `yaml:"tls"`
}

type CORSConfig struct {
    Enabled    bool     `yaml:"enabled"`
    Origins    []string `yaml:"origins"`
    Methods    []string `yaml:"methods"`
    Headers    []string `yaml:"headers"`
    Credentials bool    `yaml:"credentials"`
}
```

## 6. Environment Variable Overrides

Configuration values can be overridden via environment variables, joined with `UPPERCASE_UNDERSCORE`:

```bash
# Override server.http.addr
export SERVER_HTTP_ADDR=":9090"

# Override database.default.dsn
export DATABASE_DEFAULT_DSN="user:pass@tcp(prod-db:3306)/db"

# Override cache.redis.addr
export CACHE_REDIS_ADDR="prod-redis:6379"
```

## 7. Multi-Instance Configuration

Some plugins support multiple instances, distinguished by connection name:

```yaml
database:
  default:        # primary
    driver: mysql
    dsn: "user:pass@tcp(master:3306)/db"
  readonly:       # read replica
    driver: mysql
    dsn: "user:pass@tcp(replica:3306)/db"
  analytics:      # analytics database
    driver: clickhouse
    dsn: "clickhouse://localhost:9000/analytics"

cache:
  default:        # primary cache
    driver: redis
    addr: "localhost:6379"
  session:        # session cache
    driver: redis
    addr: "localhost:6380"
```

## Related Documents

- [Plugin Registration Mechanism](./plugins-registry.md)
- [Plugin Overview](./plugins-intro.md)
- [Bootstrap Configuration System](./bootstrap-config.md)
- [Core Framework Introduction](./core-intro.md)
