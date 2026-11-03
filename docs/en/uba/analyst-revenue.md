# Revenue Analysis

Revenue Analysis (Revenue) measures payment/revenue scale. Its core metrics are **GMV / ARPU / ARPPU / payment rate**, with trends shown per time granularity. It corresponds to the backend `AnalyticsService.Revenue`.

---

## 1. What Questions It Answers

- What is the GMV (total transaction value) trend over the last 30 days? Which day is the revenue peak?
- What are ARPU (per-user contribution) and ARPPU (per-paying-user contribution)?
- Is the payment rate (`pay_rate`) healthy? Rising or falling?

---

## 2. Key Metrics

| Metric | Meaning |
|------|------|
| **GMV** | Total transaction value (sum of `amount`) |
| **Paying users** | `pay_users` (distinct) |
| **Paying orders** | `pay_orders` |
| **ARPU** | GMV / active users (contribution per user) |
| **ARPPU** | GMV / paying users (contribution per paying user) |
| **Payment rate** | `pay_rate` = paying users / active users |
| **Average order value** | `avg_order_value` = GMV / order count |

---

## 3. Backend API

### gRPC: `AnalyticsService.Revenue`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `app_id` | uint32 (optional) | Filter by app |
| `granularity` | `AnalyticsGranularity` | Time granularity, default `DAY` |

Response `RevenueResponse`: `points[]` (`RevenuePoint` contains `timestamp` / `gmv` / `pay_users` / `pay_orders` / `arpu` / `arppu` / `pay_rate`), `total_gmv`, `total_pay_users`, `total_pay_orders`, `avg_order_value`.

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/revenue
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "granularity": "DAY"
}
```

---

## 4. Implementation

It relies on the `amount` field reported with payment-type events:

- **GMV**: sum of `amount` across all payment events within the time range.
- **Paying users/orders**: distinct counts by `user_id` / order.
- **ARPU**: `gmv / active user count` (active users come from [Active Users](/en/uba/analyst-active-users.md)).
- **ARPPU**: `gmv / pay_users`.

> Therefore **payment events must report `amount`**, otherwise GMV/ARPU and similar metrics are distorted.

---

## 5. Typical Scenarios

### Revenue trend dashboard

Query GMV trends at `DAY` granularity, together with `pay_rate` and ARPPU, to monitor revenue health.

### Big promotion effectiveness

Compare `total_gmv`, `avg_order_value`, and `pay_rate` before and after a campaign to evaluate the promotion's revenue pull (incremental gain vs. borrowed future spend).

### Complementing the payment conversion funnel

Combine with [Funnel](/en/uba/analyst-funnel.md): the funnel shows "payment conversion rate", Revenue shows "payment amount scale and per-user value" — use them together to evaluate monetization.

---

## 6. Notes and Caveats

- **Depends on the `amount` field**: if payment events do not report amounts, GMV is 0. Amount units must be site-wide consistent (e.g. yuan/CNY).
- **ARPU needs active users**: ARPU's denominator is active users. The Revenue response computes it internally, but interpret it together with ActiveUsers.
- **Deduplication basis**: `pay_users` is deduplicated by `user_id`; a user paying multiple times counts as 1 paying user.
- **Refunds**: GMV is currently a positive sum of `amount`; to subtract refunds, flag refund events at the event layer and build your own query.

---

## 7. Related Documents

- [Whale Tier](/en/uba/analyst-whale-tier.md)
- [Historical LTV](/en/uba/analyst-ltv.md)
- [Active Users Analysis](/en/uba/analyst-active-users.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
