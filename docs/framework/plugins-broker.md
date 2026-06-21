# 消息中间件插件

go-wind-plugins 提供多种消息队列（Broker）适配器，统一 `broker.Broker` 接口，支持发布/订阅模式。

## 一、Broker 接口

```go
type Broker interface {
    Connect(ctx context.Context) error
    Disconnect(ctx context.Context) error
    Publish(ctx context.Context, topic string, msg *Message) error
    Subscribe(ctx context.Context, topic string, handler Handler) (Subscriber, error)
}

type Message struct {
    Headers map[string]string
    Body    []byte
}
```

## 二、适配器列表

| 适配器 | 导入路径 | 特点 |
|--------|---------|------|
| Kafka | `plugins/broker/kafka` | 高吞吐、分区有序、消费者组 |
| RabbitMQ | `plugins/broker/rabbitmq` | 路由灵活、ACK 确认 |
| NATS | `plugins/broker/nats` | 轻量、低延迟 |
| Redis | `plugins/broker/redis` | 简单、无额外依赖 |
| Pulsar | `plugins/broker/pulsar` | 多租户、持久化 |
| RocketMQ | `plugins/broker/rocketmq` | 阿里系、事务消息 |
| NSQ | `plugins/broker/nsq` | 去中心化、无 SPOF |
| MQTT | `plugins/broker/mqtt` | IoT 协议、轻量 |

## 三、Kafka

```go
import kafkaPlugin "github.com/tx7do/go-wind-plugins/broker/kafka"

broker := kafkaPlugin.NewBroker(
    kafkaPlugin.WithAddrs("localhost:9092"),
    kafkaPlugin.WithGroupID("my-service"),
    kafkaPlugin.WithVersion("3.0.0"),
)
```

### 发布消息

```go
msg := &broker.Message{
    Headers: map[string]string{
        "trace_id": traceID,
    },
    Body: []byte(`{"event":"user_login","user_id":"123"}`),
}

broker.Publish(ctx, "user-events", msg)
```

### 订阅消息

```go
sub, _ := broker.Subscribe(ctx, "user-events", func(ctx context.Context, msg *broker.Message) error {
    var event UserEvent
    json.Unmarshal(msg.Body, &event)
    processEvent(event)
    return nil  // 返回 nil 自动 ACK
})

defer sub.Unsubscribe()
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
import rabbitmqPlugin "github.com/tx7do/go-wind-plugins/broker/rabbitmq"

broker := rabbitmqPlugin.NewBroker(
    rabbitmqPlugin.WithAddrs("amqp://guest:guest@localhost:5672/"),
    rabbitmqPlugin.WithExchange("events"),
    rabbitmqPlugin.WithExchangeType("topic"),
    rabbitmqPlugin.WithDurable(true),
    rabbitmqPlugin.WithQoS(10),       // prefetch count
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
import natsPlugin "github.com/tx7do/go-wind-plugins/broker/nats"

broker := natsPlugin.NewBroker(
    natsPlugin.WithAddrs("nats://localhost:4222"),
    natsPlugin.WithJetStream(true),
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
import redisBrokerPlugin "github.com/tx7do/go-wind-plugins/broker/redis"

broker := redisBrokerPlugin.NewBroker(
    redisBrokerPlugin.WithAddr("localhost:6379"),
    redisBrokerPlugin.WithChannels("events", "notifications"),
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
