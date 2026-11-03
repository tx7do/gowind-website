# Bootstrap 命令行集成

go-wind-bootstrap 内置 [Cobra](https://github.com/spf13/cobra) 命令行支持：应用本身即是一个 Cobra 根命令，通过 `-c` 参数指定配置文件，开箱即用。

## 一、一行接入 Cobra

```go
package main

import (
    "os"

    bootstrap "github.com/tx7do/go-wind-bootstrap"
)

func main() {
    if err := bootstrap.RunAppWithFlags(bootstrap.NewCommandFlags()); err != nil {
        os.Exit(1)
    }
}
```

`RunAppWithFlags` 创建 Cobra 根命令，解析 flag 后加载配置并启动应用，内部等价于 `RunApp(flags.Conf)`。

## 二、命令行参数

| 参数 | 说明 |
|------|------|
| `-c, --conf` | 配置文件路径（yaml/json/bin），默认 `config.yaml` |

```bash
# 使用默认 config.yaml
go run main.go

# 指定配置文件
go run main.go -c /path/to/config.yaml
go run main.go --conf config.json
```

配置文件格式按扩展名自动识别：`.yaml` / `.yml` → YAML，`.json` → JSON，`.bin` / `.pb` → Protobuf 二进制。

## 三、扩展根命令

`RunAppWithFlags` 接受可选的命令定制函数，可添加子命令、额外 flag 或修改命令元信息：

```go
flags := bootstrap.NewCommandFlags()

if err := bootstrap.RunAppWithFlags(flags, func(root *cobra.Command) {
    root.Use = "my-service"
    root.Short = "订单服务"

    // 添加自定义子命令
    root.AddCommand(&cobra.Command{
        Use:   "migrate",
        Short: "执行数据库迁移",
        RunE: func(cmd *cobra.Command, args []string) error {
            // 迁移逻辑（可复用 flags.Conf 读取同一份配置）
            return nil
        },
    })
}); err != nil {
    os.Exit(1)
}
```

需要更细的控制时，可直接使用底层构件：

```go
// CommandFlags：CLI flag 集合（Conf 配置路径）
flags := bootstrap.NewCommandFlags()

// NewRootCmd：创建标准根命令，runE 在 flag 解析完成后调用
root := bootstrap.NewRootCmd(flags, func(cmd *cobra.Command, args []string) error {
    return bootstrap.RunApp(flags.Conf)
})

// AddFlags：把 -c/--conf 绑定到你自己的 cobra 命令
flags.AddFlags(myCmd)

return root.Execute()
```

## 四、程序化指定配置

不走命令行时，直接调用密封入口：

```go
// 一行启动：加载配置 + 信号监听 + 运行 + 清理
if err := bootstrap.RunApp("config.yaml"); err != nil {
    log.Fatal(err)
}

// 先加载配置对象，自行加工后再运行
cfg, err := bootstrap.LoadConfigFromFile("config.yaml")
if err != nil {
    log.Fatal(err)
}
if err := bootstrap.Run(context.Background(), cfg); err != nil {
    log.Fatal(err)
}
```

## 相关文档

- [Bootstrap 介绍](./bootstrap-intro.md)
- [Bootstrap 配置系统](./bootstrap-config.md)
- [Bootstrap 实战示例](./bootstrap-examples.md)
- [快速入门教程](./tutorial-quick-start.md)
