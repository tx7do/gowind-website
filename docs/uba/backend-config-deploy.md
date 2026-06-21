# UBA 配置与部署指南

本文档介绍 GoWind UBA 的配置文件结构、Docker 部署和生产环境部署方案。

## 一、配置文件结构

每个服务拥有独立的 YAML 配置文件，位于 `configs/` 目录：

```
backend/app/
├── admin/service/configs/
│   └── config.yaml          # Admin Service 配置
├── collector/service/configs/
│   └── config.yaml          # Collector Service 配置
└── core/service/configs/
    └── config.yaml          # Core Service 配置
```

## 二、Core Service 配置

```yaml
# app/core/service/configs/config.yaml
server:
  grpc:
    addr: 0.0.0.0:0
    timeout: 10s

data:
  database:
    driver: postgresql
    source: "host=localhost port=5432 user=postgres password=postgres dbname=gw_uba sslmode=disable"

  redis:
    addr: localhost:6379
    password: ""
    db: 0

  clickhouse:
    addr: localhost:9000
    database: gw_uba
    username: default
    password: ""
    compression: lz4

  doris:
    host: localhost
    port: 9030
    user: root
    password: ""
    database: gw_uba
    stream_load_url: "http://localhost:8030"

  kafka:
    brokers:
      - localhost:9092
    topic: uba_events
    group_id: core-service

  minio:
    endpoint: localhost:9000
    access_key: minioadmin
    secret_key: minioadmin
    bucket: gowind-uba
    use_ssl: false

auth:
  jwt_secret: "your-jwt-secret"
  access_token_ttl: 2h
  refresh_token_ttl: 168h

registry:
  etcd:
    endpoints:
      - localhost:2379

tracing:
  jaeger:
    endpoint: localhost:4317
```

## 三、Admin Service 配置

```yaml
# app/admin/service/configs/config.yaml
server:
  rest:
    addr: 0.0.0.0:9700
    timeout: 5s
  sse:
    addr: 0.0.0.0:9701
    path: /events

core:
  grpc:
    addr: discovery:///gowind-uba-core

auth:
  jwt_secret: "your-jwt-secret"
```

## 四、Collector Service 配置

```yaml
# app/collector/service/configs/config.yaml
server:
  rest:
    addr: 0.0.0.0:9800
    timeout: 5s

core:
  grpc:
    addr: discovery:///gowind-uba-core

kafka:
  brokers:
    - localhost:9092
  topic: uba_events
```

## 五、Docker 部署

### 5.1 依赖服务

```bash
cd backend

# 启动所有依赖服务（PostgreSQL, Redis, Kafka, ClickHouse/Doris, MinIO, Etcd, Jaeger）
docker compose -f scripts/docker/docker-compose.yml up -d
```

### 5.2 服务构建

```bash
cd backend

# 构建 Admin Service
make build-admin

# 构建 Collector Service
make build-collector

# 构建 Core Service
make build-core

# 构建 Docker 镜像
make docker-admin
make docker-collector
make docker-core
```

### 5.3 完整 Docker Compose

```yaml
# docker-compose.uba.yml
version: '3.8'
services:
  # 基础设施
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: gw_uba
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports: ["6379:6379"]

  kafka:
    image: bitnami/kafka:latest
    ports: ["9092:9092"]
    environment:
      KAFKA_CFG_NODE_ID: 0
      KAFKA_CFG_PROCESS_ROLES: controller,broker
      KAFKA_CFG_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093
      KAFKA_CFG_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CFG_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_CFG_CONTROLLER_QUORUM_VOTERS: 0@kafka:9093

  clickhouse:
    image: clickhouse/clickhouse-server:latest
    ports: ["8123:8123", "9000:9000"]
    volumes:
      - ch_data:/var/lib/clickhouse

  minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin

  etcd:
    image: bitnami/etcd:latest
    ports: ["2379:2379"]
    environment:
      ALLOW_NONE_AUTHENTICATION: "yes"

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports: ["16686:16686", "4317:4317"]

  superset:
    image: apache/superset:latest
    ports: ["8088:8088"]
    environment:
      SUPERSET_SECRET_KEY: "your-secret-key"

  # UBA 服务
  core-service:
    build:
      context: ./backend
      dockerfile: Dockerfile.core
    depends_on: [postgres, redis, kafka, clickhouse]

  admin-service:
    build:
      context: ./backend
      dockerfile: Dockerfile.admin
    ports: ["9700:9700", "9701:9701"]
    depends_on: [core-service]

  collector-service:
    build:
      context: ./backend
      dockerfile: Dockerfile.collector
    ports: ["9800:9800"]
    depends_on: [core-service, kafka]

volumes:
  pg_data:
  ch_data:
```

## 六、OLAP 引擎初始化

### 6.1 ClickHouse 初始化

```bash
# 执行 SQL 脚本
cd backend/sql/clickhouse
clickhouse-client --multiquery < 01_create_database.sql
clickhouse-client --multiquery < 02_create_events_fact.sql
clickhouse-client --multiquery < 03_create_sessions_fact.sql
# ... 其他表
```

### 6.2 Doris 初始化

```bash
# 通过 MySQL 协议连接 Doris FE
cd backend/sql/doris
mysql -h localhost -P 9030 -u root < 01_create_database.sql
mysql -h localhost -P 9030 -u root < 02_create_events_fact.sql
# ... 其他表
```

### 6.3 PostgreSQL 元数据初始化

```bash
# 自动迁移（通过 Ent）
gow run admin migrate
```

## 七、Superset 部署

详见 [Superset 部署指南](./tutorial-superset-integration.md)。

```bash
# 快速启动 Superset
docker run -d \
  --name superset \
  -p 8088:8088 \
  -e SUPERSET_SECRET_KEY=your-secret-key \
  apache/superset:latest

# 初始化
docker exec -it superset superset db upgrade
docker exec -it superset superset fab create-admin \
  --username admin --password admin \
  --firstname Admin --lastname Admin \
  --email admin@superset.com
docker exec -it superset superset init
```

## 八、生产环境部署清单

| 检查项 | 说明 |
|--------|------|
| OLAP 引擎选择 | 确认 ClickHouse 或 Doris，修改 `UseClickHouse` 常量 |
| Kafka 配置 | 生产环境 Topic 副本数 ≥ 2 |
| Redis 密码 | 生产环境必须设置密码 |
| PostgreSQL SSL | 生产环境启用 SSL 连接 |
| JWT Secret | 使用强随机密钥 |
| MinIO 密钥 | 修改默认密码 |
| 服务注册 | 配置 Etcd/Consul 集群 |
| 链路追踪 | 配置 Jaeger 采样率 |
| Superset | 配置数据库连接 |
| 数据备份 | 配置 ClickHouse/Doris 定期备份 |
| 监控告警 | 配置 Prometheus + Grafana |

## 相关文档

- [UBA 后端架构总览](./backend-architecture.md)
- [UBA 安装指南](./installation.md)
- [Superset BI 集成](./tutorial-superset-integration.md)
- [三服务部署实战](./tutorial-deploy.md)
