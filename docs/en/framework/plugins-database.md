# Database and Cache Plugins

The data-access layer of go-wind-plugins (`crud/`) centers on generic `Repository` / `Client` types (family-internal interfaces, not go-wind framework interfaces) and provides **19 modules**: 9 database engines, 4 vector/graph database engines, 1 unified vector contract (vector), and 5 family-shared facilities (api / pagination / cache / audit / viewer).

## 1. Data-Access Engines (CRUD)

### 1.1 Supported Databases

| Database | Import Path | Description |
|----------|------------|-------------|
| GORM | `plugins/crud/gorm` | GORM relational ORM (MySQL, PostgreSQL, SQLite, SQL Server, ClickHouse, etc.) |
| Ent | `plugins/crud/entgo` | Ent relational ORM (code generation) |
| MongoDB | `plugins/crud/mongodb` | MongoDB document database |
| ClickHouse | `plugins/crud/clickhouse` | ClickHouse columnar OLAP |
| Apache Doris | `plugins/crud/doris` | Apache Doris analytics database (MySQL protocol) |
| Elasticsearch | `plugins/crud/elasticsearch` | Elasticsearch full-text search |
| OpenSearch | `plugins/crud/opensearch` | OpenSearch full-text search |
| InfluxDB | `plugins/crud/influxdb` | InfluxDB time-series database |
| Cassandra | `plugins/crud/cassandra` | Cassandra wide-column store (under development, not yet available) |

### 1.2 Usage Example (GORM)

```go
import (
    "github.com/tx7do/go-utils/mapper"
    "github.com/tx7do/go-wind-plugins/crud/gorm"
)

// Create a Mapper (DTO <-> Entity)
m := mapper.NewCopierMapper[User, UserEntity]()

// Create a Repository
repo := gorm.NewRepository[User, UserEntity](m,
    gorm.WithDriverName("mysql"),
    gorm.WithDSN("user:pass@tcp(localhost:3306)/mydb?parseTime=true"),
    gorm.WithReplicaDsns([]string{ /* read-replica DSNs */ }),
    gorm.WithEnableTrace(true),
    gorm.WithEnableMigrate(true),
    gorm.WithAutoMigrate(&UserEntity{}),
)
```

The Repository provides full CRUD, three pagination modes (Offset/Page/Token), structured filtering, multi-field sorting, FieldMask field selection, and optional Redis caching (with stampede prevention).

### 1.3 Connection and Migration Options

Common Options (GORM as the example): `WithGormDB` (inject an existing *gorm.DB), `WithDriverName`, `WithDSN`, `WithReplicaDsns` (read/write splitting replicas), `WithEnableTrace`, `WithEnableMetrics` (Prometheus metrics), `WithEnableDbResolver`, `WithAutoMigrate`, `WithMixin(s)` (mixins such as field auditing).

## 2. Vector and Graph Databases

### 2.1 Engine List

| Engine | Import Path | Description |
|--------|------------|-------------|
| Qdrant | `plugins/crud/qdrant` | Pure vector database (official gRPC client; point = ID + vector + payload) |
| Milvus | `plugins/crud/milvus` | Pure vector database (row = primary key + scalar columns + vector column) |
| Neo4j | `plugins/crud/neo4j` | Graph database (table-style usage: node = row, property = column) |
| Weaviate | `plugins/crud/weaviate` | Vector database (object = UUID + properties + vector) |

### 2.2 The Unified Vector Contract (vector)

`crud/vector` defines a cross-engine unified vector search contract (for RAG / semantic search scenarios). It depends on no database driver; each engine module maps the same `Query` onto its own underlying syntax:

| Engine | Underlying Syntax |
|--------|-------------------|
| Elasticsearch 8+/9.x | top-level `knn` clause + `dense_vector` |
| OpenSearch 2.11+ | `query.knn` + `knn_vector` |
| GORM (PostgreSQL) | pgvector `<->` / `<=>` / `<#>` |
| MongoDB Atlas 7.0+ | `$vectorSearch` aggregation stage |
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

res, _ := repo.SearchByVector(ctx, q) // Hit.Score is always "higher is more similar"
```

## 3. Family-Shared Facilities

| Module | Import Path | Description |
|--------|------------|-------------|
| API contract | `plugins/crud/api` | Protobuf pagination/filter/sort protocol definitions and buf-generated code |
| Pagination | `plugins/crud/pagination` | Paginators (Offset/Page/Token) and filter/sort format conversion |
| Cache | `plugins/crud/cache` | Cache-Aside caching with SingleFlight stampede prevention |
| Audit | `plugins/crud/audit` | Audit log interface and Context injection |
| Viewer | `plugins/crud/viewer` | Identity context and five-level data scope (row-level permissions) |

## 4. Service Registration and Discovery

### 4.1 Adapter List

| Service Registry | Import Path | Highlights |
|------------------|------------|------------|
| Consul | `plugins/registry/consul` | HashiCorp, health checks |
| Etcd | `plugins/registry/etcd` | Kubernetes foundation, Raft consistency |
| Eureka | `plugins/registry/eureka` | Spring Cloud integration |
| Kubernetes | `plugins/registry/kubernetes` | K8s Endpoints |
| Nacos | `plugins/registry/nacos` | Alibaba ecosystem, configuration + registry in one |
| Polaris | `plugins/registry/polaris` | Tencent Cloud Polaris |
| ServiceComb | `plugins/registry/servicecomb` | Apache ServiceComb |
| ZooKeeper | `plugins/registry/zookeeper` | Classic, strong consistency |

### 4.2 Service Registration

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

### 4.3 Service Discovery

```go
// Get the list of service instances
instances, _ := reg.GetService(ctx, "my-service")
for _, ins := range instances {
    fmt.Printf("%s:%d (weight=%d, healthy=%v)\n",
        ins.Address, ins.Port, ins.Weight, ins.Healthy)
}

// Load balancing
lb := registry.NewRoundRobin(instances)
instance := lb.Select()
```

### 4.4 YAML Configuration

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

## 5. Configuration Center

### 5.1 Adapter List

| Configuration Center | Import Path | Highlights |
|----------------------|------------|------------|
| File | `plugins/config/file` | Local YAML/JSON |
| Etcd | `plugins/config/etcd` | Distributed KV |
| Consul | `plugins/config/consul` | Consul KV |
| Nacos | `plugins/config/nacos` | Configuration + registry |
| Apollo | `plugins/config/apollo` | Open-sourced by Ctrip |

### 5.2 Dynamic Configuration

```go
import nacosConfigPlugin "github.com/tx7do/go-wind-plugins/config/nacos"

source := nacosConfigPlugin.New(
    nacosConfigPlugin.WithAddr("localhost:8848"),
    nacosConfigPlugin.WithNamespace("production"),
    nacosConfigPlugin.WithDataID("my-service.yaml"),
    nacosConfigPlugin.WithGroup("DEFAULT_GROUP"),
    nacosConfigPlugin.WithWatch(true),     // watch for config changes
)
```

### 5.3 Config Hot Reload

```go
source.Watch(func(event config.Event) {
    fmt.Println("config changed:", event.Key)
    // reload the configuration
    reloadConfig(event.Value)
})
```

## 6. Multi-Source Configuration Merging

```yaml
config:
  sources:
    - type: file
      path: ./config.yaml
    - type: nacos
      addr: localhost:8848
      data_id: my-service.yaml
  # later-loaded sources override earlier ones
```

## Related Documents

- [Plugin Configuration System](./plugins-config.md)
- [Cache Plugins](./plugins-cache.md)
- [Plugin Overview](./plugins-intro.md)
