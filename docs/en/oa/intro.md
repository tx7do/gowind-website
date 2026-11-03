# GoWind OA

GoWind OA is an enterprise collaboration and office automation system covering day-to-day office scenarios such as **approval workflows, HR attendance, leave requests, and expense reimbursement**.
The system ships with a **lightweight workflow engine** as the foundation of its approval flows, together with a web admin console and a mobile app,
helping enterprises handle requests, approvals, clock-ins, and expense management on a single platform.

GoWind OA is an open-source project of the GoWind ecosystem, released under the **MIT license**: the source code is open, and trials, feedback, and contributions are welcome.
You are also welcome to reach out through the contact information at the end of this page.

## 1. Core Highlights

### 1. Workflow Engine

- **Lightweight approval foundation**: a built-in lightweight workflow engine serves as the basis for approval flows across the entire system;
- **Linear state machine**: flows advance linearly through a state machine, keeping node transitions clear and controllable;
- **Countersign / or-sign**: nodes support countersign (all approvers must pass before the flow moves on) and or-sign (any single approval passes);
- **Approval withdrawal**: applicants can withdraw a flow that has not yet completed, correcting mistaken submissions in time;
- **Visual workflow editor**: flows are designed and adjusted visually, lowering the barrier to workflow maintenance.

### 2. Approval Center

- **Centralized to-dos**: every approval that needs my action is gathered in one to-do list, cleared one by one with nothing missed;
- **Reassignment collaboration**: approvers can hand a document over to another colleague, keeping the flow alive even when someone is out of office;
- **Full audit trail**: submission, approval, rejection, and reassignment of every document are recorded throughout, traceable at any time.

### 3. Attendance Management

- **GPS + Wi-Fi geofence clock-in**: mobile clock-in combines GPS positioning with a Wi-Fi geofence for double verification, so locations are genuine and trustworthy;
- **Scheduled settlement**: attendance data is settled on a fixed cycle, automating monthly statistics and reducing manual verification.

### 4. Leave Management

- **Quota management**: leave quotas are managed centrally with clearly visible balances, and over-quota requests are blocked automatically;
- **Half-day granularity**: leave supports the half-day as the minimum unit, matching real time-off habits.

### 5. Expense Reimbursement

- **Direct invoice photo upload**: photograph and upload invoices from the mobile app, submitting reimbursement materials on the spot — no pasting or scanning required;
- **Workflow-based approval**: reimbursement claims go through the unified approval flow, with progress visible in real time.

### 6. Four Types of Administrative Documents

- **Business trip request**: online application and itinerary reporting for business trips;
- **Overtime request**: overtime registration tied into attendance data;
- **Seal usage request**: application and registration for company seal usage, with every use on record;
- **Outing request**: filed outing requests keep whereabouts clear.

### 7. In-App Messages and Announcements

- **SSE real-time push**: approval to-dos and flow status changes are pushed to clients in real time via SSE, so nothing is handled late;
- **Company announcements**: administrators publish company announcements, delivering important notices to the whole company.

### 8. Corporate Directory

- **Clear org structure**: browse colleague information along the org chart and find people fast;
- **Data masking**: sensitive information such as phone numbers is displayed masked, protecting employee privacy.

### 9. Dynamic Form Engine

- **Forms configured with the flow**: request forms are rendered by the dynamic form engine, with fields defined flexibly by document type;
- **Fast response to business change**: adding or adjusting document fields is done through configuration, with no code changes.

## 2. Feature Overview

| Feature domain | Key capabilities |
| --- | --- |
| Workflow engine | Linear state-machine transitions, countersign / or-sign, approval withdrawal, visual workflow editor |
| Approval center | Centralized to-do handling, reassignment collaboration, full approval audit trail |
| Attendance management | GPS + Wi-Fi geofence clock-in, scheduled attendance settlement |
| Leave management | Leave quota management, half-day granularity |
| Expense reimbursement | Invoice photo upload, workflow-based approval |
| Administrative documents | Business trip, overtime, seal usage, and outing requests |
| Messages and announcements | In-app message push via SSE, company announcements |
| Corporate directory | Org-chart browsing, masking of sensitive information |
| Dynamic form engine | Forms rendered per flow type, flexibly extensible fields |

