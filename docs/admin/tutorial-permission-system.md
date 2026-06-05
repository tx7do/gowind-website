# 权限系统深度解析教程

权限系统是 GoWind Admin 的核心能力之一，支持 Casbin、OPA、Zanzibar 三种授权引擎，提供细粒度的访问控制。本教程深入讲解权限模型、配置方法和实战场景。

## 一、权限模型概览

### 1.1 三种授权引擎对比

| 特性 | Casbin | OPA (Open Policy Agent) | Zanzibar |
|------|--------|-------------------------|----------|
| **类型** | ACL/RBAC/ABAC | 策略引擎（Rego 语言） | 关系型授权 |
| **复杂度** | ⭐⭐ 简单 | ⭐⭐⭐⭐ 复杂 | ⭐⭐⭐ 中等 |
| **性能** | 高（内存计算） | 中（需编译策略） | 高（图数据库） |
| **学习曲线** | 低 | 高 | 中 |
| **适用场景** | 传统 RBAC | 复杂动态策略 | 社交网络、协作平台 |
| **后端实现** | `pkg/authorizer/casbin` | `pkg/authorizer/opa` | `pkg/authorizer/zanzibar` |

### 1.2 权限维度

GoWind Admin 的权限体系包含三个维度：

| 维度 | 说明 | 示例 |
|------|------|------|
| **菜单权限** | 控制用户能看到哪些菜单 | "文章管理"菜单对普通员工隐藏 |
| **接口权限** | 控制用户能调用哪些 API | 只有管理员能删除用户 |
| **数据权限** | 控制用户能访问哪些数据范围 | 销售经理只能看本部门数据 |

## 二、RBAC 模型详解

### 2.1 核心概念

```
用户 (User) → 角色 (Role) → 权限 (Permission) → 资源 (Resource)
```

- **用户**：系统的使用者
- **角色**：权限的集合（如"超级管理员"、"编辑"、"访客"）
- **权限**：对资源的操作许可（如"article:create"、"user:delete"）
- **资源**：被保护的对象（如菜单、API 接口、数据行）

### 2.2 数据库表结构

```sql
-- 用户表
users (id, username, ...)

-- 角色表
roles (id, name, code, ...)

-- 权限表
permissions (id, name, code, resource_type, resource_id, ...)

-- 用户-角色关联
user_roles (user_id, role_id)

-- 角色-权限关联
role_permissions (role_id, permission_id)

-- 菜单表
menus (id, name, path, component, permission_code, ...)
```

### 2.3 权限代码规范

权限代码采用 `资源:操作` 的命名规范：

| 权限代码 | 说明 |
|----------|------|
| `article:list` | 查看文章列表 |
| `article:create` | 创建文章 |
| `article:update` | 更新文章 |
| `article:delete` | 删除文章 |
| `user:view` | 查看用户信息 |
| `user:edit` | 编辑用户 |
| `system:config` | 系统配置 |

## 三、Casbin 引擎实战

Casbin 是一个国产开源访问控制库，支持 ACL/RBAC/ABAC 等模型，被 Intel、IBM、腾讯云、VMware 等公司使用。其核心由三个概念组成：

- **请求（Request）**：由 `(subject, object, action)` 三元组组成，如 `(bob, /users, GET)`
- **模型（Model）**：判定规则，定义了请求如何与策略匹配
- **策略（Policy）**：用户与角色、资源、行为的映射关系

### 3.1 配置 Casbin

在 `auth.yaml` 中启用 Casbin：

```yaml
authz:
  type: "casbin"
  
  casbin:
    model: |
      [request_definition]
      r = sub, obj, act
      
      [policy_definition]
      p = sub, obj, act
      
      [role_definition]
      g = _, _
      
      [policy_effect]
      e = some(where (p.eft == allow))
      
      [matchers]
      m = g(r.sub, p.sub) && keyMatch2(r.obj, p.obj) && regexMatch(r.act, p.act)
```

### 3.2 策略定义

Casbin 策略存储在数据库中（`casbin_rule` 表）：

