# go-wind-bootstrap 声明式启动器

go-wind-bootstrap 是 GoWind 生态的最上层，通过 YAML 声明式配置将 go-wind 核心和 go-wind-plugins 组装成完整应用，实现"零代码启动"。

## 一、设计理念

> 核心定义接口，插件提供实现，Bootstrap 负责装配。

```
┌─────────────────────────────────────┐
│         Bootstrap (装配层)           │
│   YAML → SPI → 依赖注入 → App.Run    │
├─────────────────────────────────────┤
│         Plugins (实现层)             │
│   HTTP/gRPC/Redis/Kafka/Zap/...     │
├─────────────────────────────────────┤
│         Core (接口层)                │
│   transport.Server / log.Logger     │
└─────────────────────────────────────┘
```

## 二、Hello World

### 2.1 config.yaml

```yaml
name: hello-service

server:
  http:
    addr: ":8080"

log:
  zap:
    level: info
    format: console

database:
  default:
    driver: sqlite
    dsn: "file:hello.db"
```

### 2.2 main.go

```go
package main

import (
    _ "github.com/tx7do/go-wind-plugins/transport/http"
    _ "github.com/tx7do/go-wind-plugins/log/zap"
    _ "github.com/tx7do/go-wind-plugins/database/sqlite"

    "github.com/tx7do/go-wind-bootstrap"
)

func main() {
    app := bootstrap.New("config.yaml")
    app.Run()
}
```

**仅 3 个 blank import + 2 行代码**，即可启动一个带 HTTP Server、日志和数据库的服务。

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

    // 6. 创建 App
    app := wind.New(
        wind.WithName("my-service"),
        wind.WithServer(httpServer),
        wind.WithLogger(logger),
        wind.WithSignalHandler(),
    )

    // 7. 启动
    app.Run(context.Background())
}
```

### 3.2 Bootstrap 声明式

```go
func main() {
    // 全部通过 YAML 自动装配
    app := bootstrap.New("config.yaml")
    app.Run()
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
| YAML 解析 | 多格式（YAML/JSON/TOML）+ 环境变量替换 |
| SPI 装配 | 自动实例化已注册的插件 |
| 依赖注入 | 将实例注入到指定位置 |
| 生命周期管理 | 初始化 → 启动 → 运行 → 停止 |
| 中间件编排 | YAML 声明中间件链 |
| 多实例管理 | 数据库/缓存多实例支持 |
| 信号处理 | 自动监听 SIGTERM/SIGINT |

## 五、配置文件查找

Bootstrap 按以下顺序查找配置文件：

1. 命令行参数 `--config`
2. 环境变量 `CONFIG_FILE`
3. 工作目录下的 `config.yaml`
4. 工作目录下的 `config.yml`
5. `/etc/app/config.yaml`（Linux）

```go
// 指定配置文件
app := bootstrap.New("config.yaml")

// 从多个源加载
app := bootstrap.NewWithSources(fileSource, nacosSource)
```

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

## 七、最小化依赖

Bootstrap 仅依赖：
- `github.com/tx7do/go-wind`（核心框架）
- `gopkg.in/yaml.v3`（YAML 解析）

不直接依赖任何插件，插件通过 blank import 引入。

## 相关文档

- [Bootstrap 配置系统](./bootstrap-config.md)
- [Bootstrap SPI 机制](./bootstrap-spi.md)
- [声明式中间件编排](./bootstrap-middleware.md)
- [快速入门教程](./tutorial-quick-start.md)
- [框架整体架构](./architecture.md)
