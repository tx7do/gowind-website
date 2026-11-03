# Whale Tier (Payer Segmentation)

Whale Tier (WhaleTier) automatically tiers users by cumulative top-up amount, identifying whales (big spenders) / dolphins (mid spenders) / minnows (small spenders) / free users — a classic model for game and monetization operations. It corresponds to the backend `AnalyticsService.WhaleTier`.

---

## 1. What Questions It Answers

- After tiering users by cumulative top-ups, what is the headcount share of each tier?
- Which tier contributes the most revenue? (does the classic "whales drive most revenue" pattern hold)
- What is the whales' ARPPU? How many are there?

---

## 2. Payer Tiers

| Tier | Identifier | Meaning |
|------|------|------|
| Whale | `whale` | Highest cumulative top-up tier |
| Dolphin | `dolphin` | Mid tier |
| Minnow | `minnow` | Low-tier payers |
| Free | `non_pay` | Users who have never paid |

Each `PayTierSegment` contains: `tier` / `tier_label` Chinese name / `user_count` / `percentage` / `total_amount` cumulative top-ups of the tier / `revenue_share` revenue contribution share / `arppu` the tier's ARPPU.

---

## 3. Backend API

### gRPC: `AnalyticsService.WhaleTier`

| Field | Type | Description |
|------|------|------|
| `app_id` | uint32 (optional) | Filter by app |

> ⚠️ **WhaleTier is the only one of the 25 models whose request has no `timeRange`** — it measures users' **lifetime cumulative** top-ups, not sliced by a time window.

Response `WhaleTierResponse`: `segments[]` (each `PayTierSegment`), `total_users`, `total_revenue`.

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/whale-tier
Content-Type: application/json

{
  "appId": 0
}
```

---

## 4. Typical Scenarios

### Revenue structure diagnosis

Look at `revenue_share`: a typical game has the `whale` tier contributing 60-80% of revenue (whale-driven). If `non_pay` accounts for the vast majority of users while `revenue_share` concentrates in `whale`, it is the classic "a few big spenders carry the revenue" structure.

### Whale operations

Identify `whale`-tier users and run dedicated operations for them (VIP service, exclusive events) — churn in this tier hurts revenue the most.

### Payment conversion potential

Look at the `non_pay` → `minnow` conversion headroom: the free user base is large, and lifting small-amount conversion (first-purchase bundles) is a revenue growth point.

---

## 5. Notes and Caveats

- **Cumulative basis**: tiering is based on users' **cumulative** top-up total (not within a time window), which is why there is no `timeRange`.
- **Depends on `amount`**: the `amount` field of top-up events must be reported correctly, otherwise cumulative amounts are distorted.
- **Tier thresholds**: thresholds per tier are preset by the backend (based on empirical binning); for custom binning use the [OLAP Cookbook](/en/uba/analyst-olap-cookbook.md).
- **Difference from Revenue**: [Revenue Analysis](/en/uba/analyst-revenue.md) looks at GMV/ARPU trends within a time window; WhaleTier looks at the lifetime tier structure of users.

---

## 6. Related Documents

- [Revenue Analysis](/en/uba/analyst-revenue.md)
- [Historical LTV](/en/uba/analyst-ltv.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
