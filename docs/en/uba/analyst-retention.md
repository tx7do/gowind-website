# Retention Analysis

Retention Analysis measures **whether users return on day N (week/month) after first performing a behavior**, making it the core model for evaluating product stickiness and the user lifecycle. It corresponds to the backend `AnalyticsService.Retention`.

---

## 1. What Questions It Answers

- What are the day-1, day-7, and day-30 retention rates of users who signed up on June 1?
- How does retention differ across acquisition channels?
- Should retention be computed from the "register" event or from "activity"?

---

## 2. How Retention Works: the Cohort Matrix

Retention is computed per **cohort**: users who first performed the target behavior on a given day (or week/month) form a cohort, then we count how many of them return on each subsequent day N and the corresponding ratio.

```
           Day0   Day1   Day2  ...  Day7
Jun 1 cohort  1000   420    310       180     ← each column = returning users on day N
Jun 2 cohort  950    390    280       160
...
Retention (%)  100%   42%    31%       18%
```

- **cohort size**: number of users in the cohort on its first day.
- **cell.rate**: day-N return rate = day-N returning users / cohort size.

---

## 3. Backend API

### gRPC: `AnalyticsService.Retention`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Time range for selecting cohorts |
| `app_id` | uint32 (optional) | Filter by app |
| `retention_type` | enum (optional) | `ACTIVE` (default, by activity) / `EVENT` (by a specified event) |
| `event_name` | string (optional) | Event name when `retention_type=EVENT` |
| `max_offset_days` | int32 (optional) | Maximum lookback days, default **7** |

Response `RetentionResponse`: `cohorts[]` (each `RetentionCohort` contains `cohort_date` / `size` / `cells[]`, cell contains `offset_days` / `count` / `rate`), `offset_days` (all offset columns).

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/retention
Content-Type: application/json

{
  "timeRange": { "startMs": 1717200000000, "endMs": 1719791999000 },
  "retentionType": "RETENTION_TYPE_EVENT",
  "eventName": "register",
  "maxOffsetDays": 7
}
```

---

## 4. Underlying SQL

### Step by step

1. **Build cohorts**: within `time_range`, take the set of users who first performed the target behavior each day, yielding `cohort_date` and `size`.
2. **Count returns**: for each cohort's users, check whether there are event records on `cohort_date + offset_days`.
3. **Compute retention rate**: `rate = count / size`.

### Doris example (7-day retention by the `register` event)

```sql
-- Cohort: users who registered each day
WITH cohorts AS (
    SELECT user_id, DATE(event_time) AS cohort_date
    FROM events_fact
    WHERE event_name = 'register'
      AND event_time BETWEEN :start AND :end
    GROUP BY user_id, cohort_date
)
-- Returns: each cohort's activity on subsequent day N
SELECT
    c.cohort_date,
    DATEDIFF(DATE(e.event_time), c.cohort_date) AS offset_days,
    count(DISTINCT c.user_id) AS retained
FROM cohorts c
JOIN events_fact e ON e.user_id = c.user_id
WHERE DATEDIFF(DATE(e.event_time), c.cohort_date) BETWEEN 0 AND 7
GROUP BY c.cohort_date, offset_days;
```

> The backend implementation actually builds cohorts by the date of `event_ts` and then does `count(DISTINCT user_id)` per offset — logically equivalent. See `app/core/service/internal/data/doris/analytics_repo.go` for details.

---

## 5. Choosing a Retention Type

| Type | Field | Use Case |
|------|------|------|
| **ACTIVE (default)** | No `event_name` needed | Measures "is the user still active" — any event on the day counts as retained. For overall stickiness. |
| **EVENT** | Requires `event_name` | Measures "does the user repeat a specific action" — e.g. "do they purchase again on day N after registering". For feature repeat usage. |

- New-user retention usually uses `ACTIVE` (cohort = registration day).
- Feature retention uses `EVENT` (e.g. repeat-`purchase` retention).

---

## 6. Typical Question Examples

### Q1: Next-day / 7-day retention of June's new users

`retention_type=ACTIVE`, `time_range` spanning all of June, `max_offset_days=7`. The Day1 column of the result matrix is next-day retention; the Day7 column is 7-day retention.

### Q2: Repeat-purchase retention of paying users

`retention_type=EVENT`, `event_name=purchase`, `max_offset_days=30`. Measures whether users pay again on day N after their first payment.

### Q3: Comparing retention across channels

The `Retention` API does not directly support grouping by channel. To compare channels, write SQL in Superset and build cohorts grouped by `register_channel`:

```sql
WITH cohorts AS (
    SELECT u.user_id, u.register_channel, DATE(u.register_time) AS cohort_date
    FROM users_dim u
    WHERE u.register_time BETWEEN :start AND :end
)
SELECT c.register_channel, DATEDIFF(DATE(e.event_time), c.cohort_date) AS offset_days,
       count(DISTINCT c.user_id) AS retained
FROM cohorts c
JOIN events_fact e ON e.user_id = c.user_id
WHERE DATEDIFF(DATE(e.event_time), c.cohort_date) BETWEEN 0 AND 7
GROUP BY c.register_channel, offset_days;
```

---

## 7. Notes and Caveats

- **max_offset defaults to 7**: to see 30-day retention, explicitly pass `max_offset_days=30`.
- **Time range must be long enough**: to see day-N retention, the end of `time_range` should reach at least "last cohort + N days", otherwise later columns will be missing data.
- **Empty data**: retention depends on return-visit events being stored; if returns are missing, check whether the OLAP engine's Kafka consumption job is running (see [Getting Started · Current State of Data Storage](/en/uba/analyst-getting-started.md)).

---

## 8. Related Documents

- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Event Trend Analysis](/en/uba/analyst-event-trend.md)
- [Funnel Analysis](/en/uba/analyst-funnel.md)
- [OLAP Cookbook](/en/uba/analyst-olap-cookbook.md)
- [Backend API Contract](/en/uba/backend-api.md)
