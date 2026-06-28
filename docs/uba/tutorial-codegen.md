# UBA 代码生成管线教程

项目采用**契约优先（Contract-First）**：先写 `.proto` / Ent schema，再生成 Go / TypeScript / OpenAPI 代码。理解这条管线是二次开发的前提。本教程基于项目真实工具链编写，命令可直接复制执行。

---

## 一、工具链安装

```bash
cd backend
make init    # 安装 protoc 插件 + CLI 工具（buf / wire / ent 等）
```

| 工具 | 用途 |
|------|------|
| `buf` | proto 编译（替代 protoc） |
| `protoc-gen-go` / `protoc-gen-go-grpc` | Go 消息 + gRPC stub |
| `protoc-gen-go-http` | kratos REST handler |
| `protoc-gen-typescript-http` | admin 前端 TS 客户端 |
| `protoc-gen-openapi` | Swagger 文档 |
| `wire` | 编译时依赖注入 |
| `ent` | ORM 实体代码生成 |

---

## 二、核心命令（在 `backend/` 下执行）

```bash
make api       # 生成 Go（proto → gen/go/）+ struct tag
make ts        # 生成前端 TS 客户端（仅 admin/service/v1 作为输入）
make openapi   # 生成 OpenAPI / Swagger
make ent       # 生成 ent 实体（在各 service 目录下）
make wire      # 重新生成依赖注入（wire_gen.go）
make gen       # = ent + wire + api + openapi（不含 ts）
make build     # 编译所有服务
```

### 顶层 Makefile vs 服务级 app.mk

- `backend/Makefile`：顶层编排，通过 `app/*/*/Makefile` 递归到各服务。
- `backend/app.mk`：每个服务 include 的公共片段，含 `build / build_only / run / app / gen / ent / wire / api / openapi / docker` 等。

---

## 三、关键配置文件

| 文件 | 作用 |
|------|------|
| `backend/api/buf.yaml` | buf 模块定义、依赖 |
| `backend/api/buf.gen.yaml` | Go 生成配置（managed mode 注入 go_package） |
| `backend/api/buf.admin.typescript.gen.yaml` | **TS 生成配置**，注意 `inputs.paths` 只含 `protos/admin/service/v1` —— **只有 admin proto 才会生成 TS 客户端** |
| `backend/app/core/service/app.mk` | ent 生成命令（含 feature flags：privacy/entql/sql/modifier 等） |

---

## 四、⚠️ Ent 生成的坑（重要）

**不要直接跑 `ent generate ./schema`**！会丢失项目的扩展（privacy / sql modifier），导致生成的查询方法缺少 `Modify`/`Filter`，编译报错。

正确方式（见 `backend/app/core/service/app.mk`）：

```bash
cd backend/app/core/service
ent generate \
  --feature privacy --feature entql \
  --feature sql/modifier --feature sql/upsert --feature sql/lock \
  ./internal/data/ent/schema
```

或直接在该服务目录执行 `make ent`。

---

## 五、⚠️ TS 生成产物的同步

`make ts` 输出到：

```
frontend/admin/apps/admin/src/api/generated/admin/service/v1/index.ts
```

但 composables 实际导入的是：

```
frontend/admin/apps/admin/src/generated/api/admin/service/v1/index.ts
```

**生成后需手动同步**：

```bash
cp frontend/admin/apps/admin/src/api/generated/admin/service/v1/index.ts \
   frontend/admin/apps/admin/src/generated/api/admin/service/v1/index.ts
```

> 这是当前工程的一个已知步骤，容易遗漏。如果「proto 改完没生效」，先检查这一步。

---

## 六、生成产物的目录落点

```
backend/
├── api/
│   └── gen/go/                  # make api 的 Go 产物
└── app/core/service/
    └── internal/
        ├── data/ent/            # make ent 的实体产物（含 ent client、query、mixin）
        └── cmd/server/wire_gen.go  # make wire 的依赖注入产物

frontend/admin/apps/admin/src/
├── api/generated/.../index.ts   # make ts 输出
└── generated/api/.../index.ts   # composables 实际导入（需手动同步）
```

> 生成产物**应纳入版本管理**（项目未把它们 gitignore），以保证不装工具链也能编译。

---

## 七、典型工作流

### 改了 proto（新增/修改接口）

```bash
cd backend
make api && make openapi && make ts
# 同步 TS（见第五节）
# 如果改了服务构造函数/Provider，还要：
cd app/core/service && make wire
cd app/admin/service && make wire
make build
```

### 改了 Ent schema（新增/修改业务实体）

```bash
cd backend/app/core/service
make ent        # 用带 feature flags 的正确命令
cd ../../..
make api        # 如果实体也有对应 proto
make wire       # 如果 Provider 有变化
make build
```

### 改了 service 依赖注入（新增 Provider）

```bash
cd backend/app/<svc>/service
make wire
```

---

## 八、调试技巧

- **联调 admin 前端**：`cd frontend/admin && pnpm dev`，后端 admin 跑 `5600`。
- **联调 SDK 上报**：`go run ./app/collector/service/cmd/server/`（`5700`），用 Web SDK 的 `test.html`。
- **gRPC 调试**：core 端口动态，用 etcd 查注册；或临时把 `server.yaml` 的 grpc addr 改成固定端口。
- **proto 改完没生效？** 多数是忘了 `make ts` + 同步 TS（第五节），或忘了 `make wire`。
- **ent 编译报 `Modify` 缺失？** 用了错误的 ent 生成命令（见第四节）。

---

## 九、相关文档

- [系统架构](./architecture.md)
- [后端 API 契约](./backend-api.md)
- [新增对外服务](./tutorial-new-service.md)
- [新增业务实体](./tutorial-new-entity.md)
- [新增前端页面](./tutorial-new-page.md)
