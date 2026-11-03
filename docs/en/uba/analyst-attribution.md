# Attribution Analysis

Attribution Analysis (Attribution) measures the contribution of each touchpoint (channel/source page) to conversion, answering "who drove the conversion". It corresponds to the backend `AnalyticsService.Attribution`.

---

## 1. What Questions It Answers

- Which channel brings the most paying users?
- Which source page delivered the "final strike" leading to conversion?
- How much do channel contributions differ between first touch and last touch?

---

## 2. Attribution Models

| Model | Meaning | Use Case |
|------|------|------|
| **Last touch `last_touch`** (default) | Credits the conversion to the user's last touchpoint before converting | Short decision cycles, emphasis on the final push |
| **First touch `first_touch`** | Credits the conversion to the user's first touchpoint | Looking at acquisition sources, brand reach |

**Attribution dimensions**: `channel` (default) / `referer` (source page).

---

## 3. Backend API

### gRPC: `AnalyticsService.Attribution`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `conversion_event` | string | **Conversion event name** (e.g. `pay_success`) |
| `dimension` | string (optional) | Attribution dimension: `channel` (default) / `referer` |
| `model` | string (optional) | Attribution model: `last_touch` (default) / `first_touch` |
| `app_id` | uint32 (optional) | Filter by app |

Response `AttributionResponse`: `buckets[]` (`AttributionBucket` contains `label` touchpoint value / `converter_uv` converting users / `percentage` share), `model`, `dimension`, `total_converters` total converting users.

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/attribution
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "conversionEvent": "pay_success",
  "dimension": "channel",
  "model": "last_touch"
}
```

---

## 4. Typical Scenarios

### Channel ROI attribution

`conversionEvent=pay_success, dimension=channel`: see which channel has the highest share of converting users, compute ROI against acquisition costs, and optimize budget allocation.

### Landing page effectiveness

`dimension=referer`: see which page users last came from before converting, evaluating the conversion pull of each landing/campaign page.

### First vs last touch comparison

Run it once with `first_touch` and once with `last_touch`, then compare how channel rankings shift: some channels are good at acquisition (high first-touch share) but weak at closing (low last-touch share), and vice versa.

---

## 5. Notes and Caveats

- **A conversion event is required**: `conversion_event` is mandatory — without it, "conversion" cannot be defined.
- **Last touch favors closing channels**: direct entries (e.g. organic search) tend to be overestimated under last touch.
- **First touch depends on the first record**: it requires that a user's behavior has been collected since their very first visit; otherwise first touch is inaccurate.
- **Attribution ≠ causation**: attribution is a correlation measure; a high-share channel is not necessarily the true cause of conversion.

---

## 6. Related Documents

- [Revenue Analysis](/en/uba/analyst-revenue.md)
- [Group By Aggregation](/en/uba/analyst-group-by.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
