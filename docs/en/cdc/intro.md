# GoWind CDC (Data Pipeline)

GoWind CDC is the "**data glue**" of the GoWind ecosystem: a lightweight data sync and migration pipeline built for B2B delivery scenarios, solving three pain points at once — migrating legacy system data, real-time cross-system integration, and compliance masking.

The fundamental difference from Canal / Debezium / DataX: **pure Go, no JVM, no hard Kafka dependency** — a single process serves as both the CDC engine and the management service. One server is enough; no extra middleware cluster to set up on delivery sites.

::: tip Version note
Core capabilities — capture, mapping, masking, data audit, alerting, schema-change sync, bidirectional sync — are fully implemented and have passed end-to-end acceptance (current release 1.2.0). The product is in **rapid iteration**; capabilities keep growing.
:::

## Three Delivery Stories: How GoWind CDC Works

**Story one: the legacy migration.** A factory's ERP runs on a ten-year-old SQL Server; management wants it moved to a modern platform — without stopping the business. With GoWind CDC: a **full snapshot** moves the existing data first, then **incremental catch-up** streams every change made during the migration. The old system keeps running until one night the data aligns completely and a single cutover finishes the job. The legacy system retires, and nobody worked overtime.

**Story two: real-time integration.** The order database and the data warehouse used to sync through nightly batches, so reports always lagged a day. A **real-time pipeline** fixes it: an order lands in the source database and appears in the warehouse seconds later. The target database goes down mid-stream? **Resumable sync** buffers data locally and catches up automatically when it returns — nothing lost. One day the source adds a new table: **runtime table attach** hot-mounts it without stopping the pipeline.

**Story three: compliant egress.** The dev team needs a copy of production data for testing, but phone numbers and ID numbers cannot leave. A **masking pipeline** handles it: phones masked, IDs starred, join-friendly fields replaced with deterministic algorithms — the data stays usable in dev but is no longer real personal information. The compliance review passes.

## Highlights

- **Pure Go kernel, full source-target matrix**: sources include MySQL Binlog (GTID resumption), PostgreSQL WAL, SQL Server (trigger/timestamp templates + MS CDC log-level capture), Oracle (LogMiner), and MongoDB (Change Streams); targets cover MySQL / PostgreSQL / Kafka / ClickHouse / Elasticsearch / Redis — the common combinations are all covered
- **Single-box deployment**: no JVM, no hard Kafka dependency; one core process is both engine and management API — it even fits the "one Windows server in the government machine room" reality
- **Resumable, lossless sync**: local durable queue with disk-streamed buffering; memory does not grow even during long target outages, and catch-up is automatic
- **Schema changes travel with the data**: source add/rename/drop column flows through **DDL sync** idempotently, with history
- **Bidirectional sync without loops**: A↔B hot-standby pairs get automatic loop-back markers, so data never ping-pongs
- **Incremental audit & one-click repair**: full baseline + incremental watermark + sampled checks in three tiers; block-level diff lists, point repair, CSV consistency reports
- **One-click masking with national crypto**: 10 algorithms — phone masking, ID masking, hashing, date shift, range replace, SM3 digest — compliance by default (commercial-edition capability)
- **Enterprise governance built in**: RBAC permissions, operation audit logs, multi-tenancy, and a bilingual interface out of the box — meeting the compliance and control requirements of government and enterprise private delivery
- **Alerts that reach people**: latency, backlog, and disconnects pushed via Feishu / DingTalk / WeCom / email, with a per-delivery ledger and one-click resend

## Feature Overview

### 1. Capture & Source Adapters

| Feature | Description |
|---|---|
| Real-time capture | Native MySQL Binlog (GTID-supported, survives primary failover) and PostgreSQL WAL listening |
| Legacy templates | SQL Server trigger / timestamp / MS CDC log-level modes, Oracle LogMiner, MongoDB adapters |
| One-click shadow table | Auto-generated `_cdc_log` shadow table plus I/U/D trigger scripts |
| Wildcard subscription | Subscribe by database/table prefix; new tables discovered periodically |
| Three sync modes | Real-time, full snapshot, and full + incremental, chosen per scenario; snapshot chunks can be rate-limited to ease source load in off-peak windows |
| Resumable positions | Four checkpoint kinds persisted; local disk-buffered streaming — long outages lose nothing |
| Sharded-merge | Multiple shard sources merged into one target table |

### 2. Transform & Write

