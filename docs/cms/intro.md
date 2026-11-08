# GoWind CMS 产品介绍

**GoWind CMS**（全称 **GoWind Content Hub**，中文名「风行」）是一款开箱即用的企业级 Go 全栈 **Headless 内容平台**（多租户 CMS）。

- **API 优先**：RESTful / gRPC 双协议对外服务，OpenAPI 文档自动生成，内容与展示彻底解耦
- **微服务架构**：基于 [go-kratos](https://go-kratos.dev/) 构建，后端拆分为 admin-service / app-service / core-service 三服务
- **多端可选**：管理后台 + 四套 C 端前台（React / Vue / Taro / Flutter），按需选端部署
- **AI 原生**：对话助手、RAG、Agent 图编排画布、MCP 工具面
- **全渠道分发**：一键分发至 Bluesky、Mastodon、微信公众号、微博等 10 个平台
- **开源免费**：MIT 协议

## 一、产品定位

GoWind Content Hub 为需要统一管理、多渠道分发内容的企业提供完整的内容中台：

- **内容团队**在管理后台完成内容建模、创作编排、多级审批与排期发布；
- **开发团队**通过 OpenAPI 与双协议 API，把内容消费到 Web、小程序、App 等任意终端；
- **运营团队**借助社交分发、A/B 内容实验与内容日历，放大每一次发布的价值。

「Headless」意味着内容的生产、存储与管理，与前端展示彻底分离：一套内容中台支撑任意数量的展示端，各端可独立演进、按需上线。

## 二、端形态：一套中台，按需选端

### 后端三服务

| 服务 | 定位 | 职责 |
|------|------|------|
| admin-service | 管理后台 BFF | 承载管理后台全部 HTTP API |
| app-service | C 端 BFF | 承载各前台应用消费的对外 API |
| core-service | 核心服务 | 承载核心业务逻辑与数据层，供两个 BFF 内部调用 |

### 管理后台

管理后台基于 **React 19 + Ant Design** 构建，覆盖组织权限、内容生产、社交分发、AI 助手与系统运维的完整管理面。

### C 端前台（四套可选）

| 前台 | 技术栈 | 形态 |
|------|--------|------|
| react | [Next.js](https://nextjs.org/) + shadcn/ui | SSR，支持纯静态导出（nginx 直接托管） |
| vue | [Nuxt](https://nuxt.com/) + shadcn-vue | SSR / SSG |
| taro | [Taro](https://docs.taro.zone/) | 微信小程序 / H5 |
| flutter | [Flutter](https://flutter.dev/) | iOS / Android 原生应用 |

四套前台共享同一份内容中台与 API 契约，**按需选端部署**：做官网就上 React 或 Vue，要做小程序就加 Taro，要出 App 再加 Flutter，互不牵制。

## 三、功能全景

### 组织与权限

| 功能 | 说明 |
|------|------|
| 多租户 | 租户级数据隔离与独立管理 |
| 角色与权限 | 角色化授权，支持字段级权限 |
| OpenAPI AK-SK | 面向开放接口的 AK-SK 密钥鉴权 |
| 租户配额 | 按租户控制资源用量 |
| 登录策略 | 可配置的登录安全策略 |
| MFA TOTP | 基于 TOTP 动态口令的两步验证 |
| 在线会话 | 在线会话查看与管理 |

### 内容能力

| 功能 | 说明 |
|------|------|
| 内容建模 | 以 Components 灵活定义内容结构 |
| 页面搭建 | 14 类区块可视化搭建页面 |
| 版本化 | 内容版本管理，随时回溯 |
| 协同编辑 | 多人协同编辑内容 |
| 发布审批 | 多级发布审批流程，全程留痕 |
| A/B 内容实验 | 同一位置的候选内容对比实验 |
| 内容日历 | 按日历排期内容发布 |
| 草稿预览 | 发布前预览草稿效果 |
| 重定向 | 站点重定向规则管理 |
| 表单收集 | 内置表单，收集线索与反馈 |
| SEO meta 全链路 | seoTitle、og 标签、canonical 全链路覆盖 |
| 内容健康度 | 定期巡检，探测死链 |

### 社交分发

内容可一键分发至 10 个平台：**Bluesky、Mastodon、DEV.to、Telegram、WordPress、微信公众号、Nostr、微博、LinkedIn、博客园**——一次创作，多渠道触达。

### AI 助手

| 功能 | 说明 |
|------|------|
| 对话助手 | 面向运营者的 AI 对话 |
| RAG | 基于检索增强的知识问答 |
| Agent 图编排画布 | 可视化编排 Agent 工作流，支持人工审批节点 |
| MCP 工具面 | 通过 MCP 协议扩展 AI 工具能力 |

### 全文搜索

| 功能 | 说明 |
|------|------|
| 中文分词 | OpenSearch + smartcn 中文分词 |
| 检索体验 | 结果高亮、搜索建议词 |
| 租户级同义词库 | 每个租户维护自己的同义词库 |

### 系统运维

| 功能 | 说明 |
|------|------|
| 备份恢复 | 数据备份与恢复 |
| 监控双页 | 系统监控页面（双页视角） |
| 任务调度 | 定时任务管理与运行日志 |
| 字典管理 | 数据字典统一维护 |

## 四、近期动态（2026 年 10-11 月）

- **五端 API 同源化**：管理后台与四套前台统一改为同源相对路径，经 nginx 前缀转发，弃用独立 API 域名
- **React C 端纯静态导出**：`output: export` 导出纯静态站点，nginx 直接托管，无需常驻 Node 服务
- **构建产物 zip 交付管线**：前后端构建产物统一以 zip 交付
- **发布审批多级化**：审批流升级为多级，并新增 AI Agent 人工审批节点
- **AI 反垃圾评论闸门**：评论入库前的 AI 垃圾内容拦截
- **安全加固**：跨租户写越权（BOLA）问题完成框架级修复

## 五、界面预览

### 管理后台

| 管理后台登录 | 帖子编辑 |
| :---: | :---: |
| ![管理后台登录](/assets/images/cms/admin_login.png) | ![帖子编辑](/assets/images/cms/admin_post_edit.png) |
| **内容数据分析** | **媒体资产库** |
| ![内容数据分析](/assets/images/cms/admin_analysis.png) | ![媒体资产库](/assets/images/cms/admin_media_asset_list.png) |

### React 前台

| React 前台首页 | React 前台帖子详情 |
| :---: | :---: |
| ![React 前台首页](/assets/images/cms/react_app_homepage.png) | ![React 前台帖子详情](/assets/images/cms/react_app_post_detail.png) |
| **React 前台帖子列表** | **标签详情** |
| ![React 前台帖子列表](/assets/images/cms/react_app_post_list.png) | ![React 前台标签详情](/assets/images/cms/react_app_tag_detail.png) |

### Flutter App（iOS / Android）

| Flutter 首页 | Flutter 帖子详情 |
| :---: | :---: |
| ![Flutter App 首页](/assets/images/cms/flutter_app_homepage.png) | ![Flutter App 帖子详情](/assets/images/cms/flutter_app_post_detail.png) |
| **Flutter 内容探索** | **Flutter 个人中心** |
| ![Flutter App 探索](/assets/images/cms/flutter_app_explore.png) | ![Flutter App 个人中心](/assets/images/cms/flutter_app_profile.png) |

### Taro 小程序（微信小程序 / H5）

| Taro 首页 | Taro 帖子列表 |
| :---: | :---: |
| ![Taro 首页](/assets/images/cms/taro_app_homepage.png) | ![Taro 帖子列表](/assets/images/cms/taro_app_post_list.png) |
| **Taro 帖子详情** | **Taro 登录** |
| ![Taro 帖子详情](/assets/images/cms/taro_app_post_detail.png) | ![Taro 登录](/assets/images/cms/taro_app_login.png) |

## 六、技术栈

| 层次 | 技术 |
|------|------|
| 语言 | [Go](https://go.dev/) 1.25+ |
| 微服务框架 | [go-kratos](https://go-kratos.dev/) |
| ORM | [Ent](https://entgo.io/) |
| 关系数据库 | [PostgreSQL](https://www.postgresql.org/)（默认） |
| 缓存 | [Redis](https://redis.io/) |
| 全文检索 | [OpenSearch](https://opensearch.org/) + smartcn 中文分词 |
| 对象存储 | SeaweedFS |
| 服务注册 | [Etcd](https://etcd.io/) |
| 链路追踪 | [Jaeger](https://www.jaegertracing.io/) |

## 七、在线体验

| 入口 | 地址 |
|------|------|
| 管理后台 | [https://admin.cms.gowind.cloud](https://admin.cms.gowind.cloud) |
| 管理后台 API Swagger | [https://api.admin.cms.gowind.cloud/docs/](https://api.admin.cms.gowind.cloud/docs/) |
| C 端 API Swagger | [https://api.cms.gowind.cloud/docs/](https://api.cms.gowind.cloud/docs/) |
| Vue 前台 | [https://vue.cms.gowind.cloud](https://vue.cms.gowind.cloud) |
| React 前台 | [https://react.cms.gowind.cloud](https://react.cms.gowind.cloud) |
| Taro 前台 | [https://taro.cms.gowind.cloud](https://taro.cms.gowind.cloud) |
| Flutter 前台 | [https://flutter.cms.gowind.cloud](https://flutter.cms.gowind.cloud) |

::: tip 体验账号与技术支持
- 管理后台体验账号：`admin` / `admin`
- 商务合作与技术支持微信：`yang_lin_bo`
- 商务合作与技术支持邮箱：<yanglinbo@gmail.com>
:::

## 八、开源许可

GoWind CMS 以 **MIT 协议**开源，可自由用于商业项目。

## 九、相关文档

- [CMS 安装指南](./installation.md)
- [CMS 后端架构总览](./backend-architecture.md)
- [CMS Protobuf API 定义](./backend-api.md)
- [CMS 配置与部署指南](./backend-config-deploy.md)
- [CMS 前端架构](./frontend-architecture.md)
- [GoWind Admin 文档](/admin/intro.md) — 共享技术基座（go-kratos + Ent + 权限体系）

更多循序渐进的教程（内容建模、区块编辑器、Headless API 对接、多站点管理、全文搜索、三服务部署等）见左侧目录「教程」各分栏。
