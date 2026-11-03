# OLAP Cookbook

This cookbook is the SQL query reference for data analysts and secondary development. It covers UBA's dual engines (Doris / ClickHouse) dialect differences, whitelisted dimensions, metric expressions, the SQL-injection protection design, and common queries over the fact tables.

---

## 1. Dual Engines and Database Tables

- The default engine is **Apache Doris** (`UseClickHouse = false`); you can switch to **ClickHouse** (see [Configuration Reference](/en/uba/deploy-config.md)).
- Analytical data lives in the `gw_uba` database. Core tables: `events_fact`, `sessions_fact`, `risk_events`, `path_features`, `users_dim`, `objects_dim`, `id_mapping`, `user_tags`.
- Field definitions are in `sql/{doris,clickhouse}/1_base_tables.sql` and the [Getting Started · Table and Field Map](/en/uba/analyst-getting-started.md).

---

## 2. Dialect Differences Cheat Sheet

Both engines share the same business model, but SQL functions differ:

| Operation | Doris | ClickHouse |
|------|-------|------------|
| By day | `DATE_FORMAT(t, '%Y-%m-%d')` | `toDate(t)` |
| By hour | `DATE_FORMAT(t, '%Y-%m-%d %H:00')` | `toStartOfHour(t)` |
| Current date | `CURDATE()` | `today()` |
| Date add/subtract | `DATE_SUB(CURDATE(), INTERVAL 7 DAY)` | `today() - INTERVAL 7 DAY` |
| Date difference (days) | `DATEDIFF(d1, d2)` | `dateDiff('day', d2, d1)` |
| Count | `count()` | `count()` |
| Distinct count | `count(DISTINCT user_id)` | `count(DISTINCT user_id)` / `uniqExact(user_id)` |
| String to number | `CAST(amount AS DOUBLE)` | `toFloat64OrZero(toString(amount))` |
| Query execution API | `r.db.SelectContext(ctx, &rows, sql, args...)` | `r.db.Select(ctx, &rows, sql, args...)` |
| Funnel window | Per-step independent counts | Native `windowFunnel(seconds)(...)` |

> The backend repo layer keeps one mirrored implementation under `internal/data/{doris,clickhouse}/`, with SQL adjusted per dialect.

---

## 3. Whitelisted Dimensions and Metric Expressions

The `dimension` of the `GroupBy` analysis goes through a **whitelist**, and the metric goes through a switch, to prevent SQL injection:

### Allowed dimensions (whitelist)

```
platform, channel, country, app_version, event_name, event_category, os, network
```

> Dimensions not on the whitelist are rejected (validated by `allowedDimension`).

### Metric expressions (`metricExpr`)

| metric | Expression |
|--------|--------|
| `COUNT` (default) | `count()` |
| `UNIQUE_USER` | `count(DISTINCT user_id)` |
| `SUM_AMOUNT` | `sum(toFloat64OrZero(toString(amount)))` |

### Injection protection design

- Dimension: validated against a whitelist map; invalid values are rejected.
- Metric: switch branches; invalid values raise an error.
- Numeric parameters: coerced with `%d` before concatenation.
- Only these controlled fragments are interpolated into SQL; business parameters never enter strings directly.

---

## 4. Common Query Examples

### 1. Group by dimension (equivalent to GroupBy)

Top 10 channels by event volume:

```sql
-- Doris
SELECT channel, count() AS cnt
FROM events_fact
WHERE event_time >= :start AND event_time <= :end
GROUP BY channel
ORDER BY cnt DESC
LIMIT 10;
```

Distinct users per platform:

```sql
SELECT platform, count(DISTINCT user_id) AS users
FROM events_fact
WHERE event_time >= :start AND event_time <= :end
GROUP BY platform
ORDER BY users DESC;
```

### 2. Active users (DAU/WAU/MAU)

```sql
-- DAU of the day
SELECT DATE(event_time) AS day, count(DISTINCT user_id) AS dau
FROM events_fact
WHERE event_time >= :start AND event_time <= :end
GROUP BY day
ORDER BY day;
```

> 💡 **Computing WAU/MAU yourself**: the backend `ActiveUsers` at **daily** granularity already returns accurate wau/mau based on HLL rolling windows; only at HOUR granularity, without hourly states, they degrade to equaling DAU. If you want to compute them yourself in Superset with custom definitions (e.g. windows other than exactly 7/30 days), you can reference:

