# Transport 抽象

go-wind 的 Transport 模块定义了传输层的统一接口，支持 HTTP、gRPC、WebSocket、SSE 等多种协议。

## 一、Server 接口

```go
// transport/transport.go
type Server interface {
    Start(context.Context) error
    Stop(context.Context) error
    Endpoint() []string
    Type() string
}
```

任何实现此接口的传输层都可以注册到 App。

## 二、支持的协议

| 协议 | 插件路径 | 典型场景 |
|------|---------|---------|
| HTTP | `plugins/transport/http` | REST API |
| gRPC | `plugins/transport/grpc` | 内部服务调用 |
| WebSocket | `plugins/transport/websocket` | 实时双向通信 |
| SSE | `plugins/transport/sse` | 服务端推送 |
| TCP | `plugins/transport/tcp` | 自定义协议 |
| KCP | `plugins/transport/kcp` | 低延迟 UDP |
| GraphQL | `plugins/transport/graphql` | GraphQL API |

## 三、自定义 Transport

```go
package mytransport

type Server struct {
    addr     string
    listener net.Listener
}

func NewServer(opts ...Option) *Server {
    s := &Server{addr: ":9090"}
    for _, opt := range opts {
        opt(s)
    }
    return s
}

func (s *Server) Start(ctx context.Context) error {
    ln, err := net.Listen("tcp", s.addr)
    if err != nil {
        return err
    }
    s.listener = ln
    go s.accept(ctx)
    return nil
}

func (s *Server) Stop(ctx context.Context) error {
    return s.listener.Close()
}

func (s *Server) Endpoint() []string {
    return []string{fmt.Sprintf("custom://%s", s.addr)}
}

func (s *Server) Type() string { return "custom" }
```

## 四、多协议同时监听

```go
app := wind.New(
    wind.WithServer(httpServer),    // HTTP :8080
    wind.WithServer(grpcServer),    // gRPC :9090
    wind.WithServer(wsServer),      // WebSocket :8081
)
// 三种协议同时运行，共享同一个 App 生命周期
```

## 相关文档

- [核心框架介绍](./core-intro.md)
- [传输协议插件](./plugins-transport.md)
- [声明式中间件编排](./bootstrap-middleware.md)
- [多协议同时监听教程](./tutorial-multi-transport.md)
