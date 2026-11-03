# go-wind-plugins Plugin Overview

go-wind-plugins is the largest repository in the GoWind ecosystem. Built on the idea of unified abstractions across eight major domains plus multi-engine adapters, it currently provides **157 standalone go.mod modules** and roughly **130+ plugins** covering **20+ domains**. All plugins follow a unified interface contract and are automatically registered via the SPI mechanism.

## 1. Plugin Landscape

| Domain | Core Interface | Plugin Count | Typical Plugins |
|--------|---------------|--------------|-----------------|
| Configuration Center (Config) | `config.Source` | 14 | Apollo, Consul, Etcd, Nacos, Polaris, Vault, K8s, ZooKeeper, Redis, OSS, HTTP, Env, File, FS |
| Service Registry (Registry) | `registry.Registry` | 8 + 2 | Consul, Etcd, Nacos, ZooKeeper; plus selector / resolver |
| Logging (Log) | `log.Logger` | 13 | Zap, Zerolog, Logrus, Loki, SLS, CLS, CloudWatch, Sentry |
| Transport | `transport.Server` | 31 | HTTP (4 drivers), HTTP/3, gRPC, WebSocket, SSE, Socket.IO, SignalR, KCP, WebRTC, WebTransport, GraphQL, Thrift, tRPC, Cron, Asynq, Machinery, MCP, and 12 MQ subscription-style plugins |
| Message Broker (Broker) | `broker.Broker` | 12 | Kafka, RabbitMQ, NATS, MQTT, Pulsar, RocketMQ, NSQ, SQS, Redis, STOMP, Azure Service Bus, Google Pub/Sub |
| Encoding (Codec) | `encoding.Codec` | 12 | JSON, Protobuf, YAML, TOML, MsgPack |
| CRUD Database | Database/ORM clients | 19 | GORM, Ent, MongoDB, ClickHouse, Doris, ES, OpenSearch, InfluxDB, Cassandra; vector/graph stores qdrant, milvus, neo4j, weaviate; plus api/pagination/cache/audit/viewer |
| Security | `auth.Authenticator` | 20 | Authentication (authn), 10 engines: JWT, OAuth2, etc.; authorization (authz), 9 engines: Casbin, Cedar, Cerbos, OPA, Zanzibar, etc.; crypto |
| Circuit Breaking / Rate Limiting | Breaker / `ratelimit.Limiter` | 4 + 3 | Token Bucket, Sentinel, Hystrix, etc. |
| Workflow | `workflow.Engine` | 4 | Temporal, Argo, Conductor, GoWorkflows |
| Object Storage (OSS) | `oss.OSS` | 2 | MinIO, S3 |
| AI | `ai.Client` | 3 | OpenAI, LangChainGo, Eino |
| Metrics | `metrics.Metrics` | 3 | Prometheus, OpenTelemetry, Datadog |
| Tracing (Tracer) | `tracer.Tracer` | 1 | OTLP |
| Utilities (Utils) | — | 4 | General-purpose helpers |

### Recently Added Capabilities

- **selector / resolver** — client-side load balancing (selector) and gRPC address-resolution adapters (resolver), used together with service-discovery registries
- **transaction** — the local-transaction quartet: outbox / saga / tcc / xa
- **MCP** — Model Context Protocol integrated as a transport plugin, with pass-through support for StreamableHTTP/SSE server options
- **vector store** — a unified vector abstraction connecting to the four vector/graph engines qdrant / milvus / neo4j / weaviate

## 2. Directory Structure

