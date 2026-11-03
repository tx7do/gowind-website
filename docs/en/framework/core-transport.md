# Transport Abstraction

The Transport module of go-wind defines a unified interface for the transport layer, supporting HTTP, gRPC, WebSocket, SSE, and many other protocols.

## 1. The Server Interface

```go
// transport/server.go
type Server interface {
    // Start begins accepting connections. It must block until ctx is
    // canceled or an error occurs.
    Start(ctx context.Context) error
    // Stop performs a graceful shutdown. The passed-in ctx carries a
    // timeout deadline, which implementations should respect.
    Stop(ctx context.Context) error
    // Endpoint returns the actual listening address. When bound to ":0"
    // (an OS-assigned port), it must return the resolved real address
    // after Start has begun accepting connections, so the caller can
    // register it with the service registry.
    Endpoint() string
}
```

Any transport implementing this interface can be registered with the App.

## 2. Supported Protocols

Transport implementations are provided by adapters (following the interface above). Current status:

| Protocol | Adapter | Typical Scenario |
|------|---------|---------|
| HTTP | `go-wind-bootstrap/transport/http` ✅ | REST APIs |
| gRPC | `go-wind-bootstrap/transport/grpc` ✅ | Internal service calls |
| HTTP/3, GraphQL, SSE, WebSocket, TCP, UDP, KCP, Thrift, tRPC, WebTransport | Planned | See the Bootstrap supported-components list |

For declarative configuration and middleware orchestration of the HTTP / gRPC adapters, see [Declarative Middleware Orchestration](./bootstrap-middleware.md).

## 3. Custom Transport

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

// Start must block until ctx is canceled
func (s *Server) Start(ctx context.Context) error {
    ln, err := net.Listen("tcp", s.addr)
    if err != nil {
        return err
    }
    s.listener = ln

    errCh := make(chan error, 1)
    go func() {
        errCh <- s.serve() // accept loop
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

// When bound to ":0", it should return the resolved real address after Start
func (s *Server) Endpoint() string {
    return fmt.Sprintf("custom://%s", s.listener.Addr())
}
```

## 4. Listening on Multiple Protocols

```go
app := wind.New(
    wind.WithServer(httpServer),    // HTTP :8080
    wind.WithServer(grpcServer),    // gRPC :9090
    wind.WithServer(wsServer),      // WebSocket :8081
)
// All three protocols start concurrently and share the same App lifecycle;
// any crash cascades into a full graceful exit
```

## Related Documentation

- [Core Framework Introduction](./core-intro.md)
- [Transport Protocol Plugins](./plugins-transport.md)
- [Declarative Middleware Orchestration](./bootstrap-middleware.md)
- [Multi-Protocol Listening Tutorial](./tutorial-multi-transport.md)
