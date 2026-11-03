# GoWind ERP Product Overview

GoWind ERP is an enterprise-grade open-source ERP for small and mid-sized teams, designed around the "**purchasing — inventory — finance**" business loop,
with the promise of **no implementation consultants, half-day onboarding, and core business data fully connected end to end**.

The product's core philosophy is "documents drive documents": once a purchase order is approved, a payable is generated automatically; confirming goods receipt writes back to inventory automatically;
and when stock falls below the safety level, a replenishment suggestion is produced automatically — business data is entered once and flows through the whole chain automatically.
Purchasing, warehousing, and finance collaborate on the same set of data, with no more shuttling spreadsheets back and forth to reconcile.

GoWind ERP is an open-source project of the GoWind ecosystem, released under the **MIT license**; trials, feedback, and contributions are welcome.
The companion GoWind WMS (a multi-owner warehouse management system) is derived from this product's inventory module.
For private deployment and technical support services, please contact us via the information at the end of this page.

## 1. Core Highlights

### 1. Out of the box, no implementation consultants

- **Core flows built in**: the purchasing, inventory, and finance main lines work out of the box, with no on-site consultant configuration
- **Initialization upon registration**: tenant initialization completes automatically once multi-tenant registration is done, saving the one-time cost of system setup
- **Half-day onboarding**: UI and flows match real business operations, keeping the learning cost low for small and mid-sized teams

### 2. A business loop where documents drive documents

- **Approval generates payables**: once a purchase order is approved, the payable is generated automatically — no second entry by finance
- **Goods receipt writes back to inventory**: confirming receipt updates inventory automatically, keeping books and stock from the same source
- **Automatic replenishment for low stock**: when stock falls below the safety level, replenishment suggestions are generated automatically, so stocking up has a basis
- **Data fully connected**: documents trigger each other automatically; purchasing, warehousing, and finance share one set of business data

### 3. Inventory transaction safety

- **Inventory state machine**: all inventory changes flow through a state machine, making states predictable and traceable
- **Atomic cross-warehouse transfers**: transfer orders execute atomically as transactions, with no intermediate state where "the source warehouse was debited but the destination not credited"
- **Idempotent reversals**: reversal operations are idempotent — repeated submissions never create duplicate reversals

### 4. A unified approval track that forbids self-approval

- **Unified approval track**: key documents go through the unified approval flow, with records fully logged and queryable
- **No self-review or self-approval**: submitter and approver are forcibly separated, eliminating self-approval
- **Approval center**: centralized to-do handling, combined with in-app message reminders, so no approval is missed

### 5. Mobile: scanning, approvals, and business dashboard

- **Flutter app**: a native mobile client for handling business anytime, anywhere
- **Scan-based operations**: complete on-site operations by scanning, reducing manual entry errors
- **Mobile approvals**: handle pending approvals from your phone at any time
- **Business dashboard**: managers keep an eye on the business from mobile

### 6. Multi-tenant, ready upon registration

- **Multi-tenant architecture**: data is isolated between tenants; multiple teams share one deployment
- **Initialization upon registration**: tenant base data is initialized automatically once registration completes — register and use immediately
- **Fine-grained permissions**: organization, role, and button-level permissions controlled layer by layer, with end-to-end auditing

## 2. Feature Overview

### Organization & permissions

| Feature | Description |
| --- | --- |
| Multi-tenancy | Data isolation between tenants; automatic initialization upon registration |
| Organizations & roles | Organization structure and role management |
| Button-level permissions | Fine-grained, button-level permission control on pages |
| End-to-end auditing | Full audit trail of key operations |

### Inventory / WMS

| Feature | Description |
| --- | --- |
| Inventory state machine | Inventory changes flow uniformly through the state machine — predictable and traceable |
| Cross-warehouse transfers | Transfer orders execute atomically as transactions |
| Idempotent reversals | Reversal operations are idempotent — safe error correction |
| Replenishment suggestions | Generated automatically when stock falls below the safety level |

