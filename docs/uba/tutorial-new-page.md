# 新增前端页面教程

本教程演示如何在 UBA 管理后台新增一个页面，以项目内已实现的「漏斗分析页」为参照，覆盖 API composable → 视图 → 路由 → i18n → ECharts 注册的完整链路。

> 前置：先读 [前端架构](./frontend-architecture.md) 与 [代码生成管线](./tutorial-codegen.md)（TS 产物同步）。

---

## 一、整体步骤

```
1. 加 API composable（封装生成的客户端）
2. 加页面视图（views/app/<module>/<page>/index.vue）
3. 加路由（router/routes/modules/app/<module>.ts，自动收录）
4. 加 i18n（menu.json / page.json）
5.（可选）注册 ECharts 图表类型
6. 验证（typecheck / lint）
```

---

## 二、步骤 1：加 API composable

文件：`frontend/admin/apps/admin/src/api/composables/xxx.ts`

三种导出范式（详见 [前端架构](./frontend-architecture.md)）：

```ts
import { useQuery, useMutation } from '@tanstack/vue-query';
import { toValue, type MaybeRef } from 'vue';
import { apiClient } from '#/generated/api/admin/service/v1';

// 范式 A：响应式只读（vue-query useQuery）
export function useListXxx(query: MaybeRef<PaginationQuery>) {
  return useQuery({
    queryKey: ['xxx', 'list', toValue(query)],
    queryFn: () => apiClient.xxxService.list(PaginationQuery.toRawParams(toValue(query))),
    staleTime: 60_000,
  });
}

// 范式 B：命令式（供 VxeGrid proxyConfig.ajax.query 用）
export function fetchListXxx(params: Record<string, any>) {
  return apiClient.xxxService.list(PaginationQuery.toRawParams(params));
}

// 范式 C：mutation（增删改）
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

在 `composables/index.ts` 加 barrel：

```ts
export * from './xxx';
```

> 调用的是生成的 `apiClient.xxxService.Method(...)`。**proto 改完要先 `make ts` 并手动同步 TS 产物**（见 [代码生成管线](./tutorial-codegen.md) 第五、六节）。

---

## 三、步骤 2：加页面视图

文件：`frontend/admin/apps/admin/src/views/app/<module>/<page>/index.vue`

### 列表页（CRUD）

```vue
<script setup lang="ts">
import { Page, useVbenVxeGrid } from '@vben/common-ui';
import { useVbenModal } from '@vben/hooks';
// 用 useVbenVxeGrid + <Grid> 渲染表格，proxyConfig.ajax.query 调 fetchListXxx
</script>

<template>
  <Page>
    <Grid />
  </Page>
</template>
```

### BI 分析页（图表）

```vue
<script setup lang="ts">
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { AnalysisChartCard } from '@vben/common-ui';
// 用 useFunnel / useEventTrend 等 composable 拿数据
// useEcharts 把 option 绑到 EchartsUI
</script>

<template>
  <AnalysisChartCard title="漏斗分析">
    <EchartsUI ref="chartRef" height="400px" />
  </AnalysisChartCard>
</template>
```

### 表单抽屉

用 `useVbenDrawer` + `useVbenForm` 渲染新建/编辑表单。

> 参照 `views/app/data-analysis/funnel/index.vue`（漏斗分析）、`views/app/system/dict/`（字典 CRUD）。

---

## 四、步骤 3：加路由

文件：`frontend/admin/apps/admin/src/router/routes/modules/app/<module>.ts`

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

要点：

- 父级 `component: BasicLayout`，`meta.order` 控制菜单位置，`meta.icon` 用 `lucide:*` 字符串。
- 子路由懒加载，`meta.authority` 控制权限。
- **`modules/app/*.ts` 下任何新 `.ts` 文件会被 `import.meta.glob` 自动收录**，无需手动注册。

---

## 五、步骤 4：加 i18n

文件：`frontend/admin/apps/admin/src/locales/langs/{zh-CN,en-US}/`

- `menu.json`：菜单标题（`menu.<module>.<key>`）
- `page.json`：页面文案（字段标签、按钮、表格列名）

```jsonc
// zh-CN/menu.json
{ "xxx": { "title": "我的模块", "list": "列表" } }

// en-US/menu.json
{ "xxx": { "title": "My Module", "list": "List" } }
```

---

## 六、步骤 5：ECharts 图表类型（可选）

`@vben/plugins/echarts` 默认注册了 `line / bar / pie / radar`。**漏斗 / 热力图需手动追加注册**：

文件：`packages/effects/plugins/src/echarts/echarts.ts`

```ts
import { FunnelChart, HeatmapChart } from 'echarts/charts';
import { VisualMapComponent } from 'echarts/components';
echarts.use([FunnelChart, HeatmapChart, VisualMapComponent]);
```

---

## 七、步骤 6：验证

```bash
cd frontend/admin/apps/admin
npx vue-tsc --noEmit --skipLibCheck    # 类型检查

cd frontend/admin
npx eslint <你改的文件> --fix            # lint
```

然后 `pnpm dev` 在浏览器确认菜单、页面、接口调用正常。

---

## 八、常见坑

- **页面不显示**：路由文件没放对目录（必须在 `modules/app/`），或 `meta.order`/`authority` 配置有误。
- **接口报 404**：proto 没改或 TS 没同步；`apiClient.xxxService` 未生成，检查 `make ts` + 手动同步。
- **图表不渲染**：漏斗/热力图忘了在 `echarts.ts` 注册对应图表类型与组件。
- **更新不生效**：mutation 没用 `makeUpdateMask` 生成 FieldMask，后端按掩码更新会忽略字段。

---

## 九、相关文档

- [前端架构](./frontend-architecture.md)
- [代码生成管线](./tutorial-codegen.md)
- [新增对外服务](./tutorial-new-service.md)
- [后端 API 契约](./backend-api.md)
