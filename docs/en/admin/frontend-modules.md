# Frontend Core Features in Depth

This document details the page features, component design, and API integration of each frontend business module in GoWind Admin. The Vue3 Vben edition is used as the primary reference; the other editions are functionally equivalent.

## 1. Business Module Overview

Frontend business pages are located under the `apps/admin/src/views/` directory, organized by functional domain:

```
views/
├── _core/                    # Core pages (login, 404, etc.)
├── app/                      # Business feature modules
│   ├── opm/                  # Organization & people management
│   │   ├── org_unit/         # Organization management
│   │   ├── position/         # Position management
│   │   └── user/             # User management
│   ├── permission/           # Permission management
│   │   ├── api/              # API endpoint management
│   │   ├── menu/             # Menu management
│   │   ├── permission/       # Permission management
│   │   └── role/             # Role management
│   ├── system/               # System management
│   │   ├── dict/             # Dictionary management
│   │   ├── file/             # File management
│   │   ├── language/         # Language management
│   │   ├── login_policy/     # Login policy
│   │   └── task/             # Task scheduling
│   ├── tenant/               # Tenant management
│   │   └── tenant/           # Tenant management
│   ├── internal_message/     # Internal messages
│   │   ├── category/         # Message categories
│   │   └── message/          # Message management
│   └── log/                  # Log management
│       ├── api_audit_log/    # API audit log
│       ├── data_access_audit_log/  # Data access log
│       ├── login_audit_log/  # Login log
│       ├── operation_audit_log/    # Operation log
│       └── permission_audit_log/   # Permission audit log
├── dashboard/                # Dashboard
├── message/                  # Message notifications
└── profile/                  # Personal center
```

## 2. Login & Authentication

### 1. Login Page

The login page is located in the `_core/` directory and provides:
- Username and password input
- Image captcha (click to refresh)
- Remember me
- Tenant selection (shown when multi-tenant mode is enabled)

### 2. Authentication APIs

Authentication-related APIs are located in `api/composables/auth.ts`:

| API | Description |
|-----|------|
| `login` | Username/password login |
| `logout` | Logout |
| `refreshToken` | Refresh token |
| `generateCaptcha` | Get captcha |
| `verifyCaptcha` | Verify captcha |

### 3. Authentication Composable

`api/composables/auth.ts` provides authentication-related Vue Query hooks, wrapping:
- Login/logout/registration (useMutation)
- Captcha fetching and verification
- Token refresh

## 3. Dashboard

The dashboard page is located at `views/dashboard/`, showing system overview information:
- User statistics
- Online user count
- To-do items
- System announcements
- Data charts

Dashboard APIs are located in `api/composables/admin-portal.ts`.

## 4. Organization & People Management (OPM)

### 1. User Management

Page located at `views/app/opm/user/`.

**Core features**:
- User list queries (pagination, advanced search, department filtering)
- Create users (set username, password, roles, departments, positions, supervisor, etc.)
- Edit user info
- Disable/enable users
- Reset password
- Assign multiple roles
- Assign multiple departments
- Set supervisor
- One-click login as a specific user

**API file**: `api/composables/user.ts`

### 2. Organization Management

Page located at `views/app/opm/org_unit/`.

**Core features**:
- Tree view of the organization structure
- Create/edit/delete organization nodes
- Drag-and-drop sorting
- Organization path display

**API file**: `api/composables/org-unit.ts`

### 3. Position Management

Page located at `views/app/opm/position/`.

**Core features**:
- Position list management
- Create/edit/delete positions
- Positions linked to users as tags

**API file**: `api/composables/position.ts`

## 5. Permission Management

### 1. Role Management

Page located at `views/app/permission/role/`.

**Core features**:
- Role list management
- Role group management
- View users linked by role
- Set the menu permissions attached to a role
- Set the role's data scope
- Batch add/remove employees

**API file**: `api/composables/role.ts`

### 2. Permission Management

Page located at `views/app/permission/permission/`.

**Core features**:
- Permission group management
- Permission point CRUD
- Tree list display
- Associate permissions with API endpoints
- Associate permissions with menus

**API file**: `api/composables/permission.ts`

### 3. Menu Management

Page located at `views/app/permission/menu/`.

**Core features**:
- Menu tree management
- Three menu types: directory, menu, button
- Configure operation permissions and button-level permission identifiers
- Menu icon selection
- Menu sorting

**API file**: `api/composables/menu.ts`

### 4. API Endpoint Management

Page located at `views/app/permission/api/`.

**Core features**:
- API endpoint list management
- Auto-sync endpoints from backend routes
- Associate endpoints with permission points
- Tree list display
- Configure operation log request parameters and response results

**API file**: `api/composables/api.ts`

## 6. System Management

### 1. Dictionary Management

Page located at `views/app/system/dict/`.

**Core features**:
- Dictionary category management
- Dictionary entry management (cascaded by category)
- Server-side multi-column sorting
- Data import and export
- i18n support

**API file**: `api/composables/dict.ts`

### 2. File Management

Page located at `views/app/system/file/`.

