# UBA 前端模块总览

本文档梳理 GoWind UBA 前端各功能模块及其页面组成。

## 一、数据分析模块

### 1.1 事件分析

| 页面 | 路由 | 说明 |
|------|------|------|
| 事件概览 | `/analytics/event/overview` | 事件总数、趋势、TOP 事件 |
| 事件详情 | `/analytics/event/detail` | 单个事件的时序分析、用户分布 |
| 事件对比 | `/analytics/event/compare` | 多事件横向对比 |

### 1.2 漏斗分析

| 页面 | 路由 | 说明 |
|------|------|------|
| 漏斗列表 | `/analytics/funnel/list` | 漏斗配置管理 |
| 漏斗详情 | `/analytics/funnel/detail` | 各步骤转化率、流失分析 |

### 1.3 会话分析

| 页面 | 路由 | 说明 |
|------|------|------|
| 会话列表 | `/analytics/session/list` | 会话记录浏览 |
| 会话详情 | `/analytics/session/detail` | 单次会话的行为序列 |

### 1.4 路径分析

| 页面 | 路由 | 说明 |
|------|------|------|
| 路径图 | `/analytics/path/flow` | 用户行为路径桑基图 |
| 路径详情 | `/analytics/path/detail` | 路径转化分析 |

### 1.5 留存分析

| 页面 | 路由 | 说明 |
|------|------|------|
| 留存矩阵 | `/analytics/retention/matrix` | 留存矩阵热力图 |
| 留存趋势 | `/analytics/retention/trend` | 留存率趋势曲线 |

### 1.6 用户分析

| 页面 | 路由 | 说明 |
|------|------|------|
| 活跃用户 | `/analytics/user/active` | DAU/MAU/WAU 趋势 |
| 用户画像 | `/analytics/user/profile` | 用户行为画像详情 |
| 用户分群 | `/analytics/user/segment` | 自定义分群查询 |

## 二、风控管理模块

### 2.1 风控规则

| 页面 | 路由 | 说明 |
|------|------|------|
| 规则列表 | `/risk/rules/list` | 风控规则 CRUD |
| 规则编辑 | `/risk/rules/edit` | 条件表达式 + 动作配置 |
| 规则版本 | `/risk/rules/version` | 规则版本管理 |

### 2.2 风险事件

| 页面 | 路由 | 说明 |
|------|------|------|
| 事件列表 | `/risk/events/list` | 风险事件浏览、筛选 |
| 事件详情 | `/risk/events/detail` | 事件证据链、处理操作 |
| 事件统计 | `/risk/events/stats` | 按级别/类型/状态统计 |

### 2.3 Webhook

| 页面 | 路由 | 说明 |
|------|------|------|
| Webhook 配置 | `/risk/webhooks/config` | Webhook CRUD |
| 投递日志 | `/risk/webhooks/logs` | 投递记录、状态查看 |

## 三、应用管理模块

| 页面 | 路由 | 说明 |
|------|------|------|
| 应用列表 | `/application/list` | 应用 CRUD（AppID/AppKey/AppSecret） |
| 应用详情 | `/application/detail` | 应用配置、数据统计 |
| 数据验证 | `/application/verify` | SDK 数据验证工具 |

## 四、标签管理模块

| 页面 | 路由 | 说明 |
|------|------|------|
| 标签定义 | `/tag/definition/list` | 标签类型、规则、允许值 |
| 用户标签 | `/tag/user-tag/list` | 用户标签查询、手动打标 |

## 五、系统管理模块

### 5.1 组织管理

| 页面 | 路由 | 说明 |
|------|------|------|
| 用户管理 | `/system/user` | 用户全生命周期管理 |
| 角色管理 | `/system/role` | 角色与权限组 |
| 部门管理 | `/system/org-unit` | 多级部门树 |
| 职位管理 | `/system/position` | 职位列表 |
| 租户管理 | `/system/tenant` | 多租户管理 |

### 5.2 权限管理

| 页面 | 路由 | 说明 |
|------|------|------|
| 权限管理 | `/system/permission` | 权限点 + 菜单节点 |
| 菜单管理 | `/system/menu` | 可视化菜单树 |

### 5.3 系统运维

| 页面 | 路由 | 说明 |
|------|------|------|
| 字典管理 | `/system/dict` | 数据字典 |
| 任务调度 | `/system/task` | 定时任务管理 |
| 登录日志 | `/system/login-log` | 登录记录 |
| 操作日志 | `/system/operation-log` | 操作审计 |
| API 审计 | `/system/api-log` | API 请求日志 |
| 缓存管理 | `/system/cache` | 缓存查询/清除 |

## 六、仪表板

| 组件 | 说明 |
|------|------|
| 今日概览 | 事件数、活跃用户、新增用户、风险事件 |
| 趋势图 | 近 30 天事件趋势曲线 |
| 实时数据 | 实时事件流、实时告警 |
| TOP 排行 | 热门事件、活跃用户、高风险用户 |

## 七、个人中心

| 页面 | 说明 |
|------|------|
| 个人信息 | 编辑资料、修改头像 |
| 安全设置 | 修改密码、MFA 配置 |
| 登录记录 | 个人登录历史 |

## 相关文档

- [UBA 前端架构](./frontend-architecture.md)
- [UBA 后端模块总览](./backend-modules.md)
- [事件分析实战](./tutorial-event-analysis.md)
