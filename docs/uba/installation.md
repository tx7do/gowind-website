# UBA 安装指南

本文档指导你从零搭建 GoWind UBA 本地开发环境：环境准备、依赖服务、数据库初始化、三服务启动、前端启动。

> 先读 [系统架构](./architecture.md) 了解三大服务与依赖关系，理解「libs_only（仅依赖） vs full_deploy（全栈）」两种模式。

---

## 一、环境要求

| 工具 | 版本 | 用途 |
|------|------|------|
| Go | 1.25+ | 后端编译 |
| Node.js | >= 20.10.0 | 前端构建 |
| pnpm | >= 9.12.0 | 前端包管理 |
| Docker | 20.0+ | 依赖服务（PG/Redis/Kafka/Doris/Etcd/MinIO/Jaeger） |
| buf | 最新版 | Protobuf 代码生成 |
| Make | — | 执行构建脚本 |

### 一键安装脚本

仓库提供环境安装脚本（`backend/scripts/env/`）：

| 平台 | 脚本 |
|------|------|
| Linux / macOS 开发环境 | `scripts/env/install_unix_dev.sh` |
| Linux / macOS 生产环境 | `scripts/env/install_unix_prod.sh` |
| Windows 开发环境 | `scripts/env/install_windows_dev.ps1` |

---

## 二、获取代码

```bash
git clone https://github.com/tx7do/go-wind-uba.git
cd go-wind-uba
```

---

## 三、启动依赖服务

两种 Docker 部署模式：

| 模式 | 脚本 | 适用 |
|------|------|------|
| **libs_only（依赖模式，推荐开发）** | `scripts/docker/libs_only.sh` / `.ps1` | 仅启动中间件，后端用 `go run` 本地调试 |
| **full_deploy（完整模式）** | `scripts/docker/full_deploy.sh` / `.ps1` | 中间件 + 后端服务一起起，适合一键演示 |

### Linux / macOS

```bash
cd backend
chmod +x scripts/**/*.sh

# 仅启动中间件依赖（推荐开发）
./scripts/docker/libs_only.sh

# 或：一键完整部署（中间件 + 后端服务）
./scripts/docker/full_deploy.sh
```

### Windows（PowerShell 管理员）

```powershell
cd backend
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser   # 首次放行脚本策略

.\scripts\docker\libs_only.ps1
# 或
.\scripts\docker\full_deploy.ps1
```

依赖容器包括：`postgres`、`redis`、`etcd`、`minio`、`jaeger`、`kafka`、`doris-fe`、`doris-be`、`superset`。详见 [Docker 部署](./deploy-docker.md)。

---

## 四、初始化数据库

### 1. PostgreSQL（业务库）

> ⚠️ **重要**：UBA 没有手写的 PostgreSQL `schema.sql`——表结构由 **Ent ORM 生成**。你只需建好数据库并执行种子数据。

```bash
# 1) 建库（库名以 data.yaml 中的 dbname 为准，默认 gw_uba）
psql -h localhost -U postgres -c "CREATE DATABASE gw_uba;"

# 2) 执行服务首次启动时 data.yaml 的 migrate: true 会自动建表（基于 ent schema）
#    种子字典数据：
psql -h localhost -U postgres -d gw_uba -f sql/postgresql/default-data.sql
```

> Docker compose 默认 `POSTGRES_DB=gwubd`，但服务 `data.yaml` 连接的是 `gw_uba`，请注意对齐库名（详见 [配置详解](./deploy-config.md)）。

### 2. OLAP 引擎（Doris / ClickHouse 二选一）

默认使用 **Apache Doris**（由 `UseClickHouse = false` 决定）：

