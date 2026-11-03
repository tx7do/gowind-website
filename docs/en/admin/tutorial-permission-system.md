# Permission System in Depth

The permission system is one of the core capabilities of GoWind Admin. It supports three authorization engines — Casbin, OPA, and Zanzibar — and provides fine-grained access control. This tutorial explains the permission models, configuration methods, and practical scenarios in depth.

## 1. Permission Model Overview

### 1.1 Comparison of the Three Authorization Engines

| Feature | Casbin | OPA (Open Policy Agent) | Zanzibar |
|------|--------|-------------------------|----------|
| **Type** | ACL/RBAC/ABAC | Policy engine (Rego language) | Relationship-based authorization |
| **Complexity** | ⭐⭐ Simple | ⭐⭐⭐⭐ Complex | ⭐⭐⭐ Moderate |
| **Performance** | High (in-memory evaluation) | Medium (policies must be compiled) | High (graph database) |
| **Learning curve** | Low | High | Medium |
| **Use cases** | Traditional RBAC | Complex dynamic policies | Social networks, collaboration platforms |
| **Backend implementation** | `pkg/authorizer/casbin` | `pkg/authorizer/opa` | `pkg/authorizer/zanzibar` |

### 1.2 Permission Dimensions

The permission system of GoWind Admin covers three dimensions:

| Dimension | Description | Example |
|------|------|------|
| **Menu permissions** | Control which menus a user can see | The "Article Management" menu is hidden from ordinary employees |
| **API permissions** | Control which APIs a user can call | Only administrators can delete users |
| **Data permissions** | Control which data ranges a user can access | A sales manager can only see data of their own department |

## 2. The RBAC Model in Detail

### 2.1 Core Concepts

```
User → Role → Permission → Resource
```

- **User**: a consumer of the system
- **Role**: a collection of permissions (e.g. "Super Administrator", "Editor", "Visitor")
- **Permission**: an operation grant on a resource (e.g. "article:create", "user:delete")
- **Resource**: a protected object (e.g. a menu, an API endpoint, a data row)

### 2.2 Database Table Structure

```sql
-- User table
users (id, username, ...)

-- Role table
roles (id, name, code, ...)

-- Permission table
permissions (id, name, code, resource_type, resource_id, ...)

-- User-role association
user_roles (user_id, role_id)

-- Role-permission association
role_permissions (role_id, permission_id)

-- Menu table
menus (id, name, path, component, permission_code, ...)
```

### 2.3 Permission Code Conventions

Permission codes follow the `resource:action` naming convention:

| Permission code | Description |
|----------|------|
| `article:list` | View the article list |
| `article:create` | Create an article |
| `article:update` | Update an article |
| `article:delete` | Delete an article |
| `user:view` | View user information |
| `user:edit` | Edit a user |
| `system:config` | System configuration |

## 3. The Casbin Engine in Practice

Casbin is an open-source access control library that supports ACL/RBAC/ABAC and other models. It is used by Intel, IBM, Tencent Cloud, VMware, and other companies. Its core consists of three concepts:

- **Request**: a `(subject, object, action)` triple, e.g. `(bob, /users, GET)`
- **Model**: the decision rules defining how requests match policies
- **Policy**: the mapping between users and roles, resources, and actions

### 3.1 Configure Casbin

Enable Casbin in `auth.yaml`:

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

### 3.2 Policy Definitions

Casbin policies are stored in the database (the `casbin_rule` table):

```
p, admin, /admin/v1/article/*, (GET|POST|PUT|DELETE)
p, editor, /admin/v1/article/*, (GET|POST|PUT)
p, viewer, /admin/v1/article/*, GET

g, alice, admin
g, bob, editor
g, charlie, viewer
```

**Explanation**:
- `p` lines define permission rules: subject, resource, action
- `g` lines define role inheritance: which role a user belongs to

### 3.3 Using It in Code

```go
import "github.com/casbin/casbin/v2"

// Check a permission
func CheckPermission(enforcer *casbin.Enforcer, user string, resource string, action string) bool {
    allowed, err := enforcer.Enforce(user, resource, action)
    if err != nil {
        log.Errorf("check permission failed: %v", err)
        return false
    }
    return allowed
}

// Usage example
if !CheckPermission(enforcer, "alice", "/admin/v1/article/123", "DELETE") {
    return errors.New("permission denied")
}
```

### 3.4 Loading Policies Dynamically

