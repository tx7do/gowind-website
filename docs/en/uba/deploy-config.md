# UBA Configuration Reference & Security Checklist

This document is aimed at operations engineers, detailing the three services' configuration files, OLAP engine switching, JWT authentication, and port reference, and providing the **security checklist that must be handled before production deployment**.

> Read [System Architecture](./architecture.md) first. Configuration files live in each service's `configs/` directory, split into multiple YAMLs by function.

---

## 1. Configuration File Overview

Under each service directory `app/<svc>/service/configs/`:

| File | Purpose | core | admin | collector |
|------|------|:----:|:-----:|:--------:|
| `server.yaml` | Listening ports, middleware, SSE, Swagger | ✓ (grpc/asynq) | ✓ (rest/sse) | ✓ (rest) |
| `data.yaml` | Data sources (DB/Redis/Kafka/OLAP) | ✓ | ✓ (redis only) | ✓ (redis/kafka) |
| `registry.yaml` | Service discovery (etcd / consul) | ✓ | ✓ | ✓ |
| `remote.yaml` | Remote gRPC discovery config | — | ✓ | ✓ |
| `client.yaml` | gRPC clients | ✓ | ✓ | ✓ |
| `authenticator.yaml` | JWT dual profiles | ✓ | — | — |
| `oss.yaml` | Object storage (MinIO) | ✓ | ✓ | — |
| `logger.yaml` / `trace.yaml` | Logging / distributed tracing | ✓ | ✓ | ✓ |

---

## 2. Service Listening Ports (server.yaml)

### Core Service (`app/core/service/configs/server.yaml`)

```yaml
server:
  grpc:
    addr: "0.0.0.0:0"          # dynamic port, registered to etcd at startup
    timeout: 10s
    middleware: { enable_logging: true, enable_recovery: true, enable_tracing: true,
                  enable_validate: true, enable_circuit_breaker: true, enable_metadata: true }
  asynq:
    uri: "redis://:*Abcd123456@redis:6379/1"   # asynchronous task queue
```

### Admin Service (`app/admin/service/configs/server.yaml`)

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
    addr: ":5601"               # real-time SSE push
    codec: "json"
    path: "/events"
    auto_stream: true
```

### Collector Service (`app/collector/service/configs/server.yaml`)

```yaml
server:
  rest:
    addr: "0.0.0.0:5700"        # HTTP reporting entry point
    timeout: 10s
    enable_swagger: true
    cors: { ... }
    middleware:
      auth: { method: "HS256", key: "some_api_key" }
```

### ⚠️ Port Reference

| Service | Service listening port (YAML) | docker-compose host mapping | Notes |
|------|---------------------|------------------------|------|
| Admin REST | **5600** | 5600 | Same |
| Admin SSE | **5601** | 5601 | Same |
| Collector HTTP | **5700** | 5700 | Same |
| Core gRPC | **Dynamic (etcd discovery)** | (not mapped) | Discovered via etcd inside containers |
| Doris FE | 9030(MySQL)/8030(HTTP) | 9030, 8030, 9010 | Same |
| Postgres | 5432 | 5432 | Same |
| Redis | 6379 | 6379 | Same |
| Kafka | 9092 | 9092 | Accessed as `kafka:9092` inside containers |
| MinIO | 9000/9001 | 9001/9002 | Same |
| Jaeger UI | 16686 | 16686 | Same |
| Superset | 8088 | 8088 | Same |

> The docker-compose port mappings have been unified with the services' `server.yaml` listening ports; access them from the host directly via the corresponding ports.

---

## 3. Data Source Configuration (data.yaml)

### Core Service (data hub)

```yaml
database:                      # PostgreSQL (business/config entities)
  driver: postgres
  dsn: "host=postgres port=5432 user=postgres password=*Abcd123456 dbname=gw_uba sslmode=disable"
  migrate: true                # automatically create tables from the ent schema at startup
  maxIdleConns: 25
  maxOpenConns: 25
  connMaxLifetime: 300s

