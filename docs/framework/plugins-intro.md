# go-wind-plugins 插件总览

go-wind-plugins 是 GoWind 生态中最大的仓库，以八大领域统一抽象 + 多引擎适配为思路，目前提供 **157 个 go.mod 独立模块**、约 **130+ 个插件**，覆盖 **20+ 领域**。所有插件遵循统一的接口契约，通过 SPI 机制自动注册。

## 一、插件全景

| 领域 | 核心接口 | 插件数量 | 典型插件 |
|------|---------|---------|---------|
| 配置中心 Config | `config.Source` | 14 | Apollo, Consul, Etcd, Nacos, Polaris, Vault, K8s, ZooKeeper, Redis, OSS, HTTP, Env, File, FS |
| 注册中心 Registry | `registry.Registry` | 8 + 2 | Consul, Etcd, Nacos, ZooKeeper；另含 selector / resolver |
| 日志 Log | `log.Logger` | 13 | Zap, Zerolog, Logrus, Loki, SLS, CLS, CloudWatch, Sentry |
| 传输层 Transport | `transport.Server` | 31 | HTTP（4 驱动）, HTTP/3, gRPC, WebSocket, SSE, Socket.IO, SignalR, KCP, WebRTC, WebTransport, GraphQL, Thrift, tRPC, Cron, Asynq, Machinery, MCP 及 12 个 MQ 订阅型插件 |
| 消息代理 Broker | `broker.Broker` | 12 | Kafka, RabbitMQ, NATS, MQTT, Pulsar, RocketMQ, NSQ, SQS, Redis, STOMP, Azure Service Bus, Google Pub/Sub |
| 编解码 Encoding | `encoding.Codec` | 12 | JSON, Protobuf, YAML, TOML, MsgPack |
| CRUD Database | 数据库/ORM 客户端 | 19 | GORM, Ent, MongoDB, ClickHouse, Doris, ES, OpenSearch, InfluxDB, Cassandra；向量/图库 qdrant, milvus, neo4j, weaviate；配套 api/pagination/cache/audit/viewer |
| 安全 Security | `auth.Authenticator` | 20 | 认证（authn）10 套：JWT, OAuth2 等；鉴权（authz）9 套：Casbin, Cedar, Cerbos, OPA, Zanzibar 等；crypto |
| 熔断 / 限流 | Breaker / `ratelimit.Limiter` | 4 + 3 | Token Bucket, Sentinel, Hystrix 等 |
| 工作流 Workflow | `workflow.Engine` | 4 | Temporal, Argo, Conductor, GoWorkflows |
| 对象存储 OSS | `oss.OSS` | 2 | MinIO, S3 |
| AI | `ai.Client` | 3 | OpenAI, LangChainGo, Eino |
| 指标 Metrics | `metrics.Metrics` | 3 | Prometheus, OpenTelemetry, Datadog |
| 追踪 Tracer | `tracer.Tracer` | 1 | OTLP |
| 工具 Utils | — | 4 | 通用辅助工具 |

### 近期新增能力

- **selector / resolver** — 客户端负载均衡（selector）与 gRPC 地址解析适配器（resolver），与服务发现注册中心配合使用
- **transaction** — 本地事务四件套：outbox / saga / tcc / xa
- **MCP** — 作为传输层插件接入 Model Context Protocol，支持透传 StreamableHTTP/SSE 服务选项
- **vector 向量库** — 统一 vector 抽象，对接 qdrant / milvus / neo4j / weaviate 四大向量图库

## 二、目录结构

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
│   ├── zap/           # Zap 适配器
│   ├── zerolog/       # Zerolog 适配器
│   ├── logrus/        # Logrus 适配器
│   ├── loki/          # Grafana Loki
│   ├── sentry/        # Sentry 错误追踪
│   ├── cloudwatch/    # AWS CloudWatch
│   └── aliyun_sls/    # 阿里云日志服务
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
│   ├── file/          # 本地文件
│   ├── etcd/          # Etcd KV
│   ├── consul/        # Consul KV
│   ├── nacos/         # Nacos 配置中心
│   └── apollo/        # Apollo 配置中心
├── registry/
│   ├── consul/        # Consul 服务发现
│   ├── etcd/          # Etcd 服务发现
│   ├── nacos/         # Nacos 服务发现
│   └── zookeeper/     # ZooKeeper 服务发现
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
│   ├── aliyun/        # 阿里云 OSS
│   ├── qiniu/         # 七牛云
│   └── tencent/       # 腾讯云 COS
├── ai/
│   ├── openai/        # OpenAI
│   ├── claude/        # Anthropic Claude
│   ├── gemini/        # Google Gemini
│   ├── ollama/        # Ollama 本地模型
│   └── deepseek/      # DeepSeek
└── workflow/
    ├── temporal/       # Temporal 工作流
    └── celery/         # Celery 任务队列
```

## 三、插件约定

每个插件必须满足以下约定：

### 3.1 实现 SPI 接口

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

### 3.2 函数式选项

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

### 3.3 Bootstrap 注册

```go
// transport/http/register.go
package http

import "github.com/tx7do/go-wind-bootstrap/registry"

func init() {
    registry.RegisterTransport("http", NewServer)
}
```

## 四、选择指南

| 场景 | 推荐组合 |
|------|---------|
| Web API 服务 | HTTP + MySQL + Redis + Zap |
| 微服务后端 | gRPC + PostgreSQL + Kafka + Jaeger |
| 实时通信 | WebSocket + Redis + Zerolog |
| 数据管道 | gRPC + ClickHouse + Kafka + Loki |
| AI 应用 | HTTP + PostgreSQL + OpenAI + Temporal |
| 边缘/IoT | TCP/KCP + SQLite + FreeCache |

## 近期质量动态

- 完成三轮大规模测试补齐：新增 100+ 测试文件、千余个用例，修复 25+ 个确定性缺陷（含 OPA 插件的数据竞态修复）
- 仓库内置 `docs/tutorials/` 22 章系列教程，按领域讲解插件使用

## 相关文档

- [插件配置系统](./plugins-config.md)
- [插件注册机制](./plugins-registry.md)
- [核心框架介绍](./core-intro.md)
- [框架整体架构](./architecture.md)
