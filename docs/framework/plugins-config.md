# 插件配置系统

go-wind-plugins 的每个插件都支持多种配置方式：函数式选项、配置文件、环境变量。在 bootstrap 模式下，通过 YAML 声明式配置自动装配。配置本身可来自 `config/` 家族的 14 个配置源插件（见下文）。

## 一、配置源插件（Config）

`config/` 家族实现统一的 `config.Source` 接口，共 14 个插件：

| 插件 | 导入路径 | 引擎 |
|------|---------|------|
| Apollo | `plugins/config/apollo` | 携程 Apollo |
| Consul | `plugins/config/consul` | HashiCorp Consul KV |
| Etcd | `plugins/config/etcd` | CoreOS etcd |
| Env | `plugins/config/env` | 环境变量 |
| File | `plugins/config/file` | 本地文件 |
| FS | `plugins/config/fs` | fs.FS |
| HTTP | `plugins/config/http` | HTTP 远程拉取 |
| Kubernetes | `plugins/config/kubernetes` | K8s ConfigMap / Secret |
| Nacos | `plugins/config/nacos` | 阿里云 Nacos |
| OSS | `plugins/config/oss` | 对象存储 |
| Polaris | `plugins/config/polaris` | 腾讯云 Polaris |
| Redis | `plugins/config/redis` | Redis KV |
| Vault | `plugins/config/vault` | HashiCorp Vault |
| Zookeeper | `plugins/config/zookeeper` | Apache ZooKeeper |

多个配置源可组合使用：`FallbackReader` 按优先级依次尝试多个源，实现多源回退。

## 二、配置层级

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

## 三、函数式选项

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

## 四、Bootstrap 自动装配

使用 bootstrap 时，配置文件自动映射到插件选项：

```go
import (
    _ "github.com/tx7do/go-wind-plugins/transport/http"     // blank import
    _ "github.com/tx7do/go-wind-plugins/cache/redis"
    _ "github.com/tx7do/go-wind-plugins/log/zap"
    _ "github.com/tx7do/go-wind-plugins/crud/gorm"
)

func main() {
    // bootstrap 自动读取 config.yaml
    // 根据 server.http 配置创建 HTTP Server
    // 根据 cache.redis 配置创建 Redis Client
    // 根据 database 配置创建数据访问客户端
    app := bootstrap.New("config.yaml")
    app.Run()
}
```

## 五、配置结构映射

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

## 六、环境变量覆盖

配置值可通过环境变量覆盖，格式为 `大写_下划线` 连接：

```bash
# 覆盖 server.http.addr
export SERVER_HTTP_ADDR=":9090"

# 覆盖 database.default.dsn
export DATABASE_DEFAULT_DSN="user:pass@tcp(prod-db:3306)/db"

# 覆盖 cache.redis.addr
export CACHE_REDIS_ADDR="prod-redis:6379"
```

## 七、多实例配置

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
