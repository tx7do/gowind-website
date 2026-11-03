# The Bootstrap Configuration System

The configuration system of go-wind-bootstrap takes **Protobuf as the contract**: the top-level `BootstrapConfig` is defined by `.proto` files under `conf/proto/bootstrap/v1/`, and a single YAML file describes the complete application topology — transports, the configuration center, the service registry, logging, tracing, metrics, message brokers, storage, AI, workflows, caching, script engines, and databases.

## 1. Configuration Structure (Protobuf Contract)

The top-level fields of `BootstrapConfig` correspond one-to-one with the proto files:

| Field | Proto File | Responsibility |
|------|-----------|------|
| `app` | `app.proto` | Application metadata: id / name / version / env / stop_timeout |
| `server` | `server.proto` | Transports + middleware (HTTP, gRPC, MCP, Cron, etc. as optional fields) |
| `config` | `config.proto` | Configuration center sources (several can be mixed) |
| `registry` | `registry.proto` | Service registration and discovery |
| `logger` | `log.proto` | Logging system |
| `tracer` | `tracer.proto` | Distributed tracing |
| `metrics` | `metrics.proto` | Metrics monitoring |
| `broker` | `broker.proto` | Message broker |
| `storage` | `storage.proto` | Object storage (MinIO / S3) |
| `ai` | `ai.proto` | AI model clients |
| `workflow` | `workflow.proto` | Workflow engines |
| `cache` | `cache.proto` | Cache (local in-memory / Redis) |
| `script` | `script.proto` | Script engines |
| `database` | `database.proto` | Databases |

Configuration is the application: the bootstrap engine reads `BootstrapConfig` and assembles the `wind.App` automatically through registered Builders:

```
BootstrapConfig → Builder Registry → wind.Option chain → wind.App
```

## 2. One YAML File Describing the Full Application Topology

```yaml
app:
  id: my-service-01
  name: my-service
  version: "1.0.0"
  env: production

server:
  http:
    addr: ":8080"
    middleware:
      recovery: {}
      cors:
        allowed_origins: ["*"]
      logging:
        skip_paths: ["/health"]
  grpc:
    addr: ":9000"
    reflection: true
    middleware:
      recovery: {}
      validate: {}

logger:
  type: zap
  zap:
    level: info
    format: json
    writer: file            # stdout / stderr / file
    output_path: logs/app.log
    max_size_mb: 100        # With rolling parameters configured, lumberjack is used
    max_age_days: 7
    max_backups: 10
    compress: true

registry:
  type: etcd
  etcd:
    endpoints: ["localhost:2379"]
    ttl: 30
    dial_timeout: 5

tracer:
  type: otlp
  otlp:
    endpoint: "localhost:4317"
    insecure: true
    sampler: trace_id_ratio
    sample_ratio: 0.1

cache:
  redis:
    mode: standalone        # standalone / cluster / sentinel, inferred automatically from fields
    addr: "localhost:6379"
    key_prefix: "my-service"

database:
  sql:
    driver: mysql
    source: "user:pass@tcp(localhost:3306)/db?parseTime=true"
    max_open_connections: 100
```

## 3. Configuration Surface Extensions

### 3.1 Logging: zap stderr / rolling logs, zerolog rolling logs

- **zap** adds a `writer` field (`stdout` / `stderr` / `file`, default stdout) plus rolling log parameters: `max_size_mb` (maximum size of a single file in MB), `max_age_days` (maximum retention in days), `max_backups` (maximum number of backups), and `compress` (compress archived logs). Once any rolling parameter is configured, file output goes through lumberjack.
- **zerolog** gains the same set of rolling log parameters (`max_size_mb` / `max_age_days` / `max_backups` / `compress`).

```yaml
logger:
  type: zerolog
  zerolog:
    level: debug
    format: json
    output_path: logs/app.log
    max_size_mb: 50
    max_backups: 5
```

### 3.2 Cache: Redis Rewritten on UniversalClient

The Redis cache has been rewritten on top of the go-redis `UniversalClient`, covering three deployment topologies with a single configuration surface; the client mode is inferred automatically from fields — configuring `master_name` means sentinel, configuring `addrs` (more than one, or combined with `mode`) means cluster, otherwise standalone:

```yaml
cache:
  redis:
    mode: sentinel
    master_name: mymaster
    addrs: ["sentinel-1:26379", "sentinel-2:26379"]
    sentinel_username: sentinel-user
    sentinel_password: sentinel-pass
    key_prefix: "my-service"
```

Connection pool and timeout parameters (`dial_timeout`, `read_timeout`, `pool_size`, `min_idle_conns`, `max_retries`, etc.) and TLS configuration have been added as well.

### 3.3 Tracing: The OTLP Adapter

Tracing is unified into a single OTLP type with fully configurable parameters: `endpoint`, `insecure`, `headers`, sampling strategy (`always_on` / `always_off` / `trace_id_ratio` / `parent_based` + `sample_ratio`), `use_http` (report over HTTP instead of gRPC), and batch/export timeouts:

```yaml
tracer:
  type: otlp
  otlp:
    endpoint: "otel-collector:4317"
    sampler: parent_based
    use_http: false
    batch_timeout_ms: 5000
```

### 3.4 gRPC Server Option Wiring

TLS, reflection, keepalive, and other gRPC server options are all wired into the configuration surface:

