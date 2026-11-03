# Adding an External Service Tutorial

This tutorial demonstrates how to add a new external HTTP capability on UBA (admin REST interface + core business implementation + admin forwarding), using the already-implemented **AnalyticsService (data analytics)** in the project as a reference. This is the most common secondary development scenario in UBA.

> Prerequisites: first read the "Three-Layer Service Architecture" section of [System Architecture](./architecture.md) and the [Code Generation Pipeline](./tutorial-codegen.md).

---

## 1. Goal & Pattern Recap

UBA's three-layer pattern:

```
admin/service/v1/i_xxx.proto        # HTTP gateway interface (with google.api.http annotations)
uba/service/v1/xxx.proto            # Domain messages + gRPC service contract
core/service/internal/service/      # Business implementation (implements the uba gRPC server)
admin/service/internal/service/     # Forwarding implementation (implements the admin HTTP server → calls the uba client)
```

The admin layer is **pure forwarding** with no business logic; business logic is concentrated in core. A new capability requires one set of additions in each of the two layers.

---

## 2. Steps

### Step 1: Define the domain proto

File: `backend/api/protos/uba/service/v1/xxx.proto`

```proto
syntax = "proto3";
package uba.service.v1;

service XxxService {
  rpc DoSomething(DoSomethingRequest) returns (DoSomethingResponse) {}
}

message DoSomethingRequest {
  // business fields
}
message DoSomethingResponse {
  // business fields
}
```

Key points:

- `package uba.service.v1;`
- Define `service XxxService { rpc ... }` (gRPC contract, **no http annotations**)
- Define all `message XxxRequest/Response`

### Step 2: Define the admin gateway proto

File: `backend/api/protos/admin/service/v1/i_xxx.proto`

```proto
syntax = "proto3";
package admin.service.v1;

import "uba/service/v1/xxx.proto";

service XxxService {
  rpc DoSomething(uba.service.v1.DoSomethingRequest) returns (uba.service.v1.DoSomethingResponse) {
    option (google.api.http) = {
      post: "/admin/v1/xxx"
      body: "*"
    };
  }
}
```

Key points:

- `package admin.service.v1;`
- `import "uba/service/v1/xxx.proto";` to reuse domain messages
- GET queries use query parameters: `get: "/admin/v1/xxx"`
- POST aggregations use the body: `post: "/admin/v1/xxx" body: "*"`

### Step 3: Generate code

```bash
cd backend && make api && make ts
# Sync TS (see section 5 of the Code Generation Pipeline tutorial)
```

### Step 4: Implement the business logic in the core layer

Directory: `backend/app/core/service/`

1. **Service implementation** `internal/service/xxx_service.go`: implement `ubaV1.UnimplementedXxxServiceServer` and write the business logic.
2. **Data repo** `internal/data/`:
   - ent entities → use the generic `Repository` wrapper from `go-crud` (see `uba_tag_definition_repo.go`).
   - OLAP aggregations → native SQL (Doris uses `r.db.SelectContext`, ClickHouse uses `r.db.Select`; mirrored implementations for both engines, see `analytics_repo.go`).
3. **gRPC server registration** `internal/server/grpc_server.go`: add the service as a parameter of `NewGrpcServer` and call `ubaV1.RegisterXxxServiceServer`.
4. **Provider registration**: add providers in `internal/service/providers/wire_set.go` + `internal/data/providers/wire_set.go`.
5. **Regenerate injection**:

   ```bash
   cd backend/app/core/service && make wire
   ```

### Step 5: Forward in the admin layer

Directory: `backend/app/admin/service/`

1. **Service forwarding** `internal/service/xxx_service.go`: implement `adminV1.XxxServiceHTTPServer`, with method bodies forwarding directly:

   ```go
   func (s *XxxService) DoSomething(ctx context.Context, req *ubaV1.DoSomethingRequest) (*ubaV1.DoSomethingResponse, error) {
       return s.client.DoSomething(ctx, req)
   }
   ```

2. **Client factory** `internal/data/data.go`: add `NewXxxServiceClient` (modeled on existing client factories, discovering core via etcd).
3. **REST server registration** `internal/server/rest_server.go`: add the service as a parameter of `NewRESTServer` and call `adminV1.RegisterXxxServiceHTTPServer`.
4. **Provider registration**: add providers in `internal/data/providers/wire_set.go` + `internal/service/providers/wire_set.go`.
5. **Regenerate injection**:

   ```bash
   cd backend/app/admin/service && make wire
   ```

### Step 6: Verify

```bash
cd backend && go build ./...
```

After starting the admin/core services, verify the new interface via the admin Swagger; or test directly with `curl`:

```bash
curl -X POST http://localhost:5600/admin/v1/xxx \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## 3. Reference the Real Implementation

| Reference | File |
|---------|------|
| Domain proto (25 analysis models) | `api/protos/uba/service/v1/analytics.proto` |
| Admin gateway proto | `api/protos/admin/service/v1/i_analytics.proto` |
| Core service (branches by engine) | `app/core/service/internal/service/analytics_service.go` |
| Core OLAP repo (dual engines) | `app/core/service/internal/data/{doris,clickhouse}/analytics_repo.go` |
| Admin forwarding | `app/admin/service/internal/service/analytics_service.go` |
| Admin client factory | `app/admin/service/internal/data/data.go` (`NewAnalyticsServiceClient`) |

> For OLAP implementation details of analytics aggregations (injection prevention, whitelisted dimensions, dual-engine dialect differences), see the [OLAP Query Cookbook](./analyst-olap-cookbook.md).

---

## 4. Common Pitfalls

- **Frontend does not update after proto change**: forgot `make ts` + manually syncing the TS artifacts (see [Code Generation Pipeline](./tutorial-codegen.md)).
- **wire reports "no provider"**: the Provider was not added to the corresponding `wire_set.go`, or was added to the wrong file.
- **Cannot connect to core over gRPC**: core uses a dynamic port; confirm etcd registration is working, and that discovery in admin's `remote.yaml` points to etcd.
- **One of the dual-engine OLAP repos missed**: after changing the Doris implementation, remember to sync the ClickHouse implementation to keep the mirror consistent.

---

## 5. Related Documentation

- [System Architecture](./architecture.md)
- [Code Generation Pipeline](./tutorial-codegen.md)
- [Adding a Business Entity](./tutorial-new-entity.md)
- [Adding a Frontend Page](./tutorial-new-page.md)
- [Backend API Contract](./backend-api.md)
