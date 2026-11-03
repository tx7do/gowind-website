# Active Users Analysis

Active Users Analysis measures the scale of active users of your product. Its core metrics are **DAU (daily active users) / WAU (weekly active users) / MAU (monthly active users)**, making it the foundational model for assessing product health and user stickiness. It corresponds to the backend `AnalyticsService.ActiveUsers`.

---

## 1. What Questions It Answers

- How many active users are there today (DAU)? What is the trend?
- How do WAU and MAU compare to DAU? (reflecting stickiness)
- Is DAU rising or falling over the last 30 days?

---

## 2. Key Metrics

| Metric | Meaning |
|------|------|
| DAU | Distinct active users on the day |
| WAU | Weekly actives: distinct active users within a rolling 7-day window |
| MAU | Monthly actives: distinct active users within a rolling 30-day window |
| WAU/DAU | Reflects weekly revisit frequency (the closer to 1, the more users come every day) |
| MAU/DAU | Reflects how diluted the monthly active base is relative to the current day |

---

## 3. Backend API

### gRPC: `AnalyticsService.ActiveUsers`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `granularity` | `AnalyticsGranularity` | Time granularity (DAU is bucketed by granularity) |
| `app_id` | uint32 (optional) | Filter by app (0 = all tenants) |

Response `ActiveUsersResponse`: `points[]` (each `ActiveUsersPoint` contains `timestamp` / `dau` / `wau` / `mau`), `latest_dau` (DAU of the latest day).

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/active-users
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "granularity": "DAY"
}
```

> `AnalyticsGranularity` values: `UNSPECIFIED`(0) server auto-selects / `HOUR`(1) / `DAY`(2) / `WEEK`(3) / `MONTH`(4).

---

## 4. Implementation

- **DAU**: distinct count of `events_fact.user_id` per day (`count(DISTINCT user_id)`).
- **WAU / MAU (daily level)**: returns accurate values based on **HLL rolling windows** — the pre-aggregation table stores the daily `HLL_UNION(HLL_HASH(user_id))` state, and WAU/MAU are obtained by merging the daily uv states within the rolling window with `HLL_UNION`.

> ⚠️ **Hourly granularity limitation**: since there are no hourly uv states, at HOUR granularity WAU/MAU degrade to equaling DAU (provided as a lower bound only). Daily and coarser granularities return accurate values. See [Appendix · Known Gaps](/en/uba/appendix.md).

---

## 5. Typical Scenarios

### Daily operations dashboard

Query DAU/WAU/MAU for the last 30 days at `DAY` granularity, plot them as a trend chart, and monitor fluctuations in the active user scale.

### Stickiness assessment

Compute `WAU / DAU`: a ratio close to 1 means users come almost every day (high stickiness, e.g. tool-type products); a larger ratio means users are spread across different days of the week (e.g. content-type products).

---

## 6. Notes and Caveats

- **Deduplication basis**: DAU is deduplicated by `user_id`; anonymous users (no userId) are not counted in DAU — bind users with `identify` first.
- **Rolling windows**: WAU means "the last 7 days" rather than "a calendar week"; MAU means "the last 30 days" rather than "a calendar month".
- **HLL approximation**: WAU/MAU are based on HLL, so results are approximate (error typically < 2%) — suitable for trend monitoring rather than exact reconciliation.
- **Empty data**: if DAU is 0, first confirm events have been stored (see [Getting Started · Current State of Data Storage](/en/uba/analyst-getting-started.md)).

---

## 7. Related Documents

- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Event Trend Analysis](/en/uba/analyst-event-trend.md)
- [Group By Aggregation](/en/uba/analyst-group-by.md)
- [Backend API Contract](/en/uba/backend-api.md)
