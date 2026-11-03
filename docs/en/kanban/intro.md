# GoWind Kanban

GoWind Kanban is a real-time collaborative kanban system that organizes team tasks and field operations around "boards + lists + cards".
The system is architected for **free switching between microservices and a monolith** and achieves real-time multi-client sync via **SSE / WebSocket**;
the mobile client is built on Flutter with **one codebase compiled for six platforms** (iOS / Android / Web / macOS / Windows / Linux),
optimized for frontline and field work scenarios with **offline-first** support.

If you are looking for an alternative to Focalboard (Mattermost Boards), GoWind Kanban is worth a try.
The project is open-sourced under the **MIT license**, and trials, feedback, and contributions are welcome.

::: tip Rapid iteration in progress
GoWind Kanban is under rapid iteration; the user manual and deployment documentation are still being improved.
If you run into issues, please report them via repository Issues — contributions are also very welcome.
:::

## 1. Core Highlights

### 1. Board Management

- **Boards / lists / cards**: everything needed to create and edit boards, lists, and cards;
- **Drag-and-drop transitions**: dragging a card across lists completes the status transition — zero learning cost.

### 2. Label Management

- **Label system**: use labels to mark a card's type, priority, or ownership;
- **Flexible organization**: group and filter tasks by label within a board to stay focused on priorities.

### 3. Real-Time Cross-Client Sync

- **SSE / WebSocket dual channel**: card creation, moves, and edits are broadcast to all collaborators in real time;
- **Consistent across devices**: the web console and the mobile app always show the same board state — collaborators never overwrite each other.

### 4. Offline-First

- **Usable on weak networks**: optimized for frontline and field work — keep working even when the network is unstable;
- **Field-friendly**: keep collecting offline; sync resumes automatically once back online — a fit for workshops, construction sites, and field service.

### 5. Multi-Tenancy and Permissions

- **Multi-tenant isolation**: multiple teams and business lines share one deployment, with data isolated between them;
- **RBAC permissions**: access control refined to the menu, button, and data level.

### 6. Platform Foundation Capabilities

- **Out-of-the-box foundation**: built-in dictionary management, task scheduling, login policies, i18n, and in-app messaging;
- **Five categories of audit logs**: key operations are fully logged, covering operations troubleshooting and compliance needs.

## 2. Feature Overview

| Feature domain | Key capabilities |
| --- | --- |
| Kanban collaboration | Creation and editing of boards / lists / cards, drag-and-drop card transitions, label management |
| Real-time sync | SSE / WebSocket real-time multi-client sync with consistent state everywhere |
| Offline capability | Offline-first; usable on weak networks and in the field |
| Tenancy and permissions | Multi-tenant isolation, RBAC (menu / button / data level) |
| Platform foundation | Dictionary management, task scheduling, login policies, i18n, in-app messaging, five categories of audit logs |

## 3. UI Preview

### Admin Console (Vue3 + Ant Design Vue + Vben Admin)

| ![Login page](/assets/images/kanban/login.png) | ![Board management](/assets/images/kanban/kanban.png) |
| :---: | :---: |
| *Login page* | *Board management* |

### Mobile App (Flutter, one codebase compiled for six platforms)

| ![App login](/assets/images/kanban/app-login.png) | ![App board list](/assets/images/kanban/app-boards.png) |
| :---: | :---: |
| *App login* | *App board list* |

| ![App board view](/assets/images/kanban/app-kanban.png) |  |
| :---: | :---: |
| *App board view* |  |

## 4. Use Cases

### Frontline and field operations

Designed for frontline settings — workshops, construction sites, stores, field service:

- Offline-first: kanban work continues on weak or lost networks;
- One Flutter codebase covering phones, desktops, and the web — field devices work right after install;
- Data syncs automatically once back online, so the back office sees field progress in real time.

### Team task collaboration

Kanban-driven task management for small teams:

- Drag cards to change status; use labels for priority and ownership;
- SSE / WebSocket real-time sync — zero lag between team members.

### Focalboard replacement and self-hosting

Replace the unmaintained Focalboard (Mattermost Boards):

- MIT open source, self-hostable — data fully under your control;
- Free switching between microservices and monolith, scaling smoothly from a personal deployment to an enterprise cluster.

### One deployment shared by multiple teams

A multi-tenant architecture supporting parallel business lines:

- Data of multiple teams and business lines is mutually isolated;
- Menu-, button-, and data-level RBAC permissions assigned as needed.

## 5. Tech Stack and Deployment

The backend is built on the go-kratos framework, uses Ent ORM for data access, and stores business data in PostgreSQL,
supporting free switching between the microservice and monolith forms;
the admin console is built on Vue3, Ant Design Vue, and Vben Admin, and the mobile app is developed with Flutter,
one codebase compiled for iOS / Android / Web / macOS / Windows / Linux — six platforms in total.

| Component | Description |
| --- | --- |
| Backend | go-kratos + Ent + PostgreSQL, free switching between microservices and monolith |
| Admin console | Vue3 + Ant Design Vue + Vben Admin |
| Mobile app | Flutter, one codebase compiled for six platforms |
| Real-time channel | SSE / WebSocket |
| Deployment | docker-compose supports two modes: `full_deploy` (one-shot deployment of middleware + applications) and `libs_only` (middleware only, recommended for development and debugging) |

## 6. Open-Source Repository and Contact

GoWind Kanban is open-sourced under the **MIT license**. There is currently **no public demo site**; you can deploy it locally to try it out.

| Entry point | Address |
| --- | --- |
| Source repository (GitHub) | <https://github.com/tx7do/go-wind-kanban> |

::: tip Contact Us
Reach us on WeChat at `yang_lin_bo` (remark: **go-wind-kanban**),
or by email at <yanglinbo@gmail.com>,
to discuss product features, issue reports, contribution and cooperation, and related topics.
:::
