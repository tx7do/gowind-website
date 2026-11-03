# UBA Docker Deployment Guide

This document is aimed at operations engineers, covering GoWind UBA's two Docker deployment modes, the full-stack compose service inventory, the shared Dockerfile, and the build process.

> Read [System Architecture](./architecture.md) and the [Configuration Reference](./deploy-config.md) first. Default passwords/secrets **must be rotated**; see the security checklist in the Configuration Reference.

---

## 1. Two Deployment Modes

| Mode | Script (Linux/macOS) | Script (Windows) | Compose file | For |
|------|---------------------|-----------------|-------------|------|
| **libs_only (dependency mode)** | `scripts/docker/libs_only.sh` | `scripts/docker/libs_only.ps1` | `docker-compose.libs.yaml` | Starts only the middleware; the backend is debugged locally with `go run` |
| **full_deploy (full mode)** | `scripts/docker/full_deploy.sh` | `scripts/docker/full_deploy.ps1` | `docker-compose.yaml` | Middleware + three services, one-click demo/production |

The scripts automatically detect `docker compose` (v2 plugin) or fall back to `docker-compose`, and pre-create the dependency data directories (postgres/redis/etcd/minio/jaeger).

---

## 2. Quick Start

### Linux / macOS

```bash
cd backend
chmod +x scripts/**/*.sh

# Start middleware dependencies only (recommended for development)
./scripts/docker/libs_only.sh

# One-click full deployment (middleware + three backend services)
./scripts/docker/full_deploy.sh
```

### Windows (PowerShell as Administrator)

```powershell
cd backend
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser   # first-time allowance

.\scripts\docker\libs_only.ps1
# or
.\scripts\docker\full_deploy.ps1
```

### Equivalent Make Commands

```bash
cd backend
make docker-libs   # OS-aware: automatically calls the platform's libs_only script
make docker-up     # OS-aware: automatically calls full_deploy
make docker-down   # docker compose down
```

---

## 3. Full-Stack Service Inventory (`docker-compose.yaml`)

All services join the `app-tier` bridge network, with timezone `TZ=Asia/Shanghai`.

### Middleware

| Service | Image | Host port → container port | Notes |
|------|------|---------------------|------|
| **etcd** | `quay.io/coreos/etcd:v3.6.8` | 2379, 2380 | Service discovery (all three services depend on it) |
| **jaeger** | `jaegertracing/all-in-one:latest` | 6831/udp, 5778, 4317, 4318, 16686, 14250/68/69 | Distributed tracing, OTLP enabled, UI at `http://localhost:16686` |
| **redis** | `bitnami/redis:latest` | 6379 | Password `*Abcd123456`; FLUSHDB/FLUSHALL/CONFIG disabled |
| **kafka** | `bitnami/kafka:latest` | 9092, 9093 | KRaft mode, single-node controller+broker |
| **minio** | `minio/minio:latest` | 9001→9000, 9002→9001 | root / `*Abcd123456`, default bucket `images`, UI at `http://localhost:9002` |
| **postgres** | `bitnami/postgresql:latest` | 5432 | user `postgres` / password `*Abcd123456` |
| **doris-fe** | `apache/doris:fe-4.0.4` | 8030, 9030, 9010 | Doris Frontend, static IP `172.20.80.2:9010`, `FE_ID=1` |
| **doris-be** | `apache/doris:be-4.0.4` | 8040, 9050 | Doris Backend, `BE_ADDR=172.20.80.3:9050` |
| **superset** | `apache/superset:latest` | 8088 | Runs as root, automatically installs `pymysql`+`pydoris` and initializes (admin/admin) |

> The compose file also has **commented-out blocks** for consul, mysql/mariadb, and clickhouse; uncomment as needed.

### Application Services

The three services **share the same Dockerfile**, selecting which binary to compile via the build argument `SERVICE_NAME`:

| Service | Image | Host port | SERVICE_NAME | depends_on |
|------|------|---------|--------------|------------|
| **admin-service** | `go-wind-uba/admin-service:1.0.0` | 5600, 5601 | `admin` | postgres, redis, minio, etcd, jaeger |
| **collector-service** | `go-wind-uba/collector-service:1.0.0` | 5700 | `collector` | postgres, redis, minio, etcd, jaeger |
| **core-service** | `go-wind-uba/core-service:1.0.0` | (no host port mapped) | `core` | postgres, redis, minio, etcd, jaeger |

> The port mappings match the services' `server.yaml` listening ports (admin `5600/5601`, collector `5700`); access them from the host directly via the corresponding ports. See [Configuration Reference · Port Reference](./deploy-config.md) for details.

### libs Mode

`docker-compose.libs.yaml` is **exactly the same as the full version in its middleware section**, but **excludes** the three application services admin/collector/core — this is the libs_only mode, where the backend is started locally with `go run` for debugging.

---

## 4. Building the Application Images

```bash
cd backend

# Method 1: recursively build an image for each service
make docker

# Method 2: build in a single service directory
cd app/admin/service
make docker   # docker build -t $PROJECT_NAME/$APP_NAME --build-arg SERVICE_NAME=admin ...
```

The Dockerfile (`backend/Dockerfile`) controls the artifacts via `--build-arg SERVICE_NAME={admin|collector|core}` and `--build-arg APP_VERSION=...`, producing minimal images through multi-stage builds.

---

## 5. Network & Dependency Details

- **Application network**: all three services are on `app-tier` and communicate via service names (admin calls core's gRPC, discovered via etcd; core's gRPC uses a dynamic port, not fixed at 5600).
- **Doris static IPs**: FE/BE use `172.20.80.x` static addresses (required by Doris cluster configuration); do not change the network segment arbitrarily.
- **Kafka advertised listener**: inside compose, Kafka advertises `kafka:9092` to containers, while the collector's `data.yaml` defaults to `127.0.0.1:9092`. **For containerized deployment, change the collector's kafka address to `kafka:9092`**.
- **Postgres database name**: compose has unified `POSTGRES_DB=gw_uba`, consistent with `dbname=gw_uba` in the services' `data.yaml`, so no extra alignment is needed.

---

## 6. Health Checks & Troubleshooting

| Symptom | Troubleshooting direction |
|------|---------|
| The three services fail to start | `docker logs <svc>`; usually a failure to connect to PG/Redis/etcd — confirm depends_on services are up and the network segment is correct |
| admin cannot dial core | Whether etcd registration succeeded (`docker exec etcd etcdctl get --prefix /`); whether core's gRPC has started |
| Kafka receives no data | Whether the collector's kafka address points to `kafka:9092` (inside containers) instead of `127.0.0.1` |
| Doris queries slow/timing out | Whether FE/BE are ready (`http://localhost:8030`); whether `BE_ADDR` is correct |
| Data cannot be queried | Confirm the OLAP engine's Kafka consumption job is working (Doris: `SHOW ROUTINE LOAD`; ClickHouse: check Kafka engine tables/materialized views); see [System Architecture · Kafka Consumption Mechanism](./architecture.md) |

Use the Jaeger UI (`http://localhost:16686`) to inspect cross-service calls for distributed tracing.

---

## 7. Related Documentation

- [System Architecture](./architecture.md)
- [Configuration Reference](./deploy-config.md) (**security checklist**)
- [PM2 Deployment](./deploy-pm2.md)
- [Superset Deployment](./deploy-superset.md)
- [Appendix · Port Reference](./appendix.md)
