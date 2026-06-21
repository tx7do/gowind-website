# 前端新增业务页面实战教程

本教程以"文章管理"（Article）为例，手把手演示如何在 GoWind Admin 前端（Vue3 Vben 版本）从零开始新增一个完整的业务页面。

## 一、前置条件

确保后端已完成"文章管理"模块的开发（参考 [后端新增业务模块实战教程](./backend-tutorial-new-module.md)），并且已生成 TypeScript 代码：

```shell
cd backend
make ts
```

生成的 TypeScript 类型定义会被前端自动引用。

## 二、步骤 1：创建 API Composables 层

前端采用 **两层架构**（generated + client → composables）+ **Vue Query** 数据获取方案。generated 层由 `make ts` 自动生成，无需手动编写。开发者只需创建 composables 层的 Vue Query hooks。

### 2.1 确认 generated 层已就绪

执行 `make ts` 后，确认 `src/api/generated/admin/service/v1/` 中已包含：

- `articleservicev1_*` 类型定义（如 `articleservicev1_Article`、`articleservicev1_ListArticleResponse`）
- ApiClient 中已有 `articleService` getter

### 2.2 创建 Composables 文件

在 `frontend/admin/vue-vben/apps/admin/src/api/composables/` 目录下创建 `article.ts`：

```typescript
import type {
  articleservicev1_Article,
  articleservicev1_ListArticleResponse,
} from '#/api/generated/admin/service/v1';
import {
  useMutation,
  type UseMutationOptions,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/vue-query';
import { apiClient } from '#/api/client';
import { queryClient } from '#/plugins/vue-query';
import { makeUpdateMask, type PaginationQuery } from '#/transport/rest';

// ==============================
// 文章列表查询（组件内使用）
// ==============================
export function useListArticles(
  query: PaginationQuery,
  options?: UseQueryOptions<articleservicev1_ListArticleResponse, Error>,
) {
  return useQuery({
    queryKey: ['listArticles', query],
    queryFn: () => apiClient.articleService.List(query.toRawParams()),
    ...options,
  });
}

// ==============================
// 文章列表查询（组件外使用 — Store / 路由守卫等）
// ==============================
export async function fetchListArticles(params: PaginationQuery) {
  return queryClient.fetchQuery({
    queryKey: ['listArticles', params],
    queryFn: () => apiClient.articleService.List(params.toRawParams()),
    retry: 0,
  });
}

// ==============================
// 获取文章详情（组件内使用）
// ==============================
export function useGetArticle(
  req: { id: number },
  options?: UseQueryOptions<articleservicev1_Article, Error>,
) {
  return useQuery({
    queryKey: ['getArticle', req],
    queryFn: () => apiClient.articleService.Get(req),
    ...options,
  });
}

// ==============================
// 创建文章（Mutation）
// ==============================
export function useCreateArticle(
  options?: UseMutationOptions<object, Error, Record<string, any>>,
) {
  return useMutation({
    mutationFn: (values) =>
      apiClient.articleService.Create({ data: { ...values } as articleservicev1_Article }),
    ...options,
  });
}

// ==============================
// 更新文章（自动生成 updateMask）
// ==============================
export function useUpdateArticle(
  options?: UseMutationOptions<
    object,
    Error,
    { id: number; values: Record<string, any> }
  >,
) {
  return useMutation({
    mutationFn: ({ id, values }) =>
      apiClient.articleService.Update({
        id,
        data: { ...values } as any,
        updateMask: makeUpdateMask(Object.keys(values ?? {})),
      }),
    ...options,
  });
}

// ==============================
// 删除文章（Mutation）
// ==============================
export function useDeleteArticle(
  options?: UseMutationOptions<object, Error, number>,
) {
  return useMutation({
    mutationFn: (id) => apiClient.articleService.Delete({ id }),
    ...options,
  });
}
```

