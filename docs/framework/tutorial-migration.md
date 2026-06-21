# 框架迁移指南

从其他 Go 微服务框架迁移到 GoWind 的对照指南。

## 一、从 Gin 迁移

### 1.1 路由对照

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
// 中间件在 YAML 中声明
```

### 1.2 上下文对照

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

### 1.3 中间件对照

```go
// ===== Gin =====
router.Use(gin.Logger(), gin.Recovery(), cors.Default())

// ===== GoWind =====
// YAML 声明：
// server.http.middleware: [logger, recovery, cors]
```

## 二、从 Kratos 迁移

### 2.1 Provider 对照

```go
// ===== Kratos =====
wire.NewSet(NewServer, NewDataService, NewData, NewBiz)

// ===== GoWind =====
// 不需要 wire，Bootstrap 通过 SPI 自动实例化
// 只需 YAML 配置 + blank import
```

### 2.2 Transport 对照

```go
// ===== Kratos =====
func NewHTTPServer(svc *service.Service) *http.Server {
    srv := http.NewServer(http.Address(":8080"))
    srv.HandlePrefix("/api", svc)
    return srv
}

// ===== GoWind =====
// YAML 配置：
// server.http.addr: ":8080"
// 代码中通过 bootstrap.OnReady 设置路由
```

### 2.3 配置对照

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
// YAML 文件自动加载
// bootstrap.New("config.yaml")
// 环境变量自动替换
```

## 三、从 go-micro 迁移

### 3.1 服务定义对照

```go
// ===== go-micro =====
service := micro.NewService(
    micro.Name("my.service"),
    micro.Address(":8080"),
)
pb.RegisterMyServiceHandler(service.Server(), handler)
service.Run()

// ===== GoWind =====
// YAML + blank import 替代所有选项
app := bootstrap.New("config.yaml")
app.Run()
```

### 3.2 服务发现对照

```go
// ===== go-micro =====
import _ "github.com/go-micro/plugins/v4/registry/consul"
service := micro.NewService(micro.Registry(consul.NewRegistry()))

// ===== GoWind =====
import _ "github.com/tx7do/go-wind-plugins/registry/consul"
// YAML: registry.consul.addr: "localhost:8500"
```

## 四、从 Echo 迁移

### 4.1 路由对照

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
// 中间件通过 YAML 声明
```

### 4.2 JSON 绑定

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

## 五、迁移清单

| 迁移项 | 原框架 | GoWind 方案 |
|--------|--------|-------------|
| HTTP 路由 | Gin/Echo/Echo | `net/http.ServeMux` (Go 1.22+ pattern) |
| 中间件 | 代码链式调用 | YAML 声明式编排 |
| 配置管理 | Viper/自定义 | YAML + 环境变量 + 配置中心 |
| 依赖注入 | Wire/Dig | SPI 自动装配 |
| 数据库 | GORM/XORM | Ent ORM |
| 日志 | 框架自带 | Zap/Zerolog（插件式） |
| 服务发现 | 注册中心 SDK | Consul/Etcd 插件 |
| 链路追踪 | OpenTelemetry SDK | Jaeger/OTLP 插件 |
| 消息队列 | 各 SDK | Kafka/RabbitMQ 统一接口 |

## 六、迁移步骤

### Step 1: 创建 GoWind 项目

```bash
wind new my-service --transport http --database mysql --log zap
```

### Step 2: 迁移配置

将原框架的配置映射到 `config.yaml`：

```yaml
# 原 Gin + Viper 配置
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

### Step 3: 迁移路由

将原有路由注册改为 `http.ServeMux` 模式：

```go
// 逐个迁移路由
mux.HandleFunc("GET /api/users", listUsers)
mux.HandleFunc("POST /api/users", createUser)
```

### Step 4: 迁移中间件

将中间件注册到 Bootstrap：

```go
// 原有自定义中间件
func init() {
    middleware.Register("my_middleware", MyMiddleware)
}
```

```yaml
# YAML 引用
server:
  http:
    middleware:
      - recovery
      - cors
      - my_middleware
```

### Step 5: 迁移数据层

从 GORM 迁移到 Ent：

```go
// ===== GORM =====
db.Where("id = ?", id).First(&user)

// ===== Ent =====
client.User.Get(ctx, id)
```

### Step 6: 迁移业务逻辑

业务逻辑通常不需要修改，只需调整数据访问层的调用方式。

### Step 7: 测试和部署

```bash
# 确保所有 API 正常工作
go test ./...

# Docker 构建和部署
docker compose up -d
```

## 七、渐进式迁移

如果项目较大，可以渐进式迁移：

1. **Phase 1**: 用 GoWind Bootstrap 启动，但内部仍用 Gin Handler
2. **Phase 2**: 逐步将 Gin Handler 改为 `net/http`
3. **Phase 3**: 将 GORM 迁移到 Ent
4. **Phase 4**: 移除 Gin 依赖，纯 GoWind

```go
// Phase 1: Gin 作为 Handler
ginRouter := gin.New()
ginRouter.GET("/api/users", getUsers)
// ...
app.SetHTTPHandler(ginRouter)
```

## 相关文档

- [快速入门教程](./tutorial-quick-start.md)
- [Bootstrap 介绍](./bootstrap-intro.md)
- [核心框架介绍](./core-intro.md)
- [声明式中间件编排](./bootstrap-middleware.md)
