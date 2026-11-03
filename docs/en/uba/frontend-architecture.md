# UBA Frontend Architecture

This document organizes the GoWind UBA admin console frontend's (`frontend/admin/`) engineering structure, API layer conventions, and routing mechanism, helping secondary developers get started with frontend development quickly.

---

## 1. Tech Stack & Project Shape

The admin console is a **pnpm + turbo monorepo** based on **Vben Admin 5.4**, with the application entry in `apps/admin`.

| Dimension | Choice |
|------|------|
| Framework | Vue 3.5 + TypeScript |
| UI component library | Ant Design Vue |
| Scaffold/framework | Vben Admin 5.4 (monorepo, packages/* + apps/*) |
| State management | Pinia 2.2 |
| Data fetching layer | TanStack Vue Query (`@tanstack/vue-query`) |
| Routing | Vue Router |
| Build | Vite |
| API protocol | Connect-RPC (TypeScript client generated from proto) |
| Rich text/editors | Tiptap, Monaco, md-editor-v3, etc. |
| Package management | pnpm (`engines: node >=20.10.0, pnpm >=9.12.0`) |

### Workspace Structure

```
frontend/admin/
├── apps/
│   └── admin/                     # Admin console app (@vben/web-antd)
│       └── src/
│           ├── api/composables/   # API composables (add composables here)
│           ├── generated/api/...  # Generated TS client (actually imported)
│           ├── api/generated/...  # Output location of make ts (needs manual sync)
│           ├── router/routes/modules/app/  # Route modules (new .ts files are picked up automatically)
│           ├── locales/langs/     # i18n
│           └── views/app/         # Page views
├── packages/                      # Vben internal packages (effects/plugins etc.)
│   └── effects/plugins/src/echarts/  # ECharts registration
└── internal/                      # monorepo internal tooling
```

### Path Aliases

- `#/*` → `./src/*`
- `$/*` → `./generated/*` (generated Connect-RPC types)

---

## 2. View Modules (views/app/)

`apps/admin/src/views/app/` contains **12 top-level modules**:

| Module | Sub-modules | Description |
|------|--------|------|
| `data-analysis/` | event-trend / funnel / retention / attribution / distribution / behavior-sequence / behavior-timeline / segmentation / click / interval / lifecycle / churn / new-vs-old / matrix / revenue / whale-tier / ltv / session-analysis / anomaly / path-sankey / level-analysis / server-retention / online-stats / economy / dimension-compare / realtime-screen / session / event-path / profile | **Analytics dashboard suite**: corresponds to the **25 analysis models** of the backend `AnalyticsService` + real-time dashboard + session/path/profile fact table queries |
| `risk/` | event / rule / webhook | Risk control (risk events, risk rules, Webhooks) |
| `tag/` | tags / user-tags / ids | Tag system (tag definitions, user tags, ID mapping) |
| `application/` | application | UBA app management (appId/appSecret) |
| `object/` | object | Behavior object management |
| `system/` | api / dict / event-schema / file / language / login-policy / menu / task | System configuration (dictionaries, menus, files, scheduled tasks, event schemas) |
| `permission/` | permission / role | RBAC permissions and roles |
| `opm/` | org_unit / position / user | Organization and personnel management |
| `tenant/` | tenant | Multi-tenant management |
| `log/` | api / data-access / login / operation / permission audit logs | 5 types of audit logs |
| `internal_message/` | category / message | In-app messages |

> `data-analysis` is the analyst's primary working interface, corresponding to the **25 analysis models** of the backend `AnalyticsService` (grouped by scenario; see [Product Introduction · 25 Analysis Models Matrix](./intro.md)) + real-time dashboard + session/path/profile fact table queries.

---

## 3. API Layer (composables)

API calls are uniformly wrapped in `apps/admin/src/api/composables/`, currently with about **42 composable files**, corresponding one-to-one with backend services (`analytics.ts`, `application.ts`, `user.ts`, `risk-event.ts`, etc.). The exported `index.ts` serves as a barrel.

### Three Export Conventions

**Convention A: read-only analytics queries** (`analytics.ts`)

Each analytics capability exports a pair of `useXxx` (reactive, vue-query `useQuery`) + `fetchXxx` (imperative, for stores/external calls), sharing the queryKey tuple `['analytics', <name>, req]`, with `staleTime: 60_000`:

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

**Convention B: CRUD resources** (`application.ts`, `user.ts`)

A standard set of 5 hooks; reads use `useQuery`, writes use `useMutation`, and updates carry a FieldMask:

```ts
useListApplications(query)   // list (paginated)
fetchListApplications(params) // imperative (for VxeGrid proxyConfig.ajax.query)
useGetApplication(req)       // single record
useCreateApplication()       // create
useUpdateApplication()       // update (makeUpdateMask)
useDeleteApplication()       // delete
```

**Convention C: enum/dictionary helpers**

Resource files often ship display helpers (`xxxToColor` / `xxxToName`), which take dictionary values from the `dict` composable and fall back to hardcoded mappings.

### Generated Client

- `apps/admin/src/api/generated/admin/service/v1/index.ts`: output location of `make ts`.
- `apps/admin/src/generated/api/admin/service/v1/index.ts`: where the composables **actually import** from.

> ⚠️ After generation, the former must be manually synced to the latter (see the "TS artifact sync" section of [Code Generation Pipeline](./tutorial-codegen.md)).

---

## 4. Routing & Menus

Route modules live in `apps/admin/src/router/routes/modules/app/`, with **12 files** (corresponding one-to-one with the view modules). Key mechanisms:

- Parent routes use `component: BasicLayout`; `meta.order` controls menu order; `meta.icon` uses `lucide:*` strings.
- Child routes lazily load views; `meta.authority` (e.g. `['sys:platform_admin']`) controls permissions.
- **Any new `.ts` file under `modules/app/*.ts` is picked up automatically by `import.meta.glob`**, with no manual registration needed.
- Menu titles come from i18n (`menu.<module>.<key>`).

The `data-analysis.ts` example: parent route `/data-analysis` (`BasicLayout`, icon `lucide:chart-bar`), redirects to `/data-analysis/event-trend`, with 9 child routes attached (event trends, funnels, retention, dimension compare, behavior timeline, real-time dashboard, sessions, event paths, profiles).

---

## 5. ECharts Charts

Charts are rendered through Vben's `@vben/plugins/echarts` (`EchartsUI` + `useEcharts`) and the `AnalysisChartCard` from `@vben/common-ui`.

- `line / bar / pie / radar` are registered by default.
- **Funnel / heatmap charts require additional registration in `echarts.use([])` in `packages/effects/plugins/src/echarts/echarts.ts`**:

  ```ts
  import { FunnelChart, HeatmapChart } from 'echarts/charts';
  import { VisualMapComponent } from 'echarts/components';
  echarts.use([FunnelChart, HeatmapChart, VisualMapComponent]);
  ```

---

## 6. i18n

Copy lives in `apps/admin/src/locales/langs/{zh-CN,en-US}/`:

- `menu.json`: menu titles (`menu.<module>.<key>`).
- `page.json`: page copy (field labels, buttons, table column names).

---

## 7. Common Commands

```bash
cd frontend/admin
pnpm install          # install dependencies
pnpm dev              # start the dev server (defaults to dev:antd)
pnpm build            # production build (NODE_OPTIONS=--max-old-space-size=8192)
pnpm typecheck        # vue-tsc type checking
pnpm lint             # eslint
pnpm test:unit        # vitest (dom environment)
```

For the complete steps to add a new frontend page, see the [Adding a Frontend Page tutorial](./tutorial-new-page.md).

---

## 8. Related Documentation

- [System Architecture](./architecture.md)
- [Backend API Contract](./backend-api.md)
- [Adding a Frontend Page](./tutorial-new-page.md)
- [Code Generation Pipeline](./tutorial-codegen.md)
