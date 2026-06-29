# UBA Docker 部署指南

本文档面向运维人员，介绍 GoWind UBA 的两种 Docker 部署模式、compose 全栈服务清单、共用 Dockerfile 与构建流程。

> 先读 [系统架构](./architecture.md) 与 [配置详解](./deploy-config.md)。默认口令/密钥**必须轮换**，见配置详解的安全清单。

---

## 一、两种部署模式

| 模式 | 脚本（Linux/macOS） | 脚本（Windows） | compose 文件 | 适用 |
|------|---------------------|-----------------|-------------|------|
| **libs_only（依赖模式）** | `scripts/docker/libs_only.sh` | `scripts/docker/libs_only.ps1` | `docker-compose.libs.yaml` | 仅启动中间件，后端用 `go run` 本地调试 |
| **full_deploy（完整模式）** | `scripts/docker/full_deploy.sh` | `scripts/docker/full_deploy.ps1` | `docker-compose.yaml` | 中间件 + 三服务，一键演示/生产 |

脚本会自动探测 `docker compose`（v2 插件）或回退 `docker-compose`，并预创建依赖的数据目录（postgres/redis/etcd/minio/jaeger）。

---

## 二、快速启动

### Linux / macOS

```bash
cd backend
chmod +x scripts/**/*.sh

# 仅启动中间件依赖（开发推荐）
./scripts/docker/libs_only.sh

# 一键完整部署（中间件 + 后端三服务）
./scripts/docker/full_deploy.sh
```

### Windows（PowerShell 管理员）

```powershell
cd backend
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser   # 首次放行

.\scripts\docker\libs_only.ps1
# 或
.\scripts\docker\full_deploy.ps1
```

### 等价的 Make 命令

```bash
cd backend
make docker-libs   # OS 感知：自动调用对应平台的 libs_only 脚本
make docker-up     # OS 感知：自动调用 full_deploy
make docker-down   # docker compose down
```

---

## 三、全栈服务清单（`docker-compose.yaml`）

所有服务接入 `app-tier` bridge 网络，时区 `TZ=Asia/Shanghai`。

### 中间件

| 服务 | 镜像 | 宿主端口 → 容器端口 | 说明 |
|------|------|---------------------|------|
| **etcd** | `quay.io/coreos/etcd:v3.6.8` | 2379, 2380 | 服务发现（三服务均依赖） |
| **jaeger** | `jaegertracing/all-in-one:latest` | 6831/udp, 5778, 4317, 4318, 16686, 14250/68/69 | 链路追踪，OTLP 已启用，UI `http://localhost:16686` |
| **redis** | `bitnami/redis:latest` | 6379 | 密码 `*Abcd123456`；禁用 FLUSHDB/FLUSHALL/CONFIG |
| **kafka** | `bitnami/kafka:latest` | 9092, 9093 | KRaft 模式，单节点 controller+broker |
| **minio** | `minio/minio:latest` | 9001→9000, 9002→9001 | root / `*Abcd123456`，默认 bucket `images`，UI `http://localhost:9002` |
| **postgres** | `bitnami/postgresql:latest` | 5432 | user `postgres` / 密码 `*Abcd123456` |
| **doris-fe** | `apache/doris:fe-4.0.4` | 8030, 9030, 9010 | Doris Frontend，静态 IP `172.20.80.2:9010`，`FE_ID=1` |
| **doris-be** | `apache/doris:be-4.0.4` | 8040, 9050 | Doris Backend，`BE_ADDR=172.20.80.3:9050` |
| **superset** | `apache/superset:latest` | 8088 | 以 root 运行，自动安装 `pymysql`+`pydoris` 并初始化（admin/admin） |

> compose 中另有 consul、mysql/mariadb、clickhouse 的**注释块**，按需取消注释。

### 应用服务

三服务**共用同一个 Dockerfile**，通过构建参数 `SERVICE_NAME` 选择编译哪个二进制：

