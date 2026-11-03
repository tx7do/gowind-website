# Transport 抽象

go-wind 的 Transport 模块定义了传输层的统一接口，支持 HTTP、gRPC、WebSocket、SSE 等多种协议。

## 一、Server 接口

```go
// transport/server.go
type Server interface {
    // Start 开始接受连接。必须阻塞直到 ctx 被取消或发生错误。
    Start(ctx context.Context) error
    // Stop 优雅停机。传入的 ctx 携带超时 deadline，实现应予以尊重。
    Stop(ctx context.Context) error
    // Endpoint 返回实际监听地址。绑定 ":0"（OS 分配端口）时，
    // 必须在 Start 开始接受连接后返回解析后的真实地址，
    // 以便调用方将其注册到服务注册中心。
    Endpoint() string
}
```

任何实现此接口的传输层都可以注册到 App。

## 二、支持的协议

传输层实现由适配器提供（遵循上述接口），当前落地情况：

| 协议 | 适配器 | 典型场景 |
|------|---------|---------|
| HTTP | `go-wind-bootstrap/transport/http` ✅ | REST API |
| gRPC | `go-wind-bootstrap/transport/grpc` ✅ | 内部服务调用 |
| HTTP/3、GraphQL、SSE、WebSocket、TCP、UDP、KCP、Thrift、tRPC、WebTransport | 规划中 | 详见 Bootstrap 支持组件清单 |

HTTP / gRPC 适配器的声明式配置与中间件编排见 [声明式中间件编排](./bootstrap-middleware.md)。

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

// Start 必须阻塞直到 ctx 被取消
func (s *Server) Start(ctx context.Context) error {
    ln, err := net.Listen("tcp", s.addr)
    if err != nil {
        return err
    }
    s.listener = ln

    errCh := make(chan error, 1)
    go func() {
        errCh <- s.serve() // accept 循环
    }()

    select {
    case err := <-errCh:
        return err
    case <-ctx.Done():
        return nil
    }
}

func (s *Server) Stop(ctx context.Context) error {
    return s.listener.Close()
}

// 绑定 ":0" 时应在 Start 后返回解析出的真实地址
func (s *Server) Endpoint() string {
    return fmt.Sprintf("custom://%s", s.listener.Addr())
}
```

## 四、多协议同时监听

```go
app := wind.New(
    wind.WithServer(httpServer),    // HTTP :8080
    wind.WithServer(grpcServer),    // gRPC :9090
    wind.WithServer(wsServer),      // WebSocket :8081
)
// 三种协议并发启动，共享同一个 App 生命周期；任一崩溃级联全量优雅退出
```

## 相关文档

- [核心框架介绍](./core-intro.md)
- [传输协议插件](./plugins-transport.md)
- [声明式中间件编排](./bootstrap-middleware.md)
- [多协议同时监听教程](./tutorial-multi-transport.md)
