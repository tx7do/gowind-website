# GoWind Admin 产品介绍

GoWind Admin（风行）是一套**开箱即用的企业级前后端一体管理脚手架**：Go 语言后端 + 三选一前端，基于 MIT 协议开源。组织权限、通知、日志、AI、BI、打印模板等企业级后台高频能力均已内建为可直接启用的模块，帮助团队跳过从零搭建管理后台的漫长过程，把精力集中在真正的业务开发上。

## 一、前端三选一，不是三合一

理解 GoWind Admin 的关键口径只有一句话：**前端三选一，不是三合一**。

Vue3 Vben（Ant Design Vue）、Vue3 Element Plus、React19 Antd 是**同一套后端的三个并列实现**，而不是"一套代码同时兼容三个框架"。三套前端对接同一个后端服务，接口协议、权限模型、菜单数据完全一致：

| 实现 | 技术组合 | 适合团队 |
|------|---------|---------|
| React 版 | React 19 + Ant Design V6 + ProComponents | React 技术栈团队 |
| Vue Element 版 | Vue3 + Element Plus + vxe-table | Element Plus 生态团队 |
| Vue Vben 版 | Vue3 + Vben Admin 5.x（Ant Design Vue） | Vben 生态团队 |

- 每个团队 / 项目**只取其中一套**集成即可，不需要三套都维护
- 仓库内提供裁剪指南 `docs/adopt-one-frontend.md`，说明如何安全移除另外两套前端及其依赖

::: tip
不确定选哪套？三套实现均可在官方演示站在线体验（见下方"快速体验"），界面布局与功能对齐，按团队技术栈偏好选择即可。
:::

## 二、功能全景

GoWind Admin 的内建模块按域分组如下：

| 分组 | 功能模块 |
|------|---------|
| **组织与权限** | 用户管理、租户管理、套餐配额、角色权限（数据范围五档 + 字段级权限）、权限分组、组织架构、职位管理（Excel 导入）、菜单管理（三端同步） |
| **系统功能** | 接口同步、字典管理、任务调度、文件 OSS、登录策略、MFA TOTP、通知渠道（39 个扩展渠道 + 短信）、通知规则、投递台账、服务监控、在线用户、脚本系统（Lua + JS）、参数配置、机器凭证 AK/SK、语言管理、打印模板（单据设计器 + 服务端 PDF）、BI 仪表盘（设计器 + 大屏） |
| **消息与日志** | 消息分类、站内信、六类日志、Redis 缓存监控 |
| **个人中心** | 登录后面向个人的基础功能入口 |

::: tip 列表导出
各列表页统一支持 CSV / XLSX 聚合导出，默认上限 1 万行；审计日志走服务端流式导出，可突破该上限。
:::

## 三、界面预览

以下截图来自官方演示环境，可直观感受整体界面风格。

**登录页 / 控制台工作台**

| 登录页 | 控制台工作台 |
| --- | --- |
| ![GoWind Admin 登录页](/assets/images/admin/admin_login_page.png) | ![GoWind Admin 控制台工作台](/assets/images/admin/admin_dashboard.png) |

**组织与权限**

| 用户管理 | 角色管理 |
| --- | --- |
| ![用户管理列表](/assets/images/admin/admin_user_list.png) | ![角色管理列表](/assets/images/admin/admin_role_list.png) |

**系统功能 / 接口文档**

| 菜单管理 | 站内信 |
| --- | --- |
| ![菜单管理列表](/assets/images/admin/admin_menu_list.png) | ![站内信列表](/assets/images/admin/admin_internal_message_list.png) |

| Swagger 接口文档 |
| --- |
| ![Swagger 接口文档](/assets/images/admin/api_swagger_ui.png) |

## 四、版本亮点

项目保持约每周一个版本的迭代节奏，从 v1.0.0（09-24）到 v1.5.0（10-29），持续快速演进。完整清单见[版本发布记录](./release-notes.md)。

