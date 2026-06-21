# Bootstrap 实战示例

从零到一的 Bootstrap 项目搭建指南，涵盖常见场景。

## 一、REST API 服务

### 1.1 初始化项目

```bash
wind new blog-api \
  --transport http \
  --database postgres \
  --cache redis \
  --log zap \
  --tracer jaeger

cd blog-api
```

### 1.2 配置文件

```yaml
# configs/config.yaml
name: blog-api
version: 1.0.0

server:
  http:
    addr: ":8080"
    middleware:
      - cors
      - recovery
      - request_id
      - logger
      - tracing

log:
  zap:
    level: info
    format: json

database:
  default:
    driver: postgres
    dsn: "postgres://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?sslmode=disable"
    max_open_conns: 50

cache:
  redis:
    addr: "localhost:6379"
    db: 0

tracer:
  jaeger:
    endpoint: "http://localhost:14268/api/traces"
    sample_ratio: 0.5

middleware:
  cors:
    allow_origins: ["http://localhost:3000"]
    allow_credentials: true
  logger:
    skip_paths: [/health]
```

### 1.3 定义实体

```go
// ent/schema/post.go
package schema

import (
    "entgo.io/ent"
    "entgo.io/ent/schema/field"
    "time"
)

type Post struct{ ent.Schema }

func (Post) Fields() []ent.Field {
    return []ent.Field{
        field.String("title").NotEmpty(),
        field.Text("content"),
        field.String("author").Default("anonymous"),
        field.Bool("published").Default(false),
        field.Time("created_at").Default(time.Now),
        field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now),
    }
}
```

### 1.4 生成代码

```bash
wind gen ent
```

### 1.5 业务逻辑

```go
// internal/service/post_service.go
package service

import (
    "context"
    "blog-api/ent"
    "blog-api/ent/post"
)

type PostService struct {
    client *ent.Client
    cache  cache.Cache
}

func NewPostService(client *ent.Client, cache cache.Cache) *PostService {
    return &PostService{client: client, cache: cache}
}

func (s *PostService) Create(ctx context.Context, title, content string) (*ent.Post, error) {
    return s.client.Post.Create().
        SetTitle(title).
        SetContent(content).
        Save(ctx)
}

func (s *PostService) GetByID(ctx context.Context, id int) (*ent.Post, error) {
    // 先查缓存
    key := fmt.Sprintf("post:%d", id)
    if cached, _ := s.cache.Get(ctx, key); cached != nil {
        var p ent.Post
        json.Unmarshal(cached, &p)
        return &p, nil
    }

    // 回源数据库
    p, err := s.client.Post.Get(ctx, id)
    if err != nil {
        return nil, err
    }

    // 写入缓存
    data, _ := json.Marshal(p)
    s.cache.Set(ctx, key, data, 10*time.Minute)

    return p, nil
}
```

### 1.6 路由注册

```go
// internal/router/router.go
package router

import (
    "net/http"
    "github.com/tx7do/go-wind-bootstrap"
    "blog-api/internal/service"
)

func init() {
    bootstrap.OnRouterReady(func(app *bootstrap.App) {
        mux := http.NewServeMux()

        postSvc := service.NewPostService(app.DB(), app.Cache())

        mux.HandleFunc("GET /api/posts/{id}", func(w http.ResponseWriter, r *http.Request) {
            id := r.PathValue("id")
            // ...
        })
        mux.HandleFunc("POST /api/posts", func(w http.ResponseWriter, r *http.Request) {
            // ...
        })

        app.SetHTTPHandler(mux)
    })
}
```

### 1.7 main.go

```go
package main

import (
    _ "github.com/tx7do/go-wind-plugins/transport/http"
    _ "github.com/tx7do/go-wind-plugins/log/zap"
    _ "github.com/tx7do/go-wind-plugins/database/postgres"
    _ "github.com/tx7do/go-wind-plugins/cache/redis"
    _ "github.com/tx7do/go-wind-plugins/tracer/jaeger"

    "github.com/tx7do/go-wind-bootstrap"
    _ "blog-api/internal/router"
)

func main() {
    app := bootstrap.New("configs/config.yaml")
    app.Run()
}
```

## 二、gRPC 微服务

```yaml
# configs/config.yaml
name: user-service

server:
  grpc:
    addr: ":9090"

database:
  default:
    driver: mysql
    dsn: "${DB_DSN}"

registry:
  consul:
    addr: "localhost:8500"
    health_check:
      interval: 10s
```

```protobuf
// api/v1/user.proto
syntax = "proto3";
package api.v1;

service UserService {
    rpc GetUser(GetUserRequest) returns (User);
    rpc CreateUser(CreateUserRequest) returns (User);
    rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
}

message User {
    string id = 1;
    string username = 2;
    string email = 3;
}
```

```go
package main

import (
    _ "github.com/tx7do/go-wind-plugins/transport/grpc"
    _ "github.com/tx7do/go-wind-plugins/log/zap"
    _ "github.com/tx7do/go-wind-plugins/database/mysql"
    _ "github.com/tx7do/go-wind-plugins/registry/consul"

    "github.com/tx7do/go-wind-bootstrap"
    _ "user-service/internal/handler"
)

func main() {
    app := bootstrap.New("configs/config.yaml")
    app.Run()
}
```

## 三、事件驱动服务

```yaml
name: event-processor

server:
  http:
    addr: ":8080"

broker:
  kafka:
    addrs: ["localhost:9092"]
    group_id: "event-processor"

database:
  default:
    driver: clickhouse
    dsn: "clickhouse://localhost:9000/events"
```

```go
func init() {
    bootstrap.OnReady(func(app *bootstrap.App) {
        // 订阅 Kafka 事件
        app.Broker().Subscribe(ctx, "user-events", func(ctx context.Context, msg *broker.Message) error {
            var event UserEvent
            json.Unmarshal(msg.Body, &event)
            // 写入 ClickHouse
            app.DB().UserEvent.Create().
                SetUserID(event.UserID).
                SetEvent(event.Type).
                SetTimestamp(event.Timestamp).
                Save(ctx)
            return nil
        })
    })
}
```

## 四、Dockerfile

```dockerfile
# multi-stage build
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

## 五、Docker Compose

```yaml
# docker-compose.yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DB_USER=app
      - DB_PASS=secret
      - DB_HOST=postgres
      - DB_NAME=blog
      - REDIS_ADDR=redis:6379
      - TRACER_ENDPOINT=http://jaeger:14268/api/traces
    depends_on:
      - postgres
      - redis
      - jaeger

  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: blog
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  jaeger:
    image: jaegertracing/all-in-one:1.60
    ports:
      - "16686:16686"    # Jaeger UI
      - "14268:14268"    # HTTP Collector
```

## 相关文档

- [Bootstrap 介绍](./bootstrap-intro.md)
- [Bootstrap CLI 工具](./bootstrap-cli.md)
- [快速入门教程](./tutorial-quick-start.md)
- [多协议同时监听教程](./tutorial-multi-transport.md)