> **关键说明**：
> - `use*` 函数返回 Vue Query 的响应式状态（`data`、`isLoading`、`error` 等），组件内使用
> - `fetch*` 函数返回 Promise，适合在 Store、路由守卫等非组件上下文中使用
> - 更新操作通过 `makeUpdateMask` 自动生成 `updateMask`，只需传入变化的字段
> - 所有请求通过 `apiClient` 单例发出，自动复用已有的 Token 注入、错误拦截等逻辑

### 2.3 注册导出

在 `api/composables/index.ts` 中添加导出：

```typescript
export * from './article';
```

## 三、步骤 2：创建页面组件

### 2.1 创建目录结构

在 `frontend/admin/vue-vben/apps/admin/src/views/app/` 目录下创建 `article/` 目录：

```
views/app/article/
├── index.vue          # 列表页
└── form.vue           # 表单页（创建/编辑）
```

### 2.2 创建列表页

创建 `views/app/article/index.vue`，使用 `useListArticles` 和 `useDeleteArticle` Vue Query hooks：

```vue
<script lang="ts" setup>
import { computed, reactive } from 'vue';
import { Page } from '@vben/common-ui';
import { Button, Table, message, Modal } from 'ant-design-vue';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { useRouter } from 'vue-router';
import {
  useListArticles,
  useDeleteArticle,
} from '#/api';
import { PaginationQuery } from '#/transport/rest';

const router = useRouter();
const { mutateAsync: deleteArticle } = useDeleteArticle();

// 搜索条件（响应式，PaginationQuery 会自动感知变化并重新查询）
const searchParams = reactive({
  keyword: '',
  status: undefined as number | undefined,
  page: 1,
  pageSize: 10,
});

// 构建 PaginationQuery（响应式，参数变化时自动重新请求）
const query = computed(() =>
  new PaginationQuery({
    paging: { page: searchParams.page, pageSize: searchParams.pageSize },
    formValues: { keyword: searchParams.keyword, status: searchParams.status },
  }),
);

// Vue Query 自动管理加载状态和缓存
const { data, isLoading } = useListArticles(query);

// 表格数据（自动响应式）
const dataSource = computed(() => data.value?.items ?? []);
const total = computed(() => data.value?.total ?? 0);

// 表格列定义
const columns = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: '标题', dataIndex: 'title', ellipsis: true },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '作者ID', dataIndex: 'author_id', width: 100 },
  { title: '创建时间', dataIndex: 'created_at', width: 180 },
  { title: '操作', width: 200, key: 'action' },
];

// 搜索
function handleSearch() {
  searchParams.page = 1;
}

// 重置
function handleReset() {
  searchParams.keyword = '';
  searchParams.status = undefined;
  searchParams.page = 1;
}

// 编辑
function handleEdit(id: number) {
  router.push(`/app/article/form?id=${id}`);
}

// 删除
async function handleDelete(id: number) {
  await deleteArticle(id);
  message.success('删除成功');
}

// 新建
function handleCreate() {
  router.push('/app/article/form');
}

// 分页变化
function handlePageChange(page: number, pageSize: number) {
  searchParams.page = page;
  searchParams.pageSize = pageSize;
}
</script>

<template>
  <Page title="文章管理">
    <!-- 搜索栏 -->
    <div class="mb-4 flex gap-2">
      <Input
        v-model:value="searchParams.keyword"
        placeholder="搜索标题"
        style="width: 200px"
        @press-enter="handleSearch"
      />
      <Select
        v-model:value="searchParams.status"
        placeholder="选择状态"
        style="width: 120px"
        allow-clear
      >
        <Select.Option :value="0">草稿</Select.Option>
        <Select.Option :value="1">已发布</Select.Option>
        <Select.Option :value="2">已下架</Select.Option>
      </Select>
      <Button type="primary" @click="handleSearch">搜索</Button>
      <Button @click="handleReset">重置</Button>
      <Button type="primary" @click="handleCreate">
        <PlusOutlined /> 新建
      </Button>
    </div>

    <!-- 表格 -->
    <Table
      :columns="columns"
      :data-source="dataSource"
      :loading="isLoading"
      :pagination="{
        current: searchParams.page,
        pageSize: searchParams.pageSize,
        total: total,
        showSizeChanger: true,
      }"
      @change="handlePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <Button type="link" size="small" @click="handleEdit(record.id)">
            <EditOutlined /> 编辑
          </Button>
          <Button type="link" danger size="small" @click="handleDelete(record.id)">
            <DeleteOutlined /> 删除
          </Button>
        </template>
      </template>
    </Table>
  </Page>
</template>
```

