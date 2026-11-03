# Interval Analysis

Interval Analysis (Interval) measures the **distribution of time intervals between two specified events**, answering "how long does it usually take from A to B". It corresponds to the backend `AnalyticsService.Interval`.

---

## 1. What Questions It Answers

- How long does it take on average from "register" to "first payment"? What are P50 / P90?
- What does the decision-time distribution from "browse product" to "place order" look like?
- Is there a long tail in the interval from "login" to "key action completed"?

---

## 2. Key Metrics

| Metric | Meaning |
|------|------|
| **Bucketed distribution** | Share of samples per interval length range |
| **P50** | Median interval (hours) |
| **P90** | 90th-percentile interval (hours, long tail) |
| **avg** | Average interval (hours) |

Bucket labels: `instant` (immediate) / `lt_1h` (within 1 hour) / `1_24h` (1-24 hours) / `1_7d` (1-7 days) / `7d_plus` (over 7 days).

---

## 3. Backend API

### gRPC: `AnalyticsService.Interval`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `event_from` | string | **Start event name** (e.g. `register`) |
| `event_to` | string | **End event name** (e.g. `pay_success`) |
| `app_id` | uint32 (optional) | Filter by app |

Response `IntervalResponse`: `buckets[]` (`IntervalBucket` contains `bucket` / `count` / `percentage`), `p50_hours`, `p90_hours`, `avg_hours`, `count`.

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/interval
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "eventFrom": "register",
  "eventTo": "pay_success"
}
```

---

## 4. Difference from Distribution Analysis

| Model | Measures | Input |
|------|------|------|
| [Distribution](/en/uba/analyst-distribution.md) | The **duration** of a single event | One event |
| **Interval** | The time difference **between two events** | Start + end event |

---

## 5. Typical Scenarios

### Time from registration to first payment

`eventFrom=register, eventTo=pay_success`: view the decision cycle from registration to first payment. A short P50 means fast conversion; a high `7d_plus` share means many users postpone paying — consider limited-time newbie offers.

### Browse-to-order decision

`eventFrom=view_product, eventTo=submit_order`: evaluate purchase decision time and tell impulse buying (`instant`/`lt_1h`) from deliberate comparison shopping (`1_24h`+).

### Adding a time dimension to conversion funnels

Combine with [Funnel Analysis](/en/uba/analyst-funnel.md): the funnel tells you "what the conversion rate is", while Interval tells you "how fast converters convert and how long non-converters stall".

---

## 6. Notes and Caveats

- **Both events must be specified**: `event_from` and `event_to` are both required.
- **Paired per user**: the interval is the same user's time difference from `event_from` to (the first subsequent) `event_to`; if a user triggers multiple pairs, the first pairing is used.
- **No cross-user pairing**: user A's "from" is never paired with user B's "to".
- **Unit is hours**: P50/P90/avg are all in hours; bucket labels mix seconds/hours/days — read them by their label semantics.
- **Negative/abnormal values**: if `event_to` precedes `event_from` (data anomaly or backfill), it is usually filtered out.

---

## 7. Related Documents

- [Distribution Analysis](/en/uba/analyst-distribution.md)
- [Funnel Analysis](/en/uba/analyst-funnel.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
