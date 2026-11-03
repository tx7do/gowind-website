# Bootstrap 配置系统

go-wind-bootstrap 的配置系统以 **Protobuf 为契约**：顶层 `BootstrapConfig` 由 `conf/proto/bootstrap/v1/` 下的 `.proto` 文件定义，一份 YAML 即可描述完整的应用拓扑——传输层、配置中心、注册中心、日志、追踪、指标、消息代理、存储、AI、工作流、缓存、脚本引擎、数据库。

## 一、配置结构（Protobuf 契约）

`BootstrapConfig` 的顶层字段与 proto 文件一一对应：

| 字段 | Proto 文件 | 职责 |
|------|-----------|------|
| `app` | `app.proto` | 应用元数据：id / name / version / env / stop_timeout |
| `server` | `server.proto` | 传输层 + 中间件（HTTP、gRPC、MCP、Cron 等 optional 字段） |
| `config` | `config.proto` | 配置中心源（可混合多种） |
| `registry` | `registry.proto` | 服务注册发现 |
| `logger` | `log.proto` | 日志系统 |
| `tracer` | `tracer.proto` | 分布式追踪 |
| `metrics` | `metrics.proto` | 指标监控 |
| `broker` | `broker.proto` | 消息代理 |
| `storage` | `storage.proto` | 对象存储（MinIO / S3） |
| `ai` | `ai.proto` | AI 模型客户端 |
| `workflow` | `workflow.proto` | 工作流引擎 |
| `cache` | `cache.proto` | 缓存（本地内存 / Redis） |
| `script` | `script.proto` | 脚本引擎 |
| `database` | `database.proto` | 数据库 |

配置即应用：bootstrap 引擎读取 `BootstrapConfig`，通过注册的 Builder 自动组装 `wind.App`：

```
BootstrapConfig → Builder Registry → wind.Option 链 → wind.App
```

## 二、一份 YAML 描述完整应用拓扑

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
    max_size_mb: 100        # 配置滚动参数后走 lumberjack
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
    mode: standalone        # standalone / cluster / sentinel 按字段自动推断
    addr: "localhost:6379"
    key_prefix: "my-service"

database:
  sql:
    driver: mysql
    source: "user:pass@tcp(localhost:3306)/db?parseTime=true"
    max_open_connections: 100
```

## 三、配置面扩展

### 3.1 日志：zap stderr / 滚动日志，zerolog 滚动日志

- **zap** 新增 `writer` 字段（`stdout` / `stderr` / `file`，默认 stdout）与滚动日志参数：`max_size_mb`（单文件最大体积 MB）、`max_age_days`（最大保留天数）、`max_backups`（最大备份数）、`compress`（压缩历史日志）。配置任一滚动参数后，文件输出走 lumberjack。
- **zerolog** 同步补齐同一组滚动日志参数（`max_size_mb` / `max_age_days` / `max_backups` / `compress`）。

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

### 3.2 缓存：Redis 重写为 UniversalClient

Redis 缓存底层重写为 go-redis `UniversalClient`，单配置面覆盖三种部署形态，客户端模式按字段自动推断——配置 `master_name` 即 sentinel，配置 `addrs`（多于一个或配合 `mode`）即 cluster，否则 standalone：

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

同时补齐连接池与超时参数（`dial_timeout`、`read_timeout`、`pool_size`、`min_idle_conns`、`max_retries` 等）与 TLS 配置。

### 3.3 追踪：OTLP 适配器

追踪统一为 OTLP 一个类型，参数全部配置化：`endpoint`、`insecure`、`headers`、采样策略（`always_on` / `always_off` / `trace_id_ratio` / `parent_based` + `sample_ratio`）、`use_http`（HTTP 上报而非 gRPC）、批处理与导出超时：

```yaml
tracer:
  type: otlp
  otlp:
    endpoint: "otel-collector:4317"
    sampler: parent_based
    use_http: false
    batch_timeout_ms: 5000
```

### 3.4 gRPC 服务器选项接线

gRPC 服务器的 TLS、反射、keepalive 等选项全部接入配置面：

```yaml
server:
  grpc:
    addr: ":9000"
    reflection: true              # 启用 gRPC 反射
    tls:
      file:
        cert_path: /etc/certs/tls.crt
        key_path: /etc/certs/tls.key
    keepalive_time: 30            # 探测间隔（秒）
    keepalive_timeout: 10         # 探测等待响应超时（秒）
    keepalive_min_time: 300       # 客户端最小探测间隔（秒）
    connection_timeout: 20        # 请求级连接超时（秒）
    max_recv_msg_size: 4194304    # 最大接收消息（字节）
    max_send_msg_size: 4194304    # 最大发送消息（字节）
    max_concurrent_streams: 100   # 最大并发流