> **Vue Query 优势**：`useListArticles(query)` 会自动管理加载状态（`isLoading`）、缓存和数据刷新。当 `query` 响应式变化时（如翻页、搜索），Vue Query 会自动重新请求数据，无需手动调用 `fetchList`。

### 2.3 创建表单页

创建 `views/app/article/form.vue`，使用 `useGetArticle`、`useCreateArticle`、`useUpdateArticle` Vue Query hooks：

```vue
<script lang="ts" setup>
import { computed, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { Form, Input, Select, Button, message } from 'ant-design-vue';
import { useRouter, useRoute } from 'vue-router';
import {
  useGetArticle,
  useCreateArticle,
  useUpdateArticle,
} from '#/api';

const router = useRouter();
const route = useRoute();

const articleId = computed(() => Number(route.query.id) || 0);
const isEdit = computed(() => articleId.value > 0);

// 编辑模式时自动获取详情（Vue Query 自动管理）
const { data: article } = useGetArticle(
  { id: articleId.value },
  { enabled: isEdit.value },
);

const { mutateAsync: createArticle, isPending: isCreating } = useCreateArticle();
const { mutateAsync: updateArticle, isPending: isUpdating } = useUpdateArticle();

const isSubmitting = computed(() => isCreating || isUpdating);

const formRef = ref();
const formData = ref({
  title: '',
  content: '',
  author_id: 1,
  status: 0,
});

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
};

// 详情加载后自动填充表单
watch(article, (val) => {
  if (val) {
    formData.value = {
      title: val.title,
      content: val.content || '',
      author_id: val.author_id,
      status: val.status,
    };
  }
}, { immediate: true });

// 提交
async function handleSubmit() {
  try {
    await formRef.value.validate();
    if (isEdit.value) {
      await updateArticle({ id: articleId.value, values: formData.value });
      message.success('更新成功');
    } else {
      await createArticle(formData.value);
      message.success('创建成功');
    }
    router.back();
  } catch (error) {
    console.error(error);
  }
}

// 取消
function handleCancel() {
  router.back();
}
</script>

<template>
  <Page :title="isEdit ? '编辑文章' : '新建文章'">
    <Form
      ref="formRef"
      :model="formData"
      :rules="rules"
      :label-col="{ span: 4 }"
      :wrapper-col="{ span: 16 }"
    >
      <Form.Item label="标题" name="title">
        <Input v-model:value="formData.title" placeholder="请输入标题" />
      </Form.Item>

      <Form.Item label="内容" name="content">
        <Input.TextArea
          v-model:value="formData.content"
          placeholder="请输入内容"
          :rows="10"
        />
      </Form.Item>

      <Form.Item label="状态" name="status">
        <Select v-model:value="formData.status">
          <Select.Option :value="0">草稿</Select.Option>
          <Select.Option :value="1">已发布</Select.Option>
          <Select.Option :value="2">已下架</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item :wrapper-col="{ offset: 4 }">
        <Button type="primary" :loading="isSubmitting" @click="handleSubmit">
          提交
        </Button>
        <Button @click="handleCancel">取消</Button>
      </Form.Item>
    </Form>
  </Page>
</template>
```

> **要点**：
> - `useGetArticle` 配合 `enabled: isEdit` 仅在编辑模式时获取详情
> - `useCreateArticle` 和 `useUpdateArticle` 提供独立的 `isPending` 状态
> - 更新操作通过 `useUpdateArticle({ id, values })` 自动生成 `updateMask`，只需传入变化的字段

## 四、步骤 3：注册路由

### 3.1 创建路由模块

