# 前端核心功能详解

本文档详细说明 GoWind Admin 前端各业务模块的页面功能、组件设计和 API 对接方式。以 Vue3 Vben 版本为主进行说明，其他版本功能对等。

## 一、业务模块总览

前端业务页面位于 `apps/admin/src/views/` 目录，按功能域划分：

```
views/
├── _core/                    # 核心页面（登录、404 等）
├── app/                      # 业务功能模块
│   ├── opm/                  # 组织与人员管理
│   │   ├── org_unit/         # 组织管理
│   │   ├── position/         # 职位管理
│   │   └── user/             # 用户管理
│   ├── permission/           # 权限管理
│   │   ├── api/              # API 接口管理
│   │   ├── menu/             # 菜单管理
│   │   ├── permission/       # 权限管理
│   │   └── role/             # 角色管理
│   ├── system/               # 系统管理
│   │   ├── dict/             # 字典管理
│   │   ├── file/             # 文件管理
│   │   ├── language/         # 语言管理
│   │   ├── login_policy/     # 登录策略
│   │   └── task/             # 任务调度
│   ├── tenant/               # 租户管理
│   │   └── tenant/           # 租户管理
│   ├── internal_message/     # 站内信
│   │   ├── category/         # 消息分类
│   │   └── message/          # 消息管理
│   └── log/                  # 日志管理
│       ├── api_audit_log/    # API 审计日志
│       ├── data_access_audit_log/  # 数据访问日志
│       ├── login_audit_log/  # 登录日志
│       ├── operation_audit_log/    # 操作日志
│       └── permission_audit_log/   # 权限审计日志
├── dashboard/                # 仪表盘
├── message/                  # 消息通知
└── profile/                  # 个人中心
```

## 二、登录与认证

### 1. 登录页面

登录页面位于 `_core/` 目录，提供：
- 用户名密码输入
- 图形验证码（支持点击刷新）
- 记住我功能
- 多租户选择（启用多租户模式时显示）

### 2. 认证 API

认证相关 API 位于 `api/composables/auth.ts`：

| API | 说明 |
|-----|------|
| `login` | 用户名密码登录 |
| `logout` | 登出 |
| `refreshToken` | 刷新令牌 |
| `generateCaptcha` | 获取验证码 |
| `verifyCaptcha` | 验证验证码 |

### 3. 认证 Composable

`api/composables/auth.ts` 提供认证相关的 Vue Query hooks，封装了：
- 登录/登出/注册（useMutation）
- 验证码获取与验证
- Token 刷新

## 三、仪表盘（Dashboard）

仪表盘页面位于 `views/dashboard/`，提供系统概览信息：
- 用户统计
- 在线用户数
- 待办事项
- 系统公告
- 数据图表展示

仪表盘 API 位于 `api/composables/admin-portal.ts`。

## 四、组织与人员管理（OPM）

### 1. 用户管理

页面位于 `views/app/opm/user/`。

**核心功能**：
- 用户列表查询（支持分页、高级搜索、按部门筛选）
- 创建用户（设置用户名、密码、角色、部门、职位、主管等）
- 编辑用户信息
- 禁用/启用用户
- 重置密码
- 配置多角色
- 配置多部门
- 设置主管
- 一键登录指定用户

**API 文件**：`api/composables/user.ts`

### 2. 组织管理

页面位于 `views/app/opm/org_unit/`。

**核心功能**：
- 树形结构展示组织架构
- 创建/编辑/删除组织节点
- 拖拽排序
- 组织路径展示

**API 文件**：`api/composables/org-unit.ts`

### 3. 职位管理

页面位于 `views/app/opm/position/`。

**核心功能**：
- 职位列表管理
- 创建/编辑/删除职位
- 职位作为用户标签关联

**API 文件**：`api/composables/position.ts`

## 五、权限管理

### 1. 角色管理

页面位于 `views/app/permission/role/`。

**核心功能**：
- 角色列表管理
- 角色分组管理
- 按角色联动查看关联用户
- 设置角色关联的菜单权限
- 设置角色数据权限范围
- 批量添加/移除员工

**API 文件**：`api/composables/role.ts`

### 2. 权限管理

页面位于 `views/app/permission/permission/`。

**核心功能**：
- 权限分组管理
- 权限点 CRUD
- 树形列表展示
- 权限关联 API 接口
- 权限关联菜单

**API 文件**：`api/composables/permission.ts`

### 3. 菜单管理

页面位于 `views/app/permission/menu/`。

**核心功能**：
- 菜单树形管理
- 三种菜单类型：目录、菜单、按钮
- 配置操作权限和按钮权限标识
- 菜单图标选择
- 菜单排序

**API 文件**：`api/composables/menu.ts`

### 4. API 接口管理

页面位于 `views/app/permission/api/`。

**核心功能**：
- API 接口列表管理
- 从后端路由自动同步接口
- 接口关联权限点
- 树形列表展示
- 配置操作日志的请求参数和响应结果

**API 文件**：`api/composables/api.ts`

## 六、系统管理

### 1. 字典管理

页面位于 `views/app/system/dict/`。

**核心功能**：
- 字典大类管理
- 字典条目管理（按大类联动）
- 服务端多列排序
- 数据导入和导出
- 国际化支持

**API 文件**：`api/composables/dict.ts`

### 2. 文件管理

页面位于 `views/app/system/file/`。

**核心功能**：
- 文件列表查询
- 文件上传（支持上传到 OSS 或本地）
- 文件下载
- 复制文件地址
- 删除文件
- 图片大图预览

