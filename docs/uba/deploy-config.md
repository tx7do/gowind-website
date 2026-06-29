# UBA 配置详解与安全清单

本文档面向运维人员，详解三大服务的配置文件、OLAP 引擎切换、JWT 认证、端口对照，并给出**生产部署前必须处理的安全清单**。

> 先读 [系统架构](./architecture.md)。配置文件在各服务的 `configs/` 目录下，按功能拆分为多个 YAML。

---

## 一、配置文件总览

每个服务目录 `app/<svc>/service/configs/` 下：

| 文件 | 作用 | core | admin | collector |
|------|------|:----:|:-----:|:--------:|
| `server.yaml` | 服务监听端口、中间件、SSE、Swagger | ✓（grpc/asynq） | ✓（rest/sse） | ✓（rest） |
| `data.yaml` | 数据源（DB/Redis/Kafka/OLAP） | ✓ | ✓（仅 redis） | ✓（redis/kafka） |
| `registry.yaml` | 服务发现（etcd / consul） | ✓ | ✓ | ✓ |
| `remote.yaml` | 远程 gRPC 发现配置 | — | ✓ | ✓ |
| `client.yaml` | gRPC 客户端 | ✓ | ✓ | ✓ |
| `authenticator.yaml` | JWT 双 profile | ✓ | — | — |
| `oss.yaml` | 对象存储（MinIO） | ✓ | ✓ | — |
| `logger.yaml` / `trace.yaml` | 日志 / 链路追踪 | ✓ | ✓ | ✓ |

---

## 二、服务监听端口（server.yaml）

### Core Service（`app/core/service/configs/server.yaml`）

```yaml
server:
  grpc:
    addr: "0.0.0.0:0"          # 动态端口，启动时注册到 etcd
    timeout: 10s
    middleware: { enable_logging: true, enable_recovery: true, enable_tracing: true,
                  enable_validate: true, enable_circuit_breaker: true, enable_metadata: true }
  asynq:
    uri: "redis://:*Abcd123456@redis:6379/1"   # 异步任务队列
```

### Admin Service（`app/admin/service/configs/server.yaml`）

```yaml
server:
  rest:
    addr: "0.0.0.0:5600"        # HTTP REST
    timeout: 10s
    enable_swagger: true
    cors: { origins: ["*"], methods: [...], headers: [...] }
    middleware:
      auth: { method: "HS256", key: "some_api_key" }
  sse:
    addr: ":5601"               # SSE 实时推送
    codec: "json"
    path: "/events"
    auto_stream: true
```

### Collector Service（`app/collector/service/configs/server.yaml`）

```yaml
server:
  rest:
    addr: "0.0.0.0:5700"        # HTTP 上报入口
    timeout: 10s
    enable_swagger: true
    cors: { ... }
    middleware:
      auth: { method: "HS256", key: "some_api_key" }
```

### ⚠️ 端口对照表

| 服务 | 服务监听端口（YAML） | docker-compose 宿主映射 | 说明 |
|------|---------------------|------------------------|------|
| Admin REST | **5600** | 5600 | 一致 |
| Admin SSE | **5601** | 5601 | 一致 |
| Collector HTTP | **5700** | 5700 | 一致 |
| Core gRPC | **动态（etcd 发现）** | （不映射） | 容器内通过 etcd 发现 |
| Doris FE | 9030(MySQL)/8030(HTTP) | 9030, 8030, 9010 | 一致 |
| Postgres | 5432 | 5432 | 一致 |
| Redis | 6379 | 6379 | 一致 |
| Kafka | 9092 | 9092 | 容器内用 `kafka:9092` |
| MinIO | 9000/9001 | 9001/9002 | 一致 |
| Jaeger UI | 16686 | 16686 | 一致 |
| Superset | 8088 | 8088 | 一致 |

> docker-compose 的端口映射已与服务 `server.yaml` 监听端口统一，宿主机直接用对应端口访问即可。

---

## 三、数据源配置（data.yaml）

### Core Service（数据中枢）

