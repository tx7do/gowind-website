# Frontend Tutorial: Adding a New Business Page

This tutorial uses "Article Management" (Article) as an example to walk you through adding a complete new business page to the GoWind Admin frontend (Vue3 Vben version) from scratch.

## 1. Prerequisites

Make sure the backend "Article Management" module has already been developed (see [Backend Tutorial: Adding a New Business Module](/en/admin/backend-tutorial-new-module.md)) and the TypeScript code has been generated:

```shell
cd backend
make ts
```

The generated TypeScript type definitions are referenced automatically by the frontend.

## 2. Step 1: Create the API Composables Layer

The frontend adopts a **two-layer architecture** (generated + client → composables) with **Vue Query** for data fetching. The generated layer is produced automatically by `make ts` and requires no manual coding. Developers only need to create the Vue Query hooks of the composables layer.

### 2.1 Confirm the generated layer is ready

After running `make ts`, confirm that `src/api/generated/admin/service/v1/` already contains:

- `articleservicev1_*` type definitions (such as `articleservicev1_Article` and `articleservicev1_ListArticleResponse`)
- An `articleService` getter in the ApiClient

### 2.2 Create the Composables File

Create `article.ts` under the `frontend/admin/vue-vben/apps/admin/src/api/composables/` directory:

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
// Article list query (used inside components)
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
// Article list query (used outside components — Store / route guards, etc.)
// ==============================
export async function fetchListArticles(params: PaginationQuery) {
  return queryClient.fetchQuery({
    queryKey: ['listArticles', params],
    queryFn: () => apiClient.articleService.List(params.toRawParams()),
    retry: 0,
  });
}

// ==============================
// Get article details (used inside components)
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
// Create an article (Mutation)
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
// Update an article (updateMask generated automatically)
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
// Delete an article (Mutation)
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

> **Key notes**:
> - `use*` functions return Vue Query reactive state (`data`, `isLoading`, `error`, etc.) for use inside components
> - `fetch*` functions return a Promise, suitable for non-component contexts such as Stores and route guards
> - Update operations generate the `updateMask` automatically via `makeUpdateMask`; you only need to pass the changed fields
> - All requests are issued through the `apiClient` singleton, automatically reusing the existing token injection and error interception logic

### 2.3 Register the Exports

Add the export in `api/composables/index.ts`:

```typescript
export * from './article';
```

## 3. Step 2: Create the Page Components

### 2.1 Create the Directory Structure

Create the `article/` directory under the `frontend/admin/vue-vben/apps/admin/src/views/app/` directory:

```
views/app/article/
├── index.vue          # List page
└── form.vue           # Form page (create/edit)
```

### 2.2 Create the List Page

Create `views/app/article/index.vue`, using the `useListArticles` and `useDeleteArticle` Vue Query hooks:

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

// Search conditions (reactive; PaginationQuery senses changes automatically and re-queries)
const searchParams = reactive({
  keyword: '',
  status: undefined as number | undefined,
  page: 1,
  pageSize: 10,
});

// Build the PaginationQuery (reactive; re-requests automatically when parameters change)
const query = computed(() =>
  new PaginationQuery({
    paging: { page: searchParams.page, pageSize: searchParams.pageSize },
    formValues: { keyword: searchParams.keyword, status: searchParams.status },
  }),
);

// Vue Query manages loading state and caching automatically
const { data, isLoading } = useListArticles(query);

// Table data (automatically reactive)
const dataSource = computed(() => data.value?.items ?? []);
const total = computed(() => data.value?.total ?? 0);

// Table column definitions
const columns = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: '标题', dataIndex: 'title', ellipsis: true },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '作者ID', dataIndex: 'author_id', width: 100 },
  { title: '创建时间', dataIndex: 'created_at', width: 180 },
  { title: '操作', width: 200, key: 'action' },
];

// Search
function handleSearch() {
  searchParams.page = 1;
}

// Reset
function handleReset() {
  searchParams.keyword = '';
  searchParams.status = undefined;
  searchParams.page = 1;
}

// Edit
function handleEdit(id: number) {
  router.push(`/app/article/form?id=${id}`);
}

// Delete
async function handleDelete(id: number) {
  await deleteArticle(id);
  message.success('删除成功');
}

// Create
function handleCreate() {
  router.push('/app/article/form');
}

// Pagination change
function handlePageChange(page: number, pageSize: number) {
  searchParams.page = page;
  searchParams.pageSize = pageSize;
}
</script>

<template>
  <Page title="文章管理">
    <!-- Search bar -->
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

    <!-- Table -->
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

> **Vue Query advantages**: `useListArticles(query)` manages the loading state (`isLoading`), caching, and data refresh automatically. When `query` changes reactively (e.g. pagination or search), Vue Query re-fetches the data automatically — no need to call `fetchList` manually.

### 2.3 Create the Form Page

Create `views/app/article/form.vue`, using the `useGetArticle`, `useCreateArticle`, and `useUpdateArticle` Vue Query hooks:

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

// Fetch the details automatically in edit mode (managed by Vue Query)
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

// Fill the form automatically once the details are loaded
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

// Submit
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

// Cancel
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

> **Key points**:
> - `useGetArticle` combined with `enabled: isEdit` fetches the details only in edit mode
> - `useCreateArticle` and `useUpdateArticle` provide independent `isPending` states
> - The update operation generates the `updateMask` automatically via `useUpdateArticle({ id, values })`; you only need to pass the changed fields