- **v1.0.0**：脚本系统（Lua + JS）、设计语言规范、在线用户会话管理
- **v1.1.0**：AI 模块全栈（SSE 对话 + 配额）、知识库 RAG（pgvector）、智能问数、AI 内容生成、全局语义搜索
- **v1.2.0**：企业 OIDC SSO（Keycloak 实测）、通知域 P3 收官、审计日志流式导出、套餐配额硬执行、租户白标、AI Function Call
- **v1.3.0**：工作台聚合页三端同构
- **v1.4.0**：AI Agent 编排全栈（图 DSL 五种节点 + 可视化画布 + 试运行 SSE）、通知渠道扩展至 39 渠道、阿里云/腾讯云短信、手机号找回密码
- **v1.5.0**：BI 仪表盘全栈（拖拽画布 / 跨图联动 / 下钻 / 9 主题）、打印模板模块（可视化拖拽设计 / 行打印 + 批量打印 / 服务端 PDF chromedp / 内置 A4、A5 + 工牌种子模板）
- **Unreleased**：对象存储 MinIO → SeaweedFS（社区版停止维护，零代码改动迁移）、后端单测第二轮大补（约 200 个测试 + 修复 8 处生产缺陷）

## 五、技术栈

### 1. 后端

```mermaid
graph LR
    subgraph 前端（三选一）
        R["React 19 + Antd"]
        E["Vue3 + Element Plus"]
        V["Vue3 + Vben Admin"]
    end
    subgraph 后端（Go）
        HTTP["HTTP :7788"]
        SSE["SSE :7789"]
    end
    subgraph 存储
        DB[("MySQL / PostgreSQL")]
        RD[("Redis")]
        OSS[("SeaweedFS")]
    end
    R --> HTTP
    E --> HTTP
    V --> HTTP
    HTTP --> DB
    HTTP --> RD
    HTTP --> OSS
```

| 维度 | 核心技术 |
|------|---------|
| 语言与框架 | Go 1.26+ · go-kratos v2 |
| ORM | Ent（默认）或 GORM |
| 数据库 | MySQL / PostgreSQL |
| 缓存 | Redis |
| 对象存储 | SeaweedFS |
| 认证与授权 | JWT RS256 + Casbin / OPA |
| 推送与异步 | SSE + Asynq |
| 脚本引擎 | go-scripts（Lua + JavaScript） |

### 2. 前端（三选一）

| 实现 | 核心技术 |
|------|---------|
| React 版 | React 19 · Ant Design V6 · ProComponents |
| Vue Element 版 | Vue3 · Element Plus · vxe-table |
| Vue Vben 版 | Vue3 · Vben Admin 5.x（Ant Design Vue） |

三套前端均基于 **Vite + TypeScript + Tailwind** 构建，工程规范一致。

### 3. 部署

- **Docker 两模式**：`full_deploy` 一键完整部署（应用 + 中间件全部容器化）；`libs_only` 仅启动中间件，适合本地开发调试
- **PM2**：宿主机进程托管部署
- **Swagger UI**：在线接口文档
- **服务端口**：后端 HTTP `:7788`、SSE `:7789`

## 六、快速体验

无需本地部署，直接访问三端演示站体验完整功能：

| 演示端 | 地址 |
|--------|------|
| React 版 | <https://react.admin.gowind.cloud> |
| Vue Element 版 | <https://ele.admin.gowind.cloud> |
| Vue Vben 版 | <https://vben.admin.gowind.cloud> |
| Swagger 接口文档 | <https://api.demo.admin.gowind.cloud/docs/> |

::: tip 演示账号
账号 `admin` / 密码 `Abcd@1234`
:::

## 七、开源与联系

GoWind Admin 基于 MIT 协议开源，可自由用于商业项目。源码仓库三平台镜像（`tx7do/go-wind-admin`）：

- GitHub：<https://github.com/tx7do/go-wind-admin>
- Gitee：<https://gitee.com/tx7do/go-wind-admin>
- AtomGit：<https://atomgit.com/tx7do/go-wind-admin>

交流与支持：微信 `yang_lin_bo` ｜ 邮箱 <yanglinbo@gmail.com>。

## 八、相关文档

- [安装指南](./installation.md)
- [版本发布记录](./release-notes.md)
- [后端架构设计](./backend-architecture.md)
- [前端架构设计](./frontend-architecture.md)
- [后端功能模块](./backend-modules.md)
- [前端功能模块](./frontend-modules.md)