**API 文件**：`api/composables/file.ts`、`api/composables/file-transfer.ts`

### 3. 任务调度

页面位于 `views/app/system/task/`。

**核心功能**：
- 任务列表管理
- 创建/编辑/删除任务
- 启动/暂停任务
- 立即执行任务
- 查看任务运行日志

**API 文件**：`api/composables/task.ts`

### 4. 登录策略

页面位于 `views/app/system/login_policy/`。

**核心功能**：
- 登录策略列表管理
- 创建/编辑策略规则
- IP 白名单/黑名单配置
- 时间限制配置
- 登录失败锁定策略

**API 文件**：`api/composables/login-policy.ts`

### 5. 语言管理

页面位于 `views/app/system/language/`。

**核心功能**：
- 系统支持的语言管理
- 国际化基础配置

**API 文件**：`api/composables/language.ts`

## 七、租户管理

页面位于 `views/app/tenant/tenant/`。

**核心功能**：
- 租户列表管理
- 创建租户（自动初始化部门、角色和管理员）
- 编辑租户套餐
- 禁用/启用租户
- 一键登录租户管理员

**API 文件**：`api/composables/tenant.ts`

## 八、站内信

### 1. 消息管理

页面位于 `views/app/internal_message/message/`。

**核心功能**：
- 消息列表管理
- 创建/编辑消息
- 发送消息给指定用户
- 查看用户已读状态和已读时间
- 删除消息
- 标为已读
- 全部已读

**API 文件**：`api/composables/internal-message.ts`

### 2. 消息分类

页面位于 `views/app/internal_message/category/`。

**核心功能**：
- 二级自定义消息分类管理
- 消息分类选择

**API 文件**：`api/composables/internal-message.ts`

## 九、日志管理

### 1. 登录日志

页面位于 `views/app/log/login_audit_log/`。

- 记录用户登录成功和失败日志
- 支持 IP 归属地展示
- 时间范围筛选

### 2. API 审计日志

页面位于 `views/app/log/api_audit_log/`。

- 记录 API 请求日志
- 请求路径、参数、响应、耗时等信息展示

### 3. 操作日志

页面位于 `views/app/log/operation_audit_log/`。

- 记录用户操作日志
- 支持正常和异常日志筛选
- 操作详情查看

### 4. 数据访问日志

页面位于 `views/app/log/data_access_audit_log/`。

- 记录数据访问行为

### 5. 权限审计日志

页面位于 `views/app/log/permission_audit_log/`。

- 记录权限变更操作

## 十、个人中心

页面位于 `views/profile/`。

**核心功能**：
- 个人信息展示和修改
- 头像上传
- 查看最后登录信息
- 修改密码

**API 文件**：`api/composables/user-profile.ts`

## 十一、API 层开发规范

### 1. Composables 层（Vue Query hooks）

每个业务模块对应一个 composable 文件，基于 Vue Query 提供 `use*`（组件内 hooks）、`fetch*`（组件外 Promise 方法）和枚举工具三种导出：

```typescript
// api/composables/role.ts
import type {
  permissionservicev1_ListRoleResponse,
  permissionservicev1_Role,
} from '#/api/generated/admin/service/v1';
import { useMutation, useQuery } from '@tanstack/vue-query';
import { apiClient } from '#/api/client';
import { queryClient } from '#/plugins/vue-query';
import { makeUpdateMask, type PaginationQuery } from '#/transport/rest';

// 组件内使用 — Query hook（读取数据）
export function useListRoles(query: PaginationQuery) {
  return useQuery({
    queryKey: ['listRoles', query],
    queryFn: () => apiClient.roleService.List(query.toRawParams()),
  });
}

// 组件外使用 — fetch 方法（Store / 路由守卫等）
export async function fetchListRoles(params: PaginationQuery) {
  return queryClient.fetchQuery({
    queryKey: ['listRoles', params],
    queryFn: () => apiClient.roleService.List(params.toRawParams()),
    retry: 0,
  });
}

// 写操作 — Mutation hook
export function useCreateRole() {
  return useMutation({
    mutationFn: (values) =>
      apiClient.roleService.Create({ data: { ...values } as permissionservicev1_Role }),
  });
}
```

### 2. 核心操作模式

#### 分页查询

所有列表查询统一使用 `PaginationQuery` 封装分页、搜索、排序参数：

```typescript
import { PaginationQuery } from '#/transport/rest';

const query = new PaginationQuery({
  paging: { page: 1, pageSize: 20 },
  formValues: { status: 'NORMAL' },  // 搜索条件（自动过滤空值）
  orderBy: ['-created_at'],           // 排序（"-"前缀 = 降序）
});

const { data, isLoading } = useListUsers(query);
```

#### 更新操作（自动生成 updateMask）

更新时只需传入变化的字段，内部自动生成 `updateMask`：

```typescript
const { mutateAsync } = useUpdateUser();
await mutateAsync({
  id: 1,
  values: { name: '李四', email: 'lisi@example.com' },  // 只传需要更新的字段
});
// 内部自动生成 updateMask: "name,email,id"
```

### 3. 添加新页面的流程

1. 确认 `make ts` 已生成 generated 层的 Service Client
2. 在 `api/composables/` 下创建 Vue Query hooks 文件
3. 在 `api/composables/index.ts` 中添加导出
4. 在 `views/app/` 下创建页面组件
5. 在 `router/routes/modules/` 下注册路由
6. 在后端菜单管理中配置菜单和权限

## 十二、相关文档

- [前端架构总览](./frontend-architecture.md)
- [后端 API 与 Protobuf 定义](./backend-api.md)
