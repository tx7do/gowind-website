# 消息中间件插件

go-wind-plugins 提供多种消息队列（Broker）适配器，统一 `broker.Broker` 接口，支持发布/订阅模式与 Request/Reply 请求-应答。

## 一、Broker 接口

```go
type Broker interface {
    Name() string
    Options() Options
    Address() string

    Init(...Option) error
    Connect() error
    Disconnect() error

    Publish(ctx context.Context, topic string, msg *Message, opts ...PublishOption) error
    Subscribe(topic string, handler Handler, binder Binder, opts ...SubscribeOption) (Subscriber, error)

    // Request sends a request message and waits for a response
    Request(ctx context.Context, topic string, msg *Message, opts ...RequestOption) (*Message, error)
}

type Message struct {
    ID      string
    Headers Headers          // map[string]string
    Body    any              // 经 WithCodec 注册的编解码器序列化
    Key     string           // Kafka Key / RocketMQ Key / RabbitMQ RoutingKey...
    Metadata Metadata
}
```

除原生 `Subscribe` 外，还提供泛型订阅助手 `broker.Subscribe[T]`（自动反序列化 payload）、泛型 `TypedHandler`，以及发布/订阅中间件链（`WithPublishMiddlewares` / `WithSubscriberMiddlewares`）。

## 二、适配器列表

| 适配器 | 导入路径 | 引擎 |
|--------|---------|------|
| Kafka | `plugins/broker/kafka` | segmentio/kafka-go |
| RabbitMQ | `plugins/broker/rabbitmq` | rabbitmq/amqp091-go |
| NATS | `plugins/broker/nats` | nats-io/nats.go（JetStream） |
| MQTT | `plugins/broker/mqtt` | eclipse/paho.mqtt.golang |
| Pulsar | `plugins/broker/pulsar` | apache/pulsar-client-go |
| Redis | `plugins/broker/redis` | gomodule/redigo |
| RocketMQ | `plugins/broker/rocketmq` | apache/rocketmq-client-go + rocketmq-clients |
| NSQ | `plugins/broker/nsq` | nsqio/go-nsq |
| SQS | `plugins/broker/sqs` | aws/aws-sdk-go-v2 |
| GCP Pub/Sub | `plugins/broker/gcpubsub` | cloud.google.com/go/pubsub |
| Azure Service Bus | `plugins/broker/azuresb` | azure-sdk-for-go |
| STOMP | `plugins/broker/stomp` | go-stomp/stomp |

各引擎 SDK 差异较大，每个子模块独立定义配置选项，但均实现核心 `broker.Broker` 接口；通用选项（`WithAddress` / `WithCodec` / `WithTLSConfig` / `WithTracerProvider` / 中间件等）由家族统一提供。

## 三、Kafka

```go
import (
    "github.com/tx7do/go-wind-plugins/broker"
    kafkaPlugin "github.com/tx7do/go-wind-plugins/broker/kafka"
)

b := kafkaPlugin.NewBroker(
    broker.WithAddress("localhost:9092"),
    broker.WithCodec("json"),
)

_ = b.Init()
_ = b.Connect()
defer b.Disconnect()
```

### 发布消息

```go
msg := broker.NewMessage(
    map[string]any{"event": "user_login", "user_id": "123"},
    broker.WithPublishHeaders(map[string]string{
        "trace_id": traceID,
    }),
)

b.Publish(ctx, "user-events", msg)
```

### 订阅消息

```go
sub, _ := b.Subscribe("user-events",
    func(ctx context.Context, event broker.Event) error {
        fmt.Println(event.Topic(), event.Message().Body)
        return nil  // 返回 nil 自动 ACK
    },
    func() any { return &map[string]any{} },  // Binder
)
```

### YAML 配置

```yaml
broker:
  kafka:
    addrs: ["localhost:9092"]
    group_id: "my-service"
    version: "3.0.0"
    topics:
      - name: user-events
        partitions: 6
        replication: 3
    consumer:
      initial_offset: latest    # latest | earliest
      session_timeout: 10s
      rebalance_timeout: 30s
    producer:
      acks: all                 # none | one | all
      compression: snappy       # none | gzip | snappy | lz4 | zstd
      batch_size: 16384
```

