# Historical LTV Analysis

Historical LTV (Life-Time Value) measures a cohort's **cumulative average revenue per user** on day N after registration, making it the core model for evaluating long-term user value and channel quality. It corresponds to the backend `AnalyticsService.LTV`.

---

## 1. What Questions It Answers

- What is a cohort of new users' cumulative average payment (LTV) on day 7 / day 30 after registration?
- Among users acquired from different channels, whose LTV curve is higher? (evaluating long-term channel quality)
- Payback period: when does LTV exceed the customer acquisition cost (CAC)?

---

## 2. Key Concepts

| Concept | Meaning |
|------|------|
| **Cohort** | The group of users selected by `register_time` (registration time range) |
| **day_n** | Day N after registration (0 = registration day) |
| **LTV** | The cohort's **cumulative average payment** up to day N (total payments / cohort size) |
| **cohort_size** | Number of users in the cohort |

LTV is a curve that increases with `day_n` (a cumulative value that only grows).

---

## 3. Backend API

### gRPC: `AnalyticsService.LTV`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | **Registration time range** (filters the cohort by `register_time`) |
| `app_id` | uint32 (optional) | Filter by app |
| `dimension` | string (optional) | Attribution dimension, default `channel` (LTV grouped by channel) |

Response `LTVResponse`: `points[]` (`LTVPoint` contains `label` dimension value / `day_n` / `ltv` / `cohort_size` / `total_amount`), `max_days` (maximum observed days).

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/ltv
Content-Type: application/json

{
  "timeRange": { "startMs": 1717459200000, "endMs": 1718064000000 },
  "dimension": "channel"
}
```

---

## 4. Typical Scenarios

### Long-term channel quality evaluation

`dimension=channel`: compare LTV curves across channels. One channel may have low CAC but also low LTV (low-quality traffic); another may have high CAC but far higher LTV (high-quality users worth investing more in).

### Payback period estimation

The intersection of the LTV curve with CAC (customer acquisition cost) is the payback point. The faster LTV grows and the earlier payback happens, the healthier the channel.

### Cohort value monitoring

Fix a registration cohort and keep watching whether its LTV curve grows as expected, evaluating the product's monetization capability.

---

## 5. Notes and Caveats

- **The time range is registration time**: `time_range` filters `register_time` (to select the cohort), not payment time.
- **LTV is cumulative**: day-N LTV includes all payments from day 0 to N, and only grows.
- **Depends on registration and payment events**: both the `register` event (to define the cohort) and payment events with `amount` must be collected correctly.
- **Observation window limits**: `max_days` is bounded by how long data has existed — a newly registered cohort only shows the first few days of LTV; long-term LTV requires data accumulation.
- **Difference from Revenue**: [Revenue Analysis](/en/uba/analyst-revenue.md) looks at GMV in a time window; LTV looks at a specific cohort's long-term cumulative per-user value.

---

## 6. Related Documents

- [Revenue Analysis](/en/uba/analyst-revenue.md)
- [Whale Tier](/en/uba/analyst-whale-tier.md)
- [Attribution Analysis](/en/uba/analyst-attribution.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
