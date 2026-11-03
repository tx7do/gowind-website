# go-wind-bootstrap 声明式启动器

go-wind-bootstrap 是 GoWind 生态的最上层，通过 YAML 声明式配置将 go-wind 核心和 go-wind-plugins 组装成完整应用，实现"零代码启动"。

## 一、设计理念

> 核心定义接口，插件提供实现，Bootstrap 负责装配。

```
┌──────────────────────────────────────────┐
│         Bootstrap (装配层)                │
│  BootstrapConfig → Builder Registry      │
│       → wind.Option 链 → wind.App         │
├──────────────────────────────────────────┤
│         Adapters / Plugins (实现层)       │
│   HTTP/gRPC/Zap/Redis/Consul/Kafka/...   │
├──────────────────────────────────────────┤
│         Core (接口层)                     │
│   transport.Server / log.Logger          │
└──────────────────────────────────────────┘
```

## 二、Hello World

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

**2 个 blank import + 一行启动**，即可运行一个带 HTTP Server 和日志的服务：

```bash
go run main.go                       # 使用默认 config.yaml
go run main.go -c /path/to/config.yaml  # 指定配置文件
```

## 三、Bootstrap vs 手动装配

### 3.1 手动装配（不使用 Bootstrap）

```go
func main() {
    // 1. 创建日志
    logger := zapPlugin.NewLogger(zapPlugin.WithLevel("info"))
    log.SetLogger(logger)

    // 2. 创建数据库连接
    db, _ := mysqlPlugin.New(mysqlPlugin.WithDSN("..."))
    client := ent.NewClient(ent.Driver(db))

    // 3. 创建缓存
    cache, _ := redisPlugin.New(redisPlugin.WithAddr("localhost:6379"))

    // 4. 创建 Broker
    kafka, _ := kafkaPlugin.New(kafkaPlugin.WithAddrs("localhost:9092"))

    // 5. 创建 HTTP Server
    router := setupRouter(client, cache, kafka)
    httpServer := httpPlugin.NewServer(
        httpPlugin.WithAddr(":8080"),
        httpPlugin.WithHandler(router),
    )

    // 6. 创建 App（信号监听内建，无需额外选项）
    app := wind.New(
        wind.WithName("my-service"),
        wind.WithServer(httpServer),
        wind.WithLogger(logger),
    )

    // 7. 启动
    app.Run(context.Background())
}
```

### 3.2 Bootstrap 声明式

```go
func main() {
    // 全部通过 YAML 自动装配
    if err := bootstrap.RunApp("config.yaml"); err != nil {
        log.Fatal(err)
    }
}
```

| 对比项 | 手动装配 | Bootstrap |
|--------|---------|-----------|
| 代码行数 | 30+ | 2 |
| 配置变更 | 需改代码+重新编译 | 改 YAML 重启即可 |
| 新增插件 | 写代码创建+注入 | 加 blank import+YAML 配置 |
| 出错排查 | 编译期 | 运行时（需日志辅助） |
| 灵活性 | 高 | 中（约定优于配置） |

## 四、Bootstrap 能力

| 能力 | 说明 |
|------|------|
| 声明式配置 | Protobuf 定义的 `BootstrapConfig`，一份 YAML/JSON/二进制描述完整应用拓扑 |
| SPI 装配 | 适配器通过 `init()` 自注册 Builder，按配置自动实例化 |
| 生命周期管理 | 初始化 → 启动 → 运行 → 停止；信号监听内建（SIGINT/SIGTERM） |
| 注册中心装配 | 实例注册挪到应用启动后（AfterStart 钩子）以真实端点注册，停机时（BeforeStop 钩子）先行注销 |
| 中间件编排 | YAML 声明中间件链，按 proto 字段序启用 |
| 多实例管理 | 数据库/缓存/Broker/存储等多实例支持，按类型键取用 |
| 多格式配置 | YAML / JSON / Protobuf 二进制，按扩展名自动识别 |

### 字段映射代码生成

Bootstrap 配置面的字段映射不再手工维护：各 family 配置字段到上游库选项的映射，由 [protoc-gen-fieldmap](/toolkit/fieldmap.md) 按 spec 声明式生成；同时通过 CI 按 spec 重新生成并逐字节比对，防止配置面与上游库选项之间发生漂移。详见 [protoc-gen-fieldmap 字段映射生成器](/toolkit/fieldmap.md)。

## 五、配置文件加载

启动入口通过 Cobra 命令行指定配置文件（`-c/--conf`，默认 `config.yaml`），按扩展名自动识别格式：

```bash
go run main.go -c /path/to/config.yaml   # YAML
go run main.go -c config.json            # JSON
go run main.go -c config.pb              # Protobuf 二进制
```

```go
// 全密封：内部走 RunApp → LoadConfigFromFile
bootstrap.RunAppWithFlags(bootstrap.NewCommandFlags())

// 半密封：先加载配置，可操作后再运行
cfg, _ := bootstrap.LoadConfigFromFile("config.yaml")
bctx, _ := bootstrap.BootstrapWithContext(nil, cfg)
fmt.Println(bctx.Config().GetApp().GetName())
bctx.App().Run(bctx)
```

除主配置文件外，还可配置配置中心源（file / etcd / nacos / consul / apollo 等）在启动时拉取远程配置，见 [Bootstrap 配置系统](./bootstrap-config.md)。

## 六、目录约定

```
my-service/
├── cmd/
│   └── server/
│       └── main.go          # 入口
├── configs/
│   └── config.yaml          # 配置文件
├── ent/                     # Ent 实体定义
├── api/                     # Protobuf API 定义
├── internal/
│   ├── service/             # 业务逻辑层
│   ├── repo/                # 数据访问层
│   └── router/              # 路由配置
├── go.mod
└── go.sum
```

## 七、多模块依赖隔离

引导引擎核心只依赖 `go-wind`、`Cobra` 与 `Protobuf`（配置契约）。每个适配子包（`log/zap`、`transport/http`、`database/gorm`、`cache/redis`…）都是独立 `go.mod` 的子模块，只引入你用到的适配器，不用的适配器不会进入依赖树。

## 相关文档

- [Bootstrap 配置系统](./bootstrap-config.md)
- [Bootstrap SPI 机制](./bootstrap-spi.md)
- [声明式中间件编排](./bootstrap-middleware.md)
- [快速入门教程](./tutorial-quick-start.md)
- [框架整体架构](./architecture.md)
