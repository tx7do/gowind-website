# Adding a Frontend Page Tutorial

This tutorial demonstrates how to add a new page in the UBA admin console, using the already-implemented "funnel analysis page" in the project as a reference, covering the complete chain: API composable → view → route → i18n → ECharts registration.

> Prerequisites: first read [Frontend Architecture](./frontend-architecture.md) and the [Code Generation Pipeline](./tutorial-codegen.md) (TS artifact sync).

---

## 1. Overall Steps

```
1. Add an API composable (wrapping the generated client)
2. Add the page view (views/app/<module>/<page>/index.vue)
3. Add the route (router/routes/modules/app/<module>.ts, picked up automatically)
4. Add i18n (menu.json / page.json)
5. (Optional) Register the ECharts chart type
6. Verify (typecheck / lint)
```

---

## 2. Step 1: Add an API composable

File: `frontend/admin/apps/admin/src/api/composables/xxx.ts`

Three export conventions (see [Frontend Architecture](./frontend-architecture.md) for details):

```ts
import { useQuery, useMutation } from '@tanstack/vue-query';
import { toValue, type MaybeRef } from 'vue';
import { apiClient } from '#/generated/api/admin/service/v1';

// Convention A: reactive read-only (vue-query useQuery)
export function useListXxx(query: MaybeRef<PaginationQuery>) {
  return useQuery({
    queryKey: ['xxx', 'list', toValue(query)],
    queryFn: () => apiClient.xxxService.list(PaginationQuery.toRawParams(toValue(query))),
    staleTime: 60_000,
  });
}

// Convention B: imperative (for VxeGrid proxyConfig.ajax.query)
export function fetchListXxx(params: Record<string, any>) {
  return apiClient.xxxService.list(PaginationQuery.toRawParams(params));
}

// Convention C: mutation (create/update/delete)
export function useCreateXxx() {
  return useMutation({ mutationFn: (data: Xxx) => apiClient.xxxService.create(data) });
}
export function useUpdateXxx() {
  return useMutation({
    mutationFn: (values: Xxx) =>
      apiClient.xxxService.update({ ...values, updateMask: makeUpdateMask(Object.keys(values)) }),
  });
}
export function useDeleteXxx() {
  return useMutation({ mutationFn: (req: DeleteXxxRequest) => apiClient.xxxService.delete(req) });
}
```

Add the barrel in `composables/index.ts`:

```ts
export * from './xxx';
```

> The calls go through the generated `apiClient.xxxService.Method(...)`. **After changing proto, run `make ts` first and manually sync the TS artifacts** (see sections 5 and 6 of the [Code Generation Pipeline](./tutorial-codegen.md)).

---

## 3. Step 2: Add the page view

File: `frontend/admin/apps/admin/src/views/app/<module>/<page>/index.vue`

### List page (CRUD)

```vue
<script setup lang="ts">
import { Page, useVbenVxeGrid } from '@vben/common-ui';
import { useVbenModal } from '@vben/hooks';
// Use useVbenVxeGrid + <Grid> to render the table; proxyConfig.ajax.query calls fetchListXxx
</script>

<template>
  <Page>
    <Grid />
  </Page>
</template>
```

### BI analytics page (charts)

```vue
<script setup lang="ts">
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { AnalysisChartCard } from '@vben/common-ui';
// Use composables such as useFunnel / useEventTrend to fetch data
// useEcharts binds the option to EchartsUI
</script>

<template>
  <AnalysisChartCard title="漏斗分析">
    <EchartsUI ref="chartRef" height="400px" />
  </AnalysisChartCard>
</template>
```

### Form drawer

Use `useVbenDrawer` + `useVbenForm` to render create/edit forms.

> Refer to `views/app/data-analysis/funnel/index.vue` (funnel analysis) and `views/app/system/dict/` (dictionary CRUD).

---

## 4. Step 3: Add the route

File: `frontend/admin/apps/admin/src/router/routes/modules/app/<module>.ts`

```ts
import type { RouteRecordRaw } from 'vue-router';
import { BasicLayout } from '#/layouts/basic';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    path: '/xxx',
    name: 'Xxx',
    meta: { order: 100, icon: 'lucide:tag', title: $t('menu.xxx.title') },
    redirect: '/xxx/list',
    children: [
      {
        path: 'list',
        name: 'XxxList',
        component: () => import('#/views/app/xxx/list/index.vue'),
        meta: { title: $t('menu.xxx.list'), authority: ['sys:platform_admin'] },
      },
    ],
  },
];
export default routes;
```

Key points:

- Parent route uses `component: BasicLayout`; `meta.order` controls the menu position; `meta.icon` uses `lucide:*` strings.
- Child routes are lazily loaded; `meta.authority` controls permissions.
- **Any new `.ts` file under `modules/app/*.ts` is picked up automatically by `import.meta.glob`**, with no manual registration needed.

---

## 5. Step 4: Add i18n

Files: `frontend/admin/apps/admin/src/locales/langs/{zh-CN,en-US}/`

- `menu.json`: menu titles (`menu.<module>.<key>`)
- `page.json`: page copy (field labels, buttons, table column names)

```jsonc
// zh-CN/menu.json
{ "xxx": { "title": "我的模块", "list": "列表" } }

// en-US/menu.json
{ "xxx": { "title": "My Module", "list": "List" } }
```

---

## 6. Step 5: ECharts Chart Types (optional)

`@vben/plugins/echarts` registers `line / bar / pie / radar` by default. **Funnel / heatmap charts require manual additional registration**:

File: `packages/effects/plugins/src/echarts/echarts.ts`

```ts
import { FunnelChart, HeatmapChart } from 'echarts/charts';
import { VisualMapComponent } from 'echarts/components';
echarts.use([FunnelChart, HeatmapChart, VisualMapComponent]);
```

---

## 7. Step 6: Verify

```bash
cd frontend/admin/apps/admin
npx vue-tsc --noEmit --skipLibCheck    # type checking

cd frontend/admin
npx eslint <your changed files> --fix            # lint
```

Then run `pnpm dev` and confirm in the browser that the menu, page, and API calls work correctly.

---

## 8. Common Pitfalls

- **Page does not show**: the route file is not in the right directory (it must be under `modules/app/`), or `meta.order`/`authority` is misconfigured.
- **API returns 404**: proto not changed or TS not synced; `apiClient.xxxService` was not generated — check `make ts` + manual sync.
- **Chart does not render**: forgot to register the funnel/heatmap chart types and components in `echarts.ts`.
- **Update does not take effect**: the mutation did not use `makeUpdateMask` to generate the FieldMask, so the backend ignores fields when updating by mask.

---

## 9. Related Documentation

- [Frontend Architecture](./frontend-architecture.md)
- [Code Generation Pipeline](./tutorial-codegen.md)
- [Adding an External Service](./tutorial-new-service.md)
- [Backend API Contract](./backend-api.md)