| Feature | Description |
|---|---|
| Zero-code mapping | Drag-to-connect field alignment with type conversion |
| Schema auto-migration | Target tables created automatically with source types mapped to the target dialect; missing columns are added automatically — no manual alignment |
| Row filters & expressions | Simple expression filtering and lightweight field computation |
| Dynamic masking (Commercial) | 10 algorithms — masking, hashing, date shift, range replace, SM3 — with conditional rules |
| DDL sync | Source schema changes followed automatically, executed idempotently, fully historized |
| Bidirectional sync | Loop-back markers for A↔B hot-standby pairs — no data ping-pong |
| Cache refresh | Redis target refreshes cache entries by key template with TTL |
| Transactional Kafka writes | Kafka target supports transactional Exactly-once production — no duplicates, no losses |

### 3. Operations

| Feature | Description |
|---|---|
| Runtime table attach | Hot-mount new tables without stopping the pipeline |
| Per-table re-snapshot | Re-snapshot one missed table without re-running the whole pipeline |
| Pipeline lease | Multi-instance deployment with lease-based single-writer protection |
| Standalone collector node | Deploy across network segments: the collector holds no target credentials, buffers locally for resumable sync, and reports its version for inspection |
| Overview dashboard | Task status, throughput, latency, and backlog on one auto-refreshing screen with quick links |
| Pipeline metrics | Latency (P50/P95), backlog, event and per-table metrics, and snapshot progress in real time |
| Task orchestration | Draft / starting / running / paused / error / stopped — fully visible and controllable |

### 4. Data Audit (Commercial)

| Feature | Description |
|---|---|
| Full baseline comparison | Chunked row-count + checksum comparison, dialect-agnostic |
| Incremental watermark checks | Watermark-column-based incremental comparison; first run doubles as the baseline |
| Sampled checks | Deterministic proportional sampling for low-cost daily verification |
| Diff location & repair | Block-level diff lists, row-level detail (source_only / target_only / changed), one-click point repair |
| Heterogeneous repair | Semantics-aware repair into Elasticsearch, ClickHouse and other targets |
| Consistency reports | CSV export for delivery acceptance evidence |

### 5. Alerting & Ecosystem

| Feature | Description |
|---|---|
| Alert rules | Global and per-task rules across latency / backlog / disconnect metrics |
| Multi-channel delivery | Feishu, DingTalk, WeCom robots and SMTP email |
| GoWind IM integration | Precise error messages pushed to IT ops via IM robots |
| Delivery ledger | Every dispatch recorded; failed deliveries resend in one click |
| Agent scripts (Commercial) | Describe a cleansing need in natural language and get ETL rules generated (GoWind Agent integration) |

## Screenshots

### Overview & Datasources

| Overview | Datasources |
| :---: | :---: |
| ![Overview](/assets/images/cdc/dashboard.png) | ![Datasources](/assets/images/cdc/datasources.png) |

### Sync & Audit

| Pipelines | Data Audit |
| :---: | :---: |
| ![Pipelines](/assets/images/cdc/pipelines.png) | ![Data Audit](/assets/images/cdc/audit-tasks.png) |

### Alerts & Channels

| Alert Records | Channels |
| :---: | :---: |
| ![Alert Records](/assets/images/cdc/alert-records.png) | ![Channels](/assets/images/cdc/channels.png) |

## Use Cases

- **Legacy migration**: move SQL Server / Oracle estates onto PostgreSQL/MySQL with full + incremental in one pipeline, business uninterrupted
- **Real-time integration**: stream business-database changes into warehouses, reporting, search, and caches in seconds instead of T+1 nightly batches
- **Database disaster recovery**: bidirectional sync with loop-back markers for hot-standby pairs, with incremental audits keeping both sides provably consistent
- **Compliant data egress**: mask production data before it reaches dev/test or BI dashboards — SM3 supported
- **B2B delivery**: no JVM/Kafka cluster to stand up; a single box is enough, cutting delivery cost and ops surface

## Delivery & Deployment

GoWind CDC ships as a private deployment and shares the same stack as the GoWind family. It runs standalone, or together with GoWind IM and GoWind Ops as a combined data-pipeline + alerting + operations solution. Deployment documentation is provided with delivery — contact us below for trials and deployment services.

::: tip Contact
Reach us on WeChat at `yang_lin_bo` (note **CDC - Company - Name**),
or by email at <yanglinbo@gmail.com>
for product trials, private deployment, and custom development.
:::
