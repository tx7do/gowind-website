# 快速开始

本页面向开发者，介绍如何在本地把 GoWind Shop 完整跑起来。

源码仓库：<https://github.com/tx7do/go-wind-shop>

## 一、环境准备

| 依赖 | 要求 |
| --- | --- |
| Go | 1.25+ |
| Node.js / pnpm | 构建管理后台与店铺前台 |
| Docker & Docker Compose | 启动中间件与应用服务 |
| MySQL 或 PostgreSQL | 二选一，默认演示采用 PostgreSQL |

## 二、获取代码

```bash
git clone https://github.com/tx7do/go-wind-shop.git
cd go-wind-shop
```

仓库分为三部分：

- `backend/` —— go-kratos 微服务后端（admin-service 管理后台 BFF、app-service 店铺前台 BFF、core-service 核心服务）
- `frontend/admin/` —— 管理后台（Vue3 + Element Plus）
- `frontend/app/` —— 店铺前台（Nuxt 静态站点生成，20 个页面）

## 三、启动服务

### 方式一：全栈一键启动（推荐体验）

使用 `backend/docker-compose.yaml`，中间件与应用服务一次性拉起：

- 中间件：PostgreSQL、Redis、OpenSearch、MinIO（对象存储）、etcd、Jaeger
- 应用：admin-service（:9700）、app-service（:9800）、core-service（内部 gRPC，无对外端口）

### 方式二：仅中间件 + 本地运行应用

使用 `backend/docker-compose.libs.yaml` 只启动中间件，后端服务在 IDE 中运行，便于断点调试与二次开发。

## 四、初始化演示数据

仓库提供演示种子数据（`backend/sql/` 下的演示 SQL），导入后即得一个开箱可逛的演示商城：

- 管理员与演示买家账号
- 100+ 智能家居类目商品（含商品图）
- 演示订单与「模拟支付」渠道，无需真实商户资质即可走通下单支付全流程

具体导入步骤见仓库 `backend/sql/` 目录说明。

## 五、访问入口

服务启动后：

- 管理后台前端（Vue3 + Element Plus）对接 admin-service
- 店铺前台（Nuxt）对接 app-service
- 接口文档：各服务暴露 Swagger，便于查阅 REST 契约

各前端的启动命令见对应目录的 `package.json` scripts 与仓库 README。

## 六、生产部署要点

- **同源反向代理**：参考 `deploy/nginx/` 下的配置模板——店铺前台与管理后台各自站点域内，以路径前缀将 API 请求反代到对应 BFF，静态资源直接托管，避免跨域
- **进程托管**：`scripts/deploy/pm2_service.sh` 提供 PM2 托管脚本
- **支付渠道**：生产环境部署方自带微信支付 / 支付宝商户资质，平台不经手资金；本地演示使用「模拟支付」渠道即可

## 七、下一步

- 体验产品功能：[在线体验](/shop/trial.md)
- 了解能力全景：[功能手册](/shop/features.md)
- 问题反馈与贡献：欢迎在 GitHub 仓库提交 [Issue](https://github.com/tx7do/go-wind-shop/issues) 与 PR

---

- 返回 [GoWind Shop 产品介绍](/shop/intro.md)
