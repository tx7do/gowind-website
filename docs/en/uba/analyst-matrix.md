# Matrix Quadrant Analysis

Matrix Quadrant Analysis (Matrix) places features/events into four quadrants along two axes (users UV × usage frequency), identifying core, star, niche, and edge features. It corresponds to the backend `AnalyticsService.Matrix`.

---

## 1. What Questions It Answers

- Which features are "core" (many users, frequent use)? Which are "edge" (few users, rare use)?
- Are there "star features" (few users but extremely high per-user frequency — hidden gems)?
- How are features distributed across the matrix, to guide product resource investment priorities?

---

## 2. The Four Quadrants

Defined by thresholds (median/average) on the X axis (users UV) and Y axis (usage frequency):

| Quadrant | Identifier | Characteristics |
|------|------|------|
| Core | `core` | Many users + high frequency |
| Star | `star` | Few users + high frequency (niche but intensive; potential) |
| Niche | `niche` | Few users + low frequency |
| Edge | `edge` | Many users + low frequency (broad reach but shallow use) |

---

## 3. Backend API

### gRPC: `AnalyticsService.Matrix`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `dimension` | string (optional) | Analysis dimension, default `event_name` |
| `app_id` | uint32 (optional) | Filter by app |
| `split` | string (optional) | Quadrant threshold type: `median` (default) / `avg` |

Response `MatrixResponse`: `points[]` (`MatrixPoint` contains `label` dimension value / `x` user count / `y` usage frequency / `quadrant`), `x_threshold`, `y_threshold`, `dimension`.

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/matrix
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "dimension": "event_name",
  "split": "median"
}
```

---

## 4. Interpreting Results

Each `MatrixPoint` is one dot on the scatter plot (one event/feature):

- `x` = distinct user count (breadth of coverage).
- `y` = total usage count (depth of use).
- `quadrant` = the quadrant the dot falls into.

`x_threshold` / `y_threshold` are the thresholds dividing the quadrants (median or avg, per `split`). The frontend renders this as a four-quadrant scatter plot.

---

## 5. Typical Scenarios

### Feature priority assessment

Feed each feature (`dimension=event_name`) into the matrix:

- **Core zone**: maintain continuously — the product's foundation.
- **Star zone**: few users but intensive use — possibly a hard requirement of power users, with room to grow; worth promoting.
- **Edge zone**: broad reach but shallow use — improve the experience or consider trimming.
- **Niche zone**: assess whether it justifies its maintenance cost.

### Content/column evaluation

Switch `dimension` to a content-type dimension to see which columns are core/star.

---

## 6. Notes and Caveats

- **Two-axis semantics**: `x` is distinct UV and `y` is total count; high `y` with low `x` means heavy use by a small group.
- **Threshold choice**: `median` resists extremes (recommended); `avg` is pulled up by head features. The two splits may produce different results — choose as needed.
- **Dimension limits**: `dimension` is usually `event_name` or a whitelisted dimension.
- **Empty data**: events must be stored first (see [Getting Started · Current State of Data Storage](/en/uba/analyst-getting-started.md)).

---

## 7. Related Documents

- [Group By Aggregation](/en/uba/analyst-group-by.md)
- [Distribution Analysis](/en/uba/analyst-distribution.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