```bash
# Doris（默认）：用 MySQL 协议连 FE 的 9030 端口
mysql -h localhost -P 9030 -u root < sql/doris/1_base_tables.sql
mysql -h localhost -P 9030 -u root < sql/doris/02_kafka_tables.sql   # 建立 Routine Load 消费 Kafka

# 或 ClickHouse（需先把 UseClickHouse 改为 true 并重编译）
clickhouse-client --queries-file sql/clickhouse/1_base_tables.sql
clickhouse-client --queries-file sql/clickhouse/02_kafka_tables.sql  # 建立 Kafka 引擎表 + 物化视图消费 Kafka
```

> 两个 `02_kafka_tables.sql` 分别为对应引擎建立「消费 Kafka → 写入事实表」的作业（Doris Routine Load / ClickHouse Kafka 引擎表 + 物化视图），是数据落库的关键，**必须执行**。详见 [系统架构 · Kafka 消费入库机制](./architecture.md)。

---

## 五、启动后端服务

```bash
cd backend

# 安装依赖
go mod tidy

# 初始化开发环境（安装 protoc 插件和 CLI 工具：buf / wire / ent 等）
make init

# 生成代码（ent + wire + api + openapi）
make gen

# 构建所有服务
make build

# 分别运行三个服务（各开一个终端）
go run ./app/core/service/cmd/server/       -c ./app/core/service/configs
go run ./app/admin/service/cmd/server/      -c ./app/admin/service/configs
go run ./app/collector/service/cmd/server/  -c ./app/collector/service/configs
```

### 服务监听端口

| 服务 | 端口 |
|------|------|
| Core Service | gRPC 动态端口（etcd 发现，不固定） |
| Admin Service | HTTP `5600` / SSE `5601` |
| Collector Service | HTTP `5700` |

> 验证：访问 Admin Swagger（`enable_swagger: true`），Core 通过 etcd 注册后被 Admin/Collector 发现。

---

## 六、启动前端

```bash
cd frontend/admin

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

启动后访问管理后台，默认会请求 Admin Service（`5600`）。

---

## 七、首次联调自检

1. 登录管理后台 → 「数据采集 / 应用管理」新建一个应用，拿到 `appId` + `appSecret`。
2. 用 Web SDK（或 `frontend/sdk/web/uba/test.html`）向 Collector（`5700`）上报一条 `POST /uba/v1/report`，确认返回 200、无 `failedCount`。
3. **数据落库自检**：上报数据由 OLAP 引擎的虚拟表消费 Kafka 自动落库（Doris 用 Routine Load、ClickHouse 用 Kafka 引擎表）。联调时若查询不到，先确认对应消费作业已建立并正常运行（Doris：`SHOW ROUTINE LOAD`）。详见 [系统架构 · Kafka 消费入库机制](./architecture.md)。

---

## 八、常用命令速查

```bash
cd backend
make init       # 安装 protoc 插件 + CLI 工具
make api        # 生成 Protobuf API 代码（Go + struct tag）
make openapi    # 生成 OpenAPI / Swagger 文档
make ts         # 生成 TypeScript 客户端（仅 admin proto 作为输入）
make ent        # 生成 ent 实体代码（在各 service 目录下）
make wire       # 重新生成依赖注入（wire_gen.go）
make gen        # = ent + wire + api + openapi（不含 ts）
make build      # 编译所有服务
make build_only # 仅编译，不跑代码生成
make test       # 运行测试
make lint       # 代码检查
make docker-libs# Docker Compose 启动依赖
make docker-up  # Docker Compose 完整部署
```

> `ent` / `wire` 等命令在 `backend/app.mk`（被各服务的 `app.mk` include），可在 `app/<svc>/service/` 下单独执行。完整命令语义见 [代码生成管线](./tutorial-codegen.md)。

---

## 九、环境脚本说明

- **libs_only**：开发首选。中间件跑在 Docker，三个后端服务在 IDE/终端用 `go run` 调试，断点与热重启方便。
- **full_deploy**：一键全栈。适合演示、验收测试或快速验证整体链路。

---

## 十、相关文档

- [系统架构](./architecture.md)
- [代码生成管线](./tutorial-codegen.md)
- [Docker 部署](./deploy-docker.md)
- [配置详解](./deploy-config.md)
