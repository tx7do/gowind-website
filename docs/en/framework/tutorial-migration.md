# Framework Migration Guide

A comparison guide for migrating from other Go microservices frameworks to GoWind.

## 1. Migrating from Gin

### 1.1 Routing Comparison

```go
// ===== Gin =====
router := gin.Default()
router.GET("/users/:id", getUser)
router.POST("/users", createUser)
router.Group("/api").Use(AuthMiddleware())

// ===== GoWind + Bootstrap =====
mux := http.NewServeMux()
mux.HandleFunc("GET /api/users/{id}", getUser)
mux.HandleFunc("POST /api/users", createUser)
// Middleware is declared in YAML
```

### 1.2 Context Comparison

```go
// ===== Gin =====
func handler(c *gin.Context) {
    id := c.Param("id")
    name := c.Query("name")
    body := c.Request.Body
    c.JSON(200, gin.H{"data": result})
}

// ===== GoWind =====
func handler(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    name := r.URL.Query().Get("name")
    body := r.Body
    json.NewEncoder(w).Encode(map[string]interface{}{"data": result})
}
```

### 1.3 Middleware Comparison

```go
// ===== Gin =====
router.Use(gin.Logger(), gin.Recovery(), cors.Default())

// ===== GoWind =====
// Declared in YAML:
// server.http.middleware: [logger, recovery, cors]
```

## 2. Migrating from Kratos

### 2.1 Provider Comparison

```go
// ===== Kratos =====
wire.NewSet(NewServer, NewDataService, NewData, NewBiz)

// ===== GoWind =====
// No wire needed; the Bootstrap instantiates automatically via SPI
// Only YAML configuration + blank imports are required
```

### 2.2 Transport Comparison

```go
// ===== Kratos =====
func NewHTTPServer(svc *service.Service) *http.Server {
    srv := http.NewServer(http.Address(":8080"))
    srv.HandlePrefix("/api", svc)
    return srv
}

// ===== GoWind =====
// YAML configuration:
// server.http.addr: ":8080"
// Routes are set in code via bootstrap.OnReady
```

### 2.3 Configuration Comparison

```go
// ===== Kratos =====
type Config struct {
    Server struct {
        HTTP struct { Addr string `json:"addr"` }
    }
}
bc := bootstrap.New(...)
config.LoadSources(bc, file.NewSource(...))

// ===== GoWind =====
// The YAML file is loaded automatically
// bootstrap.New("config.yaml")
// Environment variables are substituted automatically
```

## 3. Migrating from go-micro

### 3.1 Service Definition Comparison

```go
// ===== go-micro =====
service := micro.NewService(
    micro.Name("my.service"),
    micro.Address(":8080"),
)
pb.RegisterMyServiceHandler(service.Server(), handler)
service.Run()

// ===== GoWind =====
// YAML + blank imports replace all the options
app := bootstrap.New("config.yaml")
app.Run()
```

### 3.2 Service Discovery Comparison

```go
// ===== go-micro =====
import _ "github.com/go-micro/plugins/v4/registry/consul"
service := micro.NewService(micro.Registry(consul.NewRegistry()))

// ===== GoWind =====
import _ "github.com/tx7do/go-wind-plugins/registry/consul"
// YAML: registry.consul.addr: "localhost:8500"
```

## 4. Migrating from Echo

### 4.1 Routing Comparison

```go
// ===== Echo =====
e := echo.New()
e.GET("/users/:id", getUser)
e.POST("/users", createUser)
e.Use(middleware.Logger(), middleware.Recover())

// ===== GoWind =====
mux := http.NewServeMux()
mux.HandleFunc("GET /api/users/{id}", getUser)
mux.HandleFunc("POST /api/users", createUser)
// Middleware is declared in YAML
```

### 4.2 JSON Binding

```go
// ===== Echo =====
func handler(c echo.Context) error {
    var req CreateUserReq
    if err := c.Bind(&req); err != nil { return err }
    return c.JSON(200, result)
}

// ===== GoWind =====
func handler(w http.ResponseWriter, r *http.Request) {
    var req CreateUserReq
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, err.Error(), 400)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(result)
}
```

## 5. Migration Checklist

| Migration Item | Original Framework | GoWind Solution |
|--------|--------|-------------|
| HTTP routing | Gin/Echo/Echo | `net/http.ServeMux` (Go 1.22+ pattern) |
| Middleware | Chained calls in code | Declarative YAML orchestration |
| Configuration management | Viper/custom | YAML + environment variables + configuration center |
| Dependency injection | Wire/Dig | SPI auto-assembly |
| Database | GORM/XORM | Ent ORM |
| Logging | Framework built-in | Zap/Zerolog (plugin-based) |
| Service discovery | Registry SDK | Consul/Etcd plugins |
| Distributed tracing | OpenTelemetry SDK | Jaeger/OTLP plugins |
| Message queues | Various SDKs | Unified interface for Kafka/RabbitMQ |

## 6. Migration Steps

### Step 1: Create a GoWind Project

```bash
wind new my-service --transport http --database mysql --log zap
```

### Step 2: Migrate Configuration

Map the original framework's configuration to `config.yaml`:

```yaml
# Original Gin + Viper configuration
# viper.SetDefault("port", 8080)
# viper.SetDefault("db.host", "localhost")

# GoWind YAML
server:
  http:
    addr: ":8080"
database:
  default:
    driver: mysql
    dsn: "user:pass@tcp(localhost:3306)/db"
```

### Step 3: Migrate Routes

Convert the existing route registrations to the `http.ServeMux` pattern:

```go
// Migrate routes one by one
mux.HandleFunc("GET /api/users", listUsers)
mux.HandleFunc("POST /api/users", createUser)
```

### Step 4: Migrate Middleware

Register middleware with the Bootstrap:

```go
// Existing custom middleware
func init() {
    middleware.Register("my_middleware", MyMiddleware)
}
```

```yaml
# Referenced in YAML
server:
  http:
    middleware:
      - recovery
      - cors
      - my_middleware
```

### Step 5: Migrate the Data Layer

Migrate from GORM to Ent:

```go
// ===== GORM =====
db.Where("id = ?", id).First(&user)

// ===== Ent =====
client.User.Get(ctx, id)
```

### Step 6: Migrate Business Logic

Business logic usually needs no modification; only the way the data access layer is called needs adjusting.

### Step 7: Test and Deploy

```bash
# Make sure all APIs work correctly
go test ./...

# Docker build and deployment
docker compose up -d
```

## 7. Incremental Migration

For larger projects, migrate incrementally:

1. **Phase 1**: Start with the GoWind Bootstrap while still using Gin handlers internally
2. **Phase 2**: Gradually convert Gin handlers to `net/http`
3. **Phase 3**: Migrate GORM to Ent
4. **Phase 4**: Remove the Gin dependency — pure GoWind

```go
// Phase 1: Gin as the Handler
ginRouter := gin.New()
ginRouter.GET("/api/users", getUsers)
// ...
app.SetHTTPHandler(ginRouter)
```

## Related Documentation

- [Quick Start Tutorial](./tutorial-quick-start.md)
- [Bootstrap Introduction](./bootstrap-intro.md)
- [Core Framework Introduction](./core-intro.md)
- [Declarative Middleware Orchestration](./bootstrap-middleware.md)
