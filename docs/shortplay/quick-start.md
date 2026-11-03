# GoWind ShortPlay 快速开始

本指南带你在本地把 GoWind ShortPlay（风印短剧）完整跑起来：准备依赖中间件、启动三个后端服务、进入管理后台、用 App 体验短视频社区，并了解商业增值包的边界。

## 一、环境准备

| 依赖 | 用途 |
|------|------|
| Go 1.26+ | 后端服务构建与本地运行 |
| Docker & Docker Compose | 运行依赖中间件与应用容器 |
| Node.js + pnpm | 管理后台前端（React 19 + Vite） |
| Flutter 3 | 移动 App（体验 iOS / Android 时需要） |

基础版运行依赖以下中间件，需自行准备：

| 中间件 | 用途 |
|--------|------|
| PostgreSQL / MySQL | 业务数据存储 |
| Redis | 缓存与会话 |
| MinIO | 视频与封面对象存储 |
| etcd | 服务注册与发现 |
| ZLMediaKit | 单独容器运行（直播转码扩展预留） |

## 二、获取代码

```bash
git clone https://github.com/tx7do/go-wind-shortplay.git
cd go-wind-shortplay
```

## 三、启动服务

### 1. 启动依赖中间件

使用 Docker Compose 准备 PostgreSQL / Redis / MinIO / etcd 等依赖服务（ZLMediaKit 以单独容器运行）：

```bash
# 在仓库的 compose 编排目录中启动依赖
docker compose up -d
```

### 2. 启动三个应用服务

仓库提供 Docker Compose 编排，一条命令即可拉起 admin BFF / app BFF / core 三个应用服务：

```bash
docker compose up -d
```

服务端口一览：

| 服务 | 端口 | 说明 |
|------|------|------|
| Admin BFF | :7600 | 管理后台 HTTP API |
| App BFF | :7700 | 前台 HTTP API（App / H5） |
| Core | gRPC :7900 | 核心业务服务（内部调用） |

::: tip
默认管理员账号为 `admin / admin`，由 Core 服务首次启动时自动播种。生产环境部署后请立即修改默认密码。
:::

### 3. 启动管理后台前端

```bash
cd frontend/admin
pnpm install
pnpm dev
```

开发模式默认运行在 `http://localhost:16800`。

## 四、后台管理体验

1. 浏览器打开 `http://localhost:16800`，使用 `admin / admin` 登录
2. **数据看板**：查看核心指标、视频 TOP10 与近 7 日趋势
3. **视频管理**：体验草稿 → 审核 → 发布 / 驳回 / 下架状态机，尝试批量审核与定时发布
4. **举报工单 / 评论 / 弹幕 / 私信监管**：体验举报闭环处置与监管只读
5. **系统配置**：调整上传限制、人工审核开关、注册开关、敏感词库、弹幕/私信开关与公告位
6. **用户与权限**：查看角色、菜单、接口、部门权限分组

## 五、App 体验

使用 Flutter 工具链运行 App 工程（iOS / Android）：

```bash
flutter pub get
flutter run
```

建议按以下路径体验完整闭环：

1. 以 `appuser` 登录，进入上下滑沉浸 Feed（三路召回 + 已看去重 + 断点续播）
2. 拍摄/上传一段视频，进入草稿箱 → 提交审核 → 等待后台发布
3. 在他人视频下体验点赞收藏、楼中楼评论、弹幕与 1:1 私信（SSE 实时）
4. 打开「我的」页查看创作者数据（获赞/粉丝统计与近 7/14/30 日趋势）
5. 在「设置」中切换中/英/日语言，开启青少年模式（时长提醒）

## 六、目录与服务导览

| 位置 | 说明 |
|------|------|
| `docs/API.md` | 接口文档（配合 OpenAPI 使用） |
| `docs/ROADMAP.md` | 产品路线图 |
| Admin BFF（:7600） | 管理后台 HTTP API 服务 |
| App BFF（:7700） | 前台 HTTP API 服务 |
| Core（gRPC :7900） | 核心业务逻辑与数据层 |
| 管理后台前端（React 19 + AntD Pro） | 运营 / 审核后台 |
| Flutter App（iOS / Android） | 移动端社区 |
| H5 分享落地页 | 分享海报二维码落地 |

> 接口采用 Protobuf 契约优先 + OpenAPI 的开发模式，二开时可从 `docs/API.md` 入手了解契约。

## 七、商业增值包边界

开源基础版（MIT）可独立运行，以下能力不在开源版内，归入商业增值包：

| 能力 | 开源基础版 | 商业增值包 |
|------|:---------:|:---------:|
| 视频上传 / 状态机 / Feed / 互动社区 / 运营后台 | ✅ | — |
| 多码率转码集群 | ❌ | ✅ |
| AI 推荐 | ❌ | ✅ |
| 内容安全审核 | ❌ | ✅ |
| SaaS 多租户 | ❌ | ✅ |
| 直播与付费 | ❌ | ✅（ZLMediaKit 已预留扩展位） |

::: tip
增值能力与开源版的边界在 API 契约层面已划定，增值包按契约接入，不影响基于开源版的二开代码。如需商业增值包，请联系微信 `yang_lin_bo` 或邮箱 <yanglinbo@gmail.com>。
:::

更多产品能力与架构说明，请返回 [GoWind ShortPlay 产品介绍](./intro.md)。