```sql
-- Active users in the last 7 days (WAU, rolling window)
SELECT count(DISTINCT user_id) AS wau
FROM events_fact
WHERE event_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY);
```

### 3. Funnel (ClickHouse windowFunnel)

```sql
WITH steps AS (
    SELECT user_id,
        windowFunnel(1800)(event_ts,
            event_name='view_product',
            event_name='add_to_cart',
            event_name='payment_success') AS reached
    FROM events_fact
    WHERE event_ts BETWEEN :start_ms AND :end_ms
    GROUP BY user_id
)
SELECT reached, count() FROM steps GROUP BY reached ORDER BY reached;
```

### 4. Retention (cohort matrix)

```sql
WITH cohorts AS (
    SELECT user_id, DATE(event_time) AS cohort_date
    FROM events_fact
    WHERE event_name='register' AND event_time BETWEEN :start AND :end
    GROUP BY user_id, cohort_date
)
SELECT c.cohort_date,
       DATEDIFF(DATE(e.event_time), c.cohort_date) AS offset_days,
       count(DISTINCT c.user_id) AS retained
FROM cohorts c
JOIN events_fact e ON e.user_id = c.user_id
WHERE DATEDIFF(DATE(e.event_time), c.cohort_date) BETWEEN 0 AND 7
GROUP BY c.cohort_date, offset_days;
```

### 5. Session analysis (sessions_fact)

Bounce rate and average session duration:

```sql
SELECT DATE(start_time) AS day,
       count() AS sessions,
       sum(is_bounce) / count() AS bounce_rate,
       avg(duration_ms) AS avg_duration_ms
FROM sessions_fact
WHERE start_time >= :start AND start_time <= :end
GROUP BY day
ORDER BY day;
```

### 6. User paths (path_features)

Top conversion paths:

```sql
SELECT array_join(first_3_events, ' → ') AS path_prefix,
       count() AS cnt,
       sum(is_converted) AS converted
FROM path_features
WHERE event_date >= :start AND event_date <= :end
GROUP BY path_prefix
ORDER BY cnt DESC
LIMIT 20;
```

### 7. Risk events (risk_events)

Risk type distribution and trends:

```sql
SELECT DATE(occur_time) AS day, risk_type, risk_level, count() AS cnt
FROM risk_events
WHERE occur_time >= :start AND occur_time <= :end
GROUP BY day, risk_type, risk_level
ORDER BY day, cnt DESC;
```

### 8. User profiles (users_dim)

Region/VIP distribution:

```sql
SELECT country, vip_level, count() AS users
FROM users_dim
GROUP BY country, vip_level
ORDER BY users DESC;
```

---

## 5. Querying Custom Attributes (properties / metrics maps)

Business-defined attributes live in `properties` (map\<string,string\>) and `metrics` (map\<string,double\>):

```sql
-- Doris: read map values (replace with the engine's corresponding function as needed)
SELECT element_at(properties, 'page') AS page, count() AS cnt
FROM events_fact
WHERE event_name = 'page_view'
GROUP BY page
ORDER BY cnt DESC;
```

```sql
-- ClickHouse
SELECT properties['page'] AS page, count() AS cnt
FROM events_fact
WHERE event_name = 'page_view'
GROUP BY page
ORDER BY cnt DESC;
```

> Map field access syntax differs between engines — confirm before querying.

---

## 6. Performance Tips

- **Always include a time filter**: fact tables are partitioned by `event_date` / `event_time`; without a time filter you get a full table scan.
- **Filter on the partition key**: prefer `event_date` (date partition) over functions on `event_time`.
- **Distinct counts over large cardinalities**: in ClickHouse, use `uniq` (approximate) instead of `uniqExact` for speed — trading accuracy for performance.
- **TTL**: `events_fact` defaults to a 180-day TTL, `sessions_fact` 90 days, `risk_events` 180 days — historical data is cleaned up automatically, so watch your time span for long-term trend analysis.

---

## 7. Related Documents

- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Event Trend Analysis](/en/uba/analyst-event-trend.md)
- [Funnel Analysis](/en/uba/analyst-funnel.md)
- [Retention Analysis](/en/uba/analyst-retention.md)
- [Backend API Contract](/en/uba/backend-api.md)
- [Superset Deployment](/en/uba/deploy-superset.md)
