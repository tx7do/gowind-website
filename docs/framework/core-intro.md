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

## 二、核心特性

- **积木式组装** — 核心仅管生命周期，传输/日志只暴露最小接口，注册中心、配置中心等由 go-wind-plugins 提供具体实现
- **优雅生命周期** — 信号感知、超时可控的 Server 启停；单服务崩溃自动级联全量优雅退出
- **启动/停机钩子** — `WithBeforeStart` / `WithAfterStart` 提供应用启动前后的扩展点（详见 [App 生命周期管理](./core-lifecycle.md)「启动阶段扩展点」小节）
- **无侵入 Context** — TraceID / UserID / ColorTag 通过 context 传播，深拷贝防 data race
- **极简日志门面** — 4 方法接口 + `Enabled` + `With`，几行胶水代码即可适配 slog / zap / zerolog 等日志后端
- **传输无关的错误模型** — `errors` 包提供 Code ↔ HTTP 状态双向映射：除标准 gRPC 类别码（0–16）外，`CodeToHTTP` 还支持 400–599 显式 HTTP 状态码直通
- **功能选项模式** — `WithServer`、`WithName`… 链式配置，类型安全，可读性强

## 三、核心模块

```
go-wind/
├── app.go          # App 引擎：生命周期管理
├── errors.go       # 包级哨兵错误定义
├── context.go      # Context：请求级元数据传播（TraceID / UserID / Metadata）
├── instance.go     # 服务实例模型
├── errors/         # 结构化、传输感知的错误模型（WindError）
├── transport/      # Transport 抽象
│   └── server.go
└── log/            # Log 门面（接口 + Level + nop 实现 + 全局注册器）
```

## 四、App 引擎

### 4.1 创建 App

```go
package main

import (
    "context"
    "github.com/tx7do/go-wind"
)

func main() {
    app := wind.New(
        wind.WithName("my-service"),
        wind.WithServer(myHTTPServer, myGRPCServer),
    )

    if err := app.Run(context.Background()); err != nil {
        panic(err)
    }
}
```

### 4.2 函数式选项

| 选项 | 说明 |
|------|------|
| `WithID(id)` | 设置服务实例唯一标识 |
| `WithName(name)` | 设置服务名称 |
| `WithVersion(version)` | 设置服务版本号 |
| `WithServer(servers...)` | 添加一个或多个 Transport Server |
| `WithLogger(logger)` | 设置 App 级别日志器（未设置时回退到全局 logger） |
| `WithStopTimeout(d)` | 设置优雅停止超时 |
| `WithSignal(sigs...)` | 自定义监听信号（默认 SIGTERM / SIGINT / SIGQUIT） |
| `WithBanner(enabled)` | 是否打印启动横幅 |
| `WithInstanceID(id)` | 自定义服务实例 ID |
| `WithBeforeStart(fn)` | 应用启动前回调（任一 Server 启动之前） |
| `WithAfterStart(fn)` | 应用启动后回调（所有 Server 启动完成之后） |
| `WithBeforeStop(fn)` | 停机前回调（优先于 Server.Stop 执行） |
| `WithAfterStop(fn)` | 停机后回调（所有 Server 停止之后执行） |

### 4.3 Server 接口

```go
type Server interface {
    // Start 开始接受连接。必须阻塞直到 ctx 被取消或发生错误。
    Start(ctx context.Context) error
    // Stop 优雅停机。传入的 ctx 携带超时 deadline，实现应予以尊重。
    Stop(ctx context.Context) error
    // Endpoint 返回实际监听地址。绑定 ":0" 随机端口时，
    // 必须在 Start 开始接受连接后返回解析后的真实地址。
    Endpoint() string
}
```

任何实现此接口的类型都可以作为 Server 注册到 App。

## 五、快速示例

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

// Start 必须阻塞直到 ctx 被取消
func (s *MyServer) Start(ctx context.Context) error {
    s.server = &http.Server{Addr: ":8080", Handler: s.routes()}
    errCh := make(chan error, 1)
    go func() {
        if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            errCh <- err
        }
    }()
    select {
    case err := <-errCh:
        return err
    case <-ctx.Done():
        return nil
    }
}

func (s *MyServer) Stop(ctx context.Context) error {
    return s.server.Shutdown(ctx)
}

func (s *MyServer) Endpoint() string {
    return "http://localhost:8080"
}

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
    )
    // 默认监听 SIGTERM/SIGINT/SIGQUIT，收到信号后自动优雅停机
    app.Run(context.Background())
}
```

## 六、统一错误模型

`errors` 包提供传输无关的结构化错误（WindError），`Code` 为 `uint32`：

- **0–16**：对齐 gRPC 类别码，`CodeToHTTP` 按 grpc-httpjson-transcoding / Envoy 的标准映射表转换为 HTTP 状态码（如 `InvalidArgument → 400`、`Unavailable → 503`）；
- **400–599**：显式 HTTP 状态码直通——由代码生成器产生的错误助手可将 proto 中声明的状态码（402、405、418 等）直接携带在 `Code` 中，`CodeToHTTP` 原样返回，传输层得以精确复现声明的状态；
- 反向映射 `HTTPToCode` 为多对一，返回语义最具代表性的 Code；未映射状态回退 `CodeUnknown`。

```go
// 在 HTTP 传输边界应用状态码
w.WriteHeader(errors.CodeToHTTP(wErr.Code))
```

## 相关文档

- [App 生命周期管理](./core-lifecycle.md)
- [Context 传播](./core-context.md)
- [Transport 抽象](./core-transport.md)
- [Log 门面接口](./core-logging.md)
- [框架整体架构](./architecture.md)
