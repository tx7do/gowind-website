# GoWind CRM

GoWind CRM is an **enterprise-grade B2B sales CRM built for on-premise deployment**: organized around the main line of "leads → customers → opportunities → quotations → contracts → payments", it brings customer acquisition, account management, sales progression, and payment collection into a single platform. Enterprise foundations — organization & permissions, approval workflows, data-scope policies, and audit compliance — work out of the box, and all sales data stays inside the company's own environment.

::: tip Who this page is for
- **Sales leaders**: see how the full loop from acquisition to payment is managed on one platform;
- **IT decision makers**: evaluate on-premise delivery, data-scope control, and audit compliance;
- **Pre-sales / implementation consultants**: quickly grasp the product picture and delivery model.
:::

## 1. Core Highlights

### 1. Acquisition and Leads

- **Inquiry mailbox integration**: bind an IMAP inquiry mailbox and new emails are pulled automatically, parsed intelligently, and turned into leads on arrival — deduplicated, distributed, and tracked. The foreign-trade acquisition pipeline runs itself;
- **Full lead lifecycle**: create, convert, assign, transfer, and release leads in one closed loop, so no prospect falls through;
- **Marketing automation**: rule-driven automation actions (manual or triggered execution) take the manual grind out of follow-ups.

### 2. Customers and Public Pools

- **Customers and contacts**: customer sharing, handover, deduplication, and column configuration all built in;
- **Public pools**: multiple pools with rule-based automatic recall and assignment, plus a claim protection window to prevent deal-snatching — dormant customers get reactivated;
- **Follow-up calendar**: every follow-up is recorded, and the calendar view makes each person's visit and contact schedule clear at a glance.

### 3. Opportunity Progression

- **Opportunity kanban**: the full lifecycle advances visually, with won deals confirmed through approval;
- **Custom stages**: sales stages configured freely to match your own deal process;
- **Weighted forecast**: revenue forecast weighted by stage win rate, with pipeline health flagged early.

### 4. Quotations, Contracts, and Payments

- **Quotations**: line-item pricing, approval routing, printing, and PDF export — customer documents delivered directly;
- **Contracts**: contract templates, closed-loop approval submission, and expiry reminders;
- **Payments**: collection plans, payment records, an overdue ledger, weighted forecasts, and reconciliation exports — payment risks surface early.

### 5. Enterprise Foundation

- **Approval engine**: closed-loop approvals for quotations, won opportunities, contract submissions, and other business documents;
- **Data-scope policies**: a policy engine controls data visibility by role / department / individual, with every evaluation on the record;
- **Custom fields**: customers, leads, and opportunities support extended attributes to fit your own business language;
- **Sales targets**: targets decomposed level by level with progress tracked in real time;
- **After-sales tickets**: dispatch, handling, and follow-up visits in a closed loop, connecting service with sales;
- **Reports**: overview / funnel / trend / ranking across four dimensions, with xlsx export;
- **Open integration**: outbound Webhook subscriptions for business events, linking to external systems.

### 6. Security and Compliance

- **Five audit logs**: API, operation, login, data-access, and permission-change records kept in full;
- **Account security**: MFA, OAuth, sign-in policies, and login audit;
- **Multi-tenant and multilingual**: multi-tenant isolation with a Chinese/English UI — one system serving multiple entities.

## 2. Feature Map

| Domain | Key Capabilities |
| --- | --- |
| Acquisition and leads | Inquiry mailbox integration (IMAP auto capture / distribution tracking), lead conversion and assignment, marketing automation rules |
| Customers and pools | Customer sharing / handover / deduplication, contact management, multi-pool rule-based recall and claims |
| Opportunities | Kanban progression, custom stages, weighted forecast, won-deal approval |
| Quotations and contracts | Line-item quotes, approval, printing / PDF export; contract templates, submission approval, expiry reminders |
| Payments | Collection plans, payment records, overdue ledger, weighted forecast, reconciliation export |
| Platform | Approval engine, data-scope policies, custom fields, sales targets, after-sales tickets, xlsx report export, Webhooks |
| Security and compliance | Five audit logs, MFA / OAuth / sign-in policies, multi-tenancy, multilingual UI |

## 3. Use Cases

### Foreign trade, from inquiry to deal

Inquiry emails become leads automatically → leads distributed and followed up → customers converted → opportunities advanced → quotations and contracts approved → payments collected. The whole foreign-trade sales chain runs on one line.

### B2B sales team management

Public pools recycle dormant customers by rule; sales targets decompose down to individuals; weighted forecasting surfaces revenue early; overview / funnel / ranking reports fit on one page.

### Data compliance and on-premise control

Fully on-premise deployment keeps sales data inside the corporate intranet; data-scope policies plus five audit logs satisfy internal control and compliance reviews.

## 4. Tech Stack and Deployment

The backend is built on the go-kratos microservice framework (a three-service architecture: admin BFF / app BFF / core business service), Protobuf-first contracts, and the Ent ORM;
the frontend is Vue3 + TypeScript (Vben Admin monorepo); Docker Compose brings up all dependencies with one command for both local and production use.

| Component | Description |
| --- | --- |
| Backend | go-kratos + Ent + PostgreSQL / MySQL, three-service microservice architecture |
| Frontend | Vue3 + TypeScript (Vben Admin) |
| Infrastructure | Redis, S3-compatible object storage, etcd, OpenTelemetry, Asynq |
| Deployment | Docker Compose one-command dependencies; private binary delivery supported |

## 5. Versions and Roadmap

Phase-one MVP capabilities (leads, customers and pools, opportunity kanban, follow-ups, reports, data permissions, approvals) and phase-two capabilities (quotations, contracts, payments, sales targets, after-sales tickets) are all live;
phase three is planned: AI lead scoring, sales forecasting, PaaS custom objects, BI dashboards, and deep IM integration.

## 6. Contact Us

GoWind CRM is **closed-source commercial software delivered on-premise**. For licensing, trials, and deployment:

- **WeChat**: `yang_lin_bo` (please include the note: **go-wind-crm**)
- **Email**: <yanglinbo@gmail.com>
