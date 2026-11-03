# User Segmentation

User Segmentation (Segmentation) filters a list of target user IDs using conditions of the form "has / has not performed certain events". It corresponds to the backend `AnalyticsService.Segmentation`.

---

## 1. What Questions It Answers

- Find users who "added to cart in the last 30 days but never ordered" (cart-abandonment audience) for win-back marketing.
- Which are the highly active users who "logged in 3+ consecutive times in the last 7 days"?
- Select players who completed `level_5_finish` but not `level_6_finish` (stuck players).

---

## 2. Segmentation Conditions

| Condition Type | Meaning | Example |
|---------|------|------|
| **`include` (has done)** | Events that must have been triggered (any one qualifies the user for the "has-done set") | `add_to_cart` |
| **`exclude` (has not done)** | Events that must not have been triggered (any one disqualifies the user) | `pay_success` |

Each condition (`SegmentCondition`) can carry `min_times` (minimum trigger count, default 1 = "has done").

> Logic: a user is selected only if they satisfy "has done include" AND "has not done exclude".

---

## 3. Backend API

### gRPC: `AnalyticsService.Segmentation`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `include` | `SegmentCondition[]` | Events that must have been done (with `event_name` / `min_times`) |
| `exclude` | `SegmentCondition[]` | Events that must not have been done |
| `app_id` | uint32 (optional) | Filter by app |
| `limit` | uint32 (optional) | Maximum number of users returned, default 5000 |

Response `SegmentationResponse`: `user_ids[]` (list of matched user IDs), `total` (total matches).

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/segmentation
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "include": [{ "eventName": "add_to_cart", "minTimes": 1 }],
  "exclude": [{ "eventName": "pay_success", "minTimes": 1 }],
  "limit": 1000
}
```

---

## 4. Typical Scenarios

### Churn win-back audience

`include=cart_add, exclude=pay_success`: select users who added to cart without paying, then push coupons to them.

### High-value active audience

`include=[{eventName: app_open, minTimes: 3}]`: users who opened the app 3+ times in the last 7 days.

### Stuck players

`include=level_5_finish, exclude=level_6_finish`: players who passed level 5 but are stuck at level 6.

---

## 5. Notes and Caveats

- **`total` vs `user_ids`**: `total` is the total number of matches; `user_ids` is truncated by `limit` — for large audiences only the first N IDs are returned.
- **Behavior, not attributes**: Segmentation is based on "has/has not performed events", not static user attributes (e.g. age, region). For the latter, query the `users_dim` table in Superset.
- **Time range**: both "has done" and "has not done" are judged within `time_range`; behavior outside the interval does not count.
- **Combine with behavior sequences for drill-down**: after selecting an audience, use [Behavior Sequence](/en/uba/analyst-behavior-sequence.md) to inspect an individual user's full behavior.

---

## 6. Related Documents

- [Behavior Sequence](/en/uba/analyst-behavior-sequence.md)
- [User Lifecycle](/en/uba/analyst-lifecycle.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