```

TLS 使用通用 `TLS` proto（文件路径或 PEM 内联 + `insecure_skip_verify`），同一结构也被 registry、config、cache 等配置面复用。

### 3.5 MCP 传输层参数配置化

MCP（Model Context Protocol）传输层支持 `server_type`（SSE / HTTP / STDIO / IN_PROCESS）、`instructions`（返回给客户端的能力说明）与细粒度能力开关：

```yaml
server:
  mcp:
    name: my-mcp-server
    version: "1.0.0"
    address: ":8090"
    server_type: SSE
    instructions: "订单查询与管理工具集"
    recovery: true
    logging: true
    tool_capabilities: true
    resource_capabilities: true
    enable_input_schema_validation: true
```

### 3.6 对象存储：MinIO / S3 对齐新配置面

`storage` 支持 MinIO 与 S3 两种类型，字段对齐新配置面（endpoint、凭证、region、`use_ssl`、`force_path_style`、bucket 等）：

```yaml
storage:
  minio:
    endpoint: "localhost:9000"
    access_key: minioadmin
    secret_key: minioadmin
    use_ssl: false
```

### 3.7 数据库：同步 go-crud 新增向量 / 图库适配器

关系型/文档型/搜索型引擎升级 go-crud 后同步获得向量检索能力，并新增向量与图库适配器：**Qdrant、Milvus、Weaviate（向量）、Neo4j（图）**，连同 GORM / MongoDB / ClickHouse / Doris / Elasticsearch / OpenSearch / InfluxDB / Cassandra 共 13 种，全部走 SPI 自注册。

## 四、字段映射由 protoc-gen-fieldmap 生成

各适配器里"配置字段 → 上游选项"的机械映射不再手工维护：每个适配器旁一份 `mapping.spec.yaml` 声明映射规则，由 [protoc-gen-fieldmap](/toolkit/fieldmap.md) 生成强类型的 `mapping.gen.go`（如 `MapSQLOptions`、`NewMinioConfig`）；复合选项、TLS 装载等特殊字段以 `skip: true` 登记并保留在适配器手工段。

CI 中的 `fieldmap-drift` 任务按 spec 重新生成并逐字节比对 `mapping.gen.go`——改了 proto 忘了同步 spec 的 PR 会在 CI 直接变红，配置面与上游库选项之间不会发生漂移。完整维护约定见 [protoc-gen-fieldmap 字段映射生成器](/toolkit/fieldmap.md)。

## 五、配置加载与多格式

`LoadConfigFromFile` 按扩展名自动识别格式：`.yaml` / `.yml` → YAML，`.json` → JSON，`.bin` / `.pb` → Protobuf 二进制。命令行通过 Cobra 集成，`-c/--conf` 指定配置文件：

```bash
go run main.go -c config.yaml
```

## 六、程序内访问配置

`BootstrapConfig` 是强类型的 Protobuf 消息，程序内通过生成代码访问（非字符串路径取值）。半密封模式下 `Context` 提供类型化访问器：

```go
bctx, err := bootstrap.BootstrapWithContext(nil, cfg)
if err != nil {
    log.Fatal(err)
}
defer bctx.Cleanup()

// 访问原始配置（Protobuf 消息）
appName := bctx.Config().GetApp().GetName()
httpAddr := bctx.Config().GetServer().GetHttp().GetAddr()

// 访问装配好的实例（按组件类型键取用，如 "gorm"/"redis"/"etcd"）
db := bctx.Database("gorm")
cache := bctx.Cache("redis")
reg := bctx.Registry("etcd")   // GetService/Watch/Register/Deregister

// 运行
bctx.App().Run(bctx)
```

## 七、敏感信息管理

| 方式 | 安全级别 | 说明 |
|------|---------|------|
| 环境变量注入 | 高 | K8s Secret / Docker Secrets 启动前注入配置 |
| Vault 配置源 | 最高 | `config.vault` 配置源动态拉取 |
| 配置中心 | 高 | Nacos/Apollo 配置源托管 |
| TLS PEM 内联 | 高 | 证书可经 Secret 挂载，勿提交仓库 |

```yaml
# 不要在配置文件中硬编码密码！
# 错误：source: "user:password123@tcp(localhost:3306)/db"
# 正确：部署时经环境变量/配置中心注入，仓库中的 YAML 只保留模板
```

## 相关文档

- [Bootstrap 介绍](./bootstrap-intro.md)
- [Bootstrap SPI 机制](./bootstrap-spi.md)
- [protoc-gen-fieldmap 字段映射生成器](/toolkit/fieldmap.md)
- [插件配置系统](./plugins-config.md)
- [核心框架介绍](./core-intro.md)