```
p, admin, /admin/v1/article/*, (GET|POST|PUT|DELETE)
p, editor, /admin/v1/article/*, (GET|POST|PUT)
p, viewer, /admin/v1/article/*, GET

g, alice, admin
g, bob, editor
g, charlie, viewer
```

**解释**：
- `p` 行定义权限规则：主体、资源、操作
- `g` 行定义角色继承：用户属于哪个角色

### 3.3 代码中使用

```go
import "github.com/casbin/casbin/v2"

// 检查权限
func CheckPermission(enforcer *casbin.Enforcer, user string, resource string, action string) bool {
    allowed, err := enforcer.Enforce(user, resource, action)
    if err != nil {
        log.Errorf("check permission failed: %v", err)
        return false
    }
    return allowed
}

// 使用示例
if !CheckPermission(enforcer, "alice", "/admin/v1/article/123", "DELETE") {
    return errors.New("permission denied")
}
```

### 3.4 动态加载策略

当权限变更时，重新加载策略：

```go
// 添加策略
enforcer.AddPolicy("editor", "/admin/v1/article/*", "DELETE")

// 删除策略
enforcer.RemovePolicy("viewer", "/admin/v1/article/*", "POST")

// 重新加载所有策略
enforcer.LoadPolicy()
```

## 四、OPA 引擎实战

### 4.1 配置 OPA

在 `auth.yaml` 中启用 OPA：

```yaml
authz:
  type: "opa"
  
  opa:
    policy_path: "./policies"
    query: "data.authz.allow"
```

### 4.2 Rego 策略语言

创建策略文件 `policies/authz.rego`：

```rego
package authz

# 默认拒绝
default allow = false

# 管理员拥有所有权限
allow {
    input.user.roles[_] == "admin"
}

# 编辑可以创建和更新文章
allow {
    input.user.roles[_] == "editor"
    input.resource.type == "article"
    input.action in ["create", "update"]
}

# 访客只能查看
allow {
    input.user.roles[_] == "viewer"
    input.resource.type == "article"
    input.action == "view"
}

# 数据权限：用户只能查看自己的文章
allow {
    input.user.roles[_] == "author"
    input.resource.type == "article"
    input.action == "view"
    input.resource.author_id == input.user.id
}
```

### 4.3 请求上下文

OPA 接收的输入数据结构：

```json
{
  "user": {
    "id": 123,
    "username": "alice",
    "roles": ["editor"]
  },
  "resource": {
    "type": "article",
    "id": 456,
    "author_id": 123
  },
  "action": "update"
}
```

### 4.4 代码中使用

```go
import "github.com/open-policy-agent/opa/rego"

// 创建查询
query, err := rego.New(
    rego.Query("data.authz.allow"),
    rego.Input(input),
    rego.Load([]string{"./policies"}, nil),
).PrepareForEval(ctx)

// 执行评估
results, err := query.Eval(ctx)
if err != nil {
    return false, err
}

// 检查结果
allowed := len(results) > 0 && len(results[0].Expressions) > 0 && 
           results[0].Expressions[0].Value == true
```

## 五、Zanzibar 引擎实战

### 5.1 配置 Zanzibar

在 `auth.yaml` 中启用 Zanzibar（以 Keto 为例）：

```yaml
authz:
  type: "zanzibar"
  
  zanzibar:
    type: "keto"
    
    keto:
      write_url: "http://keto:4466"
      read_url: "http://keto:4466"
      use_grpc: true
```

### 5.2 关系元组

Zanzibar 基于关系元组（Relationship Tuples）：

```
(user:Alice, is_member_of, group:Admins)
(group:Admins, can_access, resource:Dashboard)
(article:123, owned_by, user:Bob)
```

### 5.3 Keto 配置

创建 Keto 命名空间配置 `namespaces.yaml`：

```yaml
namespaces:
  - name: user
    relations:
      member: {}
  
  - name: article
    relations:
      owner:
        types:
          - this
      viewer:
        types:
          - this
          - computedUserset:
              relation: owner
  
  - name: organization
    relations:
      member:
        types:
          - this
      admin:
        types:
          - this
```

### 5.4 代码中使用

