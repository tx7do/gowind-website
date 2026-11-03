# Quick Start Tutorial

This tutorial walks you through creating a GoWind microservice from scratch, covering the full flow of installation, configuration, development, and deployment.

## Prerequisites

- Go 1.25+
- MySQL / PostgreSQL
- Redis (optional)
- Docker (for deployment)

## Step 1: Create the Project

### Option 1: CLI Tool

```bash
go install github.com/tx7do/go-wind-bootstrap/cmd/wind@latest

wind new my-service \
  --transport http \
  --database mysql \
  --cache redis \
  --log zap
```

### Option 2: Manual Creation

```bash
mkdir my-service && cd my-service
go mod init github.com/myorg/my-service
```

```bash
go get github.com/tx7do/go-wind
go get github.com/tx7do/go-wind-bootstrap
go get github.com/tx7do/go-wind-plugins/transport/http
go get github.com/tx7do/go-wind-plugins/log/zap
go get github.com/tx7do/go-wind-plugins/database/mysql
go get github.com/tx7do/go-wind-plugins/cache/redis
```

## Step 2: The Configuration File

Create `configs/config.yaml`:

```yaml
name: my-service
version: "1.0.0"

server:
  http:
    addr: ":8080"
    middleware:
      - recovery
      - cors
      - logger
      - request_id

log:
  zap:
    level: info
    format: console

database:
  default:
    driver: mysql
    dsn: "root:root@tcp(localhost:3306)/mydb?parseTime=true"
    max_open_conns: 50

cache:
  redis:
    addr: "localhost:6379"
    db: 0

middleware:
  cors:
    allow_origins: ["*"]
```

## Step 3: Define Data Entities

```bash
go get entgo.io/ent/cmd/ent
```

```go
// ent/schema/user.go
package schema

import (
    "entgo.io/ent"
    "entgo.io/ent/schema/field"
    "time"
)

type User struct{ ent.Schema }

func (User) Fields() []ent.Field {
    return []ent.Field{
        field.String("username").Unique().NotEmpty(),
        field.String("email").Unique(),
        field.String("password").Sensitive(),
        field.Time("created_at").Default(time.Now),
        field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
    }
}
```

```bash
go generate ./ent
```

## Step 4: Write the API

```go
// internal/handler/user_handler.go
package handler

import (
    "encoding/json"
    "net/http"
    "strconv"
    "my-service/ent"
)

type UserHandler struct {
    client *ent.Client
}

func NewUserHandler(client *ent.Client) *UserHandler {
    return &UserHandler{client: client}
}

func (h *UserHandler) Routes() map[string]http.HandlerFunc {
    return map[string]http.HandlerFunc{
        "GET /api/users":      h.list,
        "POST /api/users":     h.create,
        "GET /api/users/{id}": h.get,
    }
}

func (h *UserHandler) create(w http.ResponseWriter, r *http.Request) {
    var input struct {
        Username string `json:"username"`
        Email    string `json:"email"`
        Password string `json:"password"`
    }
    if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    user, err := h.client.User.Create().
        SetUsername(input.Username).
        SetEmail(input.Email).
        SetPassword(input.Password).
        Save(r.Context())
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) get(w http.ResponseWriter, r *http.Request) {
    id, _ := strconv.Atoi(r.PathValue("id"))
    user, err := h.client.User.Get(r.Context(), id)
    if err != nil {
        http.Error(w, "not found", http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) list(w http.ResponseWriter, r *http.Request) {
    users, err := h.client.User.Query().All(r.Context())
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(users)
}
```

## Step 5: Assemble Routes

```go
// internal/app.go
package internal

import (
    "net/http"
    "github.com/tx7do/go-wind/bootstrap"
    "my-service/ent"
    "my-service/internal/handler"
)

func init() {
    bootstrap.OnReady(func(app *bootstrap.App) {
        mux := http.NewServeMux()

        userHandler := handler.NewUserHandler(app.DB("default"))

        for pattern, handler := range userHandler.Routes() {
            mux.HandleFunc(pattern, handler)
        }

        mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
            w.WriteHeader(http.StatusOK)
            w.Write([]byte("OK"))
        })

        app.SetHTTPHandler(mux)
    })
}
```

## Step 6: The Entry File

```go
// cmd/server/main.go
package main

import (
    _ "github.com/tx7do/go-wind-plugins/transport/http"
    _ "github.com/tx7do/go-wind-plugins/log/zap"
    _ "github.com/tx7do/go-wind-plugins/database/mysql"
    _ "github.com/tx7do/go-wind-plugins/cache/redis"

    "github.com/tx7do/go-wind-bootstrap"
    _ "my-service/internal"
)

func main() {
    app := bootstrap.New("configs/config.yaml")
    app.Run()
}
```

## Step 7: Run

```bash
# Start MySQL and Redis
docker run -d --name mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=mydb -p 3306:3306 mysql:8
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Start the service
go run cmd/server/main.go

# Test the API
curl http://localhost:8080/health
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secret123"}'

curl http://localhost:8080/api/users
```

## Step 8: Docker Deployment

### Dockerfile

```dockerfile
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /server ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /server .
COPY configs/ ./configs/
EXPOSE 8080
CMD ["./server", "--config", "configs/config.yaml"]
```

### docker-compose.yml

```yaml
version: "3.8"
services:
  app:
    build: .
    ports: ["8080:8080"]
    environment:
      - DB_DSN=root:root@tcp(mysql:3306)/mydb?parseTime=true
      - REDIS_ADDR=redis:6379
    depends_on: [mysql, redis]

  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: mydb
    ports: ["3306:3306"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

```bash
docker compose up -d
```

## Summary

With the 8 steps above, you have completed:

| Step | What Was Done |
|------|---------|
| Create the project | Initialize the Go Module via CLI / manually |
| Configuration file | YAML declaring HTTP + MySQL + Redis + Zap |
| Data entities | Ent schema definitions + code generation |
| API Handler | CRUD logic |
| Route assembly | Route registration via Bootstrap callbacks |
| Entry file | Blank imports + 2 lines of code |
| Local run | `go run` startup + curl testing |
| Docker deployment | Multi-stage build + Compose orchestration |

## Next Steps

- [Custom Plugin Development Tutorial](./tutorial-custom-plugin.md)
- [Multi-Protocol Listening Tutorial](./tutorial-multi-transport.md)
- [Bootstrap Practical Examples](./bootstrap-examples.md)

## Related Documentation

- [Bootstrap Introduction](./bootstrap-intro.md)
- [Core Framework Introduction](./core-intro.md)
- [Bootstrap CLI Tool](./bootstrap-cli.md)
