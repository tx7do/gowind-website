# 前端架构总览

GoWind Admin 前端提供 **三个版本** 的实现，均对接同一套后端 API，开发者可根据团队技术栈和项目需求选择合适的版本。

## 一、前端版本概览

| 版本 | 目录 | 技术栈 | 本地端口 | 说明 |
|------|------|--------|----------|------|
| Vue3 Vben | `frontend/admin/vue-vben` | Vue3 + TypeScript + Vite + Ant Design Vue + Vben Admin | 5666 | 功能最完整，推荐使用 |
| Vue Element | `frontend/admin/vue-element` | Vue3 + TypeScript + Vite + Element Plus | 3000 | 轻量纯净版 |
| React | `frontend/admin/react` | React19 + TypeScript + Vite + Ant Design V6 | 7000 | React 技术栈版本 |

## 二、Vue3 Vben 版架构详解

Vben 版本基于 [Vben Admin](https://doc.vben.pro) 企业级前端框架构建，采用 Monorepo 架构。

### 1. 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 框架 | Vue 3 | Composition API + `<script setup>` |
| 语言 | TypeScript | 全量类型安全 |
| 构建工具 | Vite + Turbo | 快速热更新 + Monorepo 增量构建 |
| UI 组件库 | Ant Design Vue | 企业级 UI 组件 |
| 状态管理 | Pinia | Vue3 官方推荐状态管理 |
| 路由 | Vue Router | 动态路由 + 权限路由 |
| HTTP 客户端 | Axios | 请求/响应拦截器封装 |
| 代码规范 | ESLint + Prettier + Stylelint | 统一代码风格 |
| 包管理 | pnpm + workspace | Monorepo 工作区管理 |

### 2. 项目结构

```
frontend/admin/vue-vben/
├── apps/                       # 应用目录
│   └── admin/                  # 管理端应用
│       ├── src/
│       │   ├── api/            # API 请求层（两层架构）
│       │   │   ├── client.ts   # ApiClient 单例（ClientTransport 适配器）
│       │   │   ├── index.ts    # 统一导出入口
│       │   │   ├── composables/ # Vue Query hooks 层（面向业务组件）
│       │   │   └── generated/  # Protobuf 自动生成的类型 + ApiClient + Service Client
│       │   ├── views/          # 业务页面
│       │   │   ├── app/        # 应用页面模块
│       │   │   ├── dashboard/  # 仪表盘
│       │   │   ├── message/    # 消息页面
│       │   │   └── profile/    # 个人中心
│       │   ├── router/         # 路由配置
│       │   │   └── routes/modules/  # 动态路由模块
│       │   ├── stores/         # Pinia 状态管理
│       │   ├── locales/        # 国际化
│       │   ├── layouts/        # 布局组件
│       │   ├── adapter/        # 适配器
│       │   ├── transport/      # HTTP 传输层
│       │   ├── constants/      # 常量定义
│       │   ├── plugins/        # 插件
│       │   └── utils/          # 工具函数
│       ├── public/             # 静态资源
│       ├── .env.development    # 开发环境配置
│       └── .env.production     # 生产环境配置
│
├── packages/                   # 通用包（Monorepo 共享）
│   ├── @core/                  # 核心功能包
│   ├── constants/              # 共享常量
│   ├── effects/                # 副作用处理
│   ├── icons/                  # 图标库
│   ├── locales/                # 共享国际化
│   ├── preferences/            # 偏好设置
│   ├── stores/                 # 共享状态管理
│   ├── styles/                 # 共享样式
│   ├── types/                  # 共享类型定义
│   └── utils/                  # 共享工具函数
│
├── internal/                   # 内部工具
├── scripts/                    # 构建脚本
├── turbo.json                  # Turbo 构建配置
└── pnpm-workspace.yaml         # pnpm 工作区配置
```

### 3. Monorepo 架构

项目采用 pnpm workspace + Turbo 的 Monorepo 架构：

- **`apps/admin`**：具体的应用入口，包含业务代码
- **`packages/`**：共享的包，被应用引用
  - `@core`：核心 UI 组件和布局
  - `constants`：共享常量
  - `locales`：国际化文本
  - `stores`：共享状态
  - `types`：TypeScript 类型定义
  - `utils`：工具函数

### 4. 启动与构建

```shell
# 安装依赖
pnpm install

# 启动开发服务
pnpm dev:antd

# 构建生产版本
pnpm run build:antd
```

### 5. 环境配置

| 文件 | 说明 |
|------|------|
| `.env` | 通用环境变量 |
| `.env.development` | 开发环境配置（API 地址等） |
| `.env.production` | 生产环境配置 |

## 三、Vue Element 版架构

Vue Element 版本是一个轻量级的纯净版实现，不依赖 Vben Admin 框架。

### 1. 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3 |
| UI 组件库 | Element Plus |
| 构建工具 | Vite |
| CSS 方案 | UnoCSS |
| 语言 | TypeScript |

### 2. 项目结构

```
frontend/admin/vue-element/
├── src/
│   ├── api/            # API 请求层
│   ├── assets/         # 静态资源
│   ├── components/     # 公共组件
│   ├── composables/    # Vue Composable
│   ├── constants/      # 常量
│   ├── core/           # 核心模块
│   ├── directives/     # Vue 指令
│   ├── layouts/        # 布局组件
│   ├── locales/        # 国际化
│   ├── pages/          # 页面组件
│   ├── plugins/        # 插件
│   ├── router/         # 路由配置
│   ├── stores/         # 状态管理
│   ├── styles/         # 全局样式
│   ├── types/          # 类型定义
│   └── utils/          # 工具函数
├── mock/               # Mock 数据
├── public/             # 静态资源
└── types/              # 全局类型
```

### 3. 启动

```shell
cd frontend/admin/vue-element
pnpm install
pnpm dev
```

## 四、React 版架构

React 版本基于 React 19 构建，不依赖 UMI 框架，采用轻量化方案。

### 1. 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 |
| UI 组件库 | Ant Design V6 + @ant-design/pro-components |
| 路由 | React Router |
| 状态管理 | Zustand |
| 构建工具 | Vite |
| 语言 | TypeScript |

### 2. 项目结构

```
frontend/admin/react/
├── src/
│   ├── api/            # API 请求层
│   ├── components/     # 公共组件
│   ├── config/         # 配置
│   ├── core/           # 核心模块
│   ├── hooks/          # 自定义 Hooks
│   ├── layouts/        # 布局组件
│   ├── locales/        # 国际化
│   ├── pages/          # 页面组件
│   ├── router/         # 路由配置
│   ├── stores/         # Zustand 状态管理
│   ├── styles/         # 全局样式
│   ├── types/          # 类型定义
│   └── utils/          # 工具函数
├── build/              # 构建配置
├── mock/               # Mock 数据
└── public/             # 静态资源
```

### 3. 启动

```shell
cd frontend/admin/react
pnpm install
pnpm dev
```

## 五、前端 API 层设计

三个版本的前端共享类似的 API 层设计思路，均采用 **两层架构** + **Vue Query** 数据获取方案。

### 1. 两层架构总览

```
api/
├── generated/          # 第 1 层：Protobuf 自动生成的 TypeScript 类型 + ApiClient + Service Client
│                        # （由 protoc-gen-typescript-http 生成，不要手动编辑）
├── client.ts           # 适配层：创建 apiClient 单例，将 requestApi 适配为 ClientTransport
├── index.ts            # 统一导出入口
└── composables/        # 第 2 层：Vue Query hooks 层，面向业务组件的最终 API
                         #   use*   = 组件内使用的 Vue Query hook（useQuery / useMutation）
                         #   fetch* = 组件外使用的 Promise 方法（Store、路由守卫等）
                         #   枚举工具 = 各模块的状态/颜色映射函数
```

> **架构演进说明**：旧版本采用三层结构（generated → service → composables），其中 service 层手写 HTTP 请求函数。新版本移除了 service 层，改由 generated 层自动生成的 Service Client 直接对接，composables 层则升级为基于 Vue Query 的 hooks。

### 2. 第 1 层：generated + client.ts

#### generated（自动生成）

由 `protoc-gen-typescript-http` 根据 Protobuf 定义生成，包含：

- **类型定义**：`identityservicev1_User`、`permissionservicev1_Role` 等
- **请求/响应类型**：`identityservicev1_ListUserResponse`、`permissionservicev1_CreateUserRequest` 等
- **ApiClient 类**：统一入口，通过延迟初始化的 getter 暴露所有 Service Client
- **Service Client 工厂**：`createUserServiceClient(transport)` 等

```typescript
// ApiClient 提供的所有 Service Client getter
apiClient.userService              // 用户管理
apiClient.authenticationService    // 认证服务
apiClient.roleService              // 角色管理
apiClient.dictTypeService          // 字典类型
// ... 共 20+ 个 Service Client
```

**命名规则**：`{service}v1_{MessageName}`
- `identityservicev1_` — 用户/身份相关
- `permissionservicev1_` — 权限/角色/菜单相关
- `dictservicev1_` — 字典相关
- `authenticationservicev1_` — 认证相关

#### client.ts（适配层）

创建全局唯一的 `apiClient` 单例，将已有的 `requestApi`（基于 axios 的 `RequestClient`）适配为 `ClientTransport` 接口：

```typescript
// client.ts 核心逻辑
import { createApiClient, type ClientTransport } from '#/api/generated/admin/service/v1';
import { requestApi } from '#/transport/rest';

const transport: ClientTransport = {
  unary(path, method, body, _meta) {
    return requestApi({ body, method, path });
  },
  serverStream(path, _meta) { throw new Error('not supported'); },
  duplexStream(path, _meta) { throw new Error('not supported'); },
};

export const apiClient = createApiClient(transport);
```

这样所有通过 `apiClient` 发出的请求都会经过 `requestApi`，保留 Token 注入、错误拦截、自动刷新等全部已有逻辑。

### 3. 第 2 层：composables（Vue Query hooks）

面向业务组件的最终 API 层，引入 [Vue Query](https://tanstack.com/query)（TanStack Query）提供数据获取、缓存和状态管理能力。每个 composable 文件提供三种导出：

#### `use*` — Vue Query hooks（组件内使用）

```typescript
// Query hooks（读取数据）
const { data, isLoading, refetch } = useListRoles(query);
const { data } = useGetRole({ id: 1 });

// Mutation hooks（写操作）
const { mutateAsync, isPending } = useCreateRole();
const { mutateAsync } = useUpdateRole();
const { mutateAsync } = useDeleteRole();
```

#### `fetch*` — Promise 方法（Store / 路由守卫等外部调用）

```typescript
// 不依赖组件 setup 上下文，内部通过 queryClient.fetchQuery 实现
const roles = await fetchListRoles(params);
```

#### 枚举工具 — 状态映射函数

```typescript
import { userStatusToColor, userStatusToName } from '#/api';

const color = userStatusToColor('NORMAL');  // '#4096FF'
const label = userStatusToName('NORMAL');   // '正常'
```

#### 典型 composable 文件结构

每个 composable 文件直接导入 `apiClient` 并调用对应的 Service Client：

```typescript
// composables/role.ts
import { useMutation, useQuery } from '@tanstack/vue-query';
import { apiClient } from '#/api/client';
import { queryClient } from '#/plugins/vue-query';
import { makeUpdateMask, type PaginationQuery } from '#/transport/rest';

// 组件内使用
export function useListRoles(query: PaginationQuery) {
  return useQuery({
    queryKey: ['listRoles', query],
    queryFn: () => apiClient.roleService.List(query.toRawParams()),
  });
}

// 组件外使用
export async function fetchListRoles(params: PaginationQuery) {
  return queryClient.fetchQuery({
    queryKey: ['listRoles', params],
    queryFn: () => apiClient.roleService.List(params.toRawParams()),
    retry: 0,
  });
}

// 写操作
export function useCreateRole() {
  return useMutation({
    mutationFn: (values) => apiClient.roleService.Create({ data: { ...values } }),
  });
}
```

### 4. 分页查询（PaginationQuery）

所有列表查询统一使用 `PaginationQuery` 类（位于 `transport/rest/pagination.ts`），封装分页参数、搜索条件、排序和字段过滤：

```typescript
import { PaginationQuery } from '#/transport/rest';

const query = new PaginationQuery({
  paging: { page: 1, pageSize: 20 },           // 分页参数
  formValues: { status: 'NORMAL', name: '张' }, // 搜索条件（自动过滤空值）
  orderBy: ['-created_at'],                     // 排序（"-"前缀 = 降序）
  fieldMask: 'id,name,status',                  // 只返回指定字段
});

const { data } = useListUsers(query);
```

### 5. Vue Query 全局配置

全局 QueryClient 配置（`src/plugins/vue-query.ts`）：

| 配置项 | 值 | 说明 |
|---|---|---|
| `staleTime` | `60_000`（60s） | 数据在 60 秒内视为新鲜，不会重新请求 |
| `retry` | `false` | 请求失败不自动重试 |
| `refetchOnWindowFocus` | `false` | 窗口聚焦时不自动刷新 |
| `refetchOnReconnect` | `false` | 网络重连时不自动刷新 |

### 6. 传输层（transport）

前端传输层位于 `src/transport/` 目录，分为两个子模块：

| 目录 | 说明 |
|---|---|
| `transport/rest/` | HTTP REST 传输层，包含 `RequestClient`（axios 封装）、`requestApi`、`PaginationQuery`、预设拦截器等 |
| `transport/sse/` | SSE（Server-Sent Events）传输层，用于服务端推送场景 |

### 7. 代码自动生成

前端 TypeScript 类型由后端 Protobuf 定义自动生成：

```shell
# 生成所有版本的 TypeScript 代码
make ts
```

生成配置：
- `buf.vue-vben.admin.typescript.gen.yaml` - Vben 版
- `buf.vue-element.admin.typescript.gen.yaml` - Element 版
- `buf.react.admin.typescript.gen.yaml` - React 版

## 六、前端路由与权限

### 1. 动态路由

前端路由采用 **动态路由** 模式：
- 基础路由（登录、404 等）在代码中静态定义
- 业务路由根据后端返回的菜单权限动态生成
- 路由守卫负责权限校验和重定向

### 2. 权限控制

前端支持三个层面的权限控制：

| 层面 | 说明 |
|------|------|
| 路由级 | 根据用户角色/权限动态注册路由，无权限的路由不注册 |
| 菜单级 | 根据权限数据过滤菜单显示 |
| 组件级 | 通过权限指令/组件控制按钮等元素的显示隐藏 |

### 3. 认证流程

1. 用户提交登录请求（用户名 + 密码 + 验证码）
2. 后端返回 Access Token 和 Refresh Token
3. 前端将 Token 存储到本地（localStorage 或 Cookie）
4. 后续请求在 Header 中携带 `Authorization: Bearer <token>`
5. Token 过期时自动使用 Refresh Token 刷新
6. 登出时清除本地 Token 并通知后端撤销

## 七、相关文档

- [前端核心功能详解](./frontend-modules.md)
- [后端 API 与 Protobuf 定义](./backend-api.md)
