# Transport Protocol Plugins

go-wind-plugins provides a variety of transport protocol adapters implementing the `transport.Server` interface. It supports mainstream protocols such as HTTP, gRPC, WebSocket, and SSE, and covers 31 transport plugins in total, including scheduled jobs, async task queues, message-middleware subscriptions, and MCP.

## 1. Protocol Overview

The `transport/` tree contains 31 plugin directories, grouped into four categories by form:

**Protocols & Communication**

| Plugin | Import Path | Engine/Notes | Typical Use |
|--------|------------|--------------|-------------|
| HTTP | `plugins/transport/http` | net/http, with three additional drivers: chi / gin / fiber | REST API |
| HTTP/3 | `plugins/transport/http3` | quic-go/http3 | QUIC low-latency web |
| gRPC | `plugins/transport/grpc` | google.golang.org/grpc (server/client/middleware) | Internal service calls |
| WebSocket | `plugins/transport/websocket` | gorilla/websocket | Real-time communication |
| Socket.IO | `plugins/transport/socketio` | googollee/go-socket.io | Real-time communication (Socket.IO protocol) |
| SignalR | `plugins/transport/signalr` | SignalR protocol | Real-time communication in the .NET ecosystem |
| SSE | `plugins/transport/sse` | Server-Sent Events | Server-side event push |
| TCP | `plugins/transport/tcp` | net.Listener | Custom-protocol persistent connections |
| KCP | `plugins/transport/kcp` | xtaci/kcp-go | Low-latency gaming |
| WebRTC | `plugins/transport/webrtc` | pion/webrtc v4 (SFU) | Real-time audio/video transport |
| WebTransport | `plugins/transport/webtransport` | webtransport-go | Bidirectional streams over HTTP/3 |

**RPC & Query**

| Plugin | Import Path | Engine/Notes |
|--------|------------|--------------|
| GraphQL | `plugins/transport/graphql` | graphql-go |
| Thrift | `plugins/transport/thrift` | Apache Thrift |
| tRPC | `plugins/transport/trpc` | tRPC protocol |

**Scheduled & Async Tasks**

| Plugin | Import Path | Engine/Notes |
|--------|------------|--------------|
| Cron | `plugins/transport/cron` | robfig/cron scheduled jobs |
| HPTimer | `plugins/transport/hptimer` | High-precision timer |
| Asynq | `plugins/transport/asynq` | hibiken/asynq async task queue |
| Machinery | `plugins/transport/machinery` | machinery (Celery-like) distributed task queue |

**Message-Middleware Subscription Transports**

| Plugin | Import Path | Middleware |
|--------|------------|-----------|
| Kafka | `plugins/transport/kafka` | Apache Kafka |
| RabbitMQ | `plugins/transport/rabbitmq` | RabbitMQ |
| NATS | `plugins/transport/nats` | NATS |
| MQTT | `plugins/transport/mqtt` | MQTT |
| Pulsar | `plugins/transport/pulsar` | Apache Pulsar |
| RocketMQ | `plugins/transport/rocketmq` | Apache RocketMQ |
| NSQ | `plugins/transport/nsq` | NSQ |
| SQS | `plugins/transport/sqs` | AWS SQS |
| Redis | `plugins/transport/redis` | Redis Pub/Sub |
| ActiveMQ | `plugins/transport/activemq` | Apache ActiveMQ |
| Azure Service Bus | `plugins/transport/azuresb` | Azure Service Bus |
| Google Pub/Sub | `plugins/transport/gcpubsub` | Google Cloud Pub/Sub |

**AI Protocols**

| Plugin | Import Path | Engine/Notes |
|--------|------------|--------------|
| MCP | `plugins/transport/mcp` | Model Context Protocol (two server forms: StreamableHTTP / SSE) |

## 2. HTTP Server

```go
import httpPlugin "github.com/tx7do/go-wind-plugins/transport/http"

server := httpPlugin.NewServer(
    httpPlugin.WithAddr(":8080"),
    httpPlugin.WithHandler(router),
    httpPlugin.WithReadTimeout(10*time.Second),
    httpPlugin.WithWriteTimeout(10*time.Second),
    httpPlugin.WithTLS("cert.pem", "key.pem"),
    httpPlugin.WithCORS(true, []string{"*"}),
)
```

### YAML Configuration

```yaml
server:
  http:
    addr: ":8080"
    read_timeout: 10s
    write_timeout: 10s
    idle_timeout: 60s
    max_header_bytes: 1048576
    cors:
      enabled: true
      origins: ["https://app.example.com"]
      methods: ["GET", "POST", "PUT", "DELETE"]
      credentials: true
    tls:
      enabled: true
      cert_file: certs/cert.pem
      key_file: certs/key.pem
```

## 3. gRPC Server

```go
import grpcPlugin "github.com/tx7do/go-wind-plugins/transport/grpc"

server := grpcPlugin.NewServer(
    grpcPlugin.WithAddr(":9090"),
    grpcPlugin.WithServiceDesc(&pb.File_ServiceDesc),
    grpcPlugin.WithInterceptor(unaryInterceptor, streamInterceptor),
    grpcPlugin.WithTLS("cert.pem", "key.pem"),
    grpcPlugin.WithReflection(true),     // gRPC reflection
    grpcPlugin.WithHealthCheck(true),    // health check service
)
```

