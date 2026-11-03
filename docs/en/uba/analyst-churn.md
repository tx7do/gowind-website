# Churn & Reactivation Analysis

Churn & Reactivation Analysis (Churn) quantifies the duration distribution of user churn and the extent of reactivation, answering "how long have users been gone, how many have come back, and what triggered their return". It corresponds to the backend `AnalyticsService.Churn`.

---

## 1. What Questions It Answers

- What does the "silence duration" distribution of churned users look like? (how many churned 30-60 / 60-90 / 90+ days ago)
- How many churned users have recently returned? What is the reactivation rate?
- Which event triggered a user's return? (e.g. a campaign, a feature)

---

## 2. Key Metrics

| Metric | Meaning |
|------|------|
| **Churn duration buckets** | Churned user counts per tier: `30_60d` / `60_90d` / `90_plus` |
| **Churned users** | `churned_users` (last active more than `churn_days` ago) |
| **Reactivated users** | `reactivated_users` (previously churned, active again within the last `reactivation_days`) |
| **Reactivation rate** | `reactivation_rate` = reactivated / churned |
| **Top reactivation triggers** | What returning users most often do after coming back (`triggers`) |

---

## 3. Backend API

### gRPC: `AnalyticsService.Churn`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Time range (`end_ms` is "today"; `start_ms` starts the reactivation observation window) |
| `app_id` | uint32 (optional) | Filter by app |
| `churn_days` | uint32 (optional) | Days defining churn (last active more than N days ago = churned), default 30 |
| `reactivation_days` | uint32 (optional) | Reactivation window (active again within the last N days = reactivated), default 7 |

Response `ChurnResponse`: `churn_buckets[]` (churn duration distribution), `churned_users`, `reactivated_users`, `reactivation_rate`, `triggers[]` (`ReactivationTrigger` contains `event_name` / `count` / `percentage`).

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/churn
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "churnDays": 30,
  "reactivationDays": 7
}
```

---

## 4. Typical Scenarios

### Assessing churn depth

Look at `churn_buckets`: a high `90_plus` share means many users have been gone a long time (hard to win back); a high `30_60d` share means recent churn (still recoverable).

### Win-back campaign effectiveness

Compare `reactivated_users` and `reactivation_rate` before and after a campaign to gauge its actual effect.

### Reactivation touchpoint analysis

Look at `triggers`: the events returning users most often trigger after coming back are usually the features/content that truly drew them in, and can guide follow-up operations.

---

## 5. Notes and Caveats

- **Churn threshold**: `churn_days` defaults to 30 days; product rhythms differ (games may use 14 days, SaaS 60 days) — adjust to your business.
- **Reactivation window**: `reactivation_days` defaults to 7 days; a longer window counts more returns but may include "accidental opens".
- **Relation to Lifecycle**: this model focuses on "churn depth + reactivation", while [User Lifecycle](/en/uba/analyst-lifecycle.md) gives a more macro stage distribution — the two complement each other.
- **Depends on activity records**: churn/reactivation classification is based on last active time and requires events to be reported continuously.

---

## 6. Related Documents

- [User Lifecycle](/en/uba/analyst-lifecycle.md)
- [New vs Returning Users](/en/uba/analyst-new-vs-old.md)
- [User Segmentation](/en/uba/analyst-segmentation.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
