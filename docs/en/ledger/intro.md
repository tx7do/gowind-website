# GoWind Ledger

GoWind Ledger is a personal / family bookkeeping platform built on the Go microservice architecture, consisting of an **Admin console** and a **Flutter mobile app**.
It covers income and expense records, multiple accounts, multiple currencies, reports, budgets, and recurring reminders, making every sum of money easy to record and easy to see.
Whether you are tracking daily personal finances or sharing one ledger with the whole family, it keeps income and spending under control in a lightweight way.

GoWind Ledger is an open-source project of the GoWind ecosystem, released under the **MIT license**: the source code is open, and trials, feedback, and contributions are welcome.
You are also welcome to reach out through the contact information at the end of this page.

## 1. Core Highlights

### 1. Four Transaction Types

- **Expense / income / transfer / balance adjustment**: four transaction types cover every everyday bookkeeping scenario;
- **Single-entry bookkeeping, ready on day one**: based on single-entry bookkeeping — each record is one row, with no learning cost of debit/credit entries.

### 2. Four Account Types

- **Checking / credit / asset / loan**: four account types cover cash and bank cards, credit cards, investment assets, and mortgage or car loans;
- **Linked transfers**: transfers between accounts are recorded in pairs with balances updated automatically, making reconciliation easy.

### 3. Category and Label System

- **4-level category tree**: income and expense categories support four levels of hierarchy, precisely grouping every expense;
- **Label system**: a transaction can carry multiple labels, adding multi-dimensional classification on top of categories.

### 4. Multi-Currency Bookkeeping

- **Multi-currency income and expenses**: foreign-currency income and expenses are recorded per currency, with clear conversion;
- **Exchange-rate caching and live refresh**: cached exchange rates speed up queries, while live refresh keeps converted amounts close to reality.

### 5. Multi-Dimensional Reports

- **Statistics on multiple dimensions**: income and expense reports by category, label, payee, and more;
- **ECharts visualization**: reports are presented as ECharts charts, so the structure of income and spending is clear at a glance.

### 6. Budget Management

- **Monthly / quarterly / yearly / weekly budgets**: set budgets per cycle for a category or overall;
- **Over-budget alerts**: warnings as soon as spending approaches or exceeds the budget, helping you keep spending in check.

### 7. Family Sharing

- **Group member invitation workflow**: bring family members into the same ledger through an invitation flow and keep books together;
- **Role permissions**: three tiers of roles — owner / operator / visitor — each viewing and operating within their permissions.

### 8. Recurring Reminders

- **Daily / monthly / yearly**: set bookkeeping reminders by cycle, so rent, subscriptions, bills, and anniversaries are never missed.

## 2. Feature Overview

| Feature domain | Key capabilities |
| --- | --- |
| Transaction bookkeeping | Four transaction types — expense / income / transfer / balance adjustment — with single-entry bookkeeping |
| Account management | Four account types — checking / credit / asset / loan — with linked balance updates on transfer |
| Categories and labels | 4-level category tree, multi-label system |
| Multi-currency | Multi-currency bookkeeping with exchange-rate caching and live refresh |
| Reports and statistics | Reports by category / label / payee, visualized with ECharts |
| Budget management | Monthly / quarterly / yearly / weekly budgets with over-budget alerts |
| Family sharing | Group member invitation workflow, owner / operator / visitor role permissions |
| Recurring reminders | Daily / monthly / yearly bookkeeping reminders |

## 3. UI Preview

### Admin Console (Vue3)

| ![Console data overview](/assets/images/ledger/admin-dashboard.png) | ![Income and expense transactions](/assets/images/ledger/admin-balance-flows.png) |
| :---: | :---: |
| *Console data overview* | *Income & expense transactions* |

| ![Statistical reports](/assets/images/ledger/admin-reports.png) |  |
| :---: | :---: |
| *Statistical reports* |  |

### Mobile App (Flutter)

| ![App transactions](/assets/images/ledger/app-flows.png) | ![App statistics](/assets/images/ledger/app-stats.png) |
| :---: | :---: |
| *App transactions* | *App statistics* |

| ![App accounts](/assets/images/ledger/app-accounts.png) |  |
| :---: | :---: |
| *App accounts* |  |

## 4. Use Cases

### Everyday personal bookkeeping

Jot it down whenever you want, one entry at a time:

- Single-entry bookkeeping works out of the box — an expense or income is one row;
- Record anytime on mobile; the console aggregates and manages everything centrally;
- Multi-dimensional reports and ECharts charts show exactly where the money went.

### A shared family ledger

One ledger for the whole family:

- Bring family members into the same ledger through the invitation workflow;
- Owner / operator / visitor roles are tiered, so elders and children each use it within their permissions;
- Family income and expenses, mortgages and car loans, and shared savings are presented in one place.

### Multi-currency and budget control

For households with foreign-currency flows or a desire to control spending:

- Foreign-currency income and expenses are recorded per currency, with rate caching and live refresh keeping conversions accurate;
- Monthly / quarterly / yearly / weekly budgets plus over-budget alerts keep spending within plan;
- Recurring reminders cover rent, subscriptions, bills, and other periodic expenses, so nothing is missed.

## 5. Tech Stack and Deployment

The backend is built on the go-kratos microservice framework, uses Ent ORM for data access, and stores business data in PostgreSQL;
the Admin console is built on Vue3, and the mobile app is developed with Flutter.
For local deployment, docker-compose brings up the middleware with one command, and business services are split into two entry groups: Admin BFF and App BFF.

| Component | Description |
| --- | --- |
| Backend | go-kratos + Ent + PostgreSQL, microservice architecture |
| Admin console | Vue3 |
| Mobile app | Flutter |
| Middleware | One-command start with docker-compose |
| Service ports | Admin BFF `:6600`; App BFF `:6700` |

## 6. Open-Source Repository and Contact

GoWind Ledger is open-sourced under the **MIT license**. There is currently **no public demo site**; you can deploy it locally to try it out.
The repository README is well structured, offering **role-based quick starts**, an **FAQ**, and a **contribution guide**, making it easy to get started and to contribute.
Stars, Issues, and Pull Requests are all welcome.

| Entry point | Address |
| --- | --- |
| Source repository (GitHub) | <https://github.com/tx7do/go-wind-ledger> |

::: tip Contact Us
Reach us on WeChat at `yang_lin_bo` (remark: **go-wind-ledger**),
or by email at <yanglinbo@gmail.com>,
to discuss product features, issue reports, contribution and cooperation, and related topics.
:::