| 服务 | 镜像 | 宿主端口 | SERVICE_NAME | depends_on |
|------|------|---------|--------------|------------|
| **admin-service** | `go-wind-uba/admin-service:1.0.0` | 9700, 9701 | `admin` | postgres, redis, minio, etcd, jaeger |
| **collector-service** | `go-wind-uba/collector-service:1.0.0` | 9800, 9801 | `collector` | postgres, redis, minio, etcd, jaeger |
| **core-service** | `go-wind-uba/core-service:1.0.0` | （不映射宿主端口） | `core` | postgres, redis, minio, etcd, jaeger |

> ⚠️ **端口说明**：compose 映射的 `9700/9701`、`9800/9801` 是**宿主机 → 容器**映射。但服务 YAML 里 `server.yaml` 实际监听的是 admin `5600/5601`、collector `5700`。当前 compose 端口映射与服务监听端口**不一致**——生产化时需统一（改 compose 映射或改服务 `server.yaml`）。详见 [配置详解 · 端口对照](./deploy-config.md)。

### libs 模式

`docker-compose.libs.yaml` 与完整版的**中间件部分完全相同**，但**不含** admin/collector/core 三个应用服务——这就是 libs_only 模式，后端用 `go run` 本地启动调试。

---

## 四、构建应用镜像

```bash
cd backend

# 方式 1：递归为每个服务构建镜像
make docker

# 方式 2：在单个服务目录构建
cd app/admin/service
make docker   # docker build -t $PROJECT_NAME/$APP_NAME --build-arg SERVICE_NAME=admin ...
```

Dockerfile（`backend/Dockerfile`）通过 `--build-arg SERVICE_NAME={admin|collector|core}` 与 `--build-arg APP_VERSION=...` 控制产物，多阶段构建产出最小化镜像。

---

## 五、网络与依赖细节

- **应用网络**：三服务都在 `app-tier`，互相用服务名（`core-service:5600` 等）通信；core 的 gRPC 经 etcd 发现。
- **Doris 静态 IP**：FE/BE 用了 `172.20.80.x` 静态地址（Doris 集群配置要求），不要随意改网络段。
- **Kafka advertised listener**：compose 内 Kafka 对容器内通告 `kafka:9092`，而 collector 的 `data.yaml` 默认连 `127.0.0.1:9092`。**容器化部署时需把 collector 的 kafka 地址改为 `kafka:9092`**。
- **Postgres 库名**：compose 默认 `POSTGRES_DB=gwubd`，但服务 `data.yaml` 连的是 `gw_uba`——**需对齐**（改 compose env 或建库）。

---

## 六、健康检查与排错

| 现象 | 排查方向 |
|------|---------|
| 三服务起不来 | `docker logs <svc>`；通常是连不上 PG/Redis/etcd，确认 depends_on 已起且网络段正确 |
| admin 拨不通 core | etcd 是否注册成功（`docker exec etcd etcdctl get --prefix /`）；core gRPC 是否启动 |
| Kafka 收不到数据 | collector 的 kafka 地址是否指向 `kafka:9092`（容器内）而非 `127.0.0.1` |
| Doris 查询慢/超时 | FE/BE 是否就绪（`http://localhost:8030`）；`BE_ADDR` 是否正确 |
| 数据查不到 | 确认 OLAP 引擎的 Kafka 消费作业是否正常（Doris：`SHOW ROUTINE LOAD`；ClickHouse：查 Kafka 引擎表/物化视图）；详见 [系统架构 · Kafka 消费入库机制](./architecture.md) |

链路追踪用 Jaeger UI（`http://localhost:16686`）查看跨服务调用。

---

## 七、相关文档

- [系统架构](./architecture.md)
- [配置详解](./deploy-config.md)（**安全清单**）
- [PM2 部署](./deploy-pm2.md)
- [Superset 部署](./deploy-superset.md)
- [附录 · 端口对照表](./appendix.md)
