# GoWind CMS Product Introduction

**GoWind CMS** (full name **GoWind Content Hub**, Chinese name「风行」/ "RushWind") is a batteries-included enterprise-grade full-stack Go **Headless content platform** (multi-tenant CMS).

- **API-first**: RESTful / gRPC dual-protocol external services, auto-generated OpenAPI docs, content fully decoupled from presentation
- **Microservice architecture**: Built on [go-kratos](https://go-kratos.dev/), with the backend split into three services: admin-service / app-service / core-service
- **Multiple client options**: Admin console + four C-end frontends (React / Vue / Taro / Flutter), deploy the clients you need
- **AI-native**: Chat assistant, RAG, Agent graph orchestration canvas, MCP tool surface
- **Omnichannel distribution**: One-click distribution to Bluesky, Mastodon, WeChat Official Account, Weibo, and 10 platforms in total
- **Open source and free**: MIT license

## 1. Product Positioning

GoWind Content Hub provides a complete content hub for enterprises that need unified content management and multi-channel distribution:

- **Content teams** complete content modeling, authoring and orchestration, multi-level approval, and scheduled publishing in the admin console;
- **Development teams** consume the content into Web, mini-program, App, and any other client via OpenAPI and the dual-protocol API;
- **Operations teams** amplify the value of every publication with social distribution, A/B content experiments, and the content calendar.

"Headless" means that content production, storage, and management are fully separated from front-end presentation: one content hub supports any number of presentation clients, each of which can evolve independently and go live on demand.

## 2. Client Forms: One Hub, Choose Clients On Demand

### Three Backend Services

| Service | Positioning | Responsibilities |
|------|------|------|
| admin-service | Admin console BFF | Hosts all HTTP APIs of the admin console |
| app-service | C-end BFF | Hosts the public APIs consumed by the frontends |
| core-service | Core service | Hosts core business logic and the data layer, invoked internally by the two BFFs |

### Admin Console

The admin console is built on **React 19 + Ant Design**, covering the complete management surface of organization and permissions, content production, social distribution, AI assistant, and system operations.

### C-End Frontends (Four Options)

| Frontend | Tech Stack | Form |
|------|--------|------|
| react | [Next.js](https://nextjs.org/) + shadcn/ui | SSR, supports pure static export (hosted directly by nginx) |
| vue | [Nuxt](https://nuxt.com/) + shadcn-vue | SSR / SSG |
| taro | [Taro](https://docs.taro.zone/) | WeChat Mini-Program / H5 |
| flutter | [Flutter](https://flutter.dev/) | iOS / Android native apps |

The four frontends share the same content hub and API contract, and are **deployed on demand**: use React or Vue for an official website, add Taro for mini-programs, and add Flutter when an App is needed — they do not constrain each other.

## 3. Feature Panorama

### Organization and Permissions

| Feature | Description |
|------|------|
| Multi-tenant | Tenant-level data isolation and independent management |
| Roles and permissions | Role-based authorization with field-level permissions |
| OpenAPI AK-SK | AK-SK key authentication for open APIs |
| Tenant quota | Per-tenant control of resource usage |
| Login policy | Configurable login security policies |
| MFA TOTP | Two-step verification based on TOTP dynamic codes |
| Online sessions | Online session viewing and management |

### Content Capabilities

| Feature | Description |
|------|------|
| Content modeling | Flexibly define content structures with Components |
| Page building | Visually build pages with 14 types of sections/blocks |
| Versioning | Content version management with rollback at any time |
| Collaborative editing | Multi-user collaborative content editing |
| Publishing workflow | Multi-level publishing approval with full audit trail |
| A/B content experiments | Comparative experiments of candidate content in the same slot |
| Content calendar | Schedule content publishing by calendar |
| Draft preview | Preview draft rendering before publishing |
| Redirects | Site redirect rule management |
| Form capture | Built-in forms to collect leads and feedback |
| Full-chain SEO meta | Full-chain coverage of seoTitle, og tags, and canonical |
| Content health | Periodic inspection with dead-link detection |

### Social Distribution

Content can be distributed with one click to 10 platforms: **Bluesky, Mastodon, DEV.to, Telegram, WordPress, WeChat Official Account, Nostr, Weibo, LinkedIn, and Cnblogs** — create once, reach everywhere.

### AI Assistant

| Feature | Description |
|------|------|
| Chat assistant | AI conversation for operators |
| RAG | Retrieval-augmented knowledge Q&A |
| Agent graph orchestration canvas | Visually orchestrate Agent workflows with human approval nodes |
| MCP tool surface | Extend AI tool capabilities via the MCP protocol |

### Full-Text Search

| Feature | Description |
|------|------|
| Chinese tokenization | OpenSearch + smartcn Chinese word segmentation |
| Search experience | Result highlighting and search suggestions |
| Tenant-level thesaurus | Each tenant maintains its own synonym library |

### System Operations

| Feature | Description |
|------|------|
| Backup and restore | Data backup and recovery |
| Dual monitoring pages | System monitoring pages (dual-page view) |
| Task scheduling | Scheduled task management with run logs |
| Dictionary management | Unified maintenance of data dictionaries |

## 4. Recent Updates (October–November 2026)

- **Same-origin APIs across five clients**: The admin console and all four frontends were switched to same-origin relative paths forwarded by nginx prefixes, deprecating standalone API domains
- **Pure static export of the React frontend**: `output: export` exports a pure static site hosted directly by nginx, with no resident Node service required
- **Zip delivery pipeline for build artifacts**: Frontend and backend build artifacts are uniformly delivered as zip archives
- **Multi-level publishing workflow**: The approval flow upgraded to multiple levels, with a new AI Agent human-approval node
- **AI anti-spam comment gate**: AI-based spam content interception before comments are persisted
- **Security hardening**: Framework-level fix completed for cross-tenant write privilege escalation (BOLA)

## 5. Interface Preview

| Admin Console Login | Post Editing |
| :---: | :---: |
| ![Admin console login](/assets/images/cms/admin_login.png) | ![Post editing](/assets/images/cms/admin_post_edit.png) |
| **Content Analytics** | **Media Asset Library** |
| ![Content analytics](/assets/images/cms/admin_analysis.png) | ![Media asset library](/assets/images/cms/admin_media_asset_list.png) |
| **React Frontend · Home** | **React Frontend · Post Detail** |
| ![React frontend home](/assets/images/cms/react_app_homepage.png) | ![React frontend post detail](/assets/images/cms/react_app_post_detail.png) |
| **React Frontend · Post List** | |
| ![React frontend post list](/assets/images/cms/react_app_post_list.png) | |

## 6. Tech Stack

| Layer | Technology |
|------|------|
| Language | [Go](https://go.dev/) 1.25+ |
| Microservice framework | [go-kratos](https://go-kratos.dev/) |
| ORM | [Ent](https://entgo.io/) |
| Relational database | [PostgreSQL](https://www.postgresql.org/) (default) |
| Cache | [Redis](https://redis.io/) |
| Full-text search | [OpenSearch](https://opensearch.org/) + smartcn Chinese word segmentation |
| Object storage | SeaweedFS |
| Service registry | [Etcd](https://etcd.io/) |
| Tracing | [Jaeger](https://www.jaegertracing.io/) |

## 7. Online Demo

| Entry | URL |
|------|------|
| Admin console | [https://admin.cms.gowind.cloud](https://admin.cms.gowind.cloud) |
| Admin API Swagger | [https://api.admin.cms.gowind.cloud/docs/](https://api.admin.cms.gowind.cloud/docs/) |
| C-end API Swagger | [https://api.cms.gowind.cloud/docs/](https://api.cms.gowind.cloud/docs/) |
| Vue frontend | [https://vue.cms.gowind.cloud](https://vue.cms.gowind.cloud) |
| React frontend | [https://react.cms.gowind.cloud](https://react.cms.gowind.cloud) |
| Taro frontend | [https://taro.cms.gowind.cloud](https://taro.cms.gowind.cloud) |
| Flutter frontend | [https://flutter.cms.gowind.cloud](https://flutter.cms.gowind.cloud) |

::: tip Demo Account and Support
- Admin console demo account: `admin` / `admin`
- WeChat for business cooperation and technical support: `yang_lin_bo`
- Email for business cooperation and technical support: <yanglinbo@gmail.com>
:::

## 8. Open Source License

GoWind CMS is open-sourced under the **MIT license** and may be used freely in commercial projects.

## 9. Related Documentation

- [CMS Installation Guide](./installation.md)
- [CMS Backend Architecture Overview](./backend-architecture.md)
- [CMS Protobuf API Definitions](./backend-api.md)
- [CMS Configuration and Deployment Guide](./backend-config-deploy.md)
- [CMS Frontend Architecture](./frontend-architecture.md)
- [GoWind Admin Documentation](/en/admin/intro.md) — shared technical foundation (go-kratos + Ent + permission system)

For more step-by-step tutorials (content modeling, section/block editor, Headless API integration, multi-site management, full-text search, three-service deployment, etc.), see the "Tutorials" sections in the left sidebar.
