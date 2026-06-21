# go-wind 核心框架

go-wind 是 GoWind 微服务生态的核心框架，提供应用生命周期管理、传输层抽象、日志门面和上下文传播。核心代码不到 500 行，仅依赖 `golang.org/x/sync`。

## 一、设计哲学

> 不是一揽子全栈框架，而是一盒积木。

| 原则 | 说明 |
|------|------|
| 组合优于继承 | 每个插件只实现标准接口 |
| 接口优于实现 | 核心只定义最小接口，实现由插件提供 |
| 零隐藏魔法 | 所有行为显式声明，无隐式初始化 |
| 零外部依赖 | 仅依赖 `golang.org/x/sync` |
| 函数式选项 | `WithServer`, `WithName` 等链式配置 |

## 二、核心模块

```
go-wind/
├── app.go          # App 引擎：生命周期管理
├── context.go      # Context：请求级元数据传播
├── instance.go     # 服务实例模型
├── errors.go       # 统一错误定义
├── transport/      # Transport 抽象
│   └── transport.go
└── log/            # Log 门面
    ├── log.go
    ├── level.go
    └── global.go
```

## 三、App 引擎

### 3.1 创建 App

```go
package main

import (
    "context"
    "github.com/tx7do/go-wind"
)

func main() {
    app := wind.New(
        wind.WithName("my-service"),
        wind.WithServer(myHTTPServer),
        wind.WithServer(myGRPCServer),
    )

    if err := app.Run(context.Background()); err != nil {
        panic(err)
    }
}
```

### 3.2 函数式选项

| 选项 | 说明 |
|------|------|
| `WithName(name)` | 设置服务名称 |
| `WithServer(server)` | 添加 Transport Server |
| `WithLogger(logger)` | 设置日志器 |
| `WithShutdownTimeout(d)` | 设置优雅停止超时 |
| `WithSignalHandler()` | 启用信号处理（SIGTERM/SIGINT） |

### 3.3 Server 接口

```go
type Server interface {
    Start(context.Context) error
    Stop(context.Context) error
    Endpoint() []string
    Type() string
}
```

任何实现此接口的类型都可以作为 Server 注册到 App。

## 四、快速示例

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "github.com/tx7do/go-wind"
)

// 自定义 HTTP Server
type MyServer struct {
    server *http.Server
}

func (s *MyServer) Start(ctx context.Context) error {
    s.server = &http.Server{Addr: ":8080", Handler: s.routes()}
    go s.server.ListenAndServe()
    return nil
}

func (s *MyServer) Stop(ctx context.Context) error {
    return s.server.Shutdown(ctx)
}

func (s *MyServer) Endpoint() []string {
    return []string{"http://localhost:8080"}
}

func (s *MyServer) Type() string { return "http" }

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
        wind.WithSignalHandler(),
    )
    app.Run(context.Background())
}
```

## 相关文档

- [App 生命周期管理](./core-lifecycle.md)
- [Context 传播](./core-context.md)
- [Transport 抽象](./core-transport.md)
- [Log 门面接口](./core-logging.md)
- [框架整体架构](./architecture.md)
