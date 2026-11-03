# Release Notes

GoWind Admin maintains an iteration cadence of **roughly one release cut per week**: every Monday a new version is cut from the main branch to deliver features quickly and keep the documentation in sync. This article summarizes the highlights of each version in reverse chronological order, helping you quickly grasp how the project has evolved.

- First official release: **v1.0.0** (09-24)
- Latest official release: **v1.5.0** (10-29)
- Content that has been merged but not yet released is grouped under the **Unreleased** section

::: tip
Before upgrading, it is recommended to read through the changes of the two adjacent versions and confirm whether the modules you use are affected. The complete code changes for each version can be viewed in the source repository (GitHub / Gitee / AtomGit mirrors, `tx7do/go-wind-admin`).
:::

## v1.5.0 (10-29)

Theme: **BI dashboard + print templates**, filling in the two major capabilities of data presentation and business document output.

### Full-Stack BI Dashboard

- Visual drag-and-drop canvas for freely composing dashboard layouts
- Cross-chart linking: filters on one chart can drive the entire page of charts to refresh
- Data drill-down, going from summary figures into details layer by layer
- 9 built-in themes for different presentation scenarios

### Print Template Module

- Visually design print templates with drag and drop, so business staff can adjust document layouts on their own
- Line printing and batch printing, suited to receipts, itemized lists, and similar scenarios
- Server-side PDF rendering (based on chromedp), so export results are browser-independent with stable layouts
- Built-in A4, A5, and employee badge seed templates, ready out of the box

## v1.4.0

Theme: **AI Agent orchestration + expanded notification capabilities**.

### Full-Stack AI Agent Orchestration

- Graph DSL: describe Agent orchestration flows with five node types
- Visual canvas: drag-and-drop orchestration with flows at a glance
- Trial runs stream output in real time via SSE, so orchestration results can be validated instantly

### Notification Channel Expansion

- Extended channels increased to **39**, covering mainstream messaging platforms
- Added Alibaba Cloud SMS and Tencent Cloud SMS channels

### Account Security

- Password recovery via mobile phone number

## v1.3.0

Theme: **workbench aggregation page isomorphic across the three frontend stacks**.

- The workbench aggregation page is implemented isomorphically across the React, Vue Element, and Vue Vben frontends
- Users of all three stacks see an identical workbench layout and information structure; switching frontend implementations carries no learning cost

## v1.2.0

Theme: **enterprise-grade identity and compliance capabilities**, closing gaps for external delivery and corporate intranet scenarios.

### Enterprise OIDC SSO

- Enterprise OIDC single sign-on, verified against Keycloak
- Enterprise users can plug directly into an existing identity system without rebuilding accounts

### Notification Domain Phase 3 Wrap-Up

- The three-phase plan for the notification domain is complete; notification-related capabilities now form a full closed loop

### Compliance & Quotas

- Audit logs support server-side streaming export, going beyond the row limit of regular list exports
- Hard enforcement of plan quotas: operations that exceed the limit are blocked outright — quotas are no longer just "bookkeeping"

### Tenants & AI

- Tenant white-labeling: tenant-level brand customization
- AI Function Call: the AI can invoke system functions, moving from "able to chat" to "able to get things done"

## v1.1.0

Theme: **full-stack delivery of the AI module**.

- AI chat module integrated full stack: SSE streaming chat output with accompanying quota management
- Knowledge base RAG: pgvector-based vector retrieval, grounding AI answers in evidence
- Intelligent data Q&A: query business data in natural language
- AI content generation: assists in drafting business content
- Global semantic search: a cross-module semantic retrieval entry point

## v1.0.0 (09-24)

The first official release, establishing the foundational shape of isomorphic frontends across the three stacks plus a monolithic backend.

### Script System

- Built-in Lua + JavaScript script engines
- Extend business logic without recompiling, suited to lightweight customization scenarios

### Design Language Specification

- Published a design language specification that unifies the visual and interaction baseline across the three stacks

### Online Users

- Online user session management for real-time visibility of current logins

## Unreleased (In Development)

Content already merged into the main branch, to be shipped with the next release:

### Object Storage Migration

- Object storage migrated from MinIO to **SeaweedFS**
- Background: the MinIO community edition is no longer maintained
- The migration required **zero code changes**, and existing configuration carries over smoothly

### Testing & Stability

- Second major round of backend unit tests: about 200 new unit tests added
- 8 production defects fixed for further stability improvements

::: warning
Unreleased content has not been officially released. Features are subject to the final release notes, and relying on unreleased behavior in production is not recommended.
:::
