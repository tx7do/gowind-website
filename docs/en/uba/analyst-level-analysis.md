# Level Analysis (Game)

Level Analysis (LevelAnalysis) reports each game level's pass rate, fail rate, stuck rate, and score distribution — the core model for **numeric balance tuning and churn point localization**. It corresponds to the backend `AnalyticsService.LevelAnalysis`.

> Game-specific model. It depends on level events reported by the C# SDK (`level_start` / `level_finish` / `level_fail`) and the `level` field. See the [C# SDK Integration Guide](/en/uba/sdk-csharp.md).

---

## 1. What Questions It Answers

- Which level has the lowest pass rate? (stuck point, churn hot spot)
- What is each level's 3-star rate (`star3_rate`)? Is the difficulty curve reasonable?
- Where does the number of challengers drop sharply? (players churned en masse at the previous level)

---

## 2. Key Metrics

Each `LevelStat` (single level) contains:

| Metric | Meaning |
|------|------|
| **attempt_count** | Number of attempts (`level_start`) |
| **finish_count** | Number of completions (`level_finish`) |
| **fail_count** | Number of failures (`level_fail`) |
| **pass_rate** | Pass rate (finish / (finish+fail)) |
| **stuck_rate** | Stuck rate (1 - pass_rate; higher = harder / churn point) |
| **avg_score** | Average score |
| **star3_rate** | 3-star rate (share with context['stars']==3) |
| **player_count** | Players who challenged the level (distinct) |

---

## 3. Backend API

### gRPC: `AnalyticsService.LevelAnalysis`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `app_id` | uint32 (optional) | Filter by app |
| `level_id` | string (optional) | Specific level ID (empty = all levels) |

Response `LevelAnalysisResponse`: `levels[]` (each `LevelStat`, sorted by `player_count` descending).

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/level-analysis
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 }
}
```

---

## 4. Typical Scenarios

### Difficulty curve tuning

Look at `pass_rate` and `stuck_rate` in level order: the ideal curve rises gradually and smoothly. A sudden jump in some level's `stuck_rate` indicates a difficulty cliff — lower that level's difficulty or strengthen guidance in the preceding levels.

### Churn point localization

Watch how `player_count` decays along the levels: where the challenger count drops sharply between adjacent levels is the churn point, usually corresponding to a level with a high `stuck_rate`.

### 3-star rate evaluation

`star3_rate` reflects a level's challenge for top players. A too-high 3-star rate (everyone gets three stars) means it is too easy; a too-low one means the 3-star condition is too harsh.

---

## 5. Notes and Caveats

- **Depends on standard level events**: `level_start` / `level_finish` / `level_fail` must be reported, with the `level` (level ID/name) field on the events, otherwise no statistics are possible.
- **3-star rate depends on context**: `star3_rate` reads from the event's `context['stars']`, so the client must report the star rating.
- **Pass rate basis**: `pass_rate = finish / (finish + fail)`, excluding unfinished in-progress attempts.
- **player_count decay is the key signal**: pass rate alone is not enough; combine it with player-count decay to locate real churn points.

---

## 6. Related Documents

- [Server Retention](/en/uba/analyst-server-retention.md)
- [Economy](/en/uba/analyst-economy.md)
- [C# SDK Integration Guide](/en/uba/sdk-csharp.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
