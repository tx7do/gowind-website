# go-wind Core Framework

go-wind is the core framework of the GoWind microservices ecosystem, providing application lifecycle management, transport abstraction, a logging facade, and context propagation. The core code is less than 500 lines and depends only on `golang.org/x/sync`.

## 1. Design Philosophy

> Not an all-in-one full-stack framework, but a box of building blocks.

| Principle | Description |
|------|------|
| Composition over inheritance | Every plugin implements only standard interfaces |
| Interfaces over implementations | The core defines only minimal interfaces; implementations are provided by plugins |
| Zero hidden magic | All behavior is explicitly declared, no implicit initialization |
| Zero external dependencies | Depends only on `golang.org/x/sync` |
| Functional options | `WithServer`, `WithName` and other chainable configuration |

## 2. Core Features

- **Building-block assembly** — the core only manages lifecycle; transport/logging expose minimal interfaces, while the service registry, configuration center, etc. are provided as concrete implementations by go-wind-plugins
- **Graceful lifecycle** — signal-aware Server start/stop with controllable timeouts; a single server crash automatically cascades into a full graceful exit
- **Start/stop hooks** — `WithBeforeStart` / `WithAfterStart` provide extension points before and after application startup (see the "Startup Phase Extension Points" section in [App Lifecycle Management](./core-lifecycle.md))
- **Non-intrusive Context** — TraceID / UserID / ColorTag propagate via context, with deep-copy protection against data races
- **Minimal logging facade** — a 4-method interface + `Enabled` + `With`; adapting logging backends such as slog / zap / zerolog takes only a few lines of glue code
- **Transport-agnostic error model** — the `errors` package provides bidirectional Code ↔ HTTP status mapping: beyond the standard gRPC category codes (0–16), `CodeToHTTP` also supports explicit pass-through of HTTP status codes 400–599
- **Functional options pattern** — `WithServer`, `WithName`… chainable configuration that is type-safe and readable

## 3. Core Modules

```
go-wind/
├── app.go          # App engine: lifecycle management
├── errors.go       # Package-level sentinel error definitions
├── context.go      # Context: request-scoped metadata propagation (TraceID / UserID / Metadata)
├── instance.go     # Service instance model
├── errors/         # Structured, transport-aware error model (WindError)
├── transport/      # Transport abstraction
│   └── server.go
└── log/            # Log facade (interface + Level + nop implementation + global registrar)
```

## 4. The App Engine

### 4.1 Creating an App

```go
package main

import (
    "context"
    "github.com/tx7do/go-wind"
)

func main() {
    app := wind.New(
        wind.WithName("my-service"),
        wind.WithServer(myHTTPServer, myGRPCServer),
    )

    if err := app.Run(context.Background()); err != nil {
        panic(err)
    }
}
```

### 4.2 Functional Options

| Option | Description |
|------|------|
| `WithID(id)` | Sets the unique identifier of the service instance |
| `WithName(name)` | Sets the service name |
| `WithVersion(version)` | Sets the service version |
| `WithServer(servers...)` | Adds one or more Transport Servers |
| `WithLogger(logger)` | Sets the App-level logger (falls back to the global logger when unset) |
| `WithStopTimeout(d)` | Sets the graceful shutdown timeout |
| `WithSignal(sigs...)` | Customizes the listened signals (default SIGTERM / SIGINT / SIGQUIT) |
| `WithBanner(enabled)` | Whether to print the startup banner |
| `WithInstanceID(id)` | Customizes the service instance ID |
| `WithBeforeStart(fn)` | Callback before application startup (before any Server starts) |
| `WithAfterStart(fn)` | Callback after application startup (after all Servers have started) |
| `WithBeforeStop(fn)` | Callback before shutdown (executed before Server.Stop) |
| `WithAfterStop(fn)` | Callback after shutdown (executed after all Servers stop) |

### 4.3 The Server Interface

```go
type Server interface {
    // Start begins accepting connections. It must block until ctx is
    // canceled or an error occurs.
    Start(ctx context.Context) error
    // Stop performs a graceful shutdown. The passed-in ctx carries a
    // timeout deadline, which implementations should respect.
    Stop(ctx context.Context) error
    // Endpoint returns the actual listening address. When bound to ":0"
    // (a random port), it must return the resolved real address after
    // Start has begun accepting connections.
    Endpoint() string
}
```

Any type implementing this interface can be registered with the App as a Server.

## 5. Quick Example

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "github.com/tx7do/go-wind"
)

// A custom HTTP Server
type MyServer struct {
    server *http.Server
}

// Start must block until ctx is canceled
func (s *MyServer) Start(ctx context.Context) error {
    s.server = &http.Server{Addr: ":8080", Handler: s.routes()}
    errCh := make(chan error, 1)
    go func() {
        if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            errCh <- err
        }
    }()
    select {
    case err := <-errCh:
        return err
    case <-ctx.Done():
        return nil
    }
}

func (s *MyServer) Stop(ctx context.Context) error {
    return s.server.Shutdown(ctx)
}

func (s *MyServer) Endpoint() string {
    return "http://localhost:8080"
}

func (s *MyServer) routes() http.Handler {
    mux := http.NewServeMux()
    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintln(w, "Hello, GoWind!")
    })
    return mux
}

func main() {
    app := wind.New(
        wind.WithName("hello-service"),
        wind.WithServer(&MyServer{}),
    )
    // Listens on SIGTERM/SIGINT/SIGQUIT by default and shuts down gracefully upon receiving a signal
    app.Run(context.Background())
}
```

## 6. Unified Error Model

The `errors` package provides transport-agnostic structured errors (WindError) whose `Code` is a `uint32`:

- **0–16**: aligned with gRPC category codes; `CodeToHTTP` converts them to HTTP status codes following the standard grpc-httpjson-transcoding / Envoy mapping table (e.g. `InvalidArgument → 400`, `Unavailable → 503`);
- **400–599**: explicit HTTP status pass-through — error helpers generated by code generators can carry status codes declared in proto files (402, 405, 418, etc.) directly in `Code`, and `CodeToHTTP` returns them as-is, allowing the transport to reproduce the declared status precisely;
- The reverse mapping `HTTPToCode` is many-to-one and returns the semantically most representative Code; unmapped statuses fall back to `CodeUnknown`.

```go
// Apply the status code at the HTTP transport boundary
w.WriteHeader(errors.CodeToHTTP(wErr.Code))
```

## Related Documentation

- [App Lifecycle Management](./core-lifecycle.md)
- [Context Propagation](./core-context.md)
- [Transport Abstraction](./core-transport.md)
- [Log Facade Interface](./core-logging.md)
- [Framework Architecture](./architecture.md)
