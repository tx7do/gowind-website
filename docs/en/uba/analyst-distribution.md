# Distribution Analysis

Distribution Analysis (Distribution) computes the **bucketed distribution and percentiles of event durations**, answering "how long does this usually take, and is there a long tail". It corresponds to the backend `AnalyticsService.Distribution`.

---

## 1. What Questions It Answers

- How long does a user take to finish a game round on average? What are P50 / P90?
- What does the page dwell time distribution look like? Are there many instant bounces?
- How severe is the long tail (P90) of loading time?

---

## 2. Key Metrics

| Metric | Meaning |
|------|------|
| **Bucketed distribution** | Share of events per duration interval |
| **avg** | Average duration (seconds) |
| **P50** | Median (half of the events are faster) |
| **P90** | 90th percentile (only 10% of events are slower; reflects the long tail) |
| **max** | Maximum value |

Bucket labels: `0_10s` / `10_60s` / `1_5min` / `5min_plus`.

---

## 3. Backend API

### gRPC: `AnalyticsService.Distribution`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `event_name` | string | **Target event name** (e.g. `page_view`, `game_round`) |
| `app_id` | uint32 (optional) | Filter by app |

Response `DistributionResponse`: `buckets[]` (`DistributionBucket` contains `bucket` label / `count` / `percentage`), `summary` (`DistributionSummary` contains `avg_sec` / `p50_sec` / `p90_sec` / `max_sec` / `count`).

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/distribution
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "eventName": "page_view"
}
```

---

## 4. Implementation

It relies on the `duration_ms` (duration in milliseconds) field reported with the event:

- Each event's `duration_ms` falls into a predefined bucket; bucket counts are tallied.
- On top of the buckets, an avg / P50 / P90 percentile summary is computed.

> Therefore **only events that populate `duration_ms` when reported** are meaningful for distribution. The duration must be explicitly passed when reporting via the client SDK (e.g. `track('page_view', {...}, { durationMs: ... })`).

---

## 5. Typical Scenarios

### Page dwell time distribution

`eventName=page_view`: view the dwell distribution per page. P50 reflects typical dwell time; a high `0_10s` share means severe instant bounces.

### Game/video duration analysis

`eventName=game_round`: view round duration to judge whether game pacing is reasonable (too long drives churn, too short lacks immersion).

### Performance monitoring

Use `duration_ms` for API/loading durations, monitor the P90 long tail, and detect performance degradation.

---

## 6. Notes and Caveats

- **Depends on `duration_ms`**: without a reported duration, the distribution is meaningless (all events may land in the 0 bucket).
- **Fixed buckets**: bucket intervals are predefined and cannot be customized. For custom binning, write your own SQL per the [OLAP Cookbook](/en/uba/analyst-olap-cookbook.md).
- **P90 ≠ slowest**: P90 reflects the long tail but is not the extreme; `max` is the single slowest point.
- **Unit is seconds**: avg/p50/p90/max in the response are all in **seconds**, while `duration_ms` is stored in milliseconds.

---

## 7. Related Documents

- [Interval Analysis](/en/uba/analyst-interval.md)
- [Session Analysis](/en/uba/analyst-session-analysis.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