在 `frontend/admin/vue-vben/apps/admin/src/router/routes/modules/app/` 目录下创建 `article.ts`：

```typescript
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/app/article',
    name: 'AppArticle',
    meta: {
      title: '文章管理',
      icon: 'mdi:file-document-outline',
      order: 100,
    },
    children: [
      {
        path: 'index',
        name: 'AppArticleList',
        component: () => import('#/views/app/article/index.vue'),
        meta: {
          title: '文章列表',
          affixTab: false,
        },
      },
      {
        path: 'form',
        name: 'AppArticleForm',
        component: () => import('#/views/app/article/form.vue'),
        meta: {
          title: '文章表单',
          hideInMenu: true,
          activeMenu: '/app/article/index',
        },
      },
    ],
  },
];

export default routes;
```

### 3.2 自动导入

Vben Admin 的路由系统会自动扫描 `router/routes/modules/` 目录下的所有 `.ts` 文件并注册路由，无需手动导入。

## 五、步骤 4：配置菜单权限

### 4.1 在后端添加菜单

1. 登录后台管理系统
2. 进入 **权限管理 → 菜单管理**
3. 点击"新建菜单"
4. 填写菜单信息：
   - 菜单名称：文章管理
   - 菜单类型：目录
   - 路由路径：`/app/article`
   - 组件路径：留空（目录类型不需要）
   - 图标：`mdi:file-document-outline`
   - 排序：100

5. 再次点击"新建菜单"，作为子菜单：
   - 菜单名称：文章列表
   - 父级菜单：文章管理
   - 菜单类型：菜单
   - 路由路径：`index`
   - 组件路径：`/app/article/index`
   - 权限标识：`article:list`

### 4.2 分配权限给角色

1. 进入 **权限管理 → 角色管理**
2. 选择需要授权的角色
3. 点击"设置权限"
4. 勾选"文章管理"相关权限
5. 保存

## 六、步骤 5：测试验证

### 5.1 启动前端

```shell
cd frontend/admin/vue-vben
pnpm dev:antd
```

访问 <http://localhost:5666>。

### 5.2 检查菜单

登录后，左侧菜单应显示"文章管理"，点击进入可以看到文章列表页面。

### 5.3 功能测试

- 测试搜索功能
- 测试新建文章
- 测试编辑文章
- 测试删除文章
- 测试分页

## 八、常见问题

### Q1: 路由不生效？

检查路由文件命名是否正确，确保位于 `router/routes/modules/` 目录下，且文件名唯一。

### Q2: 菜单不显示？

1. 确认后端菜单已正确配置
2. 确认用户角色已分配对应权限
3. 清除浏览器缓存后重新登录

### Q3: API 请求 404？

1. 检查 `.env.development` 中的 `VITE_GLOB_API_URL` 是否指向正确的后端地址
2. 确认后端服务已启动
3. 检查接口路径是否与 Protobuf 定义一致

### Q4: TypeScript 类型报错？

确保已执行 `make ts` 生成最新的 TypeScript 代码，并重启开发服务器。

## 九、进阶优化

### 9.1 添加权限控制

在按钮级别添加权限校验：

```vue
<script setup>
import { useAccess } from '@vben/access';

const { hasAccessByCodes } = useAccess();
</script>

<template>
  <Button 
    v-if="hasAccessByCodes(['article:create'])"
    type="primary" 
    @click="handleCreate"
  >
    新建
  </Button>
</template>
```

### 9.2 添加数据权限

根据用户的数据权限范围过滤列表数据，后端会在 Context 中自动注入用户信息。

## 十、Vue Element Plus 版本：ProPage 零模板配置

Vue Element Plus 版本提供了一套**渐进式 Pro 组件库**，基于原生 Element Plus 封装，不隐藏底层 API，支持四级开发层级。

### 10.1 Pro 组件库结构

