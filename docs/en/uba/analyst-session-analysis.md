# Session Analysis

Session Analysis (SessionAnalysis) measures the quality of each user visit from the session dimension, reporting **bounce rate, session duration percentiles, and session depth**. It corresponds to the backend `AnalyticsService.SessionAnalysis`.

---

## 1. What Questions It Answers

- How high is the bounce rate (users who view a single page and leave)?
- How long does a session last on average? What are the P50 / P90 durations?
- What is the session depth (events per session)? Are users engaged or just skimming?

---

## 2. Key Metrics

| Metric | Meaning |
|------|------|
| **Session count** | `session_count` |
| **Session users** | `unique_users` (distinct) |
| **Average duration** | `avg_duration_sec` (seconds) |
| **P50 / P90 duration** | Session duration percentiles (seconds) |
| **Bounce rate** | `bounce_rate` (0-1, share of sessions containing only one event) |
| **Session depth** | `avg_depth` (events per session = total events / sessions) |

---

## 3. Backend API

### gRPC: `AnalyticsService.SessionAnalysis`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `app_id` | uint32 (optional) | Filter by app |
| `platform` | string (optional) | Platform filter (empty = all) |

Response `SessionAnalysisResponse`: `session_count` / `unique_users` / `avg_duration_sec` / `p50_duration_sec` / `p90_duration_sec` / `bounce_rate` / `avg_depth`.

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/session-analysis
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 }
}
```

---

## 4. Data Source

Session data comes from `sessions_fact` (the session fact table), aggregated from `events_fact` by ETL:

- **Session**: a stretch of continuous user activity (aggregated by `session_id`, split on timeout).
- **Duration**: time difference between the first and last events in the session.
- **Depth**: number of events in the session.
- **Bounce**: the session contains only 1 event.

> Session aggregation is maintained by offline ETL (`sql/doris/06_etl.sql`) or materialized views and may lag by minutes.

---

## 5. Typical Scenarios

### Landing page quality evaluation

Look at `bounce_rate`: a high bounce rate means the landing page fails to engage users (content mismatch, slow loading, poor guidance) — optimize the first screen.

### User engagement

Look at `avg_depth` and `p50_duration_sec`: low depth / short duration means shallow visits; improve content stickiness and guidance.

### Per-platform comparison

Query `platform` for web/ios/android separately and compare session quality across platforms to locate the one with the weakest experience.

---

## 6. Notes and Caveats

- **Depends on session aggregation**: session metrics come from `sessions_fact`, which requires the ETL/materialized views to run normally; if the table is empty, check the ETL first.
- **Bounce rate basis**: defined as "the share of sessions with only 1 event"; acceptable levels differ by product (content sites typically have higher bounce rates than tool sites).
- **Percentiles are in seconds**: `p50_duration_sec` / `p90_duration_sec` are in seconds.
- **Session splitting**: sessions are defined by `session_id`; the timeout rule affects session counts and durations (finer splitting → more, shorter sessions).

---

## 7. Related Documents

- [Distribution Analysis](/en/uba/analyst-distribution.md)
- [Active Users Analysis](/en/uba/analyst-active-users.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
