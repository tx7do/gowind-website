# 传输协议插件

go-wind-plugins 提供多种传输协议适配器，实现 `transport.Server` 接口。支持 HTTP、gRPC、WebSocket、SSE 等主流协议。

## 一、协议总览

| 协议 | 导入路径 | 类型 | 典型场景 |
|------|---------|------|---------|
| HTTP | `plugins/transport/http` | 请求-响应 | REST API |
| gRPC | `plugins/transport/grpc` | 流式 | 内部服务调用 |
| WebSocket | `plugins/transport/websocket` | 双向流 | 实时通信 |
| SSE | `plugins/transport/sse` | 服务端推送 | 事件推送 |
| TCP | `plugins/transport/tcp` | 长连接 | 自定义协议 |
| KCP | `plugins/transport/kcp` | UDP | 低延迟游戏 |
| GraphQL | `plugins/transport/graphql` | 查询语言 | 灵活 API |

## 二、HTTP Server

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

### YAML 配置

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

## 三、gRPC Server

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

### YAML 配置

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

### 注册 gRPC 服务

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

## 四、WebSocket Server

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
        // 广播消息
        conn.WriteMessage(msgType, msg)
    }
}
```

## 五、SSE Server

```go
import ssePlugin "github.com/tx7do/go-wind-plugins/transport/sse"

server := ssePlugin.NewServer(
    ssePlugin.WithAddr(":8082"),
    ssePlugin.WithPath("/events"),
    ssePlugin.WithBufferSize(100),
)
```

### 推送事件

```go
// 向特定客户端推送
server.Push(clientID, &ssePlugin.Event{
    Event: "notification",
    Data:  `{"message":"hello"}`,
})

// 广播
server.Broadcast(&ssePlugin.Event{
    Event: "update",
    Data:  `{"version":"v2.0"}`,
})
```

## 六、TCP Server

```go
import tcpPlugin "github.com/tx7do/go-wind-plugins/transport/tcp"

server := tcpPlugin.NewServer(
    tcpPlugin.WithAddr(":9000"),
    tcpPlugin.WithHandler(tcpHandler),
    tcpPlugin.WithReadTimeout(30*time.Second),
    tcpPlugin.WithKeepAlive(true),
)
```

## 七、KCP Server

```go
import kcpPlugin "github.com/tx7do/go-wind-plugins/transport/kcp"

server := kcpPlugin.NewServer(
    kcpPlugin.WithAddr(":9001"),
    kcpPlugin.WithHandler(kcpHandler),
    kcpPlugin.WithMTU(1400),
    kcpPlugin.WithNoDelay(1, 20, 2, 1),
)
```

## 八、GraphQL Server

```go
import gqlPlugin "github.com/tx7do/go-wind-plugins/transport/graphql"

server := gqlPlugin.NewServer(
    gqlPlugin.WithAddr(":8083"),
    gqlPlugin.WithSchema(schema),
    gqlPlugin.WithPlayground(true),
    gqlPlugin.WithIntrospection(true),
)
```

## 九、多协议同时监听

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

## 十、Endpoint 暴露

每个 Server 通过 `Endpoint()` 方法暴露访问地址，可用于服务注册：

```go
for _, srv := range app.Servers() {
    for _, ep := range srv.Endpoint() {
        fmt.Printf("%s: %s\n", srv.Type(), ep)
    }
}
// 输出:
// http: http://0.0.0.0:8080
// grpc: grpc://0.0.0.0:9090
// websocket: ws://0.0.0.0:8081/ws
```

## 相关文档

- [Transport 抽象](./core-transport.md)
- [插件配置系统](./plugins-config.md)
- [声明式中间件编排](./bootstrap-middleware.md)
- [多协议同时监听教程](./tutorial-multi-transport.md)