```
components/Pro/
├── ProForm/          # 动态配置化表单
├── ProSearch/        # 自适应搜索栏
├── ProToolbar/       # 页面工具栏
├── ProTable/         # 双引擎自适应表格 (el-table / vxe-table)
├── ProPagination/    # 智能分页组件
├── ProModal/         # 弹窗/抽屉通用组件
├── ProPage/          # 一站式页面编排入口
├── composables/      # 可复用状态 hooks
└── index.ts          # 统一导出入口
```

### 10.2 Level 1：零模板配置（标准 CRUD）

通过一份 `ProPageConfig` 配置对象，自动生成搜索、表格、弹窗、分页，全程无需编写模板代码：

```vue
<template>
  <ProPage :config="pageConfig" />
</template>

<script setup lang="ts">
import { ProPage, type ProPageConfig } from "@/components/Pro";
import { fetchListTenants, createTenant, updateTenant, useDeleteTenant } from "@/api/composables";

const { mutateAsync: deleteTenant } = useDeleteTenant();

const pageConfig: ProPageConfig = {
  engine: "element",  // 切换表格引擎：vxe / element
  search: {
    grid: true,
    fields: [
      { type: "input", label: "租户名称", field: "name", attrs: { clearable: true } },
      { type: "select", label: "状态", field: "status", options: [{ label: "启用", value: 1 }, { label: "禁用", value: 0 }] },
    ]
  },
  table: {
    listAction: async (query) => {
      const { page, pageSize, ...params } = query;
      const res = await fetchListTenants({ page, pageSize, ...params });
      return { items: res.items || [], total: res.total || 0 };
    },
    deleteAction: async (ids) => await deleteTenant({ id: ids as number }),
    toolbar: ["add", "delete"],
    defaultToolbar: ["refresh", "filter"],
    columns: [
      { type: "selection", label: "", width: 50 },
      { type: "index", label: "序号", width: 60 },
      { prop: "name", label: "租户名称", minWidth: 140 },
      { prop: "status", label: "状态", width: 100, cellType: "tag", labelMap: { 1: "启用", 0: "禁用" } },
      { prop: "createdAt", label: "创建时间", minWidth: 180, cellType: "date", dateFormat: "YYYY-MM-DD HH:mm:ss" },
      { prop: "action", label: "操作", fixed: "right", width: 180, cellType: "tool", buttons: [{ name: "edit" }, { name: "delete", attrs: { type: "danger" } }] },
    ]
  },
  modal: {
    component: "drawer",
    drawer: { title: "租户维护", size: "520px" },
    fields: [
      { type: "input", label: "租户名称", field: "name", rules: [{ required: true, message: "请输入租户名称" }] },
      { type: "switch", label: "启用状态", field: "status" },
    ],
    submitAction: async (data, mode) => {
      if (mode === "add") return await createTenant({ data });
      return await updateTenant({ data });
    },
  },
};
</script>
```

### 10.3 四级开发层级

| 层级 | 方式 | 适用场景 |
|------|------|----------|
| Level 1 | `ProPage` 零模板配置 | 标准 CRUD 页面（90% 场景） |
| Level 2 | 组合式组件 | 需自定义部分区域 |
| Level 3 | 单个 Pro 组件 | 高度定制页面 |
| Level 4 | 原生 Element Plus | 完全自由编码 |

> 所有 Pro 组件均基于原生 Element Plus 原子组件封装，Props、事件、插槽完全开放，随时可回归原生编码。

### 10.4 添加国际化

在 `locales/` 目录下添加多语言翻译文件。

## 十一、总结

通过本教程，我们完成了前端页面的完整开发流程：

1. **API Composables 层**：基于 Vue Query 封装 `use*` / `fetch*` hooks
2. **页面组件**：使用 Vue Query hooks 实现 UI 和交互
3. **路由注册**：配置页面路由
4. **菜单权限**：后端配置菜单和权限

这套流程适用于任何新增的业务页面，掌握了这个模式，就可以快速扩展 GoWind Admin 的前端功能。

## 十二、相关文档

- [前端架构总览](./frontend-architecture.md)
- [前端核心功能详解](./frontend-modules.md)
- [后端新增业务模块实战教程](./backend-tutorial-new-module.md)
