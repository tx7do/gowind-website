# 数据库与缓存插件

go-wind-plugins 的数据访问层（`crud/`）以泛型 `Repository` / `Client` 为核心（家族内部接口，非 go-wind 框架接口），提供 **19 个模块**：9 个数据库引擎、4 个向量/图数据库引擎、1 个统一向量契约（vector），以及 5 个家族共享设施（api / pagination / cache / audit / viewer）。

## 一、数据访问引擎（CRUD）

### 1.1 支持的数据库

| 数据库 | 导入路径 | 说明 |
|--------|---------|------|
| GORM | `plugins/crud/gorm` | GORM 关系型 ORM（MySQL、PostgreSQL、SQLite、SQL Server、ClickHouse 等） |
| Ent | `plugins/crud/entgo` | Ent 关系型 ORM（代码生成） |
| MongoDB | `plugins/crud/mongodb` | MongoDB 文档数据库 |
| ClickHouse | `plugins/crud/clickhouse` | ClickHouse 列式 OLAP |
| Apache Doris | `plugins/crud/doris` | Apache Doris 分析型数据库（MySQL 协议） |
| Elasticsearch | `plugins/crud/elasticsearch` | Elasticsearch 全文检索 |
| OpenSearch | `plugins/crud/opensearch` | OpenSearch 全文检索 |
| InfluxDB | `plugins/crud/influxdb` | InfluxDB 时序数据库 |
| Cassandra | `plugins/crud/cassandra` | Cassandra 宽列存储（开发中，尚未可用） |

### 1.2 使用示例（GORM）

```go
import (
    "github.com/tx7do/go-utils/mapper"
    "github.com/tx7do/go-wind-plugins/crud/gorm"
)

// 创建 Mapper（DTO <-> Entity）
m := mapper.NewCopierMapper[User, UserEntity]()

// 创建 Repository
repo := gorm.NewRepository[User, UserEntity](m,
    gorm.WithDriverName("mysql"),
    gorm.WithDSN("user:pass@tcp(localhost:3306)/mydb?parseTime=true"),
    gorm.WithReplicaDsns([]string{ /* 只读副本 DSN */ }),
    gorm.WithEnableTrace(true),
    gorm.WithEnableMigrate(true),
    gorm.WithAutoMigrate(&UserEntity{}),
)
```

Repository 提供完整 CRUD、Offset/Page/Token 三种分页、结构化过滤、多字段排序、FieldMask 字段选择，可选接入 Redis 缓存（防击穿）。

### 1.3 连接与迁移选项

常用 Option（以 GORM 为例）：`WithGormDB`（注入已有 *gorm.DB）、`WithDriverName`、`WithDSN`、`WithReplicaDsns`（读写分离副本）、`WithEnableTrace`、`WithEnableMetrics`（Prometheus 指标）、`WithEnableDbResolver`、`WithAutoMigrate`、`WithMixin(s)`（字段审计等混入）。

## 二、向量与图数据库

### 2.1 引擎清单

| 引擎 | 导入路径 | 说明 |
|------|---------|------|
| Qdrant | `plugins/crud/qdrant` | 纯向量数据库（官方 gRPC 客户端，点 = ID + 向量 + Payload） |
| Milvus | `plugins/crud/milvus` | 纯向量数据库（行 = 主键 + 标量列 + 向量列） |
| Neo4j | `plugins/crud/neo4j` | 图数据库（节点 = 行，属性 = 列的表式用法） |
| Weaviate | `plugins/crud/weaviate` | 向量数据库（对象 = UUID + 属性 + 向量） |

### 2.2 统一向量契约 vector

`crud/vector` 定义跨引擎统一的向量检索契约（RAG / 语义检索场景），不依赖任何数据库驱动，由各引擎模块把同一份 `Query` 映射到各自底层语法：

| 引擎 | 底层语法 |
|------|----------|
| Elasticsearch 8+/9.x | 顶层 `knn` 子句 + `dense_vector` |
| OpenSearch 2.11+ | `query.knn` + `knn_vector` |
| GORM (PostgreSQL) | pgvector `<->` / `<=>` / `<#>` |
| MongoDB Atlas 7.0+ | `$vectorSearch` 聚合阶段 |
| ClickHouse | cosineDistance / L2Distance / dotProduct |
| Apache Doris 3.0+ | cosine_distance / l2_distance / inner_product |

```go
import "github.com/tx7do/go-wind-plugins/crud/vector"

q := &vector.Query{
    Field:  "embedding",
    Vector: []float32{0.1, 0.2, 0.3},
    TopK:   10,
    Metric: vector.DistanceMetricCosine,
}

res, _ := repo.SearchByVector(ctx, q) // Hit.Score 恒为「越大越相似」
```

## 三、家族共享设施

| 模块 | 导入路径 | 说明 |
|------|---------|------|
| API 契约 | `plugins/crud/api` | Protobuf 分页/过滤/排序协议定义与 buf 生成代码 |
| Pagination | `plugins/crud/pagination` | 分页器（Offset/Page/Token）与过滤、排序格式转换 |
| Cache | `plugins/crud/cache` | Cache-Aside 缓存与 SingleFlight 防击穿 |
| Audit | `plugins/crud/audit` | 审计日志接口与 Context 注入 |
| Viewer | `plugins/crud/viewer` | 身份上下文与五级数据范围（行级权限） |

## 四、服务注册发现

### 4.1 适配器列表

| 注册中心 | 导入路径 | 特点 |
|---------|---------|------|
| Consul | `plugins/registry/consul` | HashiCorp、健康检查 |
| Etcd | `plugins/registry/etcd` | Kubernetes 基础、Raft 一致性 |
| Eureka | `plugins/registry/eureka` | Spring Cloud 集成 |
| Kubernetes | `plugins/registry/kubernetes` | K8s Endpoints |
| Nacos | `plugins/registry/nacos` | 阿里系、配置+注册一体化 |
| Polaris | `plugins/registry/polaris` | 腾讯云 Polaris |
| ServiceComb | `plugins/registry/servicecomb` | Apache ServiceComb |
| ZooKeeper | `plugins/registry/zookeeper` | 经典、强一致性 |

### 4.2 服务注册

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

### 4.3 服务发现

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

### 4.4 YAML 配置

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

## 五、配置中心

### 5.1 适配器列表

| 配置中心 | 导入路径 | 特点 |
|---------|---------|------|
| File | `plugins/config/file` | 本地 YAML/JSON |
| Etcd | `plugins/config/etcd` | 分布式 KV |
| Consul | `plugins/config/consul` | Consul KV |
| Nacos | `plugins/config/nacos` | 配置+注册 |
| Apollo | `plugins/config/apollo` | 携程开源 |

### 5.2 动态配置

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

### 5.3 配置热更新

```go
source.Watch(func(event config.Event) {
    fmt.Println("config changed:", event.Key)
    // 重新加载配置
    reloadConfig(event.Value)
})
```

## 六、多源配置合并

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
