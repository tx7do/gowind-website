# User Lifecycle

User Lifecycle (Lifecycle) classifies users into stages by activity status and reports the distribution across stages, answering "which lifecycle stage is a user in". It corresponds to the backend `AnalyticsService.Lifecycle`.

---

## 1. What Questions It Answers

- Among current users, how many are new, how many are active long-time users, and how many have churned?
- Is the share of churned-stage users growing? (churn early warning)
- How many users have been reactivated (previously churned but came back)?

---

## 2. Lifecycle Stages

| Stage | Identifier | Meaning |
|------|------|------|
| New user | `new_user` | Registered within the last `new_user_days` (default 7 days) |
| Active | `active` | Recently active, not a new user |
| Retained | `retained` | Continuously active long-time user |
| Churned | `churned` | Last active more than `churn_days` ago (default 30 days) |
| Reactivated | `reactivated` | Previously churned, recently active again |

> The reference date for classification is `time_range.end_ms` (treated as "today").

---

## 3. Backend API

### gRPC: `AnalyticsService.Lifecycle`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Time range (`end_ms` is the reference date) |
| `app_id` | uint32 (optional) | Filter by app |
| `new_user_days` | uint32 (optional) | Days defining a new user, default 7 |
| `churn_days` | uint32 (optional) | Days defining churn, default 30 |

Response `LifecycleResponse`: `stages[]` (`LifecycleStage` contains `stage` / `stage_label` Chinese name / `user_count` / `percentage`), `total_users`.

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/lifecycle
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "newUserDays": 7,
  "churnDays": 30
}
```

---

## 4. Typical Scenarios

### User health overview

Query the current stage distribution and plot it as a pie chart. The ideal structure is dominated by "active + retained", with a steady inflow of new users and a controlled churn share.

### Churn early-warning monitoring

Compare the churned-stage share across points in time; if the `churned` share keeps rising, trigger a churn alert and drill deeper with [Churn & Reactivation Analysis](/en/uba/analyst-churn.md).

### Onboarding effectiveness evaluation

Adjust `new_user_days` and watch how the new-user stage size changes to evaluate acquisition and onboarding effectiveness.

---

## 5. Notes and Caveats

- **Thresholds are adjustable**: `new_user_days` and `churn_days` determine stage classification; different businesses (high-frequency tools vs low-frequency SaaS) should use different thresholds.
- **The reference date is `end_ms`**: "today" is defined by `time_range.end_ms`, not the server's real time.
- **Depends on activity records**: stage classification is based on each user's last active time, and requires events to be reported continuously to be accurate.
- **Stages are mutually exclusive**: each user belongs to exactly one stage; the sum of all stages' `user_count` equals `total_users`.

---

## 6. Related Documents

- [Churn & Reactivation Analysis](/en/uba/analyst-churn.md)
- [New vs Returning Users](/en/uba/analyst-new-vs-old.md)
- [User Segmentation](/en/uba/analyst-segmentation.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