### YAML Configuration

```yaml
server:
  grpc:
    addr: ":9090"
    max_recv_msg_size: 4194304
    max_send_msg_size: 4194304
    reflection: true
    health_check: true
    tls:
      enabled: false
```

### Registering gRPC Services

```go
server := grpcPlugin.NewServer(
    grpcPlugin.WithAddr(":9090"),
    grpcPlugin.WithService(
        func(s *grpc.Server) {
            pb.RegisterUserServiceServer(s, &userService{})
        },
    ),
)
```

## 4. WebSocket Server

```go
import wsPlugin "github.com/tx7do/go-wind-plugins/transport/websocket"

server := wsPlugin.NewServer(
    wsPlugin.WithAddr(":8081"),
    wsPlugin.WithPath("/ws"),
    wsPlugin.WithUpgrader(upgrader),
    wsPlugin.WithHandler(wsHandler),
    wsPlugin.WithReadBufferSize(4096),
    wsPlugin.WithWriteBufferSize(4096),
    wsPlugin.WithCheckOrigin(true),
)
```

### WebSocket Handler

```go
func wsHandler(conn *wsPlugin.Conn) {
    defer conn.Close()

    for {
        msgType, msg, err := conn.ReadMessage()
        if err != nil {
            break
        }
        // Broadcast the message
        conn.WriteMessage(msgType, msg)
    }
}
```

## 5. SSE Server

```go
import ssePlugin "github.com/tx7do/go-wind-plugins/transport/sse"

server := ssePlugin.NewServer(
    ssePlugin.WithAddr(":8082"),
    ssePlugin.WithPath("/events"),
    ssePlugin.WithBufferSize(100),
)
```

### Pushing Events

```go
// Push to a specific client
server.Push(clientID, &ssePlugin.Event{
    Event: "notification",
    Data:  `{"message":"hello"}`,
})

// Broadcast
server.Broadcast(&ssePlugin.Event{
    Event: "update",
    Data:  `{"version":"v2.0"}`,
})
```

## 6. TCP Server

```go
import tcpPlugin "github.com/tx7do/go-wind-plugins/transport/tcp"

server := tcpPlugin.NewServer(
    tcpPlugin.WithAddr(":9000"),
    tcpPlugin.WithHandler(tcpHandler),
    tcpPlugin.WithReadTimeout(30*time.Second),
    tcpPlugin.WithKeepAlive(true),
)
```

## 7. KCP Server

```go
import kcpPlugin "github.com/tx7do/go-wind-plugins/transport/kcp"

server := kcpPlugin.NewServer(
    kcpPlugin.WithAddr(":9001"),
    kcpPlugin.WithHandler(kcpHandler),
    kcpPlugin.WithMTU(1400),
    kcpPlugin.WithNoDelay(1, 20, 2, 1),
)
```

## 8. GraphQL Server

```go
import gqlPlugin "github.com/tx7do/go-wind-plugins/transport/graphql"

server := gqlPlugin.NewServer(
    gqlPlugin.WithAddr(":8083"),
    gqlPlugin.WithSchema(schema),
    gqlPlugin.WithPlayground(true),
    gqlPlugin.WithIntrospection(true),
)
```

## 9. Listening on Multiple Protocols at Once

```go
app := wind.New(
    wind.WithName("multi-protocol"),
    wind.WithServer(httpServer),    // HTTP :8080
    wind.WithServer(grpcServer),    // gRPC :9090
    wind.WithServer(wsServer),      // WebSocket :8081
    wind.WithServer(sseServer),     // SSE :8082
)
app.Run(ctx)
```

```yaml
server:
  http:
    addr: ":8080"
  grpc:
    addr: ":9090"
  websocket:
    addr: ":8081"
    path: /ws
  sse:
    addr: ":8082"
    path: /events
```

## 10. Endpoint Exposure

Every Server exposes its access addresses via the `Endpoint()` method, which can be used for service registration:

```go
for _, srv := range app.Servers() {
    for _, ep := range srv.Endpoint() {
        fmt.Printf("%s: %s\n", srv.Type(), ep)
    }
}
// Output:
// http: http://0.0.0.0:8080
// grpc: grpc://0.0.0.0:9090
// websocket: ws://0.0.0.0:8081/ws
```

## Recent Updates

- **MCP** (`transport/mcp`): added `WithMCPHTTPServerOptions` / `WithMCPSSEServerOptions` to pass through StreamableHTTP / SSE server options (e.g. `WithHTTPContextFunc`); the server form supports both `ServerTypeHTTP` and `ServerTypeSSE`.

## Related Documents

- [Transport Abstraction](./core-transport.md)
- [Plugin Configuration System](./plugins-config.md)
- [Declarative Middleware Orchestration](./bootstrap-middleware.md)
- [Multi-Transport Tutorial](./tutorial-multi-transport.md)
