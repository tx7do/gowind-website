# Three-Service Deployment Tutorial

GoWind CMS adopts the Admin / App / Core three-service architecture, which makes deployment more complex than the single-service Admin. This tutorial covers local development, Docker deployment, Nginx reverse proxying, and production deployment solutions for the three services.

## Prerequisites

- Have read [CMS Backend Architecture Overview](./backend-architecture.md) and [Installation Guide](./installation.md)
- Be familiar with basic Docker / Docker Compose / Nginx operations

## 1. Deployment Architecture

### 1.1 Production Architecture Overview

```mermaid
graph TB
    subgraph SG1["Clients"]
        Admin[Admin Console]
        Vue[Vue Frontend]
        React[React Frontend]
        Taro[Taro Mini-Program]
    end

    subgraph SG2["Reverse Proxy Nginx"]
        NLB[Load Balancer]
    end

    subgraph SG3["Backend Services"]
        AdminAPI[Admin Service<br/>:6600]
        AppAPI[App Service<br/>:6700]
        Core[Core Service<br/>gRPC]
    end

    subgraph SG4["Infrastructure"]
        PG[(PostgreSQL)]
        Redis[(Redis)]
        MinIO[(MinIO)]
        OS[(OpenSearch)]
        Etcd[(Etcd)]
        Jaeger[(Jaeger)]
    end

    Admin --> NLB
    Vue --> NLB
    React --> NLB
    Taro --> NLB

    NLB -->|/admin/| AdminAPI
    NLB -->|/app/| AppAPI

    AdminAPI -->|gRPC| Core
    AppAPI -->|gRPC| Core

    Core --> PG
    Core --> Redis
    Core --> MinIO
    Core --> OS
    Core --> Etcd
```

### 1.2 Deployment Options Compared

| Option | Complexity | Applicable Scenario |
|------|--------|---------|
| Local development | Low | Development and debugging |
| Full Docker Compose | Medium | Testing / small-scale production |
| Docker + Nginx | Medium-high | Medium-scale production |
| Kubernetes | High | Large-scale production |

## 2. Local Development Deployment

### 2.1 Starting Infrastructure

```bash
cd backend

# Start all dependency services
make docker-libs

# Or use the scripts
# Windows
.\scripts\docker\libs_only.ps1
# Linux/macOS
./scripts/docker/libs_only.sh
```

### 2.2 Starting the Three Services

```bash
# Start the three services separately with the gow CLI (three terminals)

# Terminal 1: Core Service (must start first)
gow run core

# Terminal 2: Admin Service
gow run admin

# Terminal 3: App Service
gow run app
```

### 2.3 Starting the Frontends

```bash
# Terminal 4: Admin console
cd frontend/admin
pnpm install
pnpm dev   # http://localhost:5666

# Terminal 5: React frontend
cd frontend/app/react
pnpm install
pnpm dev   # http://localhost:3000
```

## 3. Full Docker Compose Deployment

### 3.1 Complete docker-compose

```yaml
# docker-compose.yaml
version: "3.8"

services:
  # ========== Infrastructure ==========
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: cms
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: "*Abcd123456"
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    command: redis-server --requirepass "*Abcd123456"
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  opensearch:
    image: opensearchproject/opensearch:2.12.0
    environment:
      - discovery.type=single-node
      - "OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - os_data:/usr/share/opensearch/data

  etcd:
    image: bitnami/etcd:3.5
    environment:
      - ALLOW_NONE_AUTHENTICATION=yes
      - ETCD_ADVERTISE_CLIENT_URLS=http://etcd:2379
    ports:
      - "2379:2379"
    volumes:
      - etcd_data:/bitnami/etcd

  # ========== Backend services ==========
  core-service:
    build:
      context: .
      dockerfile: Dockerfile
    command: ["/app/core", "-conf", "/app/configs"]
    depends_on:
      - postgres
      - redis
      - minio
      - opensearch
      - etcd
    volumes:
      - ./app/core/service/configs:/app/configs
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
      - OSS_ENDPOINT=minio:9000
      - OS_HOST=opensearch
      - ETCD_ENDPOINTS=etcd:2379
    restart: always

  admin-service:
    build:
      context: .
      dockerfile: Dockerfile
    command: ["/app/admin", "-conf", "/app/configs"]
    depends_on:
      - core-service
      - etcd
    ports:
      - "6600:6600"
      - "6601:6601"
    volumes:
      - ./app/admin/service/configs:/app/configs
    environment:
      - ETCD_ENDPOINTS=etcd:2379
    restart: always

  app-service:
    build:
      context: .
      dockerfile: Dockerfile
    command: ["/app/app", "-conf", "/app/configs"]
    depends_on:
      - core-service
      - etcd
    ports:
      - "6700:6700"
      - "6701:6701"
    volumes:
      - ./app/app/service/configs:/app/configs
    environment:
      - ETCD_ENDPOINTS=etcd:2379
    restart: always

  # ========== Frontends ==========
  admin-frontend:
    build:
      context: ./frontend/admin
      dockerfile: Dockerfile
    ports:
      - "5666:80"
    depends_on:
      - admin-service
    restart: always

  react-frontend:
    build:
      context: ./frontend/app/react
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - app-service
    restart: always

volumes:
  pg_data:
  redis_data:
  minio_data:
  os_data:
  etcd_data:
```

