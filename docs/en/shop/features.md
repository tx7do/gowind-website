# GoWind Shop Feature Manual

This manual is written for e-commerce operators and introduces GoWind Shop's features by business domain, helping you quickly understand what the platform can do and where an operations team handles its day-to-day work.

## 1. Product Management

### Products and Categories

| Feature | Description |
| --- | --- |
| Product publishing and shelving | Product- and SKU-level publishing management; shelve or unshelve anytime to control sales |
| Attribute management | Maintain product attributes to standardize product information structure |
| Category trees | Multi-level category trees supporting complex product classification systems |
| Brand management | Brand information maintained centrally |
| SKU pricing | Prices set at SKU granularity to support differentiated selling |

### Product Content Editing

- **CMS-style editing**: product editing follows the CMS paradigm — compose product details the way you compose content
- **Rich-text details**: product details support rich-text editing for image-and-text product introductions
- **Translation tabs**: product editing includes built-in translation tabs for maintaining multilingual content language by language

### Product Search (Buyer Side)

- **Full-text search**: OpenSearch-based full-text product search with precise results
- **Search suggestions**: suggestions appear as you type, reducing buyers' input effort
- **AI query rewriting**: natural-language searches are rewritten into search keywords automatically, so even colloquial descriptions hit the right products
- **Periodic full re-indexing**: the system re-indexes everything periodically, keeping search results consistent with product data

## 2. Orders and Automation

### Shopping and Ordering

| Feature | Description |
| --- | --- |
| Shopping cart | Buyers add across products and check out in one place |
| Order state machine | Orders flow through a well-defined state machine — states are clear and traceable |
| Optimistic concurrency control | Order operations use optimistic concurrency control to prevent data conflicts from concurrent edits |

### Order Automation

- **Automatic cancellation on unpaid timeout**: unpaid orders are cancelled automatically when the payment window expires, releasing inventory and other reserved resources
- **Automatic receipt confirmation on delivery timeout**: if receipt is not confirmed within the window after delivery, the system confirms it automatically so orders don't hang indefinitely
- **Logistics delivery linkage**: logistics delivery is linked to the order state machine — shipping updates the order status immediately

### Order Notifications

- **In-site messages across the full lifecycle**: from order placement to after-sales completion, key order milestones are sent to buyers via in-site messages

::: tip Status at a glance
Status columns across all admin modules render as colored tags, so operators can tell the state of orders and every kind of business data at a glance.
:::

## 3. Marketing and Promotions

### Promotion Types

| Promotion | Rule essentials |
| --- | --- |
| Product special pricing | Exclusive prices set for designated products |
| Store spend-and-save | Store-wide spend-threshold discounts |
| Flash sale | Time-limited rush purchases; row-level locking prevents overselling, with purchase limits |
| Group buying | Groups form with N buyers; if the group does not fill by the deadline, refunds are issued and the activity closes automatically |

### Unified Pricing Priority

When a product matches multiple promotions at once, the price is taken by the following priority:

| Priority | Price type | Description |
| :---: | --- | --- |
| 1 (highest) | Group-buying price | Applied when a group-buying activity is matched |
| 2 | Flash-sale price | Applied when a flash sale is matched |
| 3 | Product special price | Applied when a specially priced product is matched |
| 4 (base) | Original product price | Applied when none of the promotions match, at the SKU's original price |

::: tip Discount stacking with a cap
Promotional prices can stack with coupons, but the combined discount is capped to prevent excessive giveaways and keep promotion costs under control.
:::

## 4. Coupons and Member Points

### Coupons

- **Template creation**: operators create coupon campaigns in bulk from coupon templates
- **Claiming**: coupons are issued to user accounts
- **Redemption at checkout**: coupons are redeemed as deductions when placing orders
- **Return on refund**: coupons are returned automatically when a refund occurs, protecting buyer rights

### Member Points

- **Earned on purchase**: points are credited per rules as members spend
- **Level multipliers**: higher member levels earn higher point multipliers on purchases
- **Points for check-ins**: buyers earn points for daily check-ins
- **Points for coupons**: points can be exchanged for coupons, encouraging repeat purchase
- **Append-only ledger**: points are recorded as a running ledger that only ever grows — every entry is traceable

