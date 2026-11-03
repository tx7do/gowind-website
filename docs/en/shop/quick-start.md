# Quick Start

This page is written for developers and walks through running GoWind Shop locally in full.

Source repository: <https://github.com/tx7do/go-wind-shop>

## 1. Prerequisites

| Dependency | Requirement |
| --- | --- |
| Go | 1.25+ |
| Node.js / pnpm | Builds the admin console and the storefront |
| Docker & Docker Compose | Starts middleware and application services |
| MySQL or PostgreSQL | Either one; the default demo uses PostgreSQL |

## 2. Get the Code

```bash
git clone https://github.com/tx7do/go-wind-shop.git
cd go-wind-shop
```

The repository has three parts:

- `backend/` — go-kratos microservice back end (admin-service: admin BFF, app-service: storefront BFF, core-service: core services)
- `frontend/admin/` — admin console (Vue3 + Element Plus)
- `frontend/app/` — storefront (Nuxt static site generation, 20 pages)

## 3. Start Services

### Option 1: One-Command Full Stack (recommended for trying it out)

Use `backend/docker-compose.yaml` to bring up middleware and application services in one go:

- Middleware: PostgreSQL, Redis, OpenSearch, MinIO (object storage), etcd, Jaeger
- Applications: admin-service (:9700), app-service (:9800), core-service (internal gRPC, no exposed port)

### Option 2: Middleware Only + Run Apps Locally

Use `backend/docker-compose.libs.yaml` to start only the middleware and run the back-end services in your IDE — convenient for breakpoint debugging and secondary development.

## 4. Load the Demo Data

The repository ships demo seed data (demo SQL under `backend/sql/`); once imported you get a ready-to-browse demo store:

- Admin and demo buyer accounts
- 100+ smart-home category products (with product images)
- Demo orders and a "mock payment" channel — the full order-to-payment flow works with no real merchant credentials

For the exact import steps, see the instructions in the repository's `backend/sql/` directory.

## 5. Access Points

Once services are up:

- The admin console front end (Vue3 + Element Plus) connects to admin-service
- The storefront (Nuxt) connects to app-service
- API documentation: each service exposes Swagger for easy review of REST contracts

For front-end startup commands, see the `package.json` scripts in each directory and the repository README.

## 6. Production Deployment Notes

- **Same-origin reverse proxy**: refer to the configuration templates under `deploy/nginx/` — within each site's own domain (storefront and admin console), API requests are reverse-proxied by path prefix to the corresponding BFF and static assets are served directly, avoiding CORS
- **Process management**: `scripts/deploy/pm2_service.sh` provides a PM2 management script
- **Payment channels**: in production the deployer brings its own WeChat Pay / Alipay merchant credentials and the platform never touches funds; the "mock payment" channel is enough for local demos

## 7. Next Steps

- Try the product: [Online Demo](/en/shop/trial.md)
- See the full capability landscape: [Feature Manual](/en/shop/features.md)
- Feedback and contributions: issues and PRs are welcome in the GitHub repository ([Issue](https://github.com/tx7do/go-wind-shop/issues))

---

- Back to [GoWind Shop Product Introduction](/en/shop/intro.md)
