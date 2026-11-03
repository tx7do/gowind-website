# Event Trend Analysis

Event Trend Analysis answers "what is the volume and trend of a given event over a period of time". It is the most fundamental and most frequently used analysis model, corresponding to the backend `AnalyticsService.EventTrend`.

> This tutorial series is aimed at data analysts and includes backend APIs, the underlying SQL, and typical question examples.

---

## 1. What Questions It Answers

- What is the trend of the "register" event over the last 30 days?
- What is the hourly distribution of the "payment success" event, and are there peak hours?
- How do event volumes compare across platforms (iOS/Android/Web) over time?

---

## 2. Backend API

### gRPC: `AnalyticsService.EventTrend`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | `start_ms` / `end_ms` (Unix milliseconds, inclusive). Defaults if omitted: end = now, start = 7 days ago |
| `granularity` | `AnalyticsGranularity` | `HOUR` / `DAY` / `WEEK` / `MONTH`. If omitted (UNSPECIFIED), auto-selected: span > 3 days → DAY, otherwise HOUR |
| `app_id` | uint32 (optional) | Filter by app (→ tenant) |
| `event_name` | string (optional) | Filter by event name, e.g. `register` / `payment_success` |
| `platform` | string (optional) | Filter by platform, e.g. `web` / `ios` |

Response `EventTrendResponse`: `points[]` (each `TimeSeriesPoint` contains `timestamp` + `value`), `granularity`, `total`.

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/event-trend
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "granularity": "ANALYTICS_GRANULARITY_DAY",
  "eventName": "register"
}
```

> For the full contract, see [Backend API Contract](/en/uba/backend-api.md).

---

## 3. Underlying SQL

Event trend is essentially "a `count()` aggregation bucketed by time". The backend runs native SQL on the OLAP engine, generating the time-bucketing expression according to the selected engine's dialect.

### Doris (default engine)

```sql
-- Daily event trend
SELECT
    DATE_FORMAT(event_time, '%Y-%m-%d') AS day,
    count() AS event_count
FROM events_fact
WHERE event_time >= FROM_UNIXTIME(:start_ms / 1000)
  AND event_time <= FROM_UNIXTIME(:end_ms / 1000)
  AND event_name = 'register'
GROUP BY day
ORDER BY day;
```

Hourly:

```sql
SELECT
    DATE_FORMAT(event_time, '%Y-%m-%d %H:00') AS hour,
    count() AS event_count
FROM events_fact
WHERE event_name = 'register'
  AND event_time >= ...
GROUP BY hour
ORDER BY hour;
```

### ClickHouse (when switched to this engine)

```sql
-- Daily
SELECT
    toDate(event_time) AS day,
    count() AS event_count
FROM events_fact
WHERE event_name = 'register'
  AND event_time >= fromUnixTimestamp64Milli(toInt64(:start_ms))
GROUP BY day
ORDER BY day;

-- Hourly
SELECT
    toStartOfHour(event_time) AS hour,
    count() AS event_count
FROM events_fact
...
GROUP BY hour;
```

> Key dialect differences: Doris uses `DATE_FORMAT`, ClickHouse uses `toStartOfHour` / `toDate`. See the [OLAP Cookbook](/en/uba/analyst-olap-cookbook.md) for details.

---

## 4. Typical Question Examples

### Q1: "Register" event trend over the last 30 days

API request:

```jsonc
{
  "timeRange": { "startMs": <now minus 30 days in ms>, "endMs": <now in ms> },
  "granularity": "ANALYTICS_GRANULARITY_DAY",
  "eventName": "register"
}
```

In the admin console's "Data Analysis / Event Trend" page, select event `register`, a 30-day time range, and "Day" granularity to get a line chart.

### Q2: Peak hours of "Payment Success" by hour

Set `granularity` to `ANALYTICS_GRANULARITY_HOUR`, `eventName` to `payment_success`, and the time range to today. The result shows the distribution across all 24 hours of a day, letting you identify peak hours.

### Q3: Comparing event volume trends across platforms

`EventTrend` supports only one `platform` filter per call. There are two ways to compare multiple platforms:

- Make multiple calls with different `platform` values and overlay the curves on the frontend;
- Write SQL directly (Superset) grouping by `platform`:

```sql
SELECT DATE_FORMAT(event_time, '%Y-%m-%d') AS day, platform, count() AS cnt
FROM events_fact
WHERE event_name = 'purchase'
GROUP BY day, platform
ORDER BY day;
```

---

## 5. Notes and Caveats

- **Time range defaults**: if `time_range` is omitted, the backend defaults to the last 7 days.
- **Automatic granularity**: if `granularity` is omitted, spans > 3 days use DAY, otherwise HOUR.
- **Empty data**: if the query returns nothing, first confirm the data has been stored (whether the OLAP engine's Kafka consumption job is running — see [Getting Started · Current State of Data Storage](/en/uba/analyst-getting-started.md)).
- **Large time ranges**: for very long spans, prefer DAY/WEEK/MONTH to avoid returning too many hourly points.

---

## 6. Related Documents

- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Funnel Analysis](/en/uba/analyst-funnel.md)
- [Retention Analysis](/en/uba/analyst-retention.md)
- [OLAP Cookbook](/en/uba/analyst-olap-cookbook.md)
- [Backend API Contract](/en/uba/backend-api.md)
