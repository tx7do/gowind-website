# UBA Code Generation Pipeline Tutorial

The project adopts **Contract-First**: write `.proto` / Ent schemas first, then generate Go / TypeScript / OpenAPI code. Understanding this pipeline is a prerequisite for secondary development. This tutorial is written based on the project's real toolchain; the commands can be copied and executed directly.

---

## 1. Toolchain Installation

```bash
cd backend
make init    # install protoc plugins + CLI tools (buf / wire / ent etc.)
```

| Tool | Purpose |
|------|------|
| `buf` | proto compilation (replaces protoc) |
| `protoc-gen-go` / `protoc-gen-go-grpc` | Go messages + gRPC stubs |
| `protoc-gen-go-http` | kratos REST handlers |
| `protoc-gen-typescript-http` | admin frontend TS client |
| `protoc-gen-openapi` | Swagger docs |
| `wire` | Compile-time dependency injection |
| `ent` | ORM entity code generation |

---

## 2. Core Commands (run under `backend/`)

```bash
make api       # generate Go (proto → gen/go/) + struct tags
make ts        # generate the frontend TS client (only admin/service/v1 as input)
make openapi   # generate OpenAPI / Swagger
make ent       # generate ent entities (in each service directory)
make wire      # regenerate dependency injection (wire_gen.go)
make gen       # = ent + wire + api + openapi (not including ts)
make build     # compile all services
```

### Top-level Makefile vs service-level app.mk

- `backend/Makefile`: top-level orchestration, recursing into each service via `app/*/*/Makefile`.
- `backend/app.mk`: the common fragment included by every service, containing `build / build_only / run / app / gen / ent / wire / api / openapi / docker` etc.

---

## 3. Key Configuration Files

| File | Purpose |
|------|------|
| `backend/api/buf.yaml` | buf module definition, dependencies |
| `backend/api/buf.gen.yaml` | Go generation config (managed mode injects go_package) |
| `backend/api/buf.admin.typescript.gen.yaml` | **TS generation config**; note that `inputs.paths` only contains `protos/admin/service/v1` — **only admin protos generate the TS client** |
| `backend/app/core/service/app.mk` | ent generation command (with feature flags: privacy/entql/sql/modifier etc.) |

---

## 4. ⚠️ Ent Generation Pitfall (important)

**Do not run `ent generate ./schema` directly**! It loses the project's extensions (privacy / sql modifier), causing the generated query methods to lack `Modify`/`Filter`, and compilation fails.

The correct way (see `backend/app/core/service/app.mk`):

```bash
cd backend/app/core/service
ent generate \
  --feature privacy --feature entql \
  --feature sql/modifier --feature sql/upsert --feature sql/lock \
  ./internal/data/ent/schema
```

Or simply run `make ent` in that service directory.

---

## 5. ⚠️ Syncing TS Generation Artifacts

`make ts` outputs to:

```
frontend/admin/apps/admin/src/api/generated/admin/service/v1/index.ts
```

But the composables actually import from:

```
frontend/admin/apps/admin/src/generated/api/admin/service/v1/index.ts
```

**Manual sync is required after generation**:

```bash
cp frontend/admin/apps/admin/src/api/generated/admin/service/v1/index.ts \
   frontend/admin/apps/admin/src/generated/api/admin/service/v1/index.ts
```

> This is a known step in the current project setup and easy to miss. If "the proto change did not take effect", check this step first.

---

## 6. Output Locations of Generated Artifacts

```
backend/
├── api/
│   └── gen/go/                  # Go artifacts of make api
└── app/core/service/
    └── internal/
        ├── data/ent/            # entity artifacts of make ent (ent client, queries, mixins)
        └── cmd/server/wire_gen.go  # dependency injection artifact of make wire

frontend/admin/apps/admin/src/
├── api/generated/.../index.ts   # output of make ts
└── generated/api/.../index.ts   # actually imported by composables (needs manual sync)
```

> Generated artifacts **should be committed to version control** (the project does not gitignore them), so the project compiles even without the toolchain installed.

---

## 7. Typical Workflows

### Changed proto (added/modified interfaces)

```bash
cd backend
make api && make openapi && make ts
# Sync TS (see section 5)
# If service constructors/Providers changed, also:
cd app/core/service && make wire
cd app/admin/service && make wire
make build
```

### Changed Ent schema (added/modified business entities)

```bash
cd backend/app/core/service
make ent        # use the correct command with feature flags
cd ../../..
make api        # if the entity also has a corresponding proto
make wire       # if Providers changed
make build
```

### Changed service dependency injection (added Providers)

```bash
cd backend/app/<svc>/service
make wire
```

---

## 8. Debugging Tips

- **Integrating the admin frontend**: `cd frontend/admin && pnpm dev`, with the backend admin running on `5600`.
- **Integrating SDK reporting**: `go run ./app/collector/service/cmd/server/` (`5700`), using the Web SDK's `test.html`.
- **gRPC debugging**: the core port is dynamic; query registrations via etcd, or temporarily change the grpc addr in `server.yaml` to a fixed port.
- **Proto change not taking effect?** Most likely you forgot `make ts` + the TS sync (section 5), or forgot `make wire`.
- **ent compile error about missing `Modify`?** You used the wrong ent generation command (see section 4).

---

## 9. Related Documentation

- [System Architecture](./architecture.md)
- [Backend API Contract](./backend-api.md)
- [Adding an External Service](./tutorial-new-service.md)
- [Adding a Business Entity](./tutorial-new-entity.md)
- [Adding a Frontend Page](./tutorial-new-page.md)
