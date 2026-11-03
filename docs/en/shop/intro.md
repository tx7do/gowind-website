# GoWind Shop Product Introduction

GoWind Shop is an enterprise-grade multilingual e-commerce platform built for going global, with an **API-first, front-end/back-end separated** architecture. It natively supports **multilingual content delivery** and **multi-currency product display**, helping businesses quickly launch brand storefronts for consumers worldwide, with on-premise deployment support.

GoWind Shop is an **open-source project in the GoWind ecosystem**: the source code is open — trial use, feedback, and contributions are welcome. On-premise deployment and technical support services are also available; for cooperation, reach us through the contact channels at the end of this page.

## 1. Product Positioning

| Dimension | Description |
| --- | --- |
| Target market | Built for going global, serving consumers worldwide |
| Product form | Enterprise-grade multilingual e-commerce platform (storefront + admin console) |
| Architecture philosophy | API-first, front-end/back-end separated |
| Multilingual | Native multilingual content delivery; both storefront pages and product content support multiple languages |
| Multi-currency | Multi-currency product display with a single settlement currency — operations and finance stay clear |
| Deployment | On-premise deployment supported, keeping data and business under your control |

## 2. Core Highlights

### 1. Built for Going Global: Multilingual and Multi-Currency

- **Native multilingual content delivery**: products, categories, and other content are managed with multiple languages as first-class citizens; the storefront presents content in the visitor's language automatically
- **Multi-currency product display**: product prices display in multiple currencies, matching the browsing habits of consumers in different regions
- **Single settlement currency**: display in multiple currencies, settle in one — reconciliation for operations and finance stays simple and clear
- **Mobile-first adaptation**: the storefront is deeply optimized for mobile, with a fixed bottom navigation bar

### 2. A Flexible, Powerful Promotions Engine

- **Multiple promotion types**: product special pricing, store spend-and-save deals, flash sales, and group buying — all in one place
- **Oversell-proof flash sales**: flash sales use row-level locking to prevent overselling, with purchase limits supported
- **Automated group buying**: supports N-buyer groups; if a group does not fill by the deadline, refunds are issued and the activity closes automatically
- **Unified pricing**: group buying, flash sales, and special pricing share a single pricing priority, stacking with coupons up to a cap — discount exposure stays controlled

### 3. Solid Payments and Reconciliation

- **Mainstream payment channels**: WeChat Pay (Native / H5) and Alipay supported
- **Two-phase payment**: a two-phase design of payment intent and payment callback keeps payment states reliable
- **Self-healing reconciliation**: payment reconciliation repairs inconsistencies automatically, reducing manual intervention
- **Refund drift detection**: anomalous refund drift is detected automatically to safeguard funds
- **Fund isolation**: the deployer collects payments with its own merchant credentials — the platform never touches funds

### 4. AI Shopping Assistant

- **Conversational shopping guidance**: a floating assistant on the buyer side; buyers ask in natural language and get shopping advice
- **Closed-loop capabilities**: tool-loop calls for finding products, checking prices, checking orders, checking offers, and more
- **Smart search**: AI query rewriting converts natural language into search keywords automatically, improving search hit rates

### 5. Fully Automated Orders and After-Sales

- **Order automation**: unpaid orders are cancelled automatically on timeout; receipt is confirmed automatically when delivery confirmation is overdue
- **Fully automated after-sales**: after a buyer files an after-sales request and it is approved, the channel refund, inventory restock, points reversal, and in-site notification all complete automatically
- **End-to-end notifications**: key milestones across the order lifecycle reach buyers via in-site messages, so status changes are known instantly

## 3. Feature Overview

