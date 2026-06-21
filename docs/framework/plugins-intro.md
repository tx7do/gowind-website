# go-wind-plugins 插件总览

go-wind-plugins 是 GoWind 生态中最大的仓库，提供 100+ 个适配器插件，覆盖 8 大领域。所有插件遵循统一的接口契约，通过 SPI 机制自动注册。

## 一、插件分类

| 领域 | 核心接口 | 插件数量 | 典型插件 |
|------|---------|---------|---------|
| Transport | `transport.Server` | 7+ | HTTP, gRPC, WebSocket, SSE |
| Log | `log.Logger` | 7+ | Zap, Zerolog, Logrus, Loki |
| Broker | `broker.Broker` | 10+ | Kafka, RabbitMQ, NATS, Redis |
| Cache | `cache.Cache` | 5+ | Redis, Memcached, FreeCache |
| Config | `config.Source` | 6+ | File, Etcd, Consul, Nacos |
| Registry | `registry.Registry` | 5+ | Consul, Etcd, Nacos, ZooKeeper |
| Database | `ent.Client` | 8+ | MySQL, PostgreSQL, SQLite, MongoDB |
| Tracer | `tracer.Tracer` | 3+ | Jaeger, OTLP, Zipkin |
| OSS | `oss.OSS` | 6+ | MinIO, S3, Aliyun OSS, Qiniu |
| Metrics | `metrics.Metrics` | 3+ | Prometheus, Datadog |
| Rate Limit | `ratelimit.Limiter` | 3+ | Token Bucket, Sentinel |
| Encoding | `encoding.Codec` | 4+ | JSON, Protobuf, YAML, XML |
| AI | `ai.Client` | 5+ | OpenAI, Claude, Gemini, Ollama |
| Workflow | `workflow.Engine` | 2+ | Temporal, Celery |
| Security | `auth.Authenticator` | 4+ | JWT, OAuth2, Casbin |

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

## 相关文档

- [插件配置系统](./plugins-config.md)
- [插件注册机制](./plugins-registry.md)
- [核心框架介绍](./core-intro.md)
- [框架整体架构](./architecture.md)
