# Message Middleware Plugins

go-wind-plugins provides a variety of message queue (Broker) adapters behind the unified `broker.Broker` interface, supporting publish/subscribe and Request/Reply request-response patterns.

## 1. The Broker Interface

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
    Body    any              // serialized by the codec registered via WithCodec
    Key     string           // Kafka Key / RocketMQ Key / RabbitMQ RoutingKey...
    Metadata Metadata
}
```

Beyond the native `Subscribe`, a generic subscription helper `broker.Subscribe[T]` (with automatic payload deserialization), a generic `TypedHandler`, and publish/subscribe middleware chains (`WithPublishMiddlewares` / `WithSubscriberMiddlewares`) are also provided.

## 2. Adapter List

| Adapter | Import Path | Engine |
|---------|------------|--------|
| Kafka | `plugins/broker/kafka` | segmentio/kafka-go |
| RabbitMQ | `plugins/broker/rabbitmq` | rabbitmq/amqp091-go |
| NATS | `plugins/broker/nats` | nats-io/nats.go (JetStream) |
| MQTT | `plugins/broker/mqtt` | eclipse/paho.mqtt.golang |
| Pulsar | `plugins/broker/pulsar` | apache/pulsar-client-go |
| Redis | `plugins/broker/redis` | gomodule/redigo |
| RocketMQ | `plugins/broker/rocketmq` | apache/rocketmq-client-go + rocketmq-clients |
| NSQ | `plugins/broker/nsq` | nsqio/go-nsq |
| SQS | `plugins/broker/sqs` | aws/aws-sdk-go-v2 |
| GCP Pub/Sub | `plugins/broker/gcpubsub` | cloud.google.com/go/pubsub |
| Azure Service Bus | `plugins/broker/azuresb` | azure-sdk-for-go |
| STOMP | `plugins/broker/stomp` | go-stomp/stomp |

The engine SDKs differ considerably, so each sub-module defines its own configuration options, but all implement the core `broker.Broker` interface; common options (`WithAddress` / `WithCodec` / `WithTLSConfig` / `WithTracerProvider` / middleware, etc.) are provided uniformly by the family.

## 3. Kafka

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

### Publishing Messages

```go
msg := broker.NewMessage(
    map[string]any{"event": "user_login", "user_id": "123"},
    broker.WithPublishHeaders(map[string]string{
        "trace_id": traceID,
    }),
)

b.Publish(ctx, "user-events", msg)
```

### Subscribing to Messages

```go
sub, _ := b.Subscribe("user-events",
    func(ctx context.Context, event broker.Event) error {
        fmt.Println(event.Topic(), event.Message().Body)
        return nil  // returning nil ACKs automatically
    },
    func() any { return &map[string]any{} },  // Binder
)
```

### YAML Configuration

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

## 4. RabbitMQ

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

### YAML Configuration

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

## 5. NATS

```go
import (
    "github.com/tx7do/go-wind-plugins/broker"
    natsPlugin "github.com/tx7do/go-wind-plugins/broker/nats"
)

b := natsPlugin.NewBroker(
    broker.WithAddress("nats://localhost:4222"),
    broker.WithCodec("json"),
)

// JetStream subscription: declare the Durable name and delivery policy
sub, _ := b.Subscribe("events",
    handler,
    binder,
    broker.WithSubscribeQueueName("my-service"),
    natsPlugin.WithDurable("my-durable"),
    natsPlugin.WithDeliverAll(),
)
```

### YAML Configuration

```yaml
broker:
  nats:
    addrs: ["nats://localhost:4222"]
    jetstream: true
    max_reconnects: 60
    reconnect_wait: 2s
    credentials_file: nats.creds
```

## 6. Redis Pub/Sub

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

// Streams consumer group (optional)
_ = b.Subscribe("events", handler, binder,
    redisBrokerPlugin.WithStreamGroup("my-group"),
    redisBrokerPlugin.WithStreamConsumer("consumer-1"),
)
```

### YAML Configuration

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

## 7. Selection Guide

| Requirement | Recommendation |
|-------------|----------------|
| Log/event streams | Kafka (high throughput, persistence) |
| Task queues | RabbitMQ (ACK, routing) |
| Internal microservice messaging | NATS (low latency) |
| Simple pub/sub | Redis (no extra dependencies) |
| IoT device messaging | MQTT (lightweight, QoS) |
| Financial/transactional messaging | RocketMQ (transactional messages) |
| Large-scale stream processing | Pulsar (multi-tenancy) |
| Managed cloud queues | SQS / GCP Pub/Sub / Azure Service Bus |
| Enterprise message bus integration | STOMP |

## 8. Combining Multiple Brokers

```yaml
broker:
  kafka:          # primary event stream
    addrs: ["localhost:9092"]
    group_id: "event-processor"
  rabbitmq:       # task queue
    addrs: ["amqp://localhost:5672/"]
    exchange: tasks
  redis:          # notification broadcast
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

## Related Documents

- [Plugin Configuration System](./plugins-config.md)
- [Plugin Overview](./plugins-intro.md)
- [Encoding Plugins](./plugins-encoding.md)
