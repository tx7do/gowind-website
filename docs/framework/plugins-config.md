# 插件配置系统

go-wind-plugins 的每个插件都支持多种配置方式：函数式选项、配置文件、环境变量。在 bootstrap 模式下，通过 YAML 声明式配置自动装配。

## 一、配置层级

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
  default:                    # 数据库连接名
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

## 二、函数式选项

所有插件都提供 `With*` 系列函数式选项：

```go
import (
    httpPlugin "github.com/tx7do/go-wind-plugins/transport/http"
    redisPlugin "github.com/tx7do/go-wind-plugins/cache/redis"
    zapPlugin "github.com/tx7do/go-wind-plugins/log/zap"
)

// 手动构建
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

## 三、Bootstrap 自动装配

使用 bootstrap 时，配置文件自动映射到插件选项：

```go
import (
    _ "github.com/tx7do/go-wind-plugins/transport/http"     // blank import
    _ "github.com/tx7do/go-wind-plugins/cache/redis"
    _ "github.com/tx7do/go-wind-plugins/log/zap"
    _ "github.com/tx7do/go-wind-plugins/database/mysql"
)

func main() {
    // bootstrap 自动读取 config.yaml
    // 根据 server.http 配置创建 HTTP Server
    // 根据 cache.redis 配置创建 Redis Client
    // 根据 database.default 配置创建 Ent Client
    app := bootstrap.New("config.yaml")
    app.Run()
}
```

## 四、配置结构映射

每个插件定义自己的配置结构体：

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

## 五、环境变量覆盖

配置值可通过环境变量覆盖，格式为 `大写_下划线` 连接：

```bash
# 覆盖 server.http.addr
export SERVER_HTTP_ADDR=":9090"

# 覆盖 database.default.dsn
export DATABASE_DEFAULT_DSN="user:pass@tcp(prod-db:3306)/db"

# 覆盖 cache.redis.addr
export CACHE_REDIS_ADDR="prod-redis:6379"
```

## 六、多实例配置

某些插件支持多实例，通过连接名区分：

```yaml
database:
  default:        # 主库
    driver: mysql
    dsn: "user:pass@tcp(master:3306)/db"
  readonly:       # 只读副本
    driver: mysql
    dsn: "user:pass@tcp(replica:3306)/db"
  analytics:      # 分析库
    driver: clickhouse
    dsn: "clickhouse://localhost:9000/analytics"

cache:
  default:        # 主缓存
    driver: redis
    addr: "localhost:6379"
  session:        # Session 缓存
    driver: redis
    addr: "localhost:6380"
```

## 相关文档

- [插件注册机制](./plugins-registry.md)
- [插件总览](./plugins-intro.md)
- [Bootstrap 配置系统](./bootstrap-config.md)
- [核心框架介绍](./core-intro.md)
