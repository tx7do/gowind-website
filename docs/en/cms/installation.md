# GoWind CMS Installation Guide

This guide describes the complete process of environment preparation, local development, Docker deployment, and production deployment for GoWind CMS.

## 1. Environment Requirements

### Development Environment

| Tool | Minimum Version | Description |
|------|----------|------|
| [Go](https://go.dev/) | 1.25+ | Backend development language |
| [Node.js](https://nodejs.org/) | 18+ | Frontend development runtime |
| [pnpm](https://pnpm.io/) | 9+ | Frontend package manager |
| [Docker](https://www.docker.com/) | 24+ | Containerized deployment |
| [Docker Compose](https://docs.docker.com/compose/) | 2.0+ | Multi-container orchestration |
| [buf](https://buf.build/) | latest | Protobuf toolchain |
| [gow](https://github.com/tx7do/go-wind-toolkit) | latest | GoWind CLI tool |

### Infrastructure Services

| Service | Default Port | Description |
|------|----------|------|
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache + async task queue |
| MinIO | 9000 / 9001 | Object storage (S3 compatible) |
| OpenSearch | 9200 / 9600 | Full-text search engine |
| Etcd | 2379 / 2380 | Service registry and discovery |
| Jaeger | 16686 (UI) | Distributed tracing |

## 2. Getting the Source

```bash
git clone https://github.com/tx7do/go-wind-cms.git
cd go-wind-cms
```

## 3. Local Development Deployment

### Step 1: Start Infrastructure Services

Use Docker Compose to start all dependency services (excluding application services):

```bash
cd backend

# Windows (PowerShell)
.\scripts\docker\libs_only.ps1

# Linux / macOS
./scripts/docker/libs_only.sh
```

Or use the Make command directly:

```bash
make docker-libs
```

This starts the following containers:

| Service | Container | Credentials |
|------|------|------|
| PostgreSQL | `bitnami/postgresql:latest` | User: `postgres`, password: `*Abcd123456`, database: `gwc` |
| Redis | `bitnami/redis:latest` | Password: `*Abcd123456` |
| MinIO | `minio/minio:latest` | User: `root`, password: `*Abcd123456` |
| OpenSearch | `opensearchproject/opensearch:latest` | Admin password: `@Abcd#123456` |
| Etcd | `coreos/etcd:v3.6.8` | No authentication |
| Jaeger | `jaegertracing/all-in-one:latest` | No authentication |

Verify service status:

```bash
docker compose -f docker-compose.libs.yaml ps
```

### Step 2: Initialize the Backend Development Environment

```bash
cd backend

# Install protoc plugins and CLI tools
make init

# Download Go dependencies
make dep

# Generate all code (Ent + Wire + API + OpenAPI)
make gen
```

### Step 3: Start the Backend Services

The GoWind CMS backend consists of three services, which need to be started separately during local development:

```bash
# Start with the gow CLI (recommended)

# Start the core service (Core Service) — business logic + data layer
gow run core

# Start the admin service (Admin Service) — admin console API
gow run admin

# Start the app service (App Service) — frontend application API
gow run app
```

> You can also debug and run them directly in an IDE such as GoLand; the entry points are located in each service's `cmd/server/` directory.

### Step 4: Start the Frontends

#### Admin Console

```bash
cd frontend/admin
pnpm install
pnpm dev
```

Admin console URL: <http://localhost:5666>

#### Frontend Applications (React as an Example)

```bash
cd frontend/app/react
pnpm install
pnpm dev
```

Other frontend variants:

```bash
# Vue frontend (Nuxt.js)
cd frontend/app/vue
pnpm install
pnpm dev

# Taro frontend (Mini-Program/H5)
cd frontend/app/taro
pnpm install
pnpm dev:h5

# Flutter frontend
cd frontend/app/flutter_app
flutter pub get
flutter run
```

### Step 5: Verification

| Service | URL |
|------|----------|
| Admin console frontend | <http://localhost:5666> |
| Admin API Swagger | <http://localhost:6600/docs/> |
| App API Swagger | <http://localhost:6700/docs/> |
| Jaeger tracing UI | <http://localhost:16686> |
| MinIO console | <http://localhost:9001> |

> Default admin account: `admin` / `admin`

## 4. Service Port Overview

| Service | REST Port | SSE Port | gRPC Port | Description |
|------|-----------|----------|-----------|------|
| Admin Service | 6600 | 6601 | dynamic | Admin console API |
| App Service | 6700 | 6701 | dynamic | Frontend application API |
| Core Service | — | — | dynamic | Core business service (internal gRPC only) |

## 5. Configuration Files

Each service's configuration files are located in the `app/<service>/service/configs/` directory:

```
configs/
├── server.yaml       # Server config (REST/SSE/gRPC ports, middleware, CORS)
├── client.yaml       # gRPC client config (calling the Core Service)
├── data.yaml         # Data layer config (Redis connection)
├── oss.yaml          # Object storage config (MinIO)
├── registry.yaml     # Service registry config (Etcd/Consul)
├── logger.yaml       # Logging config
├── trace.yaml        # Tracing config (Jaeger)
└── remote.yaml       # Remote config center
```

### Key Configuration Items

#### server.yaml — service ports and middleware

```yaml
server:
  rest:
    addr: "0.0.0.0:6600"       # REST API port
    timeout: 10s
    enable_swagger: true        # Enable Swagger UI in development
    cors:
      origins: ["*"]
    middleware:
      auth:
        method: "HS256"
        key: "some_api_key"     # JWT signing key
  sse:
    addr: ":6601"               # SSE push port
  grpc:
    addr: "0.0.0.0:0"           # gRPC port (0 = dynamic)
```

#### oss.yaml — MinIO object storage

```yaml
oss:
  minio:
    endpoint: "127.0.0.1:9000"
    access_key: "root"
    secret_key: "@Abcd#123456"
    use_ssl: false
```

#### registry.yaml — service registry and discovery

```yaml
registry:
  type: "etcd"                  # Supports etcd / consul
  etcd:
    endpoints:
      - "localhost:2379"
```

## 6. Full Docker Compose Deployment

Use Docker Compose to deploy all services (infrastructure + application services) in one go:

```bash
cd backend

# Windows (PowerShell)
.\scripts\docker\full_deploy.ps1

# Linux / macOS
./scripts/docker/full_deploy.sh
```

Or use the Make command:

```bash
make docker-up
```

Service mapping of the full deployment:

| Service | Container Ports | Description |
|------|----------|------|
| admin-service | 9700 (REST), 9701 (SSE) | Admin console API |
| app-service | 9800 (REST), 9801 (SSE) | Frontend application API |
| core-service | internal gRPC | Core business service |

Stop all services:

```bash
make docker-down
```

## 7. Docker Image Build

### Build a Single Service Image

```bash
cd backend

# The Dockerfile distinguishes services via the SERVICE_NAME argument
docker build --build-arg SERVICE_NAME=admin -t go-wind-cms/admin-service:1.0.0 .
docker build --build-arg SERVICE_NAME=app -t go-wind-cms/app-service:1.0.0 .
docker build --build-arg SERVICE_NAME=core -t go-wind-cms/core-service:1.0.0 .
```

### Run a Container

```bash
docker run -d \
  --name cms-admin \
  -p 9700:9700 \
  -p 9701:9701 \
  -e TZ=Asia/Shanghai \
  go-wind-cms/admin-service:1.0.0
```

## 8. Common Development Commands

```bash
cd backend

# === Code generation ===
make api          # Generate Protobuf Go code
make openapi      # Generate OpenAPI v3 documents (Admin + App)
make ts           # Generate TypeScript code (Admin + React + Taro + Vue)
make ent          # Generate Ent ORM code
make wire         # Generate Wire dependency injection code
make gen          # Generate everything at once (ent + wire + api + openapi)

# === Build and test ===
make build        # Build all services (including API generation)
make build_only   # Build only (no API generation)
make test         # Run tests
make cover        # Test coverage
make vet          # Static analysis
make lint         # Code linting

# === Docker ===
make docker-up    # Start all services (apps + dependencies)
make docker-libs  # Start dependency services only
make docker-down  # Stop all services

# === Environment setup ===
make init         # Install protoc plugins + CLI tools
make install-dev  # Set up the development environment (Unix)
```

## 9. Database Initialization

GoWind CMS uses the Ent ORM; the database schema is migrated automatically when the service starts for the first time, so no manual SQL execution is required.

If you need to manage the database manually, SQL scripts are located in:

```
backend/sql/
```

## 10. Production Recommendations

### Security Hardening

1. **Change default passwords**: Update all service passwords (PostgreSQL, Redis, MinIO, etc.)
2. **JWT key**: Replace `key` in `server.yaml` with a strong random string
3. **Disable Swagger**: Set `enable_swagger: false` in production
4. **CORS restrictions**: Change `origins` from `*` to specific domains
5. **HTTPS**: Configure a reverse proxy (Nginx/Caddy) to enable TLS

### Performance Optimization

1. **Database connection pool**: Adjust the pool size according to load
2. **Redis persistence**: Enable AOF persistence in production
3. **OpenSearch cluster**: Deploy a multi-node cluster for high-concurrency scenarios
4. **CDN acceleration**: Upload static assets to a CDN with MinIO configured as the origin

### Observability

1. **Jaeger**: Visit <http://localhost:16686> for distributed tracing
2. **Log collection**: Configure `logger.yaml` to output structured logs and integrate with ELK/Loki
3. **Metrics monitoring**: Integrate Prometheus + Grafana to monitor service metrics

## 11. FAQ

### Q: Database connection fails when starting the backend services?

1. Confirm the PostgreSQL container is running: `docker ps | grep postgres`
2. Check the database connection config in `data.yaml`
3. Confirm the `gwc` database has been created (it is created automatically on first startup)

### Q: MinIO file upload fails?

1. Confirm the MinIO container is running: `docker ps | grep minio`
2. Check the endpoint and credentials in `oss.yaml`
3. Confirm the bucket has been created (default bucket: `images`)

### Q: API requests return 404 after the frontend starts?

1. Confirm the backend Admin Service (6600) and App Service (6700) are running
2. Check the API address config in the frontend `.env.development`
3. Confirm the CORS config allows the frontend domain

### Q: The gow command is not found?

Install the GoWind CLI tool:

```bash
go install github.com/tx7do/go-wind-toolkit/gowind/cmd/gow@latest
```

### Q: Service registration to Etcd fails?

1. Confirm the Etcd container is running: `docker ps | grep etcd`
2. Check the Etcd address in `registry.yaml`
3. Confirm the Core Service is running and registered (Admin/App depend on Core)

## 12. Related Documentation

- [GoWind CMS Product Introduction](./intro.md)
- [GoWind Admin Installation Guide](/en/admin/installation.md) — shared technical foundation