### Member Levels

- **Automatic tiering**: levels tier automatically by members' cumulative payment amount — no manual work
- **Benefit linkage**: level determines the point multiplier, encouraging continued spending

## 5. After-Sales and Inventory

### After-Sales Refunds

The after-sales process is a fully automated closed loop:

**Buyer files after-sales → merchant approves → channel refund → inventory restocked → in-site notification → points reversed**

- **Buyer side**: each step advances automatically after filing, with transparent, visible progress
- **Operations side**: only the approval step needs handling; everything after is done by the system

### Inventory Management

- **Append-only operation log**: all inventory operations are recorded in an append-only log
- **Full audit trail**: every inventory change is traceable to its source, giving stocktaking and reconciliation solid ground

## 6. Payments and Finance

### Payment Channels

| Channel | Suitable scenarios |
| --- | --- |
| WeChat Pay Native | PC scan-to-pay |
| WeChat Pay H5 | Launching WeChat Pay on mobile |
| Alipay | Mainstream mobile and PC payments |
| Mock payment | Built-in mock channel for demos and integration testing — no real funds move |

### Payment Reliability

- **Two-phase payment**: a two-phase design of payment intent and payment callback keeps payment states reliable
- **Self-healing reconciliation**: payment reconciliation repairs anomalous states automatically
- **Refund drift detection**: anomalous refund drift is detected automatically, surfacing problems early
- **Order-close linkage**: closing an order invalidates old payment QR codes, preventing misapplied payments from scanning expired codes

### Funds and Compliance

::: warning Merchant credentials
Payment merchant credentials are held by the deployer; payments go directly into the deployer's merchant account — the platform never touches funds.
:::

### Finance Tools

| Feature | Description |
| --- | --- |
| XLSX reconciliation export | Export financial data to XLSX in one click for offline reconciliation |
| Invoices | Supports the order invoicing flow |
| Tax rate rules | Configurable tax rate rules adapt to different regional tax requirements |
| Shipping templates | Template-based shipping configuration with automatic freight calculation by rule |

## 7. Content and Reviews

### Product Reviews

- **Threaded reviews**: reviews support tree-structured replies, keeping discussions clear
- **Likes**: buyers can like reviews
- **Merchant replies**: merchants can reply to reviews, addressing buyer feedback publicly
- **AI spam filtering**: AI automatically identifies and filters spam reviews, easing manual moderation

## 8. AI Shopping Assistant

The buyer-side storefront includes a floating AI shopping assistant; buyers make purchasing decisions through natural-language conversation:

| Capability | Description |
| --- | --- |
| Find products | Recommend matching products from a description |
| Check prices | Look up a product's current price and promotional price |
| Check orders | Look up a buyer's order status |
| Check offers | Look up available coupons and ongoing promotions |

The AI assistant calls these capabilities in a tool loop until it can give a complete answer;
combined with AI query rewriting in search, natural-language capability runs through the buyer's entire journey — browsing, searching, and after-sales.

## 9. System Administration

| Feature | Description |
| --- | --- |
| Multi-tenancy | One system supports multiple tenants operating in parallel |
| RBAC permissions | Role-based access control; operations teams are authorized by role |
| Multilingual dictionaries | UI and content languages maintained centrally |
| Task scheduling | Scheduled and periodic jobs — promotions, automation, and more — dispatched centrally |
| Audit logs | Records of logins, operations, permission changes, and data access — secure and traceable |
| Email password recovery | Password recovery via email supported |
| Login policies | Login security policies configurable |
| In-site messaging | In-site message reach to buyers |

::: tip Admin console experience
The admin console supports a dark theme, and status columns across all modules render as colored tags — more comfortable for long operations sessions and faster status recognition.
:::

## Learn More

- [Online Demo](/en/shop/trial.md): visit the demo sites and walk the core flows yourself along the recommended routes
- [Product Introduction](/en/shop/intro.md): product positioning, core highlights, and applicable scenarios
