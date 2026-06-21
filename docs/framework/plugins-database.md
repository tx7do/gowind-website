# 数据库与缓存插件

go-wind-plugins 基于 Ent ORM 框架提供数据库适配器，同时集成了服务注册发现等插件。

## 一、数据库适配器

基于 [Ent](https://entgo.io/) ORM，统一 `ent.Client` 接口。

### 1.1 支持的数据库

| 数据库 | 导入路径 | Dialect |
|--------|---------|---------|
| MySQL | `plugins/database/mysql` | `mysql` |
| PostgreSQL | `plugins/database/postgres` | `postgres` |
| SQLite | `plugins/database/sqlite` | `sqlite3` |
| ClickHouse | `plugins/database/clickhouse` | `clickhouse` |
| SQL Server | `plugins/database/mssql` | `mssql` |
| MariaDB | `plugins/database/mariadb` | `mysql` |
| TiDB | `plugins/database/tidb` | `mysql` |
| MongoDB | `plugins/database/mongo` | MongoDB Driver |

### 1.2 使用示例

```go
import mysqlPlugin "github.com/tx7do/go-wind-plugins/database/mysql"

client, _ := mysqlPlugin.New(
    mysqlPlugin.WithDSN("user:pass@tcp(localhost:3306)/mydb?parseTime=true"),
    mysqlPlugin.WithMaxOpenConns(100),
    mysqlPlugin.WithMaxIdleConns(20),
    mysqlPlugin.WithConnMaxLifetime(300 * time.Second),
    mysqlPlugin.WithLogLevel("info"),
    mysqlPlugin.WithSlowThreshold(200 * time.Millisecond),
)
```

### 1.3 YAML 配置

```yaml
database:
  default:               # 默认连接
    driver: mysql
    dsn: "user:pass@tcp(localhost:3306)/mydb?parseTime=true"
    max_open_conns: 100
    max_idle_conns: 20
    conn_max_lifetime: 300s
    log_level: warn      # silent | error | warn | info
    slow_threshold: 200ms

  readonly:              # 只读副本
    driver: postgres
    dsn: "postgres://user:pass@replica:5432/mydb?sslmode=disable"
    max_open_conns: 50

  analytics:             # 分析库
    driver: clickhouse
    dsn: "clickhouse://localhost:9000/analytics"
```

### 1.4 数据库迁移

```go
// 自动迁移
client := mysqlPlugin.GetClient()
client.Schema.Create(ctx,
    schema.WithAtlas(true),                    // 使用 Atlas 迁移引擎
    schema.WithDropIndex(true),
    schema.WithDropColumn(true),
)
```

## 二、服务注册发现

### 2.1 适配器列表

| 注册中心 | 导入路径 | 特点 |
|---------|---------|------|
| Consul | `plugins/registry/consul` | HashiCorp、健康检查 |
| Etcd | `plugins/registry/etcd` | Kubernetes 基础、Raft 一致性 |
| Nacos | `plugins/registry/nacos` | 阿里系、配置+注册一体化 |
| ZooKeeper | `plugins/registry/zookeeper` | 经典、强一致性 |
| Eureka | `plugins/registry/eureka` | Spring Cloud 集成 |

### 2.2 服务注册

```go
import consulPlugin "github.com/tx7do/go-wind-plugins/registry/consul"

reg := consulPlugin.New(
    consulPlugin.WithAddr("localhost:8500"),
    consulPlugin.WithServiceName("my-service"),
    consulPlugin.WithServiceAddr("10.0.0.1"),
    consulPlugin.WithServicePort(8080),
    consulPlugin.WithHealthCheck("http://10.0.0.1:8080/health", 10*time.Second),
    consulPlugin.WithTags("v1", "primary"),
)
```

### 2.3 服务发现

```go
// 获取服务实例列表
instances, _ := reg.GetService(ctx, "my-service")
for _, ins := range instances {
    fmt.Printf("%s:%d (weight=%d, healthy=%v)\n",
        ins.Address, ins.Port, ins.Weight, ins.Healthy)
}

// 负载均衡
lb := registry.NewRoundRobin(instances)
instance := lb.Select()
```

### 2.4 YAML 配置

```yaml
registry:
  consul:
    addr: "localhost:8500"
    scheme: http
    health_check:
      interval: 10s
      timeout: 5s
      deregister_after: 60s
    tags: ["v1", "primary"]
```

## 三、配置中心

### 3.1 适配器列表

| 配置中心 | 导入路径 | 特点 |
|---------|---------|------|
| File | `plugins/config/file` | 本地 YAML/JSON |
| Etcd | `plugins/config/etcd` | 分布式 KV |
| Consul | `plugins/config/consul` | Consul KV |
| Nacos | `plugins/config/nacos` | 配置+注册 |
| Apollo | `plugins/config/apollo` | 携程开源 |

### 3.2 动态配置

```go
import nacosConfigPlugin "github.com/tx7do/go-wind-plugins/config/nacos"

source := nacosConfigPlugin.New(
    nacosConfigPlugin.WithAddr("localhost:8848"),
    nacosConfigPlugin.WithNamespace("production"),
    nacosConfigPlugin.WithDataID("my-service.yaml"),
    nacosConfigPlugin.WithGroup("DEFAULT_GROUP"),
    nacosConfigPlugin.WithWatch(true),     // 监听配置变更
)
```

### 3.3 配置热更新

```go
source.Watch(func(event config.Event) {
    fmt.Println("config changed:", event.Key)
    // 重新加载配置
    reloadConfig(event.Value)
})
```

## 四、多源配置合并

```yaml
config:
  sources:
    - type: file
      path: ./config.yaml
    - type: nacos
      addr: localhost:8848
      data_id: my-service.yaml
  # 后加载的源覆盖先加载的
```

## 相关文档

- [插件配置系统](./plugins-config.md)
- [缓存插件](./plugins-cache.md)
- [插件总览](./plugins-intro.md)