When permissions change, reload the policies:

```go
// Add a policy
enforcer.AddPolicy("editor", "/admin/v1/article/*", "DELETE")

// Remove a policy
enforcer.RemovePolicy("viewer", "/admin/v1/article/*", "POST")

// Reload all policies
enforcer.LoadPolicy()
```

## 4. The OPA Engine in Practice

### 4.1 Configure OPA

Enable OPA in `auth.yaml`:

```yaml
authz:
  type: "opa"
  
  opa:
    policy_path: "./policies"
    query: "data.authz.allow"
```

### 4.2 The Rego Policy Language

Create the policy file `policies/authz.rego`:

```rego
package authz

# Deny by default
default allow = false

# Administrators have all permissions
allow {
    input.user.roles[_] == "admin"
}

# Editors can create and update articles
allow {
    input.user.roles[_] == "editor"
    input.resource.type == "article"
    input.action in ["create", "update"]
}

# Visitors can only view
allow {
    input.user.roles[_] == "viewer"
    input.resource.type == "article"
    input.action == "view"
}

# Data permission: users can only view their own articles
allow {
    input.user.roles[_] == "author"
    input.resource.type == "article"
    input.action == "view"
    input.resource.author_id == input.user.id
}
```

### 4.3 Request Context

The input data structure OPA receives:

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

### 4.4 Using It in Code

```go
import "github.com/open-policy-agent/opa/rego"

// Create the query
query, err := rego.New(
    rego.Query("data.authz.allow"),
    rego.Input(input),
    rego.Load([]string{"./policies"}, nil),
).PrepareForEval(ctx)

// Evaluate
results, err := query.Eval(ctx)
if err != nil {
    return false, err
}

// Check the result
allowed := len(results) > 0 && len(results[0].Expressions) > 0 && 
           results[0].Expressions[0].Value == true
```

## 5. The Zanzibar Engine in Practice

### 5.1 Configure Zanzibar

Enable Zanzibar in `auth.yaml` (using Keto as an example):

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

### 5.2 Relationship Tuples

Zanzibar is based on relationship tuples:

```
(user:Alice, is_member_of, group:Admins)
(group:Admins, can_access, resource:Dashboard)
(article:123, owned_by, user:Bob)
```

### 5.3 Keto Configuration

Create the Keto namespace configuration `namespaces.yaml`:

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

### 5.4 Using It in Code

```go
import "github.com/ory/keto-client-go"

// Check an access permission
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

// Usage example
if !CheckAccess(ketoClient, "Alice", "viewer", "article:123") {
    return errors.New("access denied")
}
```

## 6. Data Permission Implementation

### 6.1 Data Permission Scopes

GoWind Admin supports five data permission scopes:

| Scope | Constant | Description |
|------|------|------|
| Self only | `SELF` | Can only view data created by the user themselves |
| Own department | `UNIT_ONLY` | Can only view data of the user's own department |
| Own department and sub-departments | `UNIT_AND_CHILD` | View data of the user's department and all its sub-departments |
| Selected departments | `SELECTED_UNITS` | View data of specified departments |
| All | `ALL` | View all data |

### 6.2 How It Works

Data permissions are implemented through the Viewer mechanism of the Ent ORM:

```go
// Create a user-level Viewer
viewer := entgo.NewUserViewerContext(ctx, userID, dataScope)

// The filter is applied automatically at query time
articles, err := client.Article.Query().
    Where(article.HasAuthorWith(user.ID(userID))).
    All(viewer)
```

### 6.3 Configuring Data Permissions for a Role

In the admin management system:

1. Go to **Permission Management → Role Management**
2. Select a role and click "Set Data Permissions"
3. Choose the data scope:
   - If "Selected departments" is chosen, the specific departments must be checked
4. Save

### 6.4 Obtaining Data Permissions in Code

```go
// Get the current user's data permission scope from the Context
dataScope := auth.GetDataScopeFromContext(ctx)

switch dataScope {
case identityV1.DataScope_SELF:
    query = query.Where(article.AuthorID(userID))
    
case identityV1.DataScope_UNIT_ONLY:
    query = query.Where(article.HasAuthorWith(
        user.HasOrgUnitsWith(orgunit.ID(orgUnitID)),
    ))
    
case identityV1.DataScope_ALL:
    // No filtering
    
// ...
}
```

## 7. Frontend Permission Control

### 7.1 Route-Level Permissions

Register routes dynamically according to user permissions:

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

