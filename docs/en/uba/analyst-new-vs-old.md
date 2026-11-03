# New vs Returning Users

New vs Returning (NewVsOld) splits users into new/returning groups and compares their differences in scale, behavior, and monetization, answering "how do new users differ from returning users". It corresponds to the backend `AnalyticsService.NewVsOld`.

---

## 1. What Questions It Answers

- What share of current actives are new users? How many are returning?
- How big is the gap between the new-user payment rate and the returning-user payment rate?
- Are new users' event volume (activity level) lower than returning users'? (an early-churn signal)

---

## 2. Comparison Dimensions

Each `NewVsOldSegment` (new/returning) contains:

| Metric | Meaning |
|------|------|
| `user_count` | Number of users in the group |
| `event_count` | Total events in the group |
| `pay_users` | Number of paying users in the group |
| `pay_rate` | Payment rate of the group (0-1) |

User types: `new` (new user) / `old` (returning user). A user is "new" if registered within the last `new_user_days` (default 7 days).

---

## 3. Backend API

### gRPC: `AnalyticsService.NewVsOld`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `app_id` | uint32 (optional) | Filter by app |
| `new_user_days` | uint32 (optional) | Days defining a new user (registered within the last N days), default 7 |

Response `NewVsOldResponse`: `segments[]` (two `NewVsOldSegment`: new / old).

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/new-vs-old
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "newUserDays": 7
}
```

---

## 4. Typical Scenarios

### Early-stage payment conversion

Compare new vs returning `pay_rate`: if new users pay far less than returning ones, early-stage payment conversion is the bottleneck — improve onboarding or offer newbie discounts.

### Activity level differences

Compare `event_count / user_count` (events per user): low per-user event counts among new users may mean onboarding failed to engage them — a high churn risk.

### Balancing acquisition vs retention

Look at the `user_count` share of new/returning: a new-user share that is too high (rapid influx) may dilute overall quality; a returning-user share that is too low signals poor retention.

---

## 5. Notes and Caveats

- **The new-user threshold is adjustable**: `new_user_days` defaults to 7 days; longer-cycle products can raise it (e.g. 30 days), shorter-cycle ones lower it.
- **Depends on registration time**: the new-user definition is based on `register_time`, which requires registration events to be collected correctly.
- **Binary comparison**: it only splits new/returning, with no finer tiers (e.g. "recently new"); for finer stages use [User Lifecycle](/en/uba/analyst-lifecycle.md).
- **Payment rate basis**: `pay_rate` = paying users / users in the group, affected by whether payment events within the time range were reported.

---

## 6. Related Documents

- [User Lifecycle](/en/uba/analyst-lifecycle.md)
- [Churn & Reactivation Analysis](/en/uba/analyst-churn.md)
- [Revenue Analysis](/en/uba/analyst-revenue.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