### 3.2 One-Command Startup

```bash
# Full startup (infrastructure + backend + frontends)
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f admin-service
docker-compose logs -f app-service
docker-compose logs -f core-service
```

## 4. Dockerfile

### 4.1 Backend Multi-Stage Build

```dockerfile
# backend/Dockerfile
FROM golang:1.25-alpine AS builder

WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Compile the binaries of the three services separately
RUN CGO_ENABLED=0 go build -o core ./app/core/service/cmd/server/
RUN CGO_ENABLED=0 go build -o admin ./app/admin/service/cmd/server/
RUN CGO_ENABLED=0 go build -o app ./app/app/service/cmd/server/

# Runtime stage
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Shanghai

WORKDIR /app
COPY --from=builder /build/core /app/core
COPY --from=builder /build/admin /app/admin
COPY --from=builder /build/app /app/app

# Start the Core Service by default (can be overridden by the docker-compose command)
CMD ["/app/core", "-conf", "/app/configs"]
```

### 4.2 Admin Console Frontend Dockerfile

```dockerfile
# frontend/admin/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY pnpm-lock.yaml package.json ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 4.3 React Frontend Dockerfile

```dockerfile
# frontend/app/react/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
ENV NEXT_PUBLIC_API_BASE_URL=/app/v1
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

## 5. Nginx Reverse Proxy

### 5.1 Production Nginx Configuration

```nginx
# /etc/nginx/conf.d/cms.conf

# Admin console
server {
    listen 443 ssl http2;
    server_name admin.cms.gowind.cloud;

    ssl_certificate /etc/ssl/certs/cms.crt;
    ssl_certificate_key /etc/ssl/private/cms.key;

    # Frontend static assets
    location / {
        proxy_pass http://127.0.0.1:5666;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Admin API
    location /api/ {
        proxy_pass http://127.0.0.1:6600/admin/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Authorization $http_authorization;
    }

    # Admin SSE
    location /sse/ {
        proxy_pass http://127.0.0.1:6601/events;
        proxy_set_header Connection "";
        proxy_http_version 1.1;
        proxy_buffering off;     # SSE requires buffering to be off
        proxy_cache off;
        proxy_read_timeout 86400s;
    }

    # Swagger documents
    location /docs/ {
        proxy_pass http://127.0.0.1:6600/docs/;
    }
}

# Frontend API
server {
    listen 443 ssl http2;
    server_name api.cms.gowind.cloud;

    ssl_certificate /etc/ssl/certs/cms.crt;
    ssl_certificate_key /etc/ssl/private/cms.key;

    # App API
    location / {
        proxy_pass http://127.0.0.1:6700/app/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # App SSE
    location /events {
        proxy_pass http://127.0.0.1:6701/events;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_read_timeout 86400s;
    }

    # Swagger
    location /docs/ {
        proxy_pass http://127.0.0.1:6700/docs/;
    }
}

# React frontend
server {
    listen 443 ssl http2;
    server_name react.cms.gowind.cloud;

    ssl_certificate /etc/ssl/certs/cms.crt;
    ssl_certificate_key /etc/ssl/private/cms.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name *.cms.gowind.cloud;
    return 301 https://$host$request_uri;
}
```