## 四、RabbitMQ

```go
import (
    "github.com/tx7do/go-wind-plugins/broker"
    rabbitmqPlugin "github.com/tx7do/go-wind-plugins/broker/rabbitmq"
)

b := rabbitmqPlugin.NewBroker(
    broker.WithAddress("amqp://guest:guest@localhost:5672/"),
    rabbitmqPlugin.WithExchangeName("events"),
    rabbitmqPlugin.WithExchangeType("topic"),
    rabbitmqPlugin.WithDurableExchange(),
    rabbitmqPlugin.WithPrefetchCount(10),   // prefetch count
)
```

### YAML 配置

```yaml
broker:
  rabbitmq:
    addrs: ["amqp://guest:guest@localhost:5672/"]
    exchange: events
    exchange_type: topic
    durable: true
    auto_delete: false
    qos:
      prefetch_count: 10
      prefetch_global: false
    queues:
      - name: order-events
        routing_key: order.*
        durable: true
```

## 五、NATS

```go
import (
    "github.com/tx7do/go-wind-plugins/broker"
    natsPlugin "github.com/tx7do/go-wind-plugins/broker/nats"
)

b := natsPlugin.NewBroker(
    broker.WithAddress("nats://localhost:4222"),
    broker.WithCodec("json"),
)

// JetStream 订阅：声明 Durable 与投递策略
sub, _ := b.Subscribe("events",
    handler,
    binder,
    broker.WithSubscribeQueueName("my-service"),
    natsPlugin.WithDurable("my-durable"),
    natsPlugin.WithDeliverAll(),
)
```

### YAML 配置

```yaml
broker:
  nats:
    addrs: ["nats://localhost:4222"]
    jetstream: true
    max_reconnects: 60
    reconnect_wait: 2s
    credentials_file: nats.creds
```

## 六、Redis Pub/Sub

```go
import (
    "github.com/tx7do/go-wind-plugins/broker"
    redisBrokerPlugin "github.com/tx7do/go-wind-plugins/broker/redis"
)

b := redisBrokerPlugin.NewBroker(
    broker.WithAddress("localhost:6379"),
    broker.WithCodec("json"),
    redisBrokerPlugin.WithPassword("pass"),
)

// Streams 消费组（可选）
_ = b.Subscribe("events", handler, binder,
    redisBrokerPlugin.WithStreamGroup("my-group"),
    redisBrokerPlugin.WithStreamConsumer("consumer-1"),
)
```

### YAML 配置

```yaml
broker:
  redis:
    addr: localhost:6379
    db: 1
    channels:
      - events
      - notifications
    buffer_size: 1000
```

## 七、选择指南

| 需求 | 推荐 |
|------|------|
| 日志/事件流 | Kafka（高吞吐、持久化） |
| 任务队列 | RabbitMQ（ACK、路由） |
| 微服务内部通信 | NATS（低延迟） |
| 简单 Pub/Sub | Redis（无额外依赖） |
| IoT 设备消息 | MQTT（轻量、QoS） |
| 金融/事务消息 | RocketMQ（事务消息） |
| 大规模流处理 | Pulsar（多租户） |
| 云上托管队列 | SQS / GCP Pub/Sub / Azure Service Bus |
| 企业消息总线对接 | STOMP |

## 八、多 Broker 组合

```yaml
broker:
  kafka:          # 主事件流
    addrs: ["localhost:9092"]
    group_id: "event-processor"
  rabbitmq:       # 任务队列
    addrs: ["amqp://localhost:5672/"]
    exchange: tasks
  redis:          # 通知广播
    addr: localhost:6379
    channels:
      - notifications
```

```go
import (
    _ "github.com/tx7do/go-wind-plugins/broker/kafka"
    _ "github.com/tx7do/go-wind-plugins/broker/rabbitmq"
    _ "github.com/tx7do/go-wind-plugins/broker/redis"
)
```

## 相关文档

- [插件配置系统](./plugins-config.md)
- [插件总览](./plugins-intro.md)
- [编码解码插件](./plugins-encoding.md)