```
go-wind-plugins/
├── transport/
│   ├── http/          # HTTP Server
│   ├── grpc/          # gRPC Server
│   ├── websocket/     # WebSocket Server
│   ├── sse/           # SSE Server
│   ├── tcp/           # TCP Server
│   ├── kcp/           # KCP Server
│   └── graphql/       # GraphQL Server
├── log/
│   ├── zap/           # Zap adapter
│   ├── zerolog/       # Zerolog adapter
│   ├── logrus/        # Logrus adapter
│   ├── loki/          # Grafana Loki
│   ├── sentry/        # Sentry error tracking
│   ├── cloudwatch/    # AWS CloudWatch
│   └── aliyun_sls/    # Alibaba Cloud Log Service
├── broker/
│   ├── kafka/         # Apache Kafka
│   ├── rabbitmq/      # RabbitMQ
│   ├── nats/          # NATS
│   ├── redis/         # Redis Pub/Sub
│   ├── pulsar/        # Apache Pulsar
│   └── ...
├── cache/
│   ├── redis/         # Redis
│   ├── memcached/     # Memcached
│   └── freecache/     # FreeCache
├── config/
│   ├── file/          # Local files
│   ├── etcd/          # Etcd KV
│   ├── consul/        # Consul KV
│   ├── nacos/         # Nacos configuration center
│   └── apollo/        # Apollo configuration center
├── registry/
│   ├── consul/        # Consul service discovery
│   ├── etcd/          # Etcd service discovery
│   ├── nacos/         # Nacos service discovery
│   └── zookeeper/     # ZooKeeper service discovery
├── database/
│   ├── mysql/         # MySQL
│   ├── postgres/      # PostgreSQL
│   ├── sqlite/        # SQLite
│   ├── mongo/         # MongoDB
│   └── clickhouse/    # ClickHouse
├── tracer/
│   ├── jaeger/        # Jaeger
│   ├── otlp/          # OpenTelemetry
│   └── zipkin/        # Zipkin
├── oss/
│   ├── minio/         # MinIO
│   ├── s3/            # AWS S3
│   ├── aliyun/        # Alibaba Cloud OSS
│   ├── qiniu/         # Qiniu Cloud
│   └── tencent/       # Tencent Cloud COS
├── ai/
│   ├── openai/        # OpenAI
│   ├── claude/        # Anthropic Claude
│   ├── gemini/        # Google Gemini
│   ├── ollama/        # Ollama local models
│   └── deepseek/      # DeepSeek
└── workflow/
    ├── temporal/       # Temporal workflow
    └── celery/         # Celery task queue
```

## 3. Plugin Conventions

Every plugin must satisfy the following conventions:

### 3.1 Implement the SPI Interface

```go
// transport/http/server.go
package http

type Server struct { ... }

func NewServer(opts ...Option) *Server { ... }

func (s *Server) Start(ctx context.Context) error { ... }
func (s *Server) Stop(ctx context.Context) error  { ... }
func (s *Server) Endpoint() []string              { ... }
func (s *Server) Type() string                    { return "http" }
```

### 3.2 Functional Options

```go
type Option func(*Server)

func WithAddr(addr string) Option {
    return func(s *Server) { s.addr = addr }
}

func WithHandler(h http.Handler) Option {
    return func(s *Server) { s.handler = h }
}

func WithTLS(certFile, keyFile string) Option {
    return func(s *Server) {
        s.tls = true
        s.certFile = certFile
        s.keyFile = keyFile
    }
}
```

### 3.3 Bootstrap Registration

```go
// transport/http/register.go
package http

import "github.com/tx7do/go-wind-bootstrap/registry"

func init() {
    registry.RegisterTransport("http", NewServer)
}
```

## 4. Selection Guide

| Scenario | Recommended Combination |
|----------|------------------------|
| Web API service | HTTP + MySQL + Redis + Zap |
| Microservice backend | gRPC + PostgreSQL + Kafka + Jaeger |
| Real-time communication | WebSocket + Redis + Zerolog |
| Data pipeline | gRPC + ClickHouse + Kafka + Loki |
| AI application | HTTP + PostgreSQL + OpenAI + Temporal |
| Edge/IoT | TCP/KCP + SQLite + FreeCache |

## Recent Quality Updates

- Completed three rounds of large-scale test backfill: added 100+ test files with over a thousand test cases, and fixed 25+ deterministic defects (including a data-race fix in the OPA plugin)
- The repository ships a 22-chapter tutorial series under `docs/tutorials/`, covering plugin usage by domain

## Related Documents

- [Plugin Configuration System](./plugins-config.md)
- [Plugin Registration Mechanism](./plugins-registry.md)
- [Core Framework Introduction](./core-intro.md)
- [Overall Framework Architecture](./architecture.md)
