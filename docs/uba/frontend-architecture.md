# UBA 前端架构

本文档梳理 GoWind UBA 管理后台前端（`frontend/admin/`）的工程结构、API 层范式与路由机制，帮助二次开发者快速上手前端开发。

---

## 一、技术栈与工程形态

管理后台是一个基于 **Vben Admin 5.4** 的 **pnpm + turbo monorepo**，应用入口在 `apps/admin`。

| 维度 | 选型 |
|------|------|
| 框架 | Vue 3.5 + TypeScript |
| UI 组件库 | Ant Design Vue |
| 脚手架/框架 | Vben Admin 5.4（monorepo，packages/* + apps/*） |
| 状态管理 | Pinia 2.2 |
| 数据获取层 | TanStack Vue Query（`@tanstack/vue-query`） |
| 路由 | Vue Router |
| 构建 | Vite |
| API 协议 | Connect-RPC（TypeScript 客户端由 proto 生成） |
| 富文本/编辑器 | Tiptap、Monaco、md-editor-v3 等 |
| 包管理 | pnpm（`engines: node >=20.10.0, pnpm >=9.12.0`） |

### 工作区结构

```
frontend/admin/
├── apps/
│   └── admin/                     # 管理后台应用（@vben/web-antd）
│       └── src/
│           ├── api/composables/   # API 组合式函数（加 composable）
│           ├── generated/api/...  # 生成的 TS 客户端（实际导入）
│           ├── api/generated/...  # make ts 输出位置（需手动同步）
│           ├── router/routes/modules/app/  # 路由模块（加 .ts 自动收录）
│           ├── locales/langs/     # i18n
│           └── views/app/         # 页面视图
├── packages/                      # Vben 内部包（effects/plugins 等）
│   └── effects/plugins/src/echarts/  # ECharts 注册
└── internal/                      # monorepo 内部工具
```

### 路径别名

- `#/*` → `./src/*`
- `$/*` → `./generated/*`（生成的 Connect-RPC 类型）

---

## 二、视图模块（views/app/）

`apps/admin/src/views/app/` 下共 **12 个一级模块**：

| 模块 | 子模块 | 说明 |
|------|--------|------|
| `data-analysis/` | event-trend / funnel / retention / dimension-compare / behavior-timeline / realtime-screen / session / event-path / profile | **分析仪表板套件**（核心分析界面） |
| `risk/` | event / rule / webhook | 风控（风险事件、风险规则、Webhook） |
| `tag/` | tags / user-tags / ids | 标签系统（标签定义、用户标签、ID 映射） |
| `application/` | application | UBA 应用管理（appId/appSecret） |
| `object/` | object | 行为对象管理 |
| `system/` | api / dict / event-schema / file / language / login-policy / menu / task | 系统配置（字典、菜单、文件、定时任务、事件 Schema） |
| `permission/` | permission / role | RBAC 权限与角色 |
| `opm/` | org_unit / position / user | 组织与人员管理 |
| `tenant/` | tenant | 多租户管理 |
| `log/` | api / data-access / login / operation / permission 审计日志 | 5 类审计日志 |
| `internal_message/` | category / message | 站内消息 |

> `data-analysis` 是分析师的主要工作界面，对应后端 `AnalyticsService` 的 5 个聚合 + 会话/路径/画像事实表查询。

---

## 三、API 层（composables）

API 调用统一封装在 `apps/admin/src/api/composables/`，目前约 **42 个 composable 文件**，与后端服务一一对应（`analytics.ts`、`application.ts`、`user.ts`、`risk-event.ts` 等）。导出 `index.ts` 作为 barrel。

### 三种导出范式

**范式 A：只读分析查询**（`analytics.ts`）

每个分析能力导出一对 `useXxx`（响应式，vue-query `useQuery`）+ `fetchXxx`（命令式，供 store/外部调用），共享 queryKey 元组 `['analytics', <name>, req]`，`staleTime: 60_000`：

```ts
export function useEventTrend(req: MaybeRef<EventTrendRequest>) {
  return useQuery({
    queryKey: ['analytics', 'event-trend', toValue(req)],
    queryFn: () => apiClient.analyticsService.eventTrend(toValue(req)),
    staleTime: 60_000,
  });
}
export function fetchEventTrend(req: EventTrendRequest) {
  return apiClient.analyticsService.eventTrend(req);
}
```

**范式 B：CRUD 资源**（`application.ts`、`user.ts`）

标准 5 hook 集合，读用 `useQuery`、写用 `useMutation`，更新带 FieldMask：

```ts
useListApplications(query)   // 列表（分页）
fetchListApplications(params) // 命令式（供 VxeGrid proxyConfig.ajax.query 用）
useGetApplication(req)       // 单条
useCreateApplication()       // 创建
useUpdateApplication()       // 更新（makeUpdateMask）
useDeleteApplication()       // 删除
```

**范式 C：枚举/字典辅助**

资源文件常附带展示辅助（`xxxToColor` / `xxxToName`），从 `dict` composable 取字典值并回退到硬编码映射。

### 生成的客户端

- `apps/admin/src/api/generated/admin/service/v1/index.ts`：`make ts` 输出位置。
- `apps/admin/src/generated/api/admin/service/v1/index.ts`：composables **实际导入**的位置。

> ⚠️ 生成后需手动把前者同步到后者（详见 [代码生成管线](./tutorial-codegen.md) 的「TS 产物同步」）。

---

## 四、路由与菜单

路由模块在 `apps/admin/src/router/routes/modules/app/`，共 **12 个文件**（与视图模块一一对应）。关键机制：

- 父级路由 `component: BasicLayout`，`meta.order` 控制菜单顺序，`meta.icon` 用 `lucide:*` 字符串。
- 子路由懒加载视图，`meta.authority`（如 `['sys:platform_admin']`）控制权限。
- **`modules/app/*.ts` 下任何新 `.ts` 文件会被 `import.meta.glob` 自动收录**，无需手动注册。
- 菜单标题来自 i18n（`menu.<module>.<key>`）。

`data-analysis.ts` 示例：父路由 `/data-analysis`（`BasicLayout`，icon `lucide:chart-bar`），重定向到 `/data-analysis/event-trend`，下挂 9 个子路由（事件趋势、漏斗、留存、维度对比、行为时间线、实时大屏、会话、事件路径、画像）。

---

## 五、ECharts 图表

图表通过 Vben 的 `@vben/plugins/echarts`（`EchartsUI` + `useEcharts`）与 `@vben/common-ui` 的 `AnalysisChartCard` 渲染。

- 默认注册了 `line / bar / pie / radar`。
- **漏斗 / 热力图需在 `packages/effects/plugins/src/echarts/echarts.ts` 的 `echarts.use([])` 追加注册**：

  ```ts
  import { FunnelChart, HeatmapChart } from 'echarts/charts';
  import { VisualMapComponent } from 'echarts/components';
  echarts.use([FunnelChart, HeatmapChart, VisualMapComponent]);
  ```

---

## 六、i18n

文案在 `apps/admin/src/locales/langs/{zh-CN,en-US}/`：

- `menu.json`：菜单标题（`menu.<module>.<key>`）。
- `page.json`：页面文案（字段标签、按钮、表格列名）。

---

## 七、常用命令

```bash
cd frontend/admin
pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器（默认 dev:antd）
pnpm build            # 生产构建（NODE_OPTIONS=--max-old-space-size=8192）
pnpm typecheck        # vue-tsc 类型检查
pnpm lint             # eslint
pnpm test:unit        # vitest（dom 环境）
```

新增前端页面的完整步骤见 [新增前端页面教程](./tutorial-new-page.md)。

---

## 八、相关文档

- [系统架构](./architecture.md)
- [后端 API 契约](./backend-api.md)
- [新增前端页面](./tutorial-new-page.md)
- [代码生成管线](./tutorial-codegen.md)