| Functional domain | Main capabilities |
| --- | --- |
| Products and trading | Product / SKU publishing and shelving; attributes, category trees, and brand management; SKU pricing; shopping cart; full-text search and search suggestions |
| Orders and automation | Order state machine; automatic cancellation of unpaid orders; automatic receipt confirmation on delivery timeout; in-site notifications across the order lifecycle |
| Marketing and promotions | Product special pricing, store spend-and-save deals, flash sales (oversell-proof + purchase limits), group buying (N-buyer groups, automatic refund and close on expiry), unified pricing priority |
| Coupons and membership | Coupon templates / issuance / redemption / refund return; member points (earned on purchase, check-ins, coupon redemption); member levels tiered automatically by cumulative payment |
| Transaction safeguards | Fully automated after-sales refund loop; inventory operation audit trail; logistics delivery state machine linkage; XLSX financial reconciliation export, invoices, tax rate rules, shipping templates |
| Payments | WeChat Pay Native / H5, Alipay; two-phase payment, self-healing reconciliation, refund drift detection, order-close linkage |
| AI capabilities | AI shopping assistant (find products / check prices / check orders / check offers), AI search query rewriting, AI comment spam filtering |
| Platform capabilities | Multi-tenancy, RBAC permissions, multilingual dictionaries, task scheduling, audit logs, email password recovery, login policies, in-site messaging |

For detailed descriptions of each functional domain, see the [Feature Manual](/en/shop/features.md).

## 4. UI Preview

### Storefront

The storefront uses a deep-green brand design with 20 pages, supporting light and dark themes, mobile adaptation, and multiple languages.

| Store home (light theme) | Store home (dark theme) |
| :---: | :---: |
| ![Store home (light theme)](/assets/images/shop/app-home.png) | ![Store home (dark theme)](/assets/images/shop/app-home-dark.png) |

| Product page with promotions | My orders |
| :---: | :---: |
| ![Product page with promotions](/assets/images/shop/app-product-promo.png) | ![My orders](/assets/images/shop/app-orders.png) |

| In-site messages | |
| :---: | :---: |
| ![In-site messages](/assets/images/shop/app-messages.png) | |

### Admin Console

The admin console is built on Vue3 and Element Plus, supports a dark theme, and renders status columns as colored tags across all modules.
Product editing follows the CMS paradigm, with rich-text details and translation tabs.

| Promotion management | Order management |
| :---: | :---: |
| ![Promotion management](/assets/images/shop/admin-promotions.png) | ![Order management](/assets/images/shop/admin-orders.png) |

| Inventory operation logs | |
| :---: | :---: |
| ![Inventory operation logs](/assets/images/shop/admin-stock-op-logs.png) | |

## 5. Applicable Scenarios

### Global Brand Storefronts

Brand-owned stores for overseas consumers:

- Present brand and product content in multiple languages; display prices in multiple currencies and settle in one
- Combine the promotions engine with the membership system to close the loop from acquisition to repeat purchase
- On-premise deployment keeps business data under your control

### Multilingual Stores

Run multilingual product content from one console:

- Content is delivered natively in multiple languages — no separate site per language
- Product editing provides translation tabs, so operators maintain product details language by language
- The storefront presents content in the visitor's language automatically, localizing the browsing experience

### Private-Domain E-Commerce

Build a private-domain operation with your own user pool:

- Coupons, member points, flash sales, group buying, and other mechanics drive conversion and repeat purchase
- In-site messages reach buyers, with notifications across the entire order lifecycle
- Multi-tenancy supports multiple brands and business lines running side by side without interference

## 6. Technical Architecture

The GoWind Shop back end is built on the go-kratos microservices framework, with Protobuf contracts driving service design and implementation.
The data layer uses PostgreSQL for business data, OpenSearch for full-text search, and Redis for high-speed caching.
The admin console is built on Vue3 and Element Plus; the storefront is delivered as a Nuxt static site (SSG)
with 20 pages, supporting light and dark themes, mobile adaptation, and multiple languages.
The product deploys via Docker Compose, with nginx providing same-origin HTTPS reverse proxying and PM2 managing application processes.

## 7. Get It and Contact Us

GoWind Shop is an open-source project with online demo environments:

| Entry | Address |
| --- | --- |
| Source repository (GitHub) | <https://github.com/tx7do/go-wind-shop> |
| Storefront demo | <https://shop.gowind.cloud> |
| Admin console demo | <https://admin.shop.gowind.cloud> |

To run it locally, see [Quick Start](/en/shop/quick-start.md); for a recommended tour, see [Online Demo](/en/shop/trial.md); for feature details, see the [Feature Manual](/en/shop/features.md).

::: tip Contact Us
Reach us on WeChat at `yang_lin_bo` (note: **go-wind-shop**),
or email <yanglinbo@gmail.com>,
with questions about product features, contributions, and on-premise deployment services.
:::
