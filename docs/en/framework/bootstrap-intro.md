# go-wind-bootstrap: The Declarative Bootstrap

go-wind-bootstrap is the topmost layer of the GoWind ecosystem. Through declarative YAML configuration, it assembles the go-wind core and go-wind-plugins into a complete application, achieving "zero-code startup".

## 1. Design Philosophy

> The core defines interfaces, plugins provide implementations, and the Bootstrap handles assembly.

```
┌──────────────────────────────────────────┐
│         Bootstrap (Assembly Layer)       │
│  BootstrapConfig → Builder Registry      │
│       → wind.Option chain → wind.App     │
├──────────────────────────────────────────┤
│         Adapters / Plugins (Impl. Layer) │
│   HTTP/gRPC/Zap/Redis/Consul/Kafka/...   │
├──────────────────────────────────────────┤
│         Core (Interface Layer)           │
│   transport.Server / log.Logger          │
└──────────────────────────────────────────┘
```

## 2. Hello World

### 2.1 config.yaml

```yaml
app:
  id: my-service
  name: my-service
  version: "1.0.0"
  env: development

server:
  http:
    addr: ":8080"

logger:
  type: zap
  zap:
    level: info
    format: json
```

### 2.2 main.go

```go
package main

import (
    "fmt"
    "net/http"
    "os"

    bootstrap "github.com/tx7do/go-wind-bootstrap"
    _ "github.com/tx7do/go-wind-bootstrap/log/zap"
    httpAdapter "github.com/tx7do/go-wind-bootstrap/transport/http"
)

func main() {
    httpAdapter.RegisterServerSetup(func(srv *httpAdapter.Server) {
        srv.GET("/", func(w http.ResponseWriter, r *http.Request) {
            _, _ = fmt.Fprintf(w, "Hello, GoWind!\n")
        })
    })

    if err := bootstrap.RunAppWithFlags(bootstrap.NewCommandFlags()); err != nil {
        os.Exit(1)
    }
}
```

**2 blank imports + one startup line** is all it takes to run a service with an HTTP server and logging:

```bash
go run main.go                       # Use the default config.yaml
go run main.go -c /path/to/config.yaml  # Specify a configuration file
```

## 3. Bootstrap vs. Manual Assembly

### 3.1 Manual Assembly (Without the Bootstrap)

```go
func main() {
    // 1. Create the logger
    logger := zapPlugin.NewLogger(zapPlugin.WithLevel("info"))
    log.SetLogger(logger)

    // 2. Create the database connection
    db, _ := mysqlPlugin.New(mysqlPlugin.WithDSN("..."))
    client := ent.NewClient(ent.Driver(db))

    // 3. Create the cache
    cache, _ := redisPlugin.New(redisPlugin.WithAddr("localhost:6379"))

    // 4. Create the Broker
    kafka, _ := kafkaPlugin.New(kafkaPlugin.WithAddrs("localhost:9092"))

    // 5. Create the HTTP server
    router := setupRouter(client, cache, kafka)
    httpServer := httpPlugin.NewServer(
        httpPlugin.WithAddr(":8080"),
        httpPlugin.WithHandler(router),
    )

    // 6. Create the App (signal listening is built in, no extra options needed)
    app := wind.New(
        wind.WithName("my-service"),
        wind.WithServer(httpServer),
        wind.WithLogger(logger),
    )

    // 7. Start
    app.Run(context.Background())
}
```

### 3.2 Bootstrap: Declarative

```go
func main() {
    // Everything is assembled automatically from YAML
    if err := bootstrap.RunApp("config.yaml"); err != nil {
        log.Fatal(err)
    }
}
```

| Aspect | Manual Assembly | Bootstrap |
|--------|---------|-----------|
| Lines of code | 30+ | 2 |
| Configuration changes | Requires code changes + recompilation | Edit the YAML and restart |
| Adding a plugin | Write code to create + inject | Add a blank import + YAML config |
| Error troubleshooting | At compile time | At runtime (needs log support) |
| Flexibility | High | Medium (convention over configuration) |

## 4. Bootstrap Capabilities

| Capability | Description |
|------|------|
| Declarative configuration | A Protobuf-defined `BootstrapConfig`; one YAML/JSON/binary file describes the full application topology |
| SPI assembly | Adapters self-register Builders via `init()` and are instantiated automatically according to configuration |
| Lifecycle management | Initialize → Start → Run → Stop; signal listening built in (SIGINT/SIGTERM) |
| Service registry assembly | Instance registration is deferred until after the application has started (AfterStart hook) so it registers with real endpoints, and deregistered first at shutdown (BeforeStop hook) |
| Middleware orchestration | Declare middleware chains in YAML, enabled in proto field order |
| Multi-instance management | Multi-instance support for databases/caches/brokers/storage etc., retrieved by type key |
| Multi-format configuration | YAML / JSON / Protobuf binary, auto-detected by file extension |

### Field Mapping Code Generation

The field mappings of the Bootstrap configuration surface are no longer maintained by hand: the mapping from each family's configuration fields to upstream library options is generated declaratively by [protoc-gen-fieldmap](/en/toolkit/fieldmap.md) according to the spec, and CI regenerates from the spec and compares byte-by-byte to prevent drift between the configuration surface and upstream library options. See [protoc-gen-fieldmap: The Field Mapping Generator](/en/toolkit/fieldmap.md) for details.

## 5. Configuration File Loading

The startup entry point specifies the configuration file via a Cobra command-line flag (`-c/--conf`, default `config.yaml`), with the format auto-detected by extension:

```bash
go run main.go -c /path/to/config.yaml   # YAML
go run main.go -c config.json            # JSON
go run main.go -c config.pb              # Protobuf binary
```

```go
// Fully sealed: internally goes through RunApp → LoadConfigFromFile
bootstrap.RunAppWithFlags(bootstrap.NewCommandFlags())

// Semi-sealed: load the configuration first, manipulate it, then run
cfg, _ := bootstrap.LoadConfigFromFile("config.yaml")
bctx, _ := bootstrap.BootstrapWithContext(nil, cfg)
fmt.Println(bctx.Config().GetApp().GetName())
bctx.App().Run(bctx)
```

Besides the main configuration file, you can also configure configuration center sources (file / etcd / nacos / consul / apollo, etc.) to pull remote configuration at startup — see [The Bootstrap Configuration System](./bootstrap-config.md).

## 6. Directory Conventions

```
my-service/
├── cmd/
│   └── server/
│       └── main.go          # Entry point
├── configs/
│   └── config.yaml          # Configuration file
├── ent/                     # Ent entity definitions
├── api/                     # Protobuf API definitions
├── internal/
│   ├── service/             # Business logic layer
│   ├── repo/                # Data access layer
│   └── router/              # Route configuration
├── go.mod
└── go.sum
```

## 7. Multi-Module Dependency Isolation

The bootstrap engine core depends only on `go-wind`, `Cobra`, and `Protobuf` (the configuration contract). Every adapter subpackage (`log/zap`, `transport/http`, `database/gorm`, `cache/redis`…) is a submodule with its own `go.mod` — only the adapters you use are imported, and unused adapters never enter the dependency tree.

## Related Documentation

- [The Bootstrap Configuration System](./bootstrap-config.md)
- [The Bootstrap SPI Mechanism](./bootstrap-spi.md)
- [Declarative Middleware Orchestration](./bootstrap-middleware.md)
- [Quick Start Tutorial](./tutorial-quick-start.md)
- [Framework Architecture](./architecture.md)