redis: { addr: "redis:6379", password: "*Abcd123456" }

clickhouse:                    # ClickHouse (takes effect when UseClickHouse=true)
  addrs: ["localhost:9000"]
  database: gw_uba
  compression: lz4

doris:                         # Doris (default engine)
  dsn: "root:@tcp(localhost:9030)/gw_uba"
  stream_load:                 # batch import
    url: "http://localhost:8040/api/gw_uba/_stream_load"
    user: root
    timeout: 30s
```

### Collector Service

```yaml
redis: { addr: "redis:6379", password: "*Abcd123456" }
kafka:
  codec: json
  endpoints: ["127.0.0.1:9092"]   # ⚠️ change to kafka:9092 when deployed in containers
```

### Admin Service

```yaml
redis: { addr: "redis:6379", password: "*Abcd123456" }
```

> Admin is a stateless forwarding layer; apart from the Redis cache, it does not connect directly to DB/OLAP.

---

## 4. OLAP Engine Switching (UseClickHouse)

The engine is decided by a **compile-time constant**, not a YAML configuration:

```go
// backend/app/core/service/internal/data/data.go
// UseClickHouse determines whether ClickHouse is used as the data store, otherwise Doris.
const UseClickHouse bool = false   // currently defaults to false → Apache Doris is used
```

- `false` (default): the Doris client is instantiated, the ClickHouse client is left empty.
- `true`: switches to ClickHouse; Core must be recompiled.

The repo layer branches on this constant: `if data.UseClickHouse { ckRepo } else { dorisRepo }`. Both engines share the same business model (mirrored schemas), with SQL differing slightly by dialect (see the [OLAP Query Cookbook](./analyst-olap-cookbook.md)).

---

## 5. Service Discovery (registry.yaml)

The three services' `registry.yaml` are identical:

```yaml
registry:
  type: "etcd"                 # etcd is currently used (a consul config exists but is not enabled)
  etcd: { endpoints: ["localhost:2379"] }
  consul: { address: "localhost:8500", scheme: "http" }   # not enabled
```

> For containerized deployment, the etcd endpoints should be changed to `etcd:2379`.

---

## 6. Authentication (authenticator.yaml)

Only Core has `authenticator.yaml`, defining two JWT profiles (HS256):

```yaml
auth:
  admin:                       # admin console
    key: "some_api_key"        # ⚠️ must be rotated
    accessTokenTTL: 5400s      # 1.5 hours
    refreshTokenTTL: 43200s    # 12 hours
    aesKey: "f51d66a73d8a0927" # ⚠️ must be rotated
  collector:                   # ingestion/mobile
    key: "some_api_key"
    accessTokenTTL: 900s       # 15 minutes
    refreshTokenTTL: 0s        # refresh disabled
    aesKey: "f51d66a73d8a0927"
```

---

## 7. 🔒 Production Security Checklist (must execute)

All of the following are development defaults and **must all be rotated before production deployment**:

| Item | Default (dangerous) | Action |
|----|---------------|------|
| JWT signing key | `some_api_key` | Replace with a strong random string |
| JWT AES key | `f51d66a73d8a0927` | Replace with a strong random string |
| PostgreSQL password | `*Abcd123456` | Replace |
| Redis password | `*Abcd123456` | Replace |
| MinIO root password | `*Abcd123456` | Replace |
| Doris root | (empty password) | Set a strong password |
| Superset admin | `admin/admin` | Change the password + change `SUPERSET_SECRET_KEY` |
| CORS origins | `["*"]` | Restrict to actual domains |
| TLS | none | Add TLS at the reverse proxy (Nginx) |

> Recommendation: inject secrets via environment variables or a configuration center (etcd, see `cfgexp` of `make export`), and never write production secrets into YAML or images.

---

## 8. Related Documentation

- [System Architecture](./architecture.md)
- [Docker Deployment](./deploy-docker.md)
- [PM2 Deployment](./deploy-pm2.md)
- [Appendix · Port Reference](./appendix.md)
