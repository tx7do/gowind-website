# Bootstrap CLI 工具

go-wind-bootstrap 提供命令行工具，用于项目初始化、代码生成和开发辅助。

## 一、安装

```bash
go install github.com/tx7do/go-wind-bootstrap/cmd/wind@latest
```

## 二、命令一览

```bash
$ wind --help
GoWind Bootstrap CLI

Usage:
  wind [command]

Available Commands:
  new         创建新项目
  run         启动服务（支持热重载）
  gen         代码生成
  config      检查/验证配置
  version     版本信息

Flags:
  -h, --help   help for wind
```

## 三、创建新项目

```bash
# 基础项目
wind new my-service

# 指定插件组合
wind new my-service \
  --transport http,grpc \
  --database mysql \
  --cache redis \
  --broker kafka \
  --log zap \
  --tracer jaeger

# 指定模块路径
wind new my-service --module github.com/myorg/my-service
```

### 生成的项目结构

```
my-service/
├── cmd/
│   └── server/
│       └── main.go              # 入口（含 blank import）
├── configs/
│   └── config.yaml              # 配置模板
├── ent/
│   └── schema/                  # Ent 实体定义
│       └── user.go
├── api/
│   └── v1/
│       └── user.proto           # Protobuf API
├── internal/
│   ├── service/
│   │   └── user_service.go      # 业务逻辑
│   ├── repo/
│   │   └── user_repo.go         # 数据访问
│   └── router/
│       └── router.go            # 路由配置
├── Makefile
├── Dockerfile
├── go.mod
└── go.sum
```

### 生成的 main.go

```go
package main

import (
    _ "github.com/tx7do/go-wind-plugins/transport/http"
    _ "github.com/tx7do/go-wind-plugins/transport/grpc"
    _ "github.com/tx7do/go-wind-plugins/log/zap"
    _ "github.com/tx7do/go-wind-plugins/database/mysql"
    _ "github.com/tx7do/go-wind-plugins/cache/redis"
    _ "github.com/tx7do/go-wind-plugins/broker/kafka"
    _ "github.com/tx7do/go-wind-plugins/tracer/jaeger"

    "github.com/tx7do/go-wind-bootstrap"
    _ "my-service/internal/router"
)

func main() {
    app := bootstrap.New("configs/config.yaml")
    app.Run()
}
```

## 四、开发热重载

```bash
# 启动并监听文件变更
wind run

# 等效于 air / realize 等热重载工具
# 修改 .go 文件自动重新编译和重启
```

```yaml
# .wind.yaml（热重载配置）
run:
  watch:
    - "*.go"
    - "configs/*.yaml"
    - "ent/schema/*.go"
  exclude:
    - "vendor"
    - ".git"
    - "tmp"
  delay: 500ms         # 文件变更后等待时间
  build_args:
    - -race
    - -tags=development
```

## 五、代码生成

### 5.1 Ent 代码生成

```bash
# 从 schema 生成 Ent 代码
wind gen ent

# 等效于 go generate ./ent
```

### 5.2 Protobuf 代码生成

```bash
# 从 .proto 生成 Go/TS/OpenAPI 代码
wind gen proto

# 指定输出目录
wind gen proto --out ./api/gen
```

### 5.3 CRUD 脚手架

```bash
# 根据实体定义生成 CRUD 代码
wind gen crud --entity User

# 生成内容：
# - ent/schema/user.go（如有缺失）
# - internal/repo/user_repo.go
# - internal/service/user_service.go
# - api/v1/user.proto
```

## 六、配置检查

```bash
# 验证配置文件格式
wind config validate configs/config.yaml

# 查看最终合并后的配置（含环境变量替换）
wind config render configs/config.yaml

# 检查配置项是否匹配已注册的插件
wind config check
```

### 输出示例

```bash
$ wind config validate configs/config.yaml

✓ server.http.addr = ":8080"
✓ log.zap.level = "info"
✓ database.default.dsn = "user:***@tcp(localhost:3306)/db"
✗ cache.redis: unknown plugin "redis" (did you forget to import?)
✗ auth.jwt.key = "" (empty, must set JWT_SECRET)

2 errors, 0 warnings
```

## 七、版本管理

```bash
# 当前版本
wind version

# GoWind 生态版本
wind version --all

# 输出:
# wind CLI:        v1.2.3
# go-wind:         v1.5.0
# go-wind-plugins:  v1.8.2
# go-wind-bootstrap: v1.3.1
```

## 八、Makefile 集成

生成的项目自带 Makefile：

```makefile
.PHONY: build run test gen

build:
	go build -o bin/server ./cmd/server

run:
	wind run

dev:
	go run ./cmd/server --config configs/config.yaml

test:
	go test ./... -v -cover

gen:
	wind gen ent
	wind gen proto

docker:
	docker build -t my-service .

clean:
	rm -rf bin/ tmp/
```

## 相关文档

- [Bootstrap 介绍](./bootstrap-intro.md)
- [Bootstrap 配置系统](./bootstrap-config.md)
- [快速入门教程](./tutorial-quick-start.md)