### 5.2 Load Balancing

Enable load balancing for multi-instance deployments:

```nginx
upstream admin_api {
    server 10.0.0.1:6600 weight=3;
    server 10.0.0.2:6600 weight=3;
    server 10.0.0.3:6600 weight=2;
}

upstream app_api {
    server 10.0.0.1:6700;
    server 10.0.0.2:6700;
    ip_hash;  # Session persistence
}

server {
    location /api/ {
        proxy_pass http://admin_api/admin/v1/;
    }
    location / {
        proxy_pass http://app_api/app/v1/;
    }
}
```

## 6. PM2 Deployment

### 6.1 PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'cms-core',
      script: './core',
      args: '-conf ./configs',
      cwd: './app/core/service',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        GO_ENV: 'production',
      },
    },
    {
      name: 'cms-admin',
      script: './admin',
      args: '-conf ./configs',
      cwd: './app/admin/service',
      instances: 2,          // Multiple instances
      exec_mode: 'cluster',
      autorestart: true,
      env: {
        GO_ENV: 'production',
      },
    },
    {
      name: 'cms-app',
      script: './app',
      args: '-conf ./configs',
      cwd: './app/app/service',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      env: {
        GO_ENV: 'production',
      },
    },
  ],
};
```

```bash
# PM2 deployment
pm2 start ecosystem.config.js

# Check status
pm2 status

# Logs
pm2 logs cms-admin
```

## 7. Health Checks and Monitoring

### 7.1 Health Check Endpoints

```yaml
# Health check in server.yaml
server:
  health:
    enabled: true
    path: "/healthz"
    read_timeout: 1s
```

```bash
# Check the health status of each service
curl http://localhost:6600/healthz   # Admin Service
curl http://localhost:6700/healthz   # App Service
```

### 7.2 Jaeger Distributed Tracing

```yaml
# server.yaml
server:
  tracer:
    enabled: true
    provider: jaeger
    endpoint: "http://jaeger:14268/api/traces"
```

Jaeger UI: `http://localhost:16686`

## 8. Configuration Management

### 8.1 Configuration File Structure

```
configs/
├── core/
│   ├── server.yaml       # Core Service config
│   └── registry.yaml     # Service registry
├── admin/
│   ├── server.yaml       # Admin Service config
│   └── registry.yaml
├── app/
│   ├── server.yaml       # App Service config
│   └── registry.yaml
└── config.yaml           # Shared config (database, Redis, OSS)
```

### 8.2 Environment Variable Overrides

```yaml
# Environment variables in server.yaml
data:
  database:
    driver: postgres
    source: "host=${DB_HOST} port=5432 user=postgres password=${DB_PASSWORD} dbname=cms sslmode=disable"

  redis:
    addr: "${REDIS_HOST}:6379"
    password: "${REDIS_PASSWORD}"

  oss:
    endpoint: "${OSS_ENDPOINT}"
    access_key: "${OSS_ACCESS_KEY}"
    secret_key: "${OSS_SECRET_KEY}"
    bucket: "${OSS_BUCKET}"
```

## 9. Deployment Checklist

| Item | Description |
|--------|------|
| Infrastructure | PostgreSQL / Redis / MinIO / OpenSearch / Etcd |
| Core Service | gRPC service registered with Etcd |
| Admin Service | Connected to Core + HTTP 6600 |
| App Service | Connected to Core + HTTP 6700 |
| Nginx configuration | HTTPS + reverse proxy + SSE |
| Health checks | /healthz endpoints |
| Environment variables | Sensitive information such as database passwords |
| Log collection | Centralized logging |
| Tracing | Jaeger integration |
| Data backup | Regular database backups |

## Related Documentation

- [CMS Installation Guide](./installation.md)
- [CMS Backend Architecture Overview](./backend-architecture.md)
- [Configuration and Deployment Guide](./backend-config-deploy.md)
- [GoWind Admin Configuration and Deployment Guide](/en/admin/backend-config-deploy.md)