```go
import "github.com/ory/keto-client-go"

// 检查权限
func CheckAccess(ketoClient *keto.Client, subject string, relation string, object string) bool {
    resp, err := ketoClient.Check(context.Background(), &keto.CheckRequest{
        Namespace: "article",
        Object: object,
        Relation: relation,
        Subject: &keto.Subject{
            Id: subject,
        },
    })
    
    if err != nil {
        log.Errorf("check access failed: %v", err)
        return false
    }
    
    return resp.Allowed
}

// 使用示例
if !CheckAccess(ketoClient, "Alice", "viewer", "article:123") {
    return errors.New("access denied")
}
```

## 六、数据权限实现

### 6.1 数据权限范围

GoWind Admin 支持五种数据权限范围：

| 范围 | 常量 | 说明 |
|------|------|------|
| 仅本人 | `SELF` | 只能查看自己创建的数据 |
| 本部门 | `UNIT_ONLY` | 只能查看本部门的数据 |
| 本部门及下级 | `UNIT_AND_CHILD` | 查看本部门及所有下级部门的数据 |
| 指定部门 | `SELECTED_UNITS` | 查看指定部门的数据 |
| 全部 | `ALL` | 查看所有数据 |

### 6.2 实现原理

数据权限通过 Ent ORM 的 Viewer 机制实现：

```go
// 创建用户级 Viewer
viewer := entgo.NewUserViewerContext(ctx, userID, dataScope)

// 在查询时自动应用过滤
articles, err := client.Article.Query().
    Where(article.HasAuthorWith(user.ID(userID))).
    All(viewer)
```

### 6.3 角色配置数据权限

在后台管理系统中：

1. 进入 **权限管理 → 角色管理**
2. 选择角色，点击"设置数据权限"
3. 选择数据范围：
   - 如果选择"指定部门"，需要勾选具体部门
4. 保存

### 6.4 代码中获取数据权限

```go
// 从 Context 获取当前用户的数据权限范围
dataScope := auth.GetDataScopeFromContext(ctx)

switch dataScope {
case identityV1.DataScope_SELF:
    query = query.Where(article.AuthorID(userID))
    
case identityV1.DataScope_UNIT_ONLY:
    query = query.Where(article.HasAuthorWith(
        user.HasOrgUnitsWith(orgunit.ID(orgUnitID)),
    ))
    
case identityV1.DataScope_ALL:
    // 不过滤
    
// ...
}
```

## 七、前端权限控制

### 7.1 路由级权限

根据用户权限动态注册路由：

```typescript
// router/access.ts
import { useAccessStore } from '@vben/stores';

export function generateAccessRoutes(menus: Menu[]) {
  const routes: RouteRecordRaw[] = [];
  
  menus.forEach(menu => {
    if (menu.component) {
      routes.push({
        path: menu.path,
        component: () => import(`@/views/${menu.component}.vue`),
        meta: {
          title: menu.title,
          permission: menu.permission_code,
        },
      });
    }
  });
  
  return routes;
}
```

### 7.2 菜单级权限

根据权限过滤菜单显示：

```typescript
// stores/modules/permission.ts
export const usePermissionStore = defineStore('permission', () => {
  const accessibleMenus = ref<Menu[]>([]);
  
  function setAccessibleMenus(menus: Menu[]) {
    // 过滤掉无权限的菜单
    accessibleMenus.value = filterMenusByPermission(menus);
  }
  
  return { accessibleMenus, setAccessibleMenus };
});
```

### 7.3 组件级权限

通过指令或组件控制按钮显示：

```vue
<script setup>
import { useAccess } from '@vben/access';

const { hasAccessByCodes } = useAccess();
</script>

<template>
  <!-- 方式 1：v-if 指令 -->
  <Button v-if="hasAccessByCodes(['article:create'])" type="primary">
    新建
  </Button>
  
  <!-- 方式 2：权限组件 -->
  <AccessControl codes="['article:delete']">
    <Button danger>删除</Button>
  </AccessControl>
</template>
```

### 7.4 权限 Composable