```yaml
database:                      # PostgreSQL（业务/配置实体）
  driver: postgres
  dsn: "host=postgres port=5432 user=postgres password=*Abcd123456 dbname=gw_uba sslmode=disable"
  migrate: true                # 启动时按 ent schema 自动建表
  maxIdleConns: 25
  maxOpenConns: 25
  connMaxLifetime: 300s

redis: { addr: "redis:6379", password: "*Abcd123456" }

clickhouse:                    # ClickHouse（UseClickHouse=true 时生效）
  addrs: ["localhost:9000"]
  database: gw_uba
  compression: lz4

doris:                         # Doris（默认引擎）
  dsn: "root:@tcp(localhost:9030)/gw_uba"
  stream_load:                 # 批量导入
    url: "http://localhost:8040/api/gw_uba/_stream_load"
    user: root
    timeout: 30s
```

### Collector Service

```yaml
redis: { addr: "redis:6379", password: "*Abcd123456" }
kafka:
  codec: json
  endpoints: ["127.0.0.1:9092"]   # ⚠️ 容器内部署改为 kafka:9092
```

### Admin Service

```yaml
redis: { addr: "redis:6379", password: "*Abcd123456" }
```

> Admin 是无状态转发层，除 Redis 缓存外不直接连 DB/OLAP。

---

## 四、OLAP 引擎切换（UseClickHouse）

引擎由**编译期常量**决定，不是 YAML 配置：

```go
// backend/app/core/service/internal/data/data.go
// UseClickHouse 是否使用ClickHouse作为数据存储，否则使用Doris。
const UseClickHouse bool = false   // 当前默认 false → 使用 Apache Doris
```

- `false`（默认）：实例化 Doris client，ClickHouse client 置空。
- `true`：切换为 ClickHouse，需重新编译 Core。

repo 层按此常量分支：`if data.UseClickHouse { ckRepo } else { dorisRepo }`。两种引擎共用同一份业务模型（schema 镜像），SQL 按方言略有差异（见 [OLAP 查询手册](./analyst-olap-cookbook.md)）。

---

## 五、服务发现（registry.yaml）

三服务的 `registry.yaml` 一致：

```yaml
registry:
  type: "etcd"                 # 当前用 etcd（consul 配置存在但未启用）
  etcd: { endpoints: ["localhost:2379"] }
  consul: { address: "localhost:8500", scheme: "http" }   # 未启用
```

> 容器化部署时，etcd endpoints 应改为 `etcd:2379`。

---

## 六、认证（authenticator.yaml）

仅 Core 有 `authenticator.yaml`，定义两个 JWT profile（HS256）：

```yaml
auth:
  admin:                       # 管理后台
    key: "some_api_key"        # ⚠️ 必须轮换
    accessTokenTTL: 5400s      # 1.5 小时
    refreshTokenTTL: 43200s    # 12 小时
    aesKey: "f51d66a73d8a0927" # ⚠️ 必须轮换
  collector:                   # 采集/移动端
    key: "some_api_key"
    accessTokenTTL: 900s       # 15 分钟
    refreshTokenTTL: 0s        # 禁用刷新
    aesKey: "f51d66a73d8a0927"
```

---

## 七、🔒 生产安全清单（务必执行）

以下均为开发默认值，**生产部署前必须全部轮换**：

| 项 | 默认值（危险） | 处理 |
|----|---------------|------|
| JWT 签名 key | `some_api_key` | 替换为强随机串 |
| JWT AES key | `f51d66a73d8a0927` | 替换为强随机串 |
| PostgreSQL 密码 | `*Abcd123456` | 替换 |
| Redis 密码 | `*Abcd123456` | 替换 |
| MinIO root 密码 | `*Abcd123456` | 替换 |
| Doris root | （空密码） | 设置强密码 |
| Superset admin | `admin/admin` | 改密码 + 改 `SUPERSET_SECRET_KEY` |
| CORS origins | `["*"]` | 收敛到实际域名 |
| TLS | 无 | 反向代理（Nginx）加 TLS |

> 建议：用环境变量或配置中心（etcd，见 `make export` 的 `cfgexp`）注入密钥，不要把生产密钥写进 YAML 或镜像。

---

## 八、相关文档

- [系统架构](./architecture.md)
- [Docker 部署](./deploy-docker.md)
- [PM2 部署](./deploy-pm2.md)
- [附录 · 端口对照表](./appendix.md)
