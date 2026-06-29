# UBA 附录：端口、术语、已知限制与 FAQ

---

## 一、端口对照表

| 服务 / 组件 | 服务监听端口 | docker-compose 宿主映射 | 备注 |
|-------------|------------|------------------------|------|
| **Admin Service** REST | `5600` | 5600 | 一致 |
| **Admin Service** SSE | `5601` | 5601 | 一致 |
| **Collector Service** HTTP | `5700` | 5700 | 一致 |
| **Core Service** gRPC | 动态（etcd 发现） | （不映射） | 容器内通过 etcd 发现 |
| PostgreSQL | 5432 | 5432 | 一致 |
| Redis | 6379 | 6379 | 一致 |
| Kafka | 9092 | 9092 | 容器内用 `kafka:9092` |
| Etcd | 2379, 2380 | 2379, 2380 | 一致 |
| MinIO API / Console | 9000 / 9001 | 9001 / 9002 | 一致 |
| Jaeger UI | 16686 | 16686 | 一致 |
| Doris FE（MySQL / HTTP） | 9030 / 8030 | 9030, 8030, 9010 | 一致 |
| Doris BE | 8040, 9050 | 8040, 9050 | 一致 |
| Superset | 8088 | 8088 | 一致 |

> docker-compose 的端口映射已与服务监听端口统一（admin `5600/5601`、collector `5700`），宿主机直接用监听端口访问即可。详见 [配置详解](./deploy-config.md)。

---

## 二、术语表

| 术语 | 含义 |
|------|------|
| **UBA** | User Behavior Analytics，用户行为分析 |
| **UEBA** | User and Entity Behavior Analytics，用户与实体行为分析（UBA 的演进，扩展到设备/应用/端点等实体） |
| **Collector** | 采集 BFF，接收 SDK 上报并转发 Kafka |
| **Core** | 核心业务服务，入库/建模/查询/风险/标签 |
| **Admin** | 管理后台 BFF，HTTP 网关 + SSE，薄转发 |
| **OLAP** | 列式分析引擎，UBA 支持 Doris（默认）/ ClickHouse 二选一 |
| **events_fact** | 行为事件事实表（核心分析数据源） |
| **sessions_fact** | 会话级汇总事实表 |
| **cohort** | 留存分析的队列（同期用户群） |
| **appId / appSecret** | 应用级鉴权凭据，在管理后台「应用管理」创建 |
| **tenantId** | 租户 ID，服务端按 appId 权威识别，客户端不上报 |
| **super properties** | 公共属性，设置后每条事件自动携带 |
| **UseClickHouse** | 编译期常量，决定 OLAP 引擎（false=Doris 默认） |
| **Asynq** | 基于 Redis 的异步任务队列 |
| **Connect-RPC** | 前端 TypeScript API 客户端协议（由 proto 生成） |

---

## 三、已知限制与路线图

> 本节如实记录代码当前状态，便于评估生产可用性与规划二开。

### 已知缺口

> 说明：**Kafka 消费入库已是默认能力，不属于缺口**。默认由 OLAP 引擎虚拟表消费 Kafka（ClickHouse Kafka 引擎表 / Doris Routine Load）落库；Core 侧另预留微服务消费接口，吞吐不够时可启用。详见 [系统架构 · Kafka 消费入库机制](./architecture.md)。

| 项 | 现状 | 影响 | 规划方向 |
|----|------|------|---------|
| **WAU / MAU 小时粒度** | 日级 wau/mau 已基于 HLL 滚动窗口输出真值；仅 HOUR 粒度因无小时级状态退化为等于 DAU | 小时粒度的周/月活不准确 | 预聚合小时级 uv 状态 |
| **风险检测引擎** | 仅实现风险事件/规则的存取（CRUD，`RiskEventService.Get` 等查询已可用） | 无「事件匹配规则并自动评分」 | 落地规则评估引擎，对接风险事件生成 |

### 数据库一致性提醒

- docker-compose 已统一 `POSTGRES_DB=gw_uba`，与服务 `data.yaml` 的 `dbname=gw_uba` 一致。
- collector `data.yaml` 的 kafka 默认 `127.0.0.1:9092`，容器化需改 `kafka:9092`。
- PostgreSQL 表结构由 Ent 生成（无手写 schema.sql），`sql/postgresql/` 仅种子/演示数据。

### 安全默认值（必须轮换）

- JWT key `some_api_key`、AES key `f51d66a73d8a0927`。
- 各中间件密码 `*Abcd123456`、Doris root 空密码、Superset admin/admin。
- CORS `origins: ["*"]`、无 TLS。

> 详见 [配置详解 · 安全清单](./deploy-config.md)。

---

## 四、FAQ

### Q1：UBA 能处理多大的数据量？
A：基于 Doris / ClickHouse 列式引擎，设计上可处理亿级事件。实际吞吐取决于引擎规格与 Kafka 集群。

### Q2：上报后多久能查到数据？
A：秒级。Collector 写入 Kafka 后，由 OLAP 引擎的虚拟表（ClickHouse Kafka 引擎表）/ Routine Load（Doris）持续消费落库，正常情况下几秒内即可在 `events_fact` 查到。若长时间查不到，先排查 OLAP 引擎的消费作业（Routine Load 状态 / 物化视图）是否正常运行。

### Q3：如何切换 ClickHouse / Doris？
A：修改 `app/core/service/internal/data/data.go` 的 `UseClickHouse` 常量并重新编译 Core（不是运行时配置）。

### Q4：有没有 iOS / Android 原生 SDK？
A：**当前没有**。仅有 Web SDK（TypeScript）和 C# SDK（Unity/Godot/.NET）。移动端游戏可用 C# SDK（Unity）；纯原生 App 需自行通过 `POST /uba/v1/report` 对接。

### Q5：是否支持多租户？
A：支持。`tenantId` 由服务端按 appId 权威识别并覆盖，客户端无需关心，天然隔离。

### Q6：如何做自定义 BI 报表？
A：部署 Superset，连 Doris 的 `gw_uba` 库，基于事实表建仪表板。见 [Superset 部署](./deploy-superset.md)。

### Q7：proto 改了前端为什么不生效？
A：忘了 `make ts` 并手动同步 TS 产物，或忘了 `make wire`。见 [代码生成管线](./tutorial-codegen.md)。

### Q8：ent 编译报 Modify 缺失？
A：用了错误的 ent 生成命令（没带 feature flags）。正确命令见 [代码生成管线 · Ent 的坑](./tutorial-codegen.md)。

---

## 五、相关文档

- [产品介绍](./intro.md)
- [系统架构](./architecture.md)
- [配置详解](./deploy-config.md)
- [后端 API 契约](./backend-api.md)
