# GoWind WMS Product Overview

GoWind WMS is an enterprise-grade open-source warehouse management system (WMS) for **small and mid-sized 3PL warehouses, e-commerce warehouses, and factory finished-goods warehouses**,
with native support for **multi-owner** and **storage-bin-level** inventory management; its inventory engine draws on Odoo's stock.quant / picking / move modeling ideas.

GoWind WMS is derived from the inventory module of GoWind ERP, sharing the same stack and origin, and is open-sourced under the **MIT license**.
Trials, feedback, and contributions are welcome; for private deployment and technical support services, please contact us via the information at the end of this page.

::: tip Release notes
The open-source edition's features are fully implemented and have passed end-to-end smoke acceptance; the official release is in preparation.
Capabilities such as the billing engine and third-party platform integrations are planned for the commercial edition.
:::

## 1. Core Highlights

### 1. Multi-owner inventory isolation

- **Native 3PL support**: owners are modeled as first-class concepts, so one warehouse can serve multiple owners
- **Data isolation**: inventory and documents are isolated by owner — invisible to and unaffected by each other
- **One warehouse, many owners**: fits the real shape of 3PL warehouses running multiple clients in a shared facility

### 2. Odoo-style inventory engine

- **quant / picking / move modeling**: drawing on the mature Odoo stock model, inventory is traceable and every movement has a document
- **Batches and shelf life**: batch management with FEFO (First-Expired-First-Out) deduction
- **Moving average cost**: moving-average costing, rolling forward automatically with each inbound and outbound movement

### 3. End-to-end ASN arrival appointments

- **Arrival appointments**: owners submit an ASN (Advanced Shipping Notice) in advance, so inbound plans come first
- **Declaration and receiving**: arrivals are declared and confirmed on site, received against appointment details with over-receiving prevented
- **Putaway suggestions**: putaway suggestions are generated after receiving, so every putaway has a basis

### 4. Wave picking outbound

- **Direct release of outbound orders**: outbound orders can be released for execution once validation passes
- **Wave consolidation**: picking tasks are merged into wave picking and executed in batches, improving picking efficiency
- **Wave debugging**: a wave debugging view makes execution observable and troubleshootable

### 5. SaaS subscription and quota guardrails

- **Subscription management**: subscription management for SaaS-style operations
- **Quota guardrails**: usage is automatically blocked once the quota is reached, keeping resource consumption under control
- **Approval track**: key documents follow the unified approval track, fully logged and queryable

## 2. Feature Overview

### Inbound

| Feature | Description |
| --- | --- |
| ASN arrival appointment | Owners book inbound plans in advance |
| Arrival declaration | On-site declaration and confirmation of arrivals |
| Over-receiving protection | Receiving against appointment details, preventing over-receipt |
| Putaway suggestions | Generated after receiving |

### Outbound

| Feature | Description |
| --- | --- |
| Direct order release | Outbound orders are released for execution once validated |
| Outbound validation | Inventory and other checks completed before release |
| Wave consolidation & execution | Picking tasks merged into wave picking and executed in batches |

### Inventory operations

| Feature | Description |
| --- | --- |
| FEFO batch / shelf-life deduction | First-Expired-First-Out by batch shelf life |
| Inventory freeze & outbound blocking | Frozen inventory is automatically blocked from outbound |
| Inventory aging report | Bucketed statistics at 30 / 60 / 90 / 180+ days |
| Cross-warehouse transfers | Transfer orders execute atomically as transactions |
| Idempotent reversals | Reversal operations are idempotent — safe error correction |

### Multi-owner and subscription

| Feature | Description |
| --- | --- |
| Owner isolation | Inventory and documents isolated by owner |
| Approval track | Key documents approved uniformly with a full audit trail |
| Subscription quotas | SaaS subscription and quota guardrails |

### Platform

| Feature | Description |
| --- | --- |
| i18n | Chinese / English / Japanese trilingual UI |
| Auditing | Operation audit trail |

## 3. UI Preview

### Login and workbench

| Login page | Workbench |
| :---: | :---: |
| ![Login page](/assets/images/wms/login.png) | ![Workbench](/assets/images/wms/dashboard.png) |

### Warehouses and inbound

| Warehouse management | ASN arrival appointment |
| :---: | :---: |
| ![Warehouse management](/assets/images/wms/warehouses.png) | ![ASN arrival appointment](/assets/images/wms/asn.png) |

### Picking and waves

| Picking management | Wave management |
| :---: | :---: |
| ![Picking management](/assets/images/wms/pickings.png) | ![Wave management](/assets/images/wms/waves.png) |

### Wave debugging and inventory

| Wave debugging | Inventory query |
| :---: | :---: |
| ![Wave debugging](/assets/images/wms/waves-debug.png) | ![Inventory query](/assets/images/wms/inventory.png) |

## 4. Use Cases

### Small and mid-sized 3PL warehouses

- Multi-owner shared-warehouse operations, with data natively isolated per owner
- ASN arrival appointments + over-receiving protection keep inbound orderly
- Storage-bin-level management: precise slot positioning and clear operation paths
- SaaS subscription and quota guardrails make serving multiple owners easier

### E-commerce warehouses

- Wave picking consolidates picking tasks and executes them in batches to handle order peaks
- FEFO batch shelf-life deduction — first-expired-first-out
- Inventory aging report bucketed at 30 / 60 / 90 / 180+ days makes slow-moving stock visible at a glance
- Chinese / English / Japanese trilingual UI fits cross-border e-commerce and overseas warehouse teams

### Factory finished-goods warehouses

- Storage-bin-level management across the full inbound/outbound flow of finished goods
- Inventory freezing and outbound blocking keep abnormal stock under control
- Atomic cross-warehouse transfers keep books and stock consistent across warehouses

## 5. Tech Stack and Deployment

The GoWind WMS backend is built on the **go-kratos** microservice framework, uses **Ent** as ORM, and uses **gRPC** for inter-service communication;
the admin console is built on **Vue3**, and field operations are equipped with a **Flutter PDA (handheld scanner) client** (adapted to industrial handheld terminals).

Deployment mirrors GoWind ERP: docker-compose brings up the same set of middleware
(PostgreSQL, Redis, MinIO, etcd, bound to 127.0.0.1),
while the application side provides two service entries: admin BFF (`:6600`) and app BFF (`:6700`).
For detailed deployment steps, see the `docs/deployment.md` deployment documentation in the repository.

Both the inventory modeling and the deployment form of the WMS originate from GoWind ERP; to learn more, see the [GoWind ERP Product Overview](/en/erp/intro.md).

## 6. Open-Source Repository and Contact

| Entry point | Address |
| --- | --- |
| Source repository (GitHub) | <https://github.com/tx7do/go-wind-wms> |
| Public demo site | Not yet available; follow the deployment docs to try it locally |

For developers: clone the repository and follow `docs/deployment.md` to complete a local deployment. Issues and PRs are welcome for co-building.

::: tip Contact Us
Reach us on WeChat at `yang_lin_bo` (remark: **go-wind-wms**),
or by email at <yanglinbo@gmail.com>,
to discuss product features, contribution and co-building, private deployment services, and related topics.
:::
