# GoWind CMS 安装指南

本指南详细介绍 GoWind CMS 的环境准备、本地开发、Docker 部署和生产环境部署的完整流程。

## 一、环境要求

### 开发环境

| 工具 | 最低版本 | 说明 |
|------|----------|------|
| [Go](https://go.dev/) | 1.25+ | 后端开发语言 |
| [Node.js](https://nodejs.org/) | 18+ | 前端开发运行时 |
| [pnpm](https://pnpm.io/) | 9+ | 前端包管理器 |
| [Docker](https://www.docker.com/) | 24+ | 容器化部署 |
| [Docker Compose](https://docs.docker.com/compose/) | 2.0+ | 多容器编排 |
| [buf](https://buf.build/) | latest | Protobuf 工具链 |
| [gow](https://github.com/tx7do/go-wind-toolkit) | latest | GoWind CLI 工具 |

### 基础设施服务

| 服务 | 默认端口 | 说明 |
|------|----------|------|
| PostgreSQL | 5432 | 主数据库 |
| Redis | 6379 | 缓存 + 异步任务队列 |
| MinIO | 9000 / 9001 | 对象存储（兼容 S3） |
| OpenSearch | 9200 / 9600 | 全文搜索引擎 |
| Etcd | 2379 / 2380 | 服务注册与发现 |
| Jaeger | 16686（UI） | 链路追踪 |

## 二、获取源码

```bash
git clone https://github.com/tx7do/go-wind-cms.git
cd go-wind-cms
```

## 三、本地开发部署

### 步骤 1：启动基础设施服务

使用 Docker Compose 启动所有依赖服务（不含应用服务）：

```bash
cd backend

# Windows (PowerShell)
.\scripts\docker\libs_only.ps1

# Linux / macOS
./scripts/docker/libs_only.sh
```

或者直接使用 Make 命令：

```bash
make docker-libs
```

这将启动以下容器：

| 服务 | 容器 | 凭据 |
|------|------|------|
| PostgreSQL | `bitnami/postgresql:latest` | 用户: `postgres`，密码: `*Abcd123456`，数据库: `gwc` |
| Redis | `bitnami/redis:latest` | 密码: `*Abcd123456` |
| MinIO | `minio/minio:latest` | 用户: `root`，密码: `*Abcd123456` |
| OpenSearch | `opensearchproject/opensearch:latest` | 管理员密码: `@Abcd#123456` |
| Etcd | `coreos/etcd:v3.6.8` | 无认证 |
| Jaeger | `jaegertracing/all-in-one:latest` | 无认证 |

验证服务状态：

```bash
docker compose -f docker-compose.libs.yaml ps
```

### 步骤 2：初始化后端开发环境

```bash
cd backend

# 安装 protoc 插件和 CLI 工具
make init

# 下载 Go 依赖
make dep

# 生成全部代码（Ent + Wire + API + OpenAPI）
make gen
```

### 步骤 3：启动后端服务

GoWind CMS 后端包含三个服务，本地开发时需要分别启动：

```bash
# 使用 gow CLI 启动（推荐）

# 启动核心服务（Core Service）— 业务逻辑 + 数据层
gow run core

# 启动管理后台服务（Admin Service）— 管理后台 API
gow run admin

# 启动前台应用服务（App Service）— 前台应用 API
gow run app
```

> 也可以在 GoLand 等 IDE 中直接调试运行，入口位于各服务的 `cmd/server/` 目录。

### 步骤 4：启动前端

#### 管理后台

```bash
cd frontend/admin
pnpm install
pnpm dev
```

管理后台访问地址：<http://localhost:5666>

#### 前台应用（以 React 为例）

```bash
cd frontend/app/react
pnpm install
pnpm dev
```

其他前台版本：

```bash
# Vue 前台（Nuxt.js）
cd frontend/app/vue
pnpm install
pnpm dev

# Taro 前台（小程序/H5）
cd frontend/app/taro
pnpm install
pnpm dev:h5

# Flutter 前台
cd frontend/app/flutter_app
flutter pub get
flutter run
```

### 步骤 5：验证

| 服务 | 访问地址 |
|------|----------|
| 管理后台前端 | <http://localhost:5666> |
| Admin API Swagger | <http://localhost:6600/docs/> |
| App API Swagger | <http://localhost:6700/docs/> |
| Jaeger 追踪 UI | <http://localhost:16686> |
| MinIO 控制台 | <http://localhost:9001> |

> 默认管理员账号：`admin` / `admin`

## 四、服务端口一览

| 服务 | REST 端口 | SSE 端口 | gRPC 端口 | 说明 |
|------|-----------|----------|-----------|------|
| Admin Service | 6600 | 6601 | 动态分配 | 管理后台 API |
| App Service | 6700 | 6701 | 动态分配 | 前台应用 API |
| Core Service | — | — | 动态分配 | 核心业务服务（仅内部 gRPC） |

## 五、配置文件说明

每个服务的配置文件位于 `app/<service>/service/configs/` 目录：

```
configs/
├── server.yaml       # 服务器配置（REST/SSE/gRPC 端口、中间件、CORS）
├── client.yaml       # gRPC 客户端配置（调用 Core Service）
├── data.yaml         # 数据层配置（Redis 连接）
├── oss.yaml          # 对象存储配置（MinIO）
├── registry.yaml     # 服务注册配置（Etcd/Consul）
├── logger.yaml       # 日志配置
├── trace.yaml        # 链路追踪配置（Jaeger）
└── remote.yaml       # 远程配置中心
```

### 关键配置项

#### server.yaml — 服务端口与中间件

```yaml
server:
  rest:
    addr: "0.0.0.0:6600"       # REST API 端口
    timeout: 10s
    enable_swagger: true        # 开发环境启用 Swagger UI
    cors:
      origins: ["*"]
    middleware:
      auth:
        method: "HS256"
        key: "some_api_key"     # JWT 签名密钥
  sse:
    addr: ":6601"               # SSE 推送端口
  grpc:
    addr: "0.0.0.0:0"           # gRPC 端口（0 = 动态分配）
```

#### oss.yaml — MinIO 对象存储

```yaml
oss:
  minio:
    endpoint: "127.0.0.1:9000"
    access_key: "root"
    secret_key: "@Abcd#123456"
    use_ssl: false
```

#### registry.yaml — 服务注册发现

```yaml
registry:
  type: "etcd"                  # 支持 etcd / consul
  etcd:
    endpoints:
      - "localhost:2379"
```

## 六、Docker Compose 全量部署

使用 Docker Compose 一键部署所有服务（基础设施 + 应用服务）：

```bash
cd backend

# Windows (PowerShell)
.\scripts\docker\full_deploy.ps1

# Linux / macOS
./scripts/docker/full_deploy.sh
```

或使用 Make 命令：

```bash
make docker-up
```

全量部署的服务映射：

| 服务 | 容器端口 | 说明 |
|------|----------|------|
| admin-service | 9700 (REST), 9701 (SSE) | 管理后台 API |
| app-service | 9800 (REST), 9801 (SSE) | 前台应用 API |
| core-service | 内部 gRPC | 核心业务服务 |

停止所有服务：

```bash
make docker-down
```

## 七、Docker 镜像构建

### 构建单个服务镜像

```bash
cd backend

# Dockerfile 通过 SERVICE_NAME 参数区分服务
docker build --build-arg SERVICE_NAME=admin -t go-wind-cms/admin-service:1.0.0 .
docker build --build-arg SERVICE_NAME=app -t go-wind-cms/app-service:1.0.0 .
docker build --build-arg SERVICE_NAME=core -t go-wind-cms/core-service:1.0.0 .
```

### 运行容器

```bash
docker run -d \
  --name cms-admin \
  -p 9700:9700 \
  -p 9701:9701 \
  -e TZ=Asia/Shanghai \
  go-wind-cms/admin-service:1.0.0
```

## 八、常用开发命令

```bash
cd backend

# === 代码生成 ===
make api          # 生成 Protobuf Go 代码
make openapi      # 生成 OpenAPI v3 文档（Admin + App）
make ts           # 生成 TypeScript 代码（Admin + React + Taro + Vue）
make ent          # 生成 Ent ORM 代码
make wire         # 生成 Wire 依赖注入代码
make gen          # 一键生成全部（ent + wire + api + openapi）

# === 构建与测试 ===
make build        # 构建所有服务（含 API 生成）
make build_only   # 仅构建（不生成 API）
make test         # 运行测试
make cover        # 测试覆盖率
make vet          # 静态分析
make lint         # 代码检查

# === Docker ===
make docker-up    # 启动全部服务（应用 + 依赖）
make docker-libs  # 仅启动依赖服务
make docker-down  # 停止全部服务

# === 环境安装 ===
make init         # 安装 protoc 插件 + CLI 工具
make install-dev  # 安装开发环境（Unix）
```

## 九、数据库初始化

GoWind CMS 使用 Ent ORM，数据库 Schema 在服务首次启动时自动迁移，无需手动执行 SQL。

如需手动管理数据库，SQL 脚本位于：

```
backend/sql/
```

## 十、生产环境建议

### 安全加固

1. **修改默认密码**：更新所有服务密码（PostgreSQL、Redis、MinIO 等）
2. **JWT 密钥**：将 `server.yaml` 中的 `key` 替换为高强度随机字符串
3. **关闭 Swagger**：生产环境设置 `enable_swagger: false`
4. **CORS 限制**：将 `origins` 从 `*` 改为具体域名
5. **HTTPS**：配置反向代理（Nginx/Caddy）启用 TLS

### 性能优化

1. **数据库连接池**：根据负载调整连接池大小
2. **Redis 持久化**：生产环境开启 AOF 持久化
3. **OpenSearch 集群**：高并发场景部署多节点集群
4. **CDN 加速**：静态资源上传到 CDN，配置 MinIO 为源站

### 可观测性

1. **Jaeger**：访问 <http://localhost:16686> 查看分布式链路追踪
2. **日志收集**：配置 `logger.yaml` 输出结构化日志，接入 ELK/Loki
3. **指标监控**：集成 Prometheus + Grafana 监控服务指标

## 十一、常见问题

### Q: 启动后端服务时报数据库连接失败？

1. 确认 PostgreSQL 容器已启动：`docker ps | grep postgres`
2. 检查 `data.yaml` 中的数据库连接配置
3. 确认数据库 `gwc` 已创建（首次启动会自动创建）

### Q: MinIO 上传文件失败？

1. 确认 MinIO 容器已启动：`docker ps | grep minio`
2. 检查 `oss.yaml` 中的 endpoint 和凭据
3. 确认 bucket 已创建（默认 bucket: `images`）

### Q: 前端启动后 API 请求 404？

1. 确认后端 Admin Service（6600）和 App Service（6700）已启动
2. 检查前端的 `.env.development` 中的 API 地址配置
3. 确认 CORS 配置允许前端域名访问

### Q: gow 命令找不到？

安装 GoWind CLI 工具：

```bash
go install github.com/tx7do/go-wind-toolkit/gowind/cmd/gow@latest
```

### Q: 服务注册到 Etcd 失败？

1. 确认 Etcd 容器已启动：`docker ps | grep etcd`
2. 检查 `registry.yaml` 中的 Etcd 地址
3. 确认 Core Service 已启动并注册（Admin/App 依赖 Core）

## 十二、相关文档

- [GoWind CMS 产品介绍](./intro.md)
- [GoWind Admin 安装指南](/admin/installation.md) — 共享技术基座