## 4. Step 3: Register Routes

### 3.1 Create the Route Module

Create `article.ts` under the `frontend/admin/vue-vben/apps/admin/src/router/routes/modules/app/` directory:

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

### 3.2 Automatic Import

The Vben Admin routing system automatically scans all `.ts` files under the `router/routes/modules/` directory and registers the routes — no manual import required.

## 5. Step 4: Configure Menu Permissions

### 4.1 Add the Menu in the Backend

1. Log in to the admin management system
2. Go to **Permission Management → Menu Management**
3. Click "New Menu"
4. Fill in the menu information:
   - Menu name: Article Management
   - Menu type: Directory
   - Route path: `/app/article`
   - Component path: leave empty (not needed for the directory type)
   - Icon: `mdi:file-document-outline`
   - Order: 100

5. Click "New Menu" again, as a sub-menu:
   - Menu name: Article List
   - Parent menu: Article Management
   - Menu type: Menu
   - Route path: `index`
   - Component path: `/app/article/index`
   - Permission code: `article:list`

### 4.2 Assign Permissions to a Role

1. Go to **Permission Management → Role Management**
2. Select the role to authorize
3. Click "Set Permissions"
4. Check the "Article Management" related permissions
5. Save

## 6. Step 5: Testing and Verification

### 5.1 Start the Frontend

```shell
cd frontend/admin/vue-vben
pnpm dev:antd
```

Visit <http://localhost:5666>.

### 5.2 Check the Menu

After logging in, the left menu should show "Article Management"; click it to see the article list page.

### 5.3 Functional Testing

- Test the search feature
- Test creating an article
- Test editing an article
- Test deleting an article
- Test pagination

## 8. Common Issues

### Q1: The routes do not take effect?

Check that the route files are named correctly, are located under the `router/routes/modules/` directory, and have unique file names.

### Q2: The menu does not show?

1. Confirm the backend menu is configured correctly
2. Confirm the user role has been assigned the corresponding permissions
3. Clear the browser cache and log in again

### Q3: API requests return 404?

1. Check whether `VITE_GLOB_API_URL` in `.env.development` points to the correct backend address
2. Confirm the backend service is running
3. Check that the API paths match the Protobuf definitions

### Q4: TypeScript type errors?

Make sure `make ts` has been executed to generate the latest TypeScript code, and restart the development server.

## 9. Advanced Optimizations

### 9.1 Add Permission Control

Add permission checks at the button level:

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

### 9.2 Add Data Permissions

Filter the list data according to the user's data permission scope; the backend automatically injects user information into the Context.

## 10. Vue Element Plus Version: Zero-Template ProPage Configuration

The Vue Element Plus version provides a **progressive Pro component library** wrapped around native Element Plus. It does not hide the underlying APIs and supports four levels of development.

### 10.1 Pro Component Library Structure

```
components/Pro/
├── ProForm/          # Dynamically configurable form
├── ProSearch/        # Adaptive search bar
├── ProToolbar/       # Page toolbar
├── ProTable/         # Dual-engine adaptive table (el-table / vxe-table)
├── ProPagination/    # Smart pagination component
├── ProModal/         # Common modal/drawer component
├── ProPage/          # All-in-one page orchestration entry
├── composables/      # Reusable state hooks
└── index.ts          # Unified export entry
```

### 10.2 Level 1: Zero-Template Configuration (Standard CRUD)

With a single `ProPageConfig` configuration object, the search bar, table, modal, and pagination are generated automatically — no template code needed at any point:

```vue
<template>
  <ProPage :config="pageConfig" />
</template>

<script setup lang="ts">
import { ProPage, type ProPageConfig } from "@/components/Pro";
import { fetchListTenants, createTenant, updateTenant, useDeleteTenant } from "@/api/composables";

const { mutateAsync: deleteTenant } = useDeleteTenant();

const pageConfig: ProPageConfig = {
  engine: "element",  // Switch the table engine: vxe / element
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

### 10.3 Four Development Levels

| Level | Approach | Applicable Scenarios |
|------|------|----------|
| Level 1 | `ProPage` zero-template configuration | Standard CRUD pages (90% of scenarios) |
| Level 2 | Composed components | Pages needing partial customization |
| Level 3 | Individual Pro components | Highly customized pages |
| Level 4 | Native Element Plus | Fully free-form coding |

> All Pro components are wrapped around native Element Plus atomic components; props, events, and slots are fully exposed, so you can always fall back to native coding.

### 10.4 Add Internationalization

Add the multi-language translation files under the `locales/` directory.

## 11. Summary

In this tutorial, we completed the full development workflow for a frontend page:

1. **API composables layer**: wrap `use*` / `fetch*` hooks based on Vue Query
2. **Page components**: implement the UI and interactions using Vue Query hooks
3. **Route registration**: configure the page routes
4. **Menu permissions**: configure menus and permissions on the backend

This workflow applies to any new business page. Once you master this pattern, you can quickly extend the frontend features of GoWind Admin.

## 12. Related Documentation

- [Frontend Architecture Overview](/en/admin/frontend-architecture.md)
- [Frontend Core Features in Detail](/en/admin/frontend-modules.md)
- [Backend Tutorial: Adding a New Business Module](/en/admin/backend-tutorial-new-module.md)
