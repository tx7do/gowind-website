# 前端新增业务页面实战教程

本教程以"文章管理"（Article）为例，手把手演示如何在 GoWind Admin 前端（Vue3 Vben 版本）从零开始新增一个完整的业务页面。

## 一、前置条件

确保后端已完成"文章管理"模块的开发（参考 [后端新增业务模块实战教程](./backend-tutorial-new-module.md)），并且已生成 TypeScript 代码：

```shell
cd backend
make ts
```

生成的代码位于 `api/gen/go/` 目录，前端会自动引用这些类型定义。

## 二、步骤 1：创建 API Service 层

### 2.1 创建 Service 文件

在 `frontend/admin/vue-vben/apps/admin/src/api/service/` 目录下创建 `article.ts`：

```typescript
import { requestClient } from '#/api/request';
import type {
  CreateArticleRequest,
  UpdateArticleRequest,
  GetArticleRequest,
  DeleteArticleRequest,
  ListArticleRequest,
  Article,
  ListArticleResponse,
} from '@vben/api/generated/article/service/v1/article';

/**
 * 创建文章
 */
export function createArticle(data: CreateArticleRequest) {
  return requestClient.post<Article>('/admin/v1/article', data);
}

/**
 * 更新文章
 */
export function updateArticle(id: number, data: UpdateArticleRequest) {
  return requestClient.put<Article>(`/admin/v1/article/${id}`, data);
}

/**
 * 删除文章
 */
export function deleteArticle(id: number) {
  return requestClient.delete(`/admin/v1/article/${id}`);
}

/**
 * 获取文章详情
 */
export function getArticle(id: number) {
  return requestClient.get<Article>(`/admin/v1/article/${id}`);
}

/**
 * 文章列表查询
 */
export function listArticle(params?: ListArticleRequest) {
  return requestClient.get<ListArticleResponse>('/admin/v1/article', { params });
}
```

### 2.2 导出 API

在 `api/service/index.ts` 中添加导出：

```typescript
export * from './article';
```

## 三、步骤 2：创建 Composable 层

### 3.1 创建 Composable 文件

在 `frontend/admin/vue-vben/apps/admin/src/api/composables/` 目录下创建 `article.ts`：

```typescript
import { ref } from 'vue';
import { message } from 'ant-design-vue';
import * as articleApi from '../service/article';
import type { Article, ListArticleRequest } from '@vben/api/generated/article/service/v1/article';

/**
 * 文章列表 Composable
 */
export function useArticleList() {
  const loading = ref(false);
  const articleList = ref<Article[]>([]);
  const total = ref(0);

  async function fetchList(params?: ListArticleRequest) {
    loading.value = true;
    try {
      const res = await articleApi.listArticle({
        page: params?.page || 1,
        page_size: params?.page_size || 10,
        keyword: params?.keyword,
        status: params?.status,
      });
      articleList.value = res.items || [];
      total.value = res.total || 0;
    } catch (error) {
      message.error('获取文章列表失败');
      console.error(error);
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    articleList,
    total,
    fetchList,
  };
}

/**
 * 文章详情 Composable
 */
export function useArticleDetail() {
  const loading = ref(false);
  const article = ref<Article | null>(null);

  async function fetchDetail(id: number) {
    loading.value = true;
    try {
      const res = await articleApi.getArticle(id);
      article.value = res;
    } catch (error) {
      message.error('获取文章详情失败');
      console.error(error);
    } finally {
      loading.value = false;
    }
  }

  async function saveArticle(data: any) {
    loading.value = true;
    try {
      if (data.id) {
        await articleApi.updateArticle(data.id, { id: data.id, data });
        message.success('更新成功');
      } else {
        await articleApi.createArticle({ data });
        message.success('创建成功');
      }
    } catch (error) {
      message.error('保存失败');
      console.error(error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function removeArticle(id: number) {
    try {
      await articleApi.deleteArticle(id);
      message.success('删除成功');
    } catch (error) {
      message.error('删除失败');
      console.error(error);
      throw error;
    }
  }

  return {
    loading,
    article,
    fetchDetail,
    saveArticle,
    removeArticle,
  };
}
```

### 3.2 导出 Composable

在 `api/composables/index.ts` 中添加导出：

```typescript
export * from './article';
```

## 四、步骤 3：创建页面组件

### 4.1 创建目录结构

在 `frontend/admin/vue-vben/apps/admin/src/views/app/` 目录下创建 `article/` 目录：

```
views/app/article/
├── index.vue          # 列表页
└── form.vue           # 表单页（创建/编辑）
```

### 4.2 创建列表页

创建 `views/app/article/index.vue`：

