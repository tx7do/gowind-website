# GoWind ShortPlay Quick Start

This guide walks you through running GoWind ShortPlay completely on your local machine: preparing the dependent middleware, starting the three backend services, entering the admin console, experiencing the short-video community with the app, and understanding the boundary of the commercial value-added pack.

## 1. Environment Preparation

| Dependency | Purpose |
|------|------|
| Go 1.26+ | Building and running backend services locally |
| Docker & Docker Compose | Running dependent middleware and application containers |
| Node.js + pnpm | Admin console frontend (React 19 + Vite) |
| Flutter 3 | Mobile app (needed to try iOS / Android) |

The starter edition depends on the following middleware, which you need to prepare yourself:

| Middleware | Purpose |
|--------|------|
| PostgreSQL / MySQL | Business data storage |
| Redis | Caching and sessions |
| MinIO | Object storage for videos and covers |
| etcd | Service registration and discovery |
| ZLMediaKit | Runs in a separate container (reserved for the live transcoding extension) |

## 2. Get the Code

```bash
git clone https://github.com/tx7do/go-wind-shortplay.git
cd go-wind-shortplay
```

## 3. Start the Services

### 1. Start the dependent middleware

Use Docker Compose to bring up PostgreSQL / Redis / MinIO / etcd and other dependencies (ZLMediaKit runs as a separate container):

```bash
# Start the dependencies in the repository's compose orchestration directory
docker compose up -d
```

### 2. Start the three application services

The repository provides a Docker Compose orchestration; one command brings up the three application services — admin BFF / app BFF / core:

```bash
docker compose up -d
```

Service ports at a glance:

| Service | Port | Description |
|------|------|------|
| Admin BFF | :7600 | Admin console HTTP API |
| App BFF | :7700 | Frontend HTTP API (App / H5) |
| Core | gRPC :7900 | Core business service (internal calls) |

::: tip
The default administrator account is `admin / admin`, seeded automatically by the Core service on first startup. Change the default password immediately after deploying to production.
:::

### 3. Start the admin console frontend

```bash
cd frontend/admin
pnpm install
pnpm dev
```

Development mode runs at `http://localhost:16800` by default.

## 4. Explore the Admin Console

1. Open `http://localhost:16800` in a browser and log in with `admin / admin`
2. **Data dashboard**: view core metrics, video TOP10, and 7-day trends
3. **Video management**: experience the draft → review → published / rejected / taken-down state machine; try batch moderation and scheduled publishing
4. **Report tickets / comments / danmaku / DM supervision**: experience the closed report-handling loop and read-only supervision
5. **System settings**: adjust upload limits, the manual-review switch, the registration switch, the sensitive-word library, danmaku/DM switches, and announcement slots
6. **Users & permissions**: view role, menu, API, and department permission groups

## 5. Explore the App

Run the app project (iOS / Android) with the Flutter toolchain:

```bash
flutter pub get
flutter run
```

Recommended path to experience the complete loop:

1. Log in as `appuser` and enter the vertical-swipe immersive Feed (three-way recall + already-watched deduplication + resume playback)
2. Shoot / upload a video, go to the draft box → submit for review → wait for back-office publishing
3. On someone else's video, try likes and favorites, nested comments, danmaku, and 1:1 direct messages (SSE real-time)
4. Open the “Profile” page to view creator analytics (likes/follower statistics and 7/14/30-day trends)
5. In “Settings”, switch among Chinese / English / Japanese and enable teen mode (usage-time reminder)

## 6. Directory and Services Guide

| Location | Description |
|------|------|
| `docs/API.md` | API documentation (use together with OpenAPI) |
| `docs/ROADMAP.md` | Product roadmap |
| Admin BFF (:7600) | Admin console HTTP API service |
| App BFF (:7700) | Frontend HTTP API service |
| Core (gRPC :7900) | Core business logic and data layer |
| Admin console frontend (React 19 + AntD Pro) | Operations / moderation back office |
| Flutter App (iOS / Android) | Mobile community |
| H5 share landing page | Landing for share posters with QR codes |

> Interfaces follow a Protobuf contract-first + OpenAPI development model; when doing secondary development, start from `docs/API.md` to learn the contracts.

## 7. Commercial Value-Added Pack Boundary

The open-source starter edition (MIT) runs independently; the following capabilities are not in the open-source edition and belong to the commercial value-added pack:

| Capability | Open-source starter edition | Commercial value-added pack |
|------|:---------:|:---------:|
| Video upload / state machine / Feed / interactive community / operations back office | ✅ | — |
| Multi-bitrate transcoding cluster | ❌ | ✅ |
| AI recommendation | ❌ | ✅ |
| Content safety moderation | ❌ | ✅ |
| SaaS multi-tenancy | ❌ | ✅ |
| Live streaming and paid content | ❌ | ✅ (ZLMediaKit extension slot reserved) |

::: tip
The boundary between the value-added capabilities and the open-source edition is defined at the API contract level; the value-added pack plugs in according to the contracts, without affecting secondary-development code based on the open-source edition. For the commercial value-added pack, contact WeChat `yang_lin_bo` or email <yanglinbo@gmail.com>.
:::

For more product capabilities and architecture details, return to the [GoWind ShortPlay Product Overview](/en/shortplay/intro.md).