**Core features**:
- File list queries
- File upload (to OSS or local storage)
- File download
- Copy file URL
- Delete files
- Full-size image preview

**API files**: `api/composables/file.ts`, `api/composables/file-transfer.ts`

### 3. Task Scheduling

Page located at `views/app/system/task/`.

**Core features**:
- Task list management
- Create/edit/delete tasks
- Start/pause tasks
- Run a task immediately
- View task run logs

**API file**: `api/composables/task.ts`

### 4. Login Policy

Page located at `views/app/system/login_policy/`.

**Core features**:
- Login policy list management
- Create/edit policy rules
- IP whitelist/blacklist configuration
- Time restriction configuration
- Login failure lockout policy

**API file**: `api/composables/login-policy.ts`

### 5. Language Management

Page located at `views/app/system/language/`.

**Core features**:
- Manage languages supported by the system
- Base i18n configuration

**API file**: `api/composables/language.ts`

## 7. Tenant Management

Page located at `views/app/tenant/tenant/`.

**Core features**:
- Tenant list management
- Create tenants (auto-initializes department, roles, and administrator)
- Edit the tenant plan
- Disable/enable tenants
- One-click login as the tenant administrator

**API file**: `api/composables/tenant.ts`

## 8. Internal Messages

### 1. Message Management

Page located at `views/app/internal_message/message/`.

**Core features**:
- Message list management
- Create/edit messages
- Send messages to specified users
- View users' read status and read time
- Delete messages
- Mark as read
- Mark all as read

**API file**: `api/composables/internal-message.ts`

### 2. Message Categories

Page located at `views/app/internal_message/category/`.

**Core features**:
- Two-level custom message category management
- Message category selection

**API file**: `api/composables/internal-message.ts`

## 9. Log Management

### 1. Login Log

Page located at `views/app/log/login_audit_log/`.

- Records successful and failed user logins
- Supports IP geolocation display
- Time range filtering

### 2. API Audit Log

Page located at `views/app/log/api_audit_log/`.

- Records API request logs
- Shows request path, parameters, response, latency, and other information

### 3. Operation Log

Page located at `views/app/log/operation_audit_log/`.

- Records user operation logs
- Supports filtering by normal and abnormal logs
- View operation details

### 4. Data Access Log

Page located at `views/app/log/data_access_audit_log/`.

- Records data access behavior

### 5. Permission Audit Log

Page located at `views/app/log/permission_audit_log/`.

- Records permission change operations

## 10. Personal Center

Page located at `views/profile/`.

**Core features**:
- View and edit personal info
- Avatar upload
- View last login info
- Change password

**API file**: `api/composables/user-profile.ts`

## 11. API Layer Development Conventions

### 1. Composables Layer (Vue Query hooks)

Each business module corresponds to one composable file, which — based on Vue Query — provides three kinds of exports: `use*` (in-component hooks), `fetch*` (out-of-component Promise methods), and enum utilities:

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

// In-component use — Query hook (read data)
export function useListRoles(query: PaginationQuery) {
  return useQuery({
    queryKey: ['listRoles', query],
    queryFn: () => apiClient.roleService.List(query.toRawParams()),
  });
}

// Out-of-component use — fetch method (Stores / route guards, etc.)
export async function fetchListRoles(params: PaginationQuery) {
  return queryClient.fetchQuery({
    queryKey: ['listRoles', params],
    queryFn: () => apiClient.roleService.List(params.toRawParams()),
    retry: 0,
  });
}

// Write operations — Mutation hook
export function useCreateRole() {
  return useMutation({
    mutationFn: (values) =>
      apiClient.roleService.Create({ data: { ...values } as permissionservicev1_Role }),
  });
}
```

### 2. Core Operation Patterns

#### Pagination queries

All list queries uniformly use `PaginationQuery` to encapsulate paging, search, and sorting parameters:

```typescript
import { PaginationQuery } from '#/transport/rest';

const query = new PaginationQuery({
  paging: { page: 1, pageSize: 20 },
  formValues: { status: 'NORMAL' },  // Search conditions (empty values auto-filtered)
  orderBy: ['-created_at'],           // Sorting ("-" prefix = descending)
});

const { data, isLoading } = useListUsers(query);
```

#### Update operations (auto-generated updateMask)

When updating, pass only the changed fields; the `updateMask` is generated automatically:

```typescript
const { mutateAsync } = useUpdateUser();
await mutateAsync({
  id: 1,
  values: { name: '李四', email: 'lisi@example.com' },  // Pass only the fields to update
});
// Internally generates updateMask: "name,email,id"
```

### 3. Workflow for Adding a New Page

1. Confirm `make ts` has generated the Service Clients for the generated layer
2. Create the Vue Query hooks file under `api/composables/`
3. Add exports in `api/composables/index.ts`
4. Create the page component under `views/app/`
5. Register the route under `router/routes/modules/`
6. Configure the menu and permissions in the backend menu management

## 12. Related Documents

- [Frontend Architecture Overview](/en/admin/frontend-architecture.md)
- [Backend API & Protobuf Definitions](/en/admin/backend-api.md)