```yaml
server:
  grpc:
    addr: ":9000"
    reflection: true              # Enable gRPC reflection
    tls:
      file:
        cert_path: /etc/certs/tls.crt
        key_path: /etc/certs/tls.key
    keepalive_time: 30            # Probe interval (seconds)
    keepalive_timeout: 10         # Probe response timeout (seconds)
    keepalive_min_time: 300       # Minimum client probe interval (seconds)
    connection_timeout: 20        # Request-level connection timeout (seconds)
    max_recv_msg_size: 4194304    # Maximum received message size (bytes)
    max_send_msg_size: 4194304    # Maximum sent message size (bytes)
    max_concurrent_streams: 100   # Maximum concurrent streams
```

TLS uses the generic `TLS` proto (file paths or inline PEM + `insecure_skip_verify`); the same structure is reused by the registry, config, cache, and other configuration surfaces.

### 3.5 MCP Transport Parameters Made Configurable

The MCP (Model Context Protocol) transport supports `server_type` (SSE / HTTP / STDIO / IN_PROCESS), `instructions` (capability description returned to clients), and fine-grained capability switches:

```yaml
server:
  mcp:
    name: my-mcp-server
    version: "1.0.0"
    address: ":8090"
    server_type: SSE
    instructions: "Order query and management toolset"
    recovery: true
    logging: true
    tool_capabilities: true
    resource_capabilities: true
    enable_input_schema_validation: true
```

### 3.6 Object Storage: MinIO / S3 Aligned to the New Configuration Surface

`storage` supports two types, MinIO and S3, with fields aligned to the new configuration surface (endpoint, credentials, region, `use_ssl`, `force_path_style`, bucket, etc.):

```yaml
storage:
  minio:
    endpoint: "localhost:9000"
    access_key: minioadmin
    secret_key: minioadmin
    use_ssl: false
```

### 3.7 Databases: go-crud Upgrade Brings New Vector / Graph Adapters

Relational/document/search engines gain vector search capabilities along with the go-crud upgrade, and new vector and graph adapters have been added: **Qdrant, Milvus, Weaviate (vector), Neo4j (graph)** — 13 engines in total together with GORM / MongoDB / ClickHouse / Doris / Elasticsearch / OpenSearch / InfluxDB / Cassandra, all self-registering via SPI.

## 4. Field Mappings Generated by protoc-gen-fieldmap

The mechanical "configuration field → upstream option" mappings inside each adapter are no longer maintained by hand: a `mapping.spec.yaml` file next to each adapter declares the mapping rules, and [protoc-gen-fieldmap](/en/toolkit/fieldmap.md) generates strongly typed `mapping.gen.go` files (e.g. `MapSQLOptions`, `NewMinioConfig`); special fields such as composite options and TLS loading are registered with `skip: true` and kept in the adapters' hand-written sections.

The `fieldmap-drift` CI job regenerates `mapping.gen.go` from the spec and compares byte-by-byte — a PR that changes the proto but forgets to sync the spec turns red in CI immediately, so the configuration surface and upstream library options cannot drift apart. See [protoc-gen-fieldmap: The Field Mapping Generator](/en/toolkit/fieldmap.md) for the complete maintenance conventions.

## 5. Configuration Loading and Multiple Formats

`LoadConfigFromFile` auto-detects the format by extension: `.yaml` / `.yml` → YAML, `.json` → JSON, `.bin` / `.pb` → Protobuf binary. The command line is integrated via Cobra, with `-c/--conf` specifying the configuration file:

```bash
go run main.go -c config.yaml
```

## 6. Accessing Configuration in Code

`BootstrapConfig` is a strongly typed Protobuf message, accessed in code through generated accessors (not string-path lookups). In semi-sealed mode, `Context` provides typed accessors:

```go
bctx, err := bootstrap.BootstrapWithContext(nil, cfg)
if err != nil {
    log.Fatal(err)
}
defer bctx.Cleanup()

// Access the raw configuration (Protobuf message)
appName := bctx.Config().GetApp().GetName()
httpAddr := bctx.Config().GetServer().GetHttp().GetAddr()

// Access assembled instances (retrieved by component type key, e.g. "gorm"/"redis"/"etcd")
db := bctx.Database("gorm")
cache := bctx.Cache("redis")
reg := bctx.Registry("etcd")   // GetService/Watch/Register/Deregister

// Run
bctx.App().Run(bctx)
```

## 7. Sensitive Information Management

| Method | Security Level | Description |
|------|---------|------|
| Environment variable injection | High | K8s Secret / Docker Secrets inject configuration before startup |
| Vault configuration source | Highest | Dynamic retrieval via the `config.vault` source |
| Configuration center | High | Hosted via Nacos/Apollo configuration sources |
| Inline TLS PEM | High | Certificates can be mounted from Secrets; never commit them to the repository |

```yaml
# Never hardcode passwords in configuration files!
# Wrong: source: "user:password123@tcp(localhost:3306)/db"
# Right: inject via environment variables/configuration center at deploy time;
#        keep only templates in the repository
```

## Related Documentation

- [Bootstrap Introduction](./bootstrap-intro.md)
- [The Bootstrap SPI Mechanism](./bootstrap-spi.md)
- [protoc-gen-fieldmap: The Field Mapping Generator](/en/toolkit/fieldmap.md)
- [Plugin Configuration System](./plugins-config.md)
- [Core Framework Introduction](./core-intro.md)
