# Bootstrap 实战示例

从零到一的 Bootstrap 项目搭建指南，涵盖常见场景。所有示例均可在仓库 `_examples/` 目录找到对应雏形（quickstart / yaml_config / custom_builder / ddd）。

## 一、最简 REST 服务

### 1.1 config.yaml

```yaml
app:
  id: hello-service
  name: hello-service
  version: "1.0.0"
  env: development

server:
  http:
    addr: ":8080"
    middleware:
      recovery:
        stack_trace: true
      cors:
        allowed_origins: ["*"]
      logging:
        skip_paths: ["/health"]

logger:
  type: zap
  zap:
    level: info
    format: json
```

### 1.2 main.go

```go
package main

import (
    "fmt"
    "log/slog"
    "net/http"
    "os"

    bootstrap "github.com/tx7do/go-wind-bootstrap"

    // 适配层子模块，通过空导入自注册 builder。
    _ "github.com/tx7do/go-wind-bootstrap/log/zap"
    httpAdapter "github.com/tx7do/go-wind-bootstrap/transport/http"
)

func main() {
    // --- 配置路由（必须在 RunApp 之前）---
    httpAdapter.RegisterServerSetup(func(srv *httpAdapter.Server) {
        srv.GET("/", func(w http.ResponseWriter, r *http.Request) {
            _, _ = fmt.Fprintf(w, "Hello from go-wind-bootstrap quickstart!\n")
        })
        srv.GET("/health", func(w http.ResponseWriter, r *http.Request) {
            w.WriteHeader(http.StatusOK)
        })
    })

    // --- 一行启动 ---
    if err := bootstrap.RunAppWithFlags(bootstrap.NewCommandFlags()); err != nil {
        slog.Error("application exited with error", "error", err)
        os.Exit(1)
    }
}
```

```bash
go run main.go                          # 使用默认 config.yaml
go run main.go -c /path/to/config.yaml  # 指定配置文件
curl http://localhost:8080
```

`RegisterServerSetup` 是追加式注册：代码生成器生成的路由与手写路由各自注册、互不覆盖。

## 二、gRPC 微服务

### 2.1 config.yaml

```yaml
app:
  name: user-service

server:
  grpc:
    addr: ":9000"
    reflection: true
    middleware:
      recovery: {}
      logging: {}
      validate: {}

registry:
  type: etcd
  etcd:
    endpoints: ["localhost:2379"]
    ttl: 30

database:
  sql:
    driver: mysql
    source: "user:pass@tcp(localhost:3306)/users?parseTime=true"
```

配置注册中心后无需写任何注册代码：应用启动后（AfterStart 钩子）以真实监听端点自动注册，优雅停机时（BeforeStop 钩子）在服务器停止前自动注销。

### 2.2 main.go

```go
package main

import (
    "google.golang.org/grpc"

    bootstrap "github.com/tx7do/go-wind-bootstrap"
    _ "github.com/tx7do/go-wind-bootstrap/log/zap"
    grpcAdapter "github.com/tx7do/go-wind-bootstrap/transport/grpc"

    v1 "user-service/api/gen/v1"
)

func init() {
    // 注册 gRPC 服务实现
    grpcAdapter.RegisterServiceRegistrar(func(srv *grpc.Server) {
        v1.RegisterUserServiceServer(srv, &userService{})
    })
}

func main() {
    if err := bootstrap.RunAppWithFlags(bootstrap.NewCommandFlags()); err != nil {
        os.Exit(1)
    }
}
```

## 三、声明式全家桶

一份 YAML 同时描述缓存、数据库、对象存储、Broker、注册中心与追踪；半密封模式启动后按类型键取用装配好的实例：

```yaml
app:
  name: order-service

server:
  http:
    addr: ":8080"

logger:
  type: zap
  zap:
    level: info
    writer: file
    output_path: logs/app.log
    max_size_mb: 100
    max_backups: 10

registry:
  type: consul
  consul:
    address: "localhost:8500"

tracer:
  type: otlp
  otlp:
    endpoint: "localhost:4317"
    insecure: true

cache:
  redis:
    addr: "localhost:6379"
    key_prefix: "order"

database:
  sql:
    driver: postgres
    source: "postgres://user:pass@localhost:5432/orders?sslmode=disable"

storage:
  minio:
    endpoint: "localhost:9000"
    access_key: minioadmin
    secret_key: minioadmin
    use_ssl: false

broker:
  kafka:
    brokers: ["localhost:9092"]
```

```go
bctx, err := bootstrap.BootstrapWithContext(nil, cfg)
if err != nil {
    log.Fatal(err)
}
defer bctx.Cleanup()

// 按类型键取用装配好的实例
db := bctx.Database("gorm")
cache := bctx.Cache("redis")
oss := bctx.Storage("minio")
broker := bctx.Broker("kafka")
reg := bctx.Registry("consul") // GetService/Watch/Register/Deregister

fmt.Println(bctx.Config().GetApp().GetName())
fmt.Println(bctx.Config().GetServer().GetHttp().GetAddr())

bctx.App().Run(bctx)
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
CMD ["./server", "-c", "configs/config.yaml"]
```

## 五、Docker Compose

```yaml
# docker-compose.yaml
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DB_DSN=postgres://app:secret@postgres:5432/orders?sslmode=disable
    depends_on:
      - postgres
      - redis
      - etcd

  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: orders
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  etcd:
    image: quay.io/coreos/etcd:v3.5.17
    command: etcd --listen-client-urls http://0.0.0.0:2379 --advertise-client-urls http://etcd:2379
    ports:
      - "2379:2379"
```

## 相关文档

- [Bootstrap 介绍](./bootstrap-intro.md)
- [Bootstrap CLI 工具](./bootstrap-cli.md)
- [声明式中间件编排](./bootstrap-middleware.md)
- [快速入门教程](./tutorial-quick-start.md)
- [多协议同时监听教程](./tutorial-multi-transport.md)