```vue
<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { Button, Table, Space, Tag, Input, Select } from 'ant-design-vue';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { useRouter } from 'vue-router';
import { useArticleList } from '#/api/composables/article';
import type { Article } from '@vben/api/generated/article/service/v1/article';

const router = useRouter();
const { loading, articleList, total, fetchList } = useArticleList();

// 搜索条件
const searchParams = ref({
  keyword: '',
  status: undefined as number | undefined,
  page: 1,
  page_size: 10,
});

// 表格列定义
const columns = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: '标题', dataIndex: 'title', ellipsis: true },
  { 
    title: '状态', 
    dataIndex: 'status',
    width: 100,
    customRender: ({ record }: { record: Article }) => {
      const statusMap: Record<number, { text: string; color: string }> = {
        0: { text: '草稿', color: 'default' },
        1: { text: '已发布', color: 'success' },
        2: { text: '已下架', color: 'error' },
      };
      const status = statusMap[record.status] || { text: '未知', color: 'default' };
      return <Tag color={status.color}>{status.text}</Tag>;
    },
  },
  { title: '作者ID', dataIndex: 'author_id', width: 100 },
  { title: '创建时间', dataIndex: 'created_at', width: 180 },
  {
    title: '操作',
    width: 200,
    customRender: ({ record }: { record: Article }) => (
      <Space>
        <Button type="link" size="small" onClick={() => handleEdit(record.id)}>
          <EditOutlined /> 编辑
        </Button>
        <Button type="link" danger size="small" onClick={() => handleDelete(record.id)}>
          <DeleteOutlined /> 删除
        </Button>
      </Space>
    ),
  },
];

// 加载数据
async function loadData() {
  await fetchList(searchParams.value);
}

// 搜索
function handleSearch() {
  searchParams.value.page = 1;
  loadData();
}

// 重置
function handleReset() {
  searchParams.value = {
    keyword: '',
    status: undefined,
    page: 1,
    page_size: 10,
  };
  loadData();
}

// 编辑
function handleEdit(id: number) {
  router.push(`/app/article/form?id=${id}`);
}

// 删除
async function handleDelete(id: number) {
  // TODO: 实现删除逻辑
}

// 新建
function handleCreate() {
  router.push('/app/article/form');
}

// 分页变化
function handlePageChange(page: number, pageSize: number) {
  searchParams.value.page = page;
  searchParams.value.page_size = pageSize;
  loadData();
}

onMounted(() => {
  loadData();
});
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
      :data-source="articleList"
      :loading="loading"
      :pagination="{
        current: searchParams.page,
        pageSize: searchParams.page_size,
        total: total,
        showSizeChanger: true,
      }"
      @change="handlePageChange"
    />
  </Page>
</template>
```

### 4.3 创建表单页

创建 `views/app/article/form.vue`：

```vue
<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { Form, Input, Select, Button, message } from 'ant-design-vue';
import { useRouter, useRoute } from 'vue-router';
import { useArticleDetail } from '#/api/composables/article';

const router = useRouter();
const route = useRoute();
const { loading, article, fetchDetail, saveArticle } = useArticleDetail();

const formRef = ref();
const formData = ref({
  id: undefined as number | undefined,
  title: '',
  content: '',
  author_id: 1, // TODO: 从当前用户获取
  status: 0,
});

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
};

// 加载详情
async function loadDetail() {
  const id = Number(route.query.id);
  if (id) {
    await fetchDetail(id);
    if (article.value) {
      formData.value = {
        id: article.value.id,
        title: article.value.title,
        content: article.value.content || '',
        author_id: article.value.author_id,
        status: article.value.status,
      };
    }
  }
}

// 提交
async function handleSubmit() {
  try {
    await formRef.value.validate();
    await saveArticle(formData.value);
    router.back();
  } catch (error) {
    console.error(error);
  }
}

// 取消
function handleCancel() {
  router.back();
}

onMounted(() => {
  loadDetail();
});
</script>

<template>
  <Page :title="formData.id ? '编辑文章' : '新建文章'">
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
        <Space>
          <Button type="primary" :loading="loading" @click="handleSubmit">
            提交
          </Button>
          <Button @click="handleCancel">取消</Button>
        </Space>
      </Form.Item>
    </Form>
  </Page>
</template>
```

## 五、步骤 4：注册路由

### 5.1 创建路由模块

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

### 5.2 自动导入

Vben Admin 的路由系统会自动扫描 `router/routes/modules/` 目录下的所有 `.ts` 文件并注册路由，无需手动导入。

## 六、步骤 5：配置菜单权限

### 6.1 在后端添加菜单

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

### 6.2 分配权限给角色

1. 进入 **权限管理 → 角色管理**
2. 选择需要授权的角色
3. 点击"设置权限"
4. 勾选"文章管理"相关权限
5. 保存

## 七、步骤 6：测试验证

### 7.1 启动前端

```shell
cd frontend/admin/vue-vben
pnpm dev:antd
```

访问 <http://localhost:5666>。

### 7.2 检查菜单

登录后，左侧菜单应显示"文章管理"，点击进入可以看到文章列表页面。

### 7.3 功能测试

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

### 9.3 添加国际化

在 `locales/` 目录下添加多语言翻译文件。

## 十、总结

通过本教程，我们完成了前端页面的完整开发流程：

1. **API 层**：封装 HTTP 请求
2. **Composable 层**：提供响应式状态管理
3. **页面组件**：实现 UI 和交互
4. **路由注册**：配置页面路由
5. **菜单权限**：后端配置菜单和权限

这套流程适用于任何新增的业务页面，掌握了这个模式，就可以快速扩展 GoWind Admin 的前端功能。

## 十一、相关文档

- [前端架构总览](./frontend-architecture.md)
- [前端核心功能详解](./frontend-modules.md)
- [后端新增业务模块实战教程](./backend-tutorial-new-module.md)
