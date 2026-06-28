# 新增业务实体教程

本教程演示如何在 UBA 后端新增一个 PostgreSQL 业务实体（Ent schema → 生成 → proto → repo → service），以项目内已实现的 **EventSchema（事件 Schema）** 为参照。

> 前置：先读 [代码生成管线](./tutorial-codegen.md)（尤其是「Ent 生成的坑」）与 [新增对外服务](./tutorial-new-service.md)。

---

## 一、适用场景

- 需要持久化到 PostgreSQL 的业务实体（如新的配置项、业务表）。
- 需要完整 CRUD（List/Count/Get/Create/Update/Delete）。

> ⚠️ 如果是**分析数据**（事实表、聚合查询），应走 OLAP 而非 Ent，见 [新增对外服务](./tutorial-new-service.md) 的 OLAP repo 部分。

---

## 二、步骤

### 步骤 1：定义 Ent schema

文件：`backend/app/core/service/internal/data/ent/schema/uba_xxx.go`

```go
package schema

import (
    "entgo.io/ent"
    "entgo.io/ent/schema"
    "entgo.io/ent/schema/field"
    "entgo.io/ent/schema/index"
    "entgo.io/ent/schema/mixin"
    entsql "entgo.io/ent/dialect/entsql"
)

type Xxx struct{ ent.Schema }

func (Xxx) Fields() []ent.Field {
    return []ent.Field{
        field.String("name").NotEmpty().Comment("名称"),
        field.String("code").Unique().Comment("编码"),
        // 注意 Nillable / Optional / Default 的取舍
    }
}

func (Xxx) Mixin() []schema.Mixin {
    return []schema.Mixin{
        mixin.AutoIncrementId{},   // 自增主键
        mixin.TimeAt{},            // created_at / updated_at
        mixin.OperatorID{},        // 操作人
        mixin.TenantID[uint32]{},  // 多租户
    }
}

func (Xxx) Indexes() []ent.Index {
    return []ent.Index{
        index.Fields("code").Unique(),
        index.Fields("tenant_id", "name"),
    }
}

func (Xxx) Annotations() []schema.Annotation {
    return []schema.Annotation{
        entsql.Annotation{Table: "uba_xxx", Charset: "utf8mb4"},
    }
}
```

要点：

- `Fields()`：注意 `Nillable` / `Optional` / `Default` 的取舍。
- `Mixin()`：复用项目提供的 `mixin.AutoIncrementId{}` / `mixin.TimeAt{}` / `mixin.OperatorID{}` / `mixin.TenantID[T]{}`。
- `Indexes()`：唯一索引 + 普通索引。
- `Annotations()`：表名（`uba_` 前缀）、字符集。

### 步骤 2：生成 Ent 代码（用正确命令）

> ⚠️ **必须带 feature flags**，否则会丢扩展、编译报错。

```bash
cd backend/app/core/service
ent generate \
  --feature privacy --feature entql \
  --feature sql/modifier --feature sql/upsert --feature sql/lock \
  ./internal/data/ent/schema
```

或直接 `make ent`（在 `core/service` 目录）。

### 步骤 3：定义 proto

领域 proto（`api/protos/uba/service/v1/xxx.proto`，含完整 CRUD 消息）+ admin 网关 proto（`api/protos/admin/service/v1/i_xxx.proto`，每个 rpc 加 `google.api.http` 注解）。

参考 `event_schema.proto` / `i_event_schema.proto` 的 CRUD 套路：

```proto
service XxxService {
  rpc List(google.protobuf.PagingRequest) returns (ListXxxResponse) {}
  rpc Count(...) returns (...);
  rpc Get(GetXxxRequest) returns (Xxx) {}
  rpc Create(Xxx) returns (google.protobuf.Empty) {}
  rpc Update(Xxx) returns (google.protobuf.Empty) {}   // 带 FieldMask
  rpc Delete(DeleteXxxRequest) returns (google.protobuf.Empty) {}
}
```

### 步骤 4：生成 proto 代码

```bash
cd backend && make api && make ts
# 同步 TS（见代码生成管线教程第五节）
```

### 步骤 5：实现 repo

文件：`backend/app/core/service/internal/data/uba_xxx_repo.go`

- 仿 `uba_tag_definition_repo.go` / `uba_event_schema_repo.go`。
- 用 `entCrud.Repository[...]` 泛型 + `mapper.CopierMapper`。
- `Count` / `List` 用 `BuildListSelectorWithPaging`。
- **ID 类型注意**：Ent 默认 `uint32`，proto 用 `uint64`，需 `uint32(req.GetId())` 转换。

```go
type XxxRepo struct {
    *entCrud.Repository[ent.Xxx, ent.XxxCreate, ent.XxxUpdate, ubaV1.Xxx, *ubaV1.Xxx]
}

func NewXxxRepo(data *Data, auth authorization.Casbin) *XxxRepo {
    r := entCrud.NewRepository[ent.Xxx, ent.XxxCreate, ent.XxxUpdate, ubaV1.Xxx, *ubaV1.Xxx](
        data.GetEntTx(), mapper.NewCopierMapper[ubaV1.Xxx, ent.Xxx](),
    )
    return &XxxRepo{Repository: r}
}
```

### 步骤 6：实现 core service + admin 转发

同 [新增对外服务](./tutorial-new-service.md) 的步骤 4–5：

- core：`internal/service/xxx_service.go` 实现 `ubaV1.UnimplementedXxxServiceServer`，调用 repo。
- admin：`internal/service/xxx_service.go` 转发实现。
- 两层各自注册 Provider、server 注册，并 `make wire`。

### 步骤 7：验证

```bash
cd backend && go build ./...
```

---

## 三、表结构说明

- **没有手写 `schema.sql`**：表结构由 `make ent` 生成；core 服务启动时 `data.yaml` 的 `migrate: true` 会自动建表。
- 种子数据：若有字典数据，放到 `sql/postgresql/default-data.sql`（参考已有的 `sys_dict_types` / `sys_dict_entries`）。

---

## 四、常见坑

- **Ent 编译报 `Modify` 缺失**：用了错误的 ent 生成命令（没带 feature flags，见步骤 2）。
- **ID 类型不匹配**：Ent `uint32` ↔ proto `uint64`，记得转换。
- **多租户字段漏填**：实体未加 `mixin.TenantID`，导致租户隔离失效。
- **FieldMask 更新失效**：admin 前端更新时需用 `makeUpdateMask(Object.keys(values))` 生成掩码（见前端 composable 范式）。

---

## 五、相关文档

- [代码生成管线](./tutorial-codegen.md)
- [新增对外服务](./tutorial-new-service.md)
- [后端模块总览](./backend-modules.md)
- [前端架构](./frontend-architecture.md)
