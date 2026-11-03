# Bootstrap 集成与网关插件

::: warning 家族现状说明（以仓库为准）
go-wind-plugins 仓库中**已无 `gateway/` 插件家族**（无对应目录、模块与 README 矩阵条目），下文「API 网关」「Webhook 回调」描述的能力在仓库现状中没有对应实现，去向无官方说明，请以仓库现状为准。

仓库现状中可对应的能力：

- **gRPC 服务客户端**：由 `transport/grpc/client` 模块提供（见 2.1 节，已按现状更新）；
- **健康检查**：顶层 `health/` 模块提供 HTTP 健康检查端点（见第三节）；
- **定时任务**：`transport/cron`（robfig/cron）；
- **负载均衡**：顶层 `selector/` 模块（RoundRobin/Random/First + Watch Balancer）。
:::

go-wind-plugins 还提供服务客户端、健康检查等高级插件，与 Bootstrap 深度集成。

## 一、API 网关

### 1.1 网关路由

```go
import gatewayPlugin "github.com/tx7do/go-wind-plugins/gateway"

gw := gatewayPlugin.New(
    gatewayPlugin.WithAddr(":8080"),
    gatewayPlugin.WithRoutes([]gatewayPlugin.Route{
        {Prefix: "/api/users", Service: "user-service", StripPrefix: true},
        {Prefix: "/api/orders", Service: "order-service", StripPrefix: true},
        {Prefix: "/api/products", Service: "product-service", StripPrefix: false},
    }),
    gatewayPlugin.WithLoadBalancer("round_robin"),
)
```

### YAML 配置

```yaml
gateway:
  addr: ":8080"
  load_balancer: round_robin        # round_robin | random | weighted | least_conn
  routes:
    - prefix: /api/users
      service: user-service
      strip_prefix: true
      timeout: 10s
      retry: 3
    - prefix: /api/orders
      service: order-service
      strip_prefix: true
  middleware:
    - rate_limit
    - jwt_auth
    - cors
    - tracing
```

### 1.2 负载均衡策略

| 策略 | 说明 |
|------|------|
| `round_robin` | 轮询（默认） |
| `random` | 随机 |
| `weighted` | 加权（根据服务实例权重） |
| `least_conn` | 最少连接 |
| `consistent_hash` | 一致性哈希（会话保持） |

## 二、服务客户端

### 2.1 gRPC 客户端

gRPC 客户端封装位于 `transport/grpc/client`：

```go
import grpcClientPlugin "github.com/tx7do/go-wind-plugins/transport/grpc/client"

conn := grpcClientPlugin.NewClient("user-service",
    grpcClientPlugin.WithInsecure(),                     // 或 WithTransportCredentials(creds)
    grpcClientPlugin.WithDialOption(grpc.WithResolvers(resolver)),
    grpcClientPlugin.WithMiddleware(retryMiddleware),
)

userClient := pb.NewUserServiceClient(conn)
resp, _ := userClient.GetUser(ctx, &pb.GetUserRequest{Id: "123"})
```

配合顶层 `resolver/` 模块可实现按注册中心寻址：`grpc.NewClient("wind:///svc", grpc.WithResolvers(...))`。

### 2.2 HTTP 客户端

::: warning
仓库现状中没有独立的 HTTP 服务客户端模块（`client/http` 不存在）。
:::

```go
import httpClientPlugin "github.com/tx7do/go-wind-plugins/client/http"

client := httpClientPlugin.New(
    httpClientPlugin.WithBaseURL("http://user-service"),
    httpClientPlugin.WithTimeout(5*time.Second),
    httpClientPlugin.WithRetry(3, 100*time.Millisecond),
    httpClientPlugin.WithTracing(true),
)
```

## 三、健康检查

```go
import healthPlugin "github.com/tx7do/go-wind-plugins/health"

healthChecker := healthPlugin.New(
    healthPlugin.WithCheck("database", func(ctx context.Context) error {
        return dbClient.Ping(ctx)
    }),
    healthPlugin.WithCheck("redis", func(ctx context.Context) error {
        _, err := redisCache.Ping(ctx)
        return err
    }),
    healthPlugin.WithCheck("kafka", func(ctx context.Context) error {
        return kafkaBroker.Ping(ctx)
    }),
)
```

### HTTP 端点

```go
// 自动注册 /health 和 /ready 端点
// GET /health → liveness check（进程存活）
// GET /ready  → readiness check（依赖就绪）
```

```yaml
health:
  enabled: true
  liveness_path: /health
  readiness_path: /ready
  checks:
    database:
      interval: 10s
      timeout: 3s
      failures: 3        # 连续失败 3 次标记为不健康
    redis:
      interval: 5s
      timeout: 1s
```

## 四、优雅上下线

结合服务注册与健康检查实现：

```mermaid
graph LR
    A["启动"] --> B["注册到注册中心"]
    B --> C["健康检查通过"]
    C --> D["接收流量"]
    D --> E["收到 SIGTERM"]
    E --> F["从注册中心注销"]
    F --> G["等待流量排空<br/>grace_period"]
    G --> H["关闭 Server"]
```

```yaml
registry:
  consul:
    addr: "localhost:8500"
    deregister:
      critical_timeout: 60s       # 不健康后 60s 自动注销
    health_check:
      interval: 10s
      deregister_after: 30s

lifecycle:
  grace_period: 15s               # 收到信号后等待 15s
  shutdown_timeout: 30s           # 优雅关闭超时
```

## 五、事件驱动

### Webhook 回调

```go
import webhookPlugin "github.com/tx7do/go-wind-plugins/webhook"

wh := webhookPlugin.New(
    webhookPlugin.WithRetry(3, 5*time.Second),
    webhookPlugin.WithTimeout(10*time.Second),
    webhookPlugin.WithHMACKey("webhook-secret"),
)

wh.Subscribe("order.created", "https://partner.com/webhooks/order")
wh.Publish(ctx, "order.created", orderData)
```

## 六、定时任务编排

在 Bootstrap 中通过注解/配置编排定时任务：

```yaml
tasks:
  - name: daily-report
    schedule: "0 9 * * *"          # 每天 9 点
    handler: report.DailyReport
    queue: low

  - name: cleanup-tokens
    schedule: "0 0 * * 0"          # 每周日
    handler: auth.CleanupExpiredTokens
    queue: default
```

## 相关文档

- [插件总览](./plugins-intro.md)
- [插件配置系统](./plugins-config.md)
- [声明式启动器介绍](./bootstrap-intro.md)
- [声明式中间件编排](./bootstrap-middleware.md)
