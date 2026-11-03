# Frontend Architecture Overview

The GoWind Admin frontend ships **three editions**, all connected to the same backend API; developers can choose the edition that fits their team's stack and project needs.

## 1. Frontend Editions at a Glance

| Edition | Directory | Tech Stack | Local Port | Notes |
|------|------|--------|----------|------|
| Vue3 Vben | `frontend/admin/vue-vben` | Vue3 + TypeScript + Vite + Ant Design Vue + Vben Admin | 5666 | Most feature-complete; recommended |
| Vue Element | `frontend/admin/vue-element` | Vue3 + TypeScript + Vite + Element Plus | 3000 | Lightweight, clean edition |
| React | `frontend/admin/react` | React19 + TypeScript + Vite + Ant Design V6 | 7000 | Edition for the React stack |

## 2. Vue3 Vben Edition Architecture in Depth

The Vben edition is built on the [Vben Admin](https://doc.vben.pro) enterprise frontend framework and adopts a Monorepo architecture.

### 1. Tech Stack

| Category | Technology | Notes |
|------|------|------|
| Framework | Vue 3 | Composition API + `<script setup>` |
| Language | TypeScript | Full type safety |
| Build tool | Vite + Turbo | Fast hot updates + Monorepo incremental builds |
| UI component library | Ant Design Vue | Enterprise UI components |
| State management | Pinia | The state management officially recommended for Vue3 |
| Routing | Vue Router | Dynamic routes + permission-based routes |
| HTTP client | Axios | Request/response interceptor wrappers |
| Code standards | ESLint + Prettier + Stylelint | Unified code style |
| Package management | pnpm + workspace | Monorepo workspace management |

### 2. Project Structure

```
frontend/admin/vue-vben/
├── apps/                       # Applications
│   └── admin/                  # Admin application
│       ├── src/
│       │   ├── api/            # API request layer (two-layer architecture)
│       │   │   ├── client.ts   # ApiClient singleton (ClientTransport adapter)
│       │   │   ├── index.ts    # Unified export entry
│       │   │   ├── composables/ # Vue Query hooks layer (for business components)
│       │   │   └── generated/  # Protobuf-generated types + ApiClient + Service Clients
│       │   ├── views/          # Business pages
│       │   │   ├── app/        # Application page modules
│       │   │   ├── dashboard/  # Dashboard
│       │   │   ├── message/    # Message pages
│       │   │   └── profile/    # Personal center
│       │   ├── router/         # Router configuration
│       │   │   └── routes/modules/  # Dynamic route modules
│       │   ├── stores/         # Pinia state management
│       │   ├── locales/        # i18n
│       │   ├── layouts/        # Layout components
│       │   ├── adapter/        # Adapters
│       │   ├── transport/      # HTTP transport layer
│       │   ├── constants/      # Constants
│       │   ├── plugins/        # Plugins
│       │   └── utils/          # Utility functions
│       ├── public/             # Static assets
│       ├── .env.development    # Development environment configuration
│       └── .env.production     # Production environment configuration
│
├── packages/                   # Shared packages (Monorepo)
│   ├── @core/                  # Core functionality package
│   ├── constants/              # Shared constants
│   ├── effects/                # Side-effect handling
│   ├── icons/                  # Icon library
│   ├── locales/                # Shared i18n
│   ├── preferences/            # Preferences
│   ├── stores/                 # Shared state management
│   ├── styles/                 # Shared styles
│   ├── types/                  # Shared type definitions
│   └── utils/                  # Shared utility functions
│
├── internal/                   # Internal tooling
├── scripts/                    # Build scripts
├── turbo.json                  # Turbo build configuration
└── pnpm-workspace.yaml         # pnpm workspace configuration
```

### 3. Monorepo Architecture

The project uses a pnpm workspace + Turbo Monorepo architecture:

- **`apps/admin`**: the actual application entry, containing business code
- **`packages/`**: shared packages referenced by the application
  - `@core`: core UI components and layouts
  - `constants`: shared constants
  - `locales`: i18n texts
  - `stores`: shared state
  - `types`: TypeScript type definitions
  - `utils`: utility functions

### 4. Startup & Build

```shell
# Install dependencies
pnpm install

# Start the dev server
pnpm dev:antd

# Build for production
pnpm run build:antd
```

### 5. Environment Configuration

| File | Description |
|------|------|
| `.env` | Common environment variables |
| `.env.development` | Development configuration (API URL, etc.) |
| `.env.production` | Production configuration |

## 3. Vue Element Edition Architecture

The Vue Element edition is a lightweight, clean implementation that does not depend on the Vben Admin framework.

### 1. Tech Stack

| Category | Technology |
|------|------|
| Framework | Vue 3 |
| UI component library | Element Plus |
| Build tool | Vite |
| CSS solution | UnoCSS |
| Language | TypeScript |

### 2. Project Structure

```
frontend/admin/vue-element/
├── src/
│   ├── api/            # API request layer
│   ├── assets/         # Static assets
│   ├── components/     # Shared components
│   ├── composables/    # Vue composables
│   ├── constants/      # Constants
│   ├── core/           # Core modules
│   ├── directives/     # Vue directives
│   ├── layouts/        # Layout components
│   ├── locales/        # i18n
│   ├── pages/          # Page components
│   ├── plugins/        # Plugins
│   ├── router/         # Router configuration
│   ├── stores/         # State management
│   ├── styles/         # Global styles
│   ├── types/          # Type definitions
│   └── utils/          # Utility functions
├── mock/               # Mock data
├── public/             # Static assets
└── types/              # Global types
```

### 3. Startup

```shell
cd frontend/admin/vue-element
pnpm install
pnpm dev
```

## 4. React Edition Architecture

The React edition is built on React 19 without the UMI framework, using a lightweight setup.

### 1. Tech Stack

| Category | Technology |
|------|------|
| Framework | React 19 |
| UI component library | Ant Design V6 + @ant-design/pro-components |
| Routing | React Router |
| State management | Zustand |
| Build tool | Vite |
| Language | TypeScript |

### 2. Project Structure

```
frontend/admin/react/
├── src/
│   ├── api/            # API request layer
│   ├── components/     # Shared components
│   ├── config/         # Configuration
│   ├── core/           # Core modules
│   ├── hooks/          # Custom hooks
│   ├── layouts/        # Layout components
│   ├── locales/        # i18n
│   ├── pages/          # Page components
│   ├── router/         # Router configuration
│   ├── stores/         # Zustand state management
│   ├── styles/         # Global styles
│   ├── types/          # Type definitions
│   └── utils/          # Utility functions
├── build/              # Build configuration
├── mock/               # Mock data
└── public/             # Static assets
```

### 3. Startup

```shell
cd frontend/admin/react
pnpm install
pnpm dev
```

## 5. Frontend API Layer Design

The three frontend editions share a similar API layer design, all using a **two-layer architecture** + **Vue Query** data-fetching approach.

### 1. Two-Layer Architecture Overview

```
api/
├── generated/          # Layer 1: Protobuf-generated TypeScript types + ApiClient + Service Clients
│                       #   (generated by protoc-gen-typescript-http; do not edit manually)
├── client.ts           # Adapter layer: creates the apiClient singleton, adapting requestApi into ClientTransport
├── index.ts            # Unified export entry
└── composables/        # Layer 2: Vue Query hooks layer, the final API for business components
                         #   use*   = Vue Query hooks used inside components (useQuery / useMutation)
                         #   fetch* = Promise methods used outside components (Stores, route guards, etc.)
                         #   Enum utilities = status/color mapping functions per module
```

> **Architecture evolution note**: the older version used a three-layer structure (generated → service → composables), where the service layer contained hand-written HTTP request functions. The new version removes the service layer; the auto-generated Service Clients from the generated layer are called directly, and the composables layer has been upgraded to Vue Query-based hooks.

### 2. Layer 1: generated + client.ts

#### generated (auto-generated)

Generated by `protoc-gen-typescript-http` from the Protobuf definitions, including:

- **Type definitions**: `identityservicev1_User`, `permissionservicev1_Role`, etc.
- **Request/response types**: `identityservicev1_ListUserResponse`, `permissionservicev1_CreateUserRequest`, etc.
- **ApiClient class**: a unified entry point exposing all Service Clients via lazily initialized getters
- **Service Client factories**: `createUserServiceClient(transport)`, etc.

```typescript
// All Service Client getters provided by ApiClient
apiClient.userService              // user management
apiClient.authenticationService    // authentication service
apiClient.roleService              // role management
apiClient.dictTypeService          // dictionary types
// ... 20+ Service Clients in total
```

**Naming convention**: `{service}v1_{MessageName}`
- `identityservicev1_` — user/identity related
- `permissionservicev1_` — permission/role/menu related
- `dictservicev1_` — dictionary related
- `authenticationservicev1_` — authentication related

#### client.ts (adapter layer)

Creates the globally unique `apiClient` singleton, adapting the existing `requestApi` (an axios-based `RequestClient`) to the `ClientTransport` interface:

```typescript
// Core logic of client.ts
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

This way, all requests sent through `apiClient` go through `requestApi`, preserving all existing logic such as token injection, error interception, and automatic refresh.

### 3. Layer 2: composables (Vue Query hooks)

The final API layer for business components introduces [Vue Query](https://tanstack.com/query) (TanStack Query) to provide data fetching, caching, and state management. Each composable file provides three kinds of exports:

#### `use*` — Vue Query hooks (used inside components)

```typescript
// Query hooks (read data)
const { data, isLoading, refetch } = useListRoles(query);
const { data } = useGetRole({ id: 1 });

// Mutation hooks (write operations)
const { mutateAsync, isPending } = useCreateRole();
const { mutateAsync } = useUpdateRole();
const { mutateAsync } = useDeleteRole();
```

#### `fetch*` — Promise methods (called externally from Stores / route guards, etc.)

```typescript
// Does not depend on the component setup context; implemented internally via queryClient.fetchQuery
const roles = await fetchListRoles(params);
```

#### Enum utilities — status mapping functions

```typescript
import { userStatusToColor, userStatusToName } from '#/api';

const color = userStatusToColor('NORMAL');  // '#4096FF'
const label = userStatusToName('NORMAL');   // 'Normal'
```

#### Typical composable file structure

Each composable file imports `apiClient` directly and calls the corresponding Service Client:

```typescript
// composables/role.ts
import { useMutation, useQuery } from '@tanstack/vue-query';
import { apiClient } from '#/api/client';
import { queryClient } from '#/plugins/vue-query';
import { makeUpdateMask, type PaginationQuery } from '#/transport/rest';

// Used inside components
export function useListRoles(query: PaginationQuery) {
  return useQuery({
    queryKey: ['listRoles', query],
    queryFn: () => apiClient.roleService.List(query.toRawParams()),
  });
}

// Used outside components
export async function fetchListRoles(params: PaginationQuery) {
  return queryClient.fetchQuery({
    queryKey: ['listRoles', params],
    queryFn: () => apiClient.roleService.List(params.toRawParams()),
    retry: 0,
  });
}

// Write operations
export function useCreateRole() {
  return useMutation({
    mutationFn: (values) => apiClient.roleService.Create({ data: { ...values } }),
  });
}
```

### 4. Pagination Query (PaginationQuery)

All list queries uniformly use the `PaginationQuery` class (located at `transport/rest/pagination.ts`), which encapsulates paging parameters, search conditions, sorting, and field filtering:

```typescript
import { PaginationQuery } from '#/transport/rest';

const query = new PaginationQuery({
  paging: { page: 1, pageSize: 20 },           // Paging parameters
  formValues: { status: 'NORMAL', name: '张' }, // Search conditions (empty values auto-filtered)
  orderBy: ['-created_at'],                     // Sorting ("-" prefix = descending)
  fieldMask: 'id,name,status',                  // Return only the specified fields
});

const { data } = useListUsers(query);
```

### 5. Vue Query Global Configuration

Global QueryClient configuration (`src/plugins/vue-query.ts`):

| Option | Value | Description |
|---|---|---|
| `staleTime` | `60_000` (60s) | Data is considered fresh within 60 seconds and will not be refetched |
| `retry` | `false` | No automatic retry on failed requests |
| `refetchOnWindowFocus` | `false` | No automatic refresh on window focus |
| `refetchOnReconnect` | `false` | No automatic refresh on network reconnect |

### 6. Transport Layer

The frontend transport layer is located in the `src/transport/` directory and split into two submodules:

| Directory | Description |
|---|---|
| `transport/rest/` | HTTP REST transport layer, containing `RequestClient` (axios wrapper), `requestApi`, `PaginationQuery`, preset interceptors, etc. |
| `transport/sse/` | SSE (Server-Sent Events) transport layer, for server push scenarios |

### 7. Code Auto-Generation

Frontend TypeScript types are auto-generated from the backend Protobuf definitions:

```shell
# Generate TypeScript code for all editions
make ts
```

Generation configurations:
- `buf.vue-vben.admin.typescript.gen.yaml` - Vben edition
- `buf.vue-element.admin.typescript.gen.yaml` - Element edition
- `buf.react.admin.typescript.gen.yaml` - React edition

## 6. Frontend Routing & Permissions

### 1. Dynamic Routing

Frontend routing uses a **dynamic routing** model:
- Base routes (login, 404, etc.) are statically defined in code
- Business routes are generated dynamically from the menu permissions returned by the backend
- Route guards handle permission checks and redirects

### 2. Permission Control

The frontend supports permission control at three levels:

| Level | Description |
|------|------|
| Route level | Routes registered dynamically according to user roles/permissions; unauthorized routes are not registered |
| Menu level | Menus filtered for display according to permission data |
| Component level | Visibility of buttons and other elements controlled via permission directives/components |

### 3. Authentication Flow

1. The user submits a login request (username + password + captcha)
2. The backend returns an access token and a refresh token
3. The frontend stores the token locally (localStorage or Cookie)
4. Subsequent requests carry `Authorization: Bearer <token>` in the header
5. When the token expires, it is refreshed automatically using the refresh token
6. On logout, the local token is cleared and the backend is notified to revoke it

## 7. Related Documents

- [Frontend Core Features in Depth](/en/admin/frontend-modules.md)
- [Backend API & Protobuf Definitions](/en/admin/backend-api.md)
