# Server Retention (Game)

Server Retention (ServerRetention) computes retention grouped by **game server (`server_id`)**, comparing user stickiness across servers. It corresponds to the backend `AnalyticsService.ServerRetention`.

> Game-specific model. It depends on the `serverId` (server ID) field reported by the C# SDK. See the [C# SDK Integration Guide](/en/uba/sdk-csharp.md).

---

## 1. What Questions It Answers

- How do servers (e.g. server 1, 2, 3) compare in next-day / 7-day retention?
- Which server has the worst retention? (possibly server merges, operations, or version issues)
- For a newly opened server, is early retention up to standard?

---

## 2. Difference from Generic Retention

| Model | Grouping | Use Case |
|------|------|------|
| [Retention](/en/uba/analyst-retention.md) | By cohort (registration day) | Generic Web/APP |
| **Server Retention (ServerRetention)** | By game server `server_id` | Games, comparing servers |

---

## 3. Backend API

### gRPC: `AnalyticsService.ServerRetention`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Time range (filtered by first active day) |
| `app_id` | uint32 (optional) | Filter by app |
| `server_id` | string (optional) | Server ID filter (empty = compare all servers) |
| `max_offset_days` | uint32 (optional) | Maximum offset days, default 7 |

Response `ServerRetentionResponse`: `rows[]` (`ServerRetentionRow` contains `server_id` / `cohort_size` first-day new users / `retention_rates` map of retention rate per offset day), `offset_days` (offset day list).

> `retention_rates` is a `map<string, double>`, keyed by day number (e.g. `"1"`/`"3"`/`"7"`) — the only map field among the 25 models.

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/server-retention
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "maxOffsetDays": 7
}
```

---

## 4. Typical Scenarios

### Server quality comparison

Omit `server_id` to see the retention comparison table for all servers and spot servers with abnormal retention (clearly below average).

### New server launch evaluation

For a newly opened `server_id`, look at its first-7-day retention curve to assess how well the new server onboards players.

### Server merge / operations effectiveness

Before and after a server merge or major version update, compare retention changes on the affected servers to evaluate the operations action.

---

## 5. Notes and Caveats

- **Depends on `serverId` reporting**: the C# SDK must report `serverId` in events (landing in the `events_fact.server_id` column), otherwise grouping by server is impossible.
- **cohort_size basis**: each server's cohort size is that server's first-day new user count.
- **Map field**: `retention_rates` is a map; the frontend aligns it into a table by the `offset_days` columns.
- **Complements generic retention**: games look at both overall retention and per-server drill-downs; combining them tells you whether a problem is global or server-specific.

---

## 6. Related Documents

- [Retention Analysis](/en/uba/analyst-retention.md)
- [Level Analysis](/en/uba/analyst-level-analysis.md)
- [Online Stats](/en/uba/analyst-online-stats.md)
- [C# SDK Integration Guide](/en/uba/sdk-csharp.md)
- [Backend API Contract](/en/uba/backend-api.md)
