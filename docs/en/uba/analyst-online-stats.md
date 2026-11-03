# Online Stats Analysis (Game)

Online Stats Analysis (OnlineStats) estimates **PCU (Peak Concurrent Users) / ACU (Average Concurrent Users)** from session intervals, measuring the game's concurrent capacity and popularity. It corresponds to the backend `AnalyticsService.OnlineStats`.

> Game-specific model. It can be filtered by game server (`server_id`) and depends on session data.

---

## 1. What Questions It Answers

- What is the PCU (peak concurrent users) within the statistics period? When did it occur?
- What is the ACU (average concurrent users)? How many times the average is the peak? (concurrency fluctuation)
- What is the concurrent online scale of a given game server?

---

## 2. Key Metrics

| Metric | Meaning |
|------|------|
| **PCU** | Peak Concurrent Users, the maximum concurrent online count within the period |
| **ACU** | Average Concurrent Users, average concurrent online count |
| **Statistics duration** | `duration_minutes` (minutes) |
| **Total sessions** | `total_sessions` |

---

## 3. Backend API

### gRPC: `AnalyticsService.OnlineStats`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `app_id` | uint32 (optional) | Filter by app |
| `server_id` | string (optional) | Game server filter |

Response `OnlineStatsResponse`: `pcu` / `acu` / `duration_minutes` / `total_sessions`.

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/online-stats
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "serverId": "5"
}
```

---

## 4. Implementation

PCU/ACU are **estimated from session intervals**, not from real-time heartbeat counts:

- Each session has a start/end time, forming an "online interval".
- All session intervals are overlaid on the timeline; the number of overlapping intervals at any moment is the concurrent online count at that moment.
- **PCU** = the maximum concurrency within the period; **ACU** = the average concurrency.

> PCU/ACU are therefore estimates; their accuracy depends on whether session starts/ends are recorded accurately.

---

## 5. Typical Scenarios

### Server capacity planning

Look at historical PCU peaks to plan server concurrency capacity, ensuring peak periods (launches, events) do not crash.

### Event popularity evaluation

Query PCU/ACU during an event period and compare with normal levels to evaluate how the event lifted online popularity.

### Server popularity comparison

Query by `server_id` separately and compare concurrent scale across servers to identify popular and dead servers.

---

## 6. Notes and Caveats

- **Estimated, not real-time**: PCU/ACU are estimated from session intervals and may differ from real-time heartbeat counts; for precise real-time online numbers, use dedicated heartbeat reporting.
- **Depends on session data**: session start/end times must be accurate; the timeout splitting rule affects results.
- **Time range impact**: PCU is the peak within `time_range`; a wider range is more likely to include extreme peaks.
- **`server_id` filter**: games can view online stats per server, which requires the C# SDK to report `serverId`.

---

## 7. Related Documents

- [Server Retention](/en/uba/analyst-server-retention.md)
- [Level Analysis](/en/uba/analyst-level-analysis.md)
- [Session Analysis](/en/uba/analyst-session-analysis.md)
- [C# SDK Integration Guide](/en/uba/sdk-csharp.md)
- [Backend API Contract](/en/uba/backend-api.md)
