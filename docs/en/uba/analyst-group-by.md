# Group By Aggregation

Group By Aggregation (GroupBy) groups event metrics by a dimension field (platform, channel, region, version, etc.), answering "what does the distribution/comparison look like when viewed by dimension X". It corresponds to the backend `AnalyticsService.GroupBy`.

---

## 1. What Questions It Answers

- What share of event volume does each channel (`channel`) contribute? Which channel is the largest?
- How do the three platforms iOS / Android / Web compare in activity?
- What is the user distribution across app versions?

---

## 2. Key Concepts

| Concept | Description |
|------|------|
| **Dimension** | The field to group by, restricted to the **whitelist** (see below) |
| **Metric** | Aggregation method: `COUNT` event count (default) / `UNIQUE_USER` distinct users / `SUM_AMOUNT` amount sum |
| **Percentage** | Each group's share of the total |

**Supported whitelist dimensions**: `platform` / `channel` / `country` / `app_version` / `event_name` / `event_category` / `os` / `network` (game models additionally support `server_id` / `level`, etc.).

---

## 3. Backend API

### gRPC: `AnalyticsService.GroupBy`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `dimension` | string | Dimension field name to group by (must be on the whitelist) |
| `metric` | string (optional) | `COUNT` / `UNIQUE_USER` / `SUM_AMOUNT`, default `COUNT` |
| `app_id` | uint32 (optional) | Filter by app |
| `event_name` | string (optional) | Event name filter (empty = all events) |
| `top_n` | uint32 (optional) | Return the top N groups, default 20 |

Response `GroupByResponse`: `buckets[]` (each `GroupByBucket` contains `label` / `value` / `percentage`), `dimension`, `total`.

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/group-by
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "dimension": "channel",
  "metric": "UNIQUE_USER",
  "topN": 10
}
```

---

## 4. Underlying SQL

```sql
SELECT channel AS label, count(DISTINCT user_id) AS value
FROM events_fact
WHERE event_time BETWEEN :start AND :end
GROUP BY channel
ORDER BY value DESC
LIMIT 10;
```

The application layer then divides each group's `value` by `total` to get `percentage`.

> Dimension fields are validated against a **whitelist** (to prevent SQL injection): only the whitelisted field names above may be used as `dimension`; anything else is rejected by the backend.

---

## 5. Typical Scenarios

### Channel quality assessment

`dimension=channel, metric=UNIQUE_USER`: view the distinct user count per channel to gauge the user acquisition scale of each acquisition channel.

### Version distribution

`dimension=app_version, metric=COUNT`: view event volume per version to track version migration progress and spot anomalies in new releases.

### Platform comparison

`dimension=platform`: compare event scale across Web/iOS/Android.

---

## 6. Notes and Caveats

- **Dimensions must be on the whitelist**: custom fields cannot be used as a dimension directly (use `properties` custom attributes through other analyses, or write your own queries in Superset).
- **`top_n` truncation**: long-tail groups (e.g. hundreds of countries) are truncated to the top N; the remainder is not listed separately.
- **`SUM_AMOUNT` depends on the `amount` field**: it is only meaningful for events that populate `amount` when reporting (e.g. payments).

---

## 7. Related Documents

- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Event Trend Analysis](/en/uba/analyst-event-trend.md)
- [Revenue Analysis](/en/uba/analyst-revenue.md)
- [Backend API Contract](/en/uba/backend-api.md)