### Purchasing & SRM

| Feature | Description |
| --- | --- |
| Supplier management | Supplier profiles and collaboration management |
| Purchase order lifecycle | Full-flow management from ordering, approval, receiving, to closure |
| Line-item receiving | Receive line by line against purchase order details, preventing over-receiving |

### Finance & payables

| Feature | Description |
| --- | --- |
| Automatic payable generation | Payables generated automatically once a purchase is approved |
| Payment state machine | Payments flow through a state machine, making states reliable |
| Aging report | Payables aging analysis report |

### Approvals & collaboration

| Feature | Description |
| --- | --- |
| Unified approval track | Key documents approved uniformly; self-approval forbidden |
| In-app messaging | In-site message notifications so collaboration misses nothing |
| Task scheduling | Scheduled scheduling of background tasks |

### Mobile

| Feature | Description |
| --- | --- |
| Flutter app | Scan-based operations, mobile approvals, business dashboard |

### Platform capabilities

| Feature | Description |
| --- | --- |
| Data dictionary | Unified data dictionary management |
| i18n | Multilingual UI support |

## 3. UI Preview

### Login and dashboard

| Login page | Business dashboard |
| :---: | :---: |
| ![Login page](/assets/images/erp/login.png) | ![Business dashboard](/assets/images/erp/dashboard.png) |

### Purchasing and approvals

| Purchase order management | Approval center |
| :---: | :---: |
| ![Purchase order management](/assets/images/erp/purchase-orders.png) | ![Approval center](/assets/images/erp/approval.png) |

### Finance

| Payables management | Aging report |
| :---: | :---: |
| ![Payables management](/assets/images/erp/payables.png) | ![Aging report](/assets/images/erp/aging.png) |

| Accounting vouchers / journal | |
| :---: | :---: |
| ![Accounting vouchers / journal](/assets/images/erp/journal.png) | |

## 4. Use Cases

### Purchasing–inventory–payables management for small and mid-sized teams

- Ordering, approval, receiving, payables, and payment in one straight line
- Payables and inventory are linked automatically through documents — no manual spreadsheet reconciliation
- Automatic replenishment suggestions for low stock reduce material shortages and stockouts

### Multi-warehouse operations

- Cross-warehouse transfers execute atomically, keeping books and stock consistent
- The inventory state machine makes every change traceable
- Idempotent reversals — correct errors without fear of duplicate operations

### Teams requiring approval compliance

- Unified approval track + no self-approval satisfy basic internal-control requirements
- End-to-end audit trails are traceable after the fact
- Managers run the business remotely via mobile approvals and the business dashboard

## 5. Tech Stack and Deployment

The GoWind ERP backend is built on the **go-kratos** microservice framework, uses **Ent** as ORM, and stores data in **PostgreSQL**;
the admin console is built on **Vue3 + Ant Design Vue** with **Vben Admin** as the template base; the mobile client is a **Flutter app**.

Deployment uses docker-compose to bring up the middleware in one command (PostgreSQL, Redis, MinIO, etcd — all bound to 127.0.0.1),
while the application side provides two service entries: admin BFF (`:6600`) and app BFF (`:6700`).
For detailed deployment steps, see the `docs/deployment.md` deployment documentation in the repository.

## 6. Open-Source Repository and Contact

| Entry point | Address |
| --- | --- |
| Source repository (GitHub) | <https://github.com/tx7do/go-wind-erp> |
| Public demo site | Not yet available; follow the deployment docs to try it locally |

For developers: clone the repository and follow `docs/deployment.md` to complete a local deployment. Issues and PRs are welcome for co-building.

::: tip Contact Us
Reach us on WeChat at `yang_lin_bo` (remark: **go-wind-erp**),
or by email at <yanglinbo@gmail.com>,
to discuss product features, contribution and co-building, private deployment services, and related topics.
:::
