# Click Heatmap

The Click Heatmap (Click) aggregates click coordinates into page grid buckets, answering "where on the page gets clicked the most". It corresponds to the backend `AnalyticsService.Click`.

---

## 1. What Questions It Answers

- Where are the click hotspots on the homepage? Which button do users click most?
- What share of total page clicks does a given button account for?
- Are there many accidental clicks (e.g. clicking non-interactive areas)?

---

## 2. Data Source

The heatmap relies on the Web SDK's **autotrack automatic collection** — once `autoTrack` is enabled, the SDK automatically listens for clicks and fills in the heatmap fields:

| Field | Description |
|------|------|
| `clickX` / `clickY` | Click viewport coordinates |
| `elementXpath` | Element XPath |
| `pageUrl` | Current page URL |
| `viewportWidth` | Viewport width |

> ⚠️ **Web SDK autotrack covers click only** (no PV). See the [Web SDK Integration Guide](/en/uba/sdk-web.md) for details. The C# SDK has no autotrack.

---

## 3. Backend API

### gRPC: `AnalyticsService.Click`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `page_url` | string | **Page URL** (required; the heatmap is grouped per page) |
| `grid_size` | uint32 (optional) | Grid size (pixels), default 20 |
| `app_id` | uint32 (optional) | Filter by app |

Response `ClickResponse`: `points[]` (`ClickHeatPoint` contains `x` / `y` / `count` / normalized `intensity` heat), `top_elements[]` (`ClickElementBucket` contains `element_xpath` / `count` / `percentage`), `total_clicks`, `grid_size`.

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/click
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "pageUrl": "https://example.com/home",
  "gridSize": 20
}
```

---

## 4. Interpreting Results

- **`points` (heat grid)**: the page is split into a grid by `grid_size` (default 20px); each cell has its click `count` and normalized `intensity` heat (0-1, relative to the maximum click count). The frontend renders this as a heatmap.
- **`top_elements` (top elements)**: the top clicks aggregated by `element_xpath`, showing at a glance which element is clicked most and its share.
- **`grid_size` tuning**: a smaller grid is finer-grained but produces more points; the default 20px balances precision and performance.

---

## 5. Typical Scenarios

### Homepage layout optimization

Query the homepage's `points` and check whether hotspots fall on the core CTAs; if hotspots land on non-interactive areas, it may indicate accidental clicks or visual misdirection.

### Button click share

Look at `top_elements` to confirm the click share of the primary button (e.g. "Buy Now") and evaluate how well it drives action.

### A/B test comparison

Query Click separately for the A and B page versions and compare hotspot distribution and primary button clicks.

---

## 6. Notes and Caveats

- **`pageUrl` is required**: the heatmap is grouped per page, so you must specify the page URL to analyze.
- **Viewport coordinates**: `clickX/clickY` are viewport coordinates at report time, whose meaning varies with resolution/responsive layout; aggregating heatmaps across devices may distort results — consider grouping by `viewportWidth`.
- **autotrack must be enabled**: without `autoTrack` in the Web SDK there are no click events and the heatmap is empty.
- **Not applicable to C#**: the heatmap is Web-only; games/native clients do not have this model.

---

## 7. Related Documents

- [Web SDK Integration Guide](/en/uba/sdk-web.md)
- [Group By Aggregation](/en/uba/analyst-group-by.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
