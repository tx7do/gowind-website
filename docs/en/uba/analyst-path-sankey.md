# Top Conversion Paths

Top Conversion Paths (PathSankey) mines the most frequently occurring event sequences from group behavior, answering "what are the mainstream conversion paths of users". It corresponds to the backend `AnalyticsService.PathSankey`.

---

## 1. What Questions It Answers

- From entering the app to completing a purchase, which are the mainstream paths?
- Which path has the highest/lowest conversion rate?
- Are there unexpected "detour" paths (potential drop-off points)?

---

## 2. Difference from Funnels

| Model | Logic | Use Case |
|------|------|------|
| [Funnel](/en/uba/analyst-funnel.md) | **Predefined** fixed ordered steps, measuring conversion | Key path is known; validating conversion |
| **PathSankey** | **Automatically discovers** the most common real event sequences | Exploring users' actual behavior paths |

---

## 3. Backend API

### gRPC: `AnalyticsService.PathSankey`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `app_id` | uint32 (optional) | Filter by app |
| `top_n` | uint32 (optional) | Return the top N popular paths, default 20 |

Response `PathSankeyResponse`: `paths[]` (each `PathBucket` contains the `event_sequence` string / `support_count` times the path occurs / `unique_users` distinct users / `conversion_rate`).

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/path-sankey
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "topN": 15
}
```

---

## 4. Interpreting Results

`event_sequence` is a comma-separated event sequence, e.g. `"view_home,view_product,add_to_cart,pay_success"`:

- `support_count`: how many (user ×) samples completed this full sequence.
- `unique_users`: the number of **distinct users** who walked this path.
- `conversion_rate`: the conversion rate of this path (share that completed the full sequence).

Results are sorted by `support_count` descending; the frontend usually renders them as a Sankey diagram to show path branching.

---

## 5. Typical Scenarios

### E-commerce main-flow path mining

Without predefined steps, look at users' real paths starting from `view_home`: is it `view_home → view_product → pay` (efficient), or `view_home → search → view_product → compare → pay` (detour)?

### Pre-churn paths

Focus on sequences with high `support_count` that break off midway, pinpointing the key pages before drop-off.

---

## 6. Notes and Caveats

- **Path length**: overly long sequences grow explosively, so the backend usually limits sequence length / top N.
- **Event sequence basis**: events are chained per user in chronological order; behaviors across sessions and days are included too — make sure `time_range` covers them.
- **Paths ≠ funnels**: path mining is descriptive; funnels are prescriptive validation. They complement each other.
- **Empty data**: first confirm events have been stored (see [Getting Started · Current State of Data Storage](/en/uba/analyst-getting-started.md)).

---

## 7. Related Documents

- [Funnel Analysis](/en/uba/analyst-funnel.md)
- [Behavior Sequence](/en/uba/analyst-behavior-sequence.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
