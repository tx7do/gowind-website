# GoWind 框架

GoWind 框架是一套 **积木式 Go 微服务框架**，由三层组成：核心框架 go-wind、插件生态 go-wind-plugins、声明式启动器 go-wind-bootstrap，提供从底层生命周期管理到声明式配置启动的完整基础设施。

```mermaid
graph TB
    subgraph "go-wind-bootstrap<br/>声明式启动器"
        Bootstrap["配置驱动的应用装配<br/>一份 YAML 描述完整拓扑"]
    end

    subgraph "go-wind-plugins<br/>插件生态"
        Plugins["157 个独立模块<br/>130+ 插件 / 20+ 领域"]
    end

    subgraph "go-wind<br/>核心框架"
        Core["生命周期管理 + 最小接口<br/>核心代码 < 500 行"]
    end

    Bootstrap -->|"SPI 装配"| Plugins
    Plugins -->|"实现接口"| Core

    subgraph "业务应用"
        Admin["Admin / CMS / UBA / IM"]
    end

    Admin -->|"基于"| Bootstrap
```

## 一、三个项目

| 项目 | 仓库 | 定位 | 核心代码 |
|------|------|------|---------|
| **go-wind** | [tx7do/go-wind](https://github.com/tx7do/go-wind) | 核心框架：生命周期 + 最小接口 | < 500 行 |
| **go-wind-plugins** | [tx7do/go-wind-plugins](https://github.com/tx7do/go-wind-plugins) | 插件生态：130+ 插件，20+ 领域（157 个 go.mod 独立模块） | 按子模块独立版本 |
| **go-wind-bootstrap** | [tx7do/go-wind-bootstrap](https://github.com/tx7do/go-wind-bootstrap) | 声明式启动器：YAML 配置驱动装配 | — |

> **近期新增**：go-wind 核心新增 `beforeStart` / `afterStart` 两个生命周期钩子，为应用启动前后提供扩展点（详见 [App 生命周期管理](./core-lifecycle.md)）；`errors` 包的 `CodeToHTTP` 支持 400-599 错误码显式直通为 HTTP 状态码。

## 二、设计哲学

### 2.1 积木式架构

> 不是一揽子全栈框架，而是一盒积木。

- **组合优于继承** — 每个插件只实现标准接口，业务代码依赖接口而非实现
- **接口优于实现** — 核心只定义最小接口，具体实现由插件提供
- **零隐藏魔法** — 所有行为都是显式的，没有隐式初始化和全局状态

### 2.2 分层职责

```mermaid
graph LR
    subgraph 接口层
        App["App 生命周期"]
        Transport["Transport 接口"]
        Log["Log 门面"]
    end

    subgraph 插件层
        HTTP["HTTP/gRPC/WS"]
        Zap["Zap/Logrus"]
        Kafka["Kafka/RabbitMQ"]
    end

    subgraph 装配层
        Config["YAML 配置"]
        SPI["SPI 注册"]
    end

    接口层 -->|"定义契约"| 插件层
    装配层 -->|"按配置选择"| 插件层
```

### 2.3 零外部依赖

核心框架仅依赖 `golang.org/x/sync`，不引入任何第三方库。

## 三、插件领域总览

go-wind-plugins 以八大领域统一抽象为基础、多引擎适配，目前包含 **157 个 go.mod 独立模块**，约 **130+ 个插件**，覆盖 **20+ 领域**：

| 领域 | 接口 | 插件数量 | 示例 |
|------|------|-----------|------|
| 配置中心 | Config | 14 | Apollo, Consul, Etcd, Nacos, Polaris, Vault, K8s, ZooKeeper, Redis, OSS, HTTP, Env, File, FS |
| 服务注册 | Registry | 8 + selector/resolver | Consul, Etcd, Nacos, Eureka, Zookeeper |
| 日志 | Logger | 13 | Zap, Zerolog, Logrus, Loki, SLS, CLS, CloudWatch, Sentry |
| 传输协议 | Transport | 31 | HTTP（4 驱动）, HTTP/3, gRPC, WebSocket, SSE, Socket.IO, SignalR, KCP, WebRTC, WebTransport, GraphQL, Thrift, tRPC, Cron, Asynq, Machinery, MCP |
| 消息队列 | Broker | 12 | Kafka, RabbitMQ, NATS, MQTT, Pulsar, RocketMQ, NSQ, SQS, Redis, STOMP, Azure Service Bus, Google Pub/Sub |
| 编解码 | Encoding | 12 | JSON, Protobuf, YAML, TOML, MsgPack |
| CRUD | Database | 19 | GORM, Ent, MongoDB, ClickHouse, Doris, ES, OpenSearch, InfluxDB, Cassandra, qdrant, milvus, neo4j, weaviate + api/pagination/cache/audit/viewer |
| 安全 | Authn/Authz | 20 | 认证 10 套（JWT/OAuth2 等）、鉴权 9 套（Casbin, Cedar, Cerbos, OPA, Zanzibar 等）、crypto |

此外还包括：熔断（4）、限流（3）、工作流引擎（Temporal/Argo/Conductor/GoWorkflows）、对象存储（2）、AI 集成（OpenAI/LangChainGo/Eino）、指标监控（Prometheus 等）、链路追踪（OTLP）、工具类（4）等领域，合计 20+ 领域。

近期动态：MCP 传输透传 StreamableHTTP/SSE 服务选项；新增 vector 抽象对接 qdrant/milvus/neo4j/weaviate 四大向量图库；selector 客户端负载均衡 + resolver gRPC 适配器；transaction 本地事务四件套（outbox/saga/tcc/xa）。

## 四、快速开始

### 4.1 安装

```bash
go get github.com/tx7do/go-wind
go get github.com/tx7do/go-wind-bootstrap
```

### 4.2 最小示例

```go
package main

import (
    "github.com/tx7do/go-wind"
    _ "github.com/tx7do/go-wind-plugins/transport/http"    // 导入 HTTP 插件
    _ "github.com/tx7do/go-wind-plugins/log/zap"           // 导入 Zap 日志插件
    "github.com/tx7do/go-wind-bootstrap"
)

func main() {
    // 一行启动：读取 YAML 配置，装配所有组件
    bootstrap.RunApp()
}
```

### 4.3 配置文件

```yaml
# app.yaml
name: my-service

servers:
  - name: http
    type: http
    addr: ":8080"

log:
  level: info
  format: json

registry:
  type: etcd
  config:
    endpoints: ["localhost:2379"]
```

## 五、与业务应用的关系

| 层次 | 项目 | 说明 |
|------|------|------|
| 框架基础设施 | go-wind + plugins + bootstrap | 提供微服务运行时 |
| 开发工具 | [GoWind Toolkit](/toolkit/intro.md) | CLI 代码生成 + 桌面端 |
| 业务应用 | [Admin](/admin/intro.md) / [CMS](/cms/intro.md) / [UBA](/uba/intro.md) / IM | 开箱即用的产品 |

## 六、相关文档

### 基础文档

- [框架整体架构](./architecture.md)

### go-wind 核心

- [核心框架介绍](./core-intro.md)
- [App 生命周期管理](./core-lifecycle.md)
- [Context 传播](./core-context.md)
- [Transport 抽象](./core-transport.md)
- [Log 门面接口](./core-logging.md)

### go-wind-plugins 插件

- [插件生态总览](./plugins-intro.md)
- [配置中心](./plugins-config.md)
- [服务注册](./plugins-registry.md)
- [日志适配](./plugins-log.md)
- [传输协议](./plugins-transport.md)
- [消息队列](./plugins-broker.md)
- [编解码](./plugins-encoding.md)
- [安全](./plugins-security.md)
- [链路追踪](./plugins-tracer.md)
- [缓存](./plugins-cache.md)
- [对象存储](./plugins-oss.md)
- [限流熔断](./plugins-ratelimit.md)
- [指标监控](./plugins-metrics.md)
- [AI 集成](./plugins-ai.md)
- [工作流引擎](./plugins-workflow.md)

### go-wind-bootstrap 启动器

- [声明式启动器介绍](./bootstrap-intro.md)
- [BootstrapConfig 配置定义](./bootstrap-config.md)
- [SPI 插件注册机制](./bootstrap-spi.md)
- [声明式中间件编排](./bootstrap-middleware.md)
- [Cobra CLI 集成](./bootstrap-cli.md)
- [完整示例](./bootstrap-examples.md)

### 教程

| 阶段 | 教程 | 说明 |
|------|------|------|
| 入门 | [从零搭建一个微服务](./tutorial-quick-start.md) | 使用 bootstrap 快速搭建 |
| 核心 | [自定义插件开发](./tutorial-custom-plugin.md) | 实现 go-wind 接口 |
| 核心 | [多协议同时监听](./tutorial-multi-transport.md) | HTTP + gRPC + WebSocket |
| 进阶 | [从 Kratos 迁移](./tutorial-migration.md) | 迁移指南 |