### 7.2 Menu-Level Permissions

Filter the menu display according to permissions:

```typescript
// stores/modules/permission.ts
export const usePermissionStore = defineStore('permission', () => {
  const accessibleMenus = ref<Menu[]>([]);
  
  function setAccessibleMenus(menus: Menu[]) {
    // Filter out menus without permission
    accessibleMenus.value = filterMenusByPermission(menus);
  }
  
  return { accessibleMenus, setAccessibleMenus };
});
```

### 7.3 Component-Level Permissions

Control button visibility via a directive or a component:

```vue
<script setup>
import { useAccess } from '@vben/access';

const { hasAccessByCodes } = useAccess();
</script>

<template>
  <!-- Method 1: the v-if directive -->
  <Button v-if="hasAccessByCodes(['article:create'])" type="primary">
    新建
  </Button>
  
  <!-- Method 2: the permission component -->
  <AccessControl codes="['article:delete']">
    <Button danger>删除</Button>
  </AccessControl>
</template>
```

### 7.4 Permission Composable

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

## 8. Permission Audit Logs

### 8.1 Recording Permission Changes

An audit log is recorded for every permission change:

```go
// Record a log when adding role permissions
func (s *RoleService) AddPermissions(ctx context.Context, req *AddPermissionsRequest) error {
    // Perform the addition
    err := s.repo.AddPermissions(ctx, req.RoleId, req.PermissionIds)
    if err != nil {
        return err
    }
    
    // Record the audit log
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

### 8.2 Viewing Permission Audit Logs

In the admin management system:

1. Go to **Log Management → Permission Audit Logs**
2. You can see all permission change records:
   - Operator
   - Operation time
   - Operation type (add/remove permission)
   - Involved roles and permissions

## 9. Performance Optimization

### 9.1 Caching Permission Data

Cache user permissions in Redis:

```go
// Get user permissions (with caching)
func GetUserPermissions(ctx context.Context, userID uint32) ([]string, error) {
    cacheKey := fmt.Sprintf("user:%d:permissions", userID)
    
    // Try to get it from the cache
    cached, err := redis.Get(ctx, cacheKey).Result()
    if err == nil {
        var permissions []string
        json.Unmarshal([]byte(cached), &permissions)
        return permissions, nil
    }
    
    // Query the database
    permissions, err := queryPermissionsFromDB(userID)
    if err != nil {
        return nil, err
    }
    
    // Write to the cache (TTL: 1 hour)
    data, _ := json.Marshal(permissions)
    redis.Set(ctx, cacheKey, data, time.Hour)
    
    return permissions, nil
}
```

### 9.2 Batch Permission Checks

Avoid calling the permission check API multiple times:

```go
// ❌ Wrong: checking in a loop
for _, resource := range resources {
    if !CheckPermission(user, resource, "view") {
        return errors.New("permission denied")
    }
}

// ✅ Correct: get all permissions at once
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

## 10. Common Issues

### Q1: How do I choose the right authorization engine?

- **Casbin**: suitable for traditional RBAC scenarios; simple to configure with good performance
- **OPA**: suitable for complex dynamic policies, such as permission decisions based on time, location, device, and other dimensions
- **Zanzibar**: suitable for scenarios requiring complex relationship graphs, such as social networks and collaboration platforms

### Q2: When do permission changes take effect?

- **Menu permissions**: take effect after the user logs in again (or when the frontend refreshes permissions proactively)
- **API permissions**: take effect immediately (Casbin policies are updated in real time)
- **Data permissions**: take effect on the next query

### Q3: How do I implement permission inheritance?

Through role inheritance:

```
Super Administrator → Administrator → Editor → Visitor
```

In Casbin:

```
g, admin, super_admin
g, editor, admin
g, viewer, editor
```

### Q4: How do I handle cross-tenant permissions?

In multi-tenancy mode, permission isolation is achieved in the following ways:

1. **Tenant-level roles**: each tenant has its own roles and permissions
2. **Data isolation**: a `tenant_id` filter is added automatically at query time
3. **Cross-tenant access**: requires a special permission code (e.g. `cross_tenant:view`)

## 11. Related Documentation

- [Backend Core Modules in Detail](/en/admin/backend-modules.md)
- [Full-Stack Integration Tutorial](/en/admin/tutorial-fullstack-integration.md)
- [Lua Script Extension Tutorial](/en/admin/tutorial-lua-extension.md)