## 3. UI Preview

### Admin Console (Vue3 + Element Plus)

| ![Login page](/assets/images/oa/login.png) | ![Workbench](/assets/images/oa/dashboard.png) |
| :---: | :---: |
| *Login page* | *Workbench* |

| ![Visual workflow design](/assets/images/oa/workflow.png) | ![Approval center](/assets/images/oa/approvals.png) |
| :---: | :---: |
| *Visual workflow design* | *Approval center* |

| ![Attendance management](/assets/images/oa/attendance.png) |  |
| :---: | :---: |
| *Attendance management* |  |

### Mobile App (Flutter)

| ![App login](/assets/images/oa/app-login.png) | ![App workbench](/assets/images/oa/app-dashboard.png) |
| :---: | :---: |
| *App login* | *App workbench* |

| ![App clock-in](/assets/images/oa/app-attendance.png) | ![App profile](/assets/images/oa/app-mine.png) |
| :---: | :---: |
| *App clock-in* | *App profile* |

## 4. Use Cases

### Taking everyday enterprise approvals online

Move requests scattered across paper forms and group chats onto one online platform:

- Business trip, overtime, seal usage, and outing requests all follow a unified approval flow;
- Flow nodes are designed and adjusted to match your own management rules;
- The approval process is fully recorded, traceable and auditable afterwards.

### HR attendance and leave management

Attendance and leave management backed by genuine location data:

- GPS + Wi-Fi geofence clock-in for field and on-site staff, eliminating buddy punching;
- Leave quotas managed centrally, with half-day granularity fitting HR policies;
- Attendance data settled on schedule, with monthly statistics automated.

### A closed loop for expense reimbursement

Reimbursement materials circulate electronically, with progress checkable anytime:

- Employees photograph and upload invoices on mobile, submitting reimbursements anytime, anywhere;
- Reimbursement claims enter the unified approval flow, giving finance a solid basis for processing.

## 5. Tech Stack and Deployment

The backend is built on the go-kratos microservice framework, uses Ent ORM for data access, and stores business data in PostgreSQL;
the admin console is built on Vue3 and Element Plus, and the mobile app is developed with Flutter, covering Android and iOS.
For local deployment, docker-compose brings up middleware such as PostgreSQL, Redis, MinIO, etcd, and Jaeger with one command;
business services are split by client into two entry groups — an admin console BFF and a mobile BFF — each with its own SSE push port.

| Component | Description |
| --- | --- |
| Backend | go-kratos + Ent + PostgreSQL, microservice architecture |
| Admin console | Vue3 + Element Plus |
| Mobile app | Flutter |
| Middleware | PostgreSQL / Redis / MinIO / etcd / Jaeger, one-command start with docker-compose |
| Service ports | Admin BFF `:6600` (SSE `:6601`); App BFF `:6700` (SSE `:6701`) |

## 6. Open-Source Repository and Contact

GoWind OA is open-sourced under the **MIT license**. There is currently **no public demo site**; you can deploy it locally following the repository documentation.

| Entry point | Address |
| --- | --- |
| Source repository (GitHub) | <https://github.com/tx7do/go-wind-oa> |

The repository's `docs/` directory offers thorough materials for going deeper:

- **quick-start**: quick start guide;
- **admin / mobile-user-guide**: user manuals for the admin console and the mobile app;
- **developer-guide**: developer guide;
- **workflow-design**: workflow design notes.

::: tip Contact Us
Reach us on WeChat at `yang_lin_bo` (remark: **go-wind-oa**),
or by email at <yanglinbo@gmail.com>,
to discuss product features, issue reports, contribution and cooperation, and related topics.
:::