```typescript
// composables/usePermission.ts
export function usePermission() {
  const accessStore = useAccessStore();
  
  function hasPermission(code: string): boolean {
    return accessStore.accessCodes.includes(code);
  }
  
  function hasAnyPermission(codes: string[]): boolean {
    return codes.some(code => hasPermission(code));
  }
  
  function hasAllPermissions(codes: string[]): boolean {
    return codes.every(code => hasPermission(code));
  }
  
  return { hasPermission, hasAnyPermission, hasAllPermissions };
}
```

## 八、权限审计日志

### 8.1 记录权限变更

每次权限变更都记录审计日志：

```go
// 添加角色权限时记录日志
func (s *RoleService) AddPermissions(ctx context.Context, req *AddPermissionsRequest) error {
    // 执行添加操作
    err := s.repo.AddPermissions(ctx, req.RoleId, req.PermissionIds)
    if err != nil {
        return err
    }
    
    // 记录审计日志
    auditLogRepo.Create(ctx, &permissionV1.PermissionAuditLog{
        Action:      "add_permissions",
        RoleId:      req.RoleId,
        PermissionIds: req.PermissionIds,
        OperatorId:  auth.GetUserID(ctx),
        CreatedAt:   time.Now(),
    })
    
    return nil
}
```

### 8.2 查看权限审计日志

在后台管理系统中：

1. 进入 **日志管理 → 权限审计日志**
2. 可以看到所有权限变更记录：
   - 操作人
   - 操作时间
   - 操作类型（添加/移除权限）
   - 涉及的角色和权限

## 九、性能优化

### 9.1 缓存权限数据

将用户权限缓存到 Redis：

```go
// 获取用户权限（带缓存）
func GetUserPermissions(ctx context.Context, userID uint32) ([]string, error) {
    cacheKey := fmt.Sprintf("user:%d:permissions", userID)
    
    // 尝试从缓存获取
    cached, err := redis.Get(ctx, cacheKey).Result()
    if err == nil {
        var permissions []string
        json.Unmarshal([]byte(cached), &permissions)
        return permissions, nil
    }
    
    // 从数据库查询
    permissions, err := queryPermissionsFromDB(userID)
    if err != nil {
        return nil, err
    }
    
    // 写入缓存（TTL 1 小时）
    data, _ := json.Marshal(permissions)
    redis.Set(ctx, cacheKey, data, time.Hour)
    
    return permissions, nil
}
```

### 9.2 批量权限检查

避免多次调用权限检查接口：

```go
// ❌ 错误做法：循环检查
for _, resource := range resources {
    if !CheckPermission(user, resource, "view") {
        return errors.New("permission denied")
    }
}

// ✅ 正确做法：一次性获取所有权限
permissions := GetUserPermissions(user)
permissionSet := make(map[string]bool)
for _, p := range permissions {
    permissionSet[p] = true
}

for _, resource := range resources {
    if !permissionSet[resource] {
        return errors.New("permission denied")
    }
}
```

## 十、常见问题

### Q1: 如何选择合适的授权引擎？

- **Casbin**：适合传统的 RBAC 场景，配置简单，性能好
- **OPA**：适合复杂的动态策略，如基于时间、地点、设备等多维度的权限判断
- **Zanzibar**：适合社交网络、协作平台等需要复杂关系图谱的场景

### Q2: 权限变更后何时生效？

- **菜单权限**：用户重新登录后生效（或前端主动刷新权限）
- **接口权限**：立即生效（Casbin 策略实时更新）
- **数据权限**：下次查询时生效

### Q3: 如何实现权限继承？

通过角色继承实现：

```
超级管理员 → 管理员 → 编辑 → 访客
```

在 Casbin 中：

```
g, admin, super_admin
g, editor, admin
g, viewer, editor
```

### Q4: 如何处理跨租户权限？

在多租户模式下，权限隔离通过以下方式实现：

1. **租户级角色**：每个租户有自己的角色和权限
2. **数据隔离**：查询时自动添加 `tenant_id` 过滤条件
3. **跨租户访问**：需要特殊权限代码（如 `cross_tenant:view`）

## 十一、相关文档

- [后端核心模块详解](./backend-modules.md)
- [前后端联调完整实战](./tutorial-fullstack-integration.md)
- [Lua 脚本扩展实战](./tutorial-lua-extension.md)
