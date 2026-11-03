# Period-over-Period Comparison and Anomaly Detection

Anomaly Detection (Anomaly) computes the day-over-day change of event PV/UV and raises anomaly alerts against a 7-day average baseline, answering "is there any abnormal fluctuation in the data". It corresponds to the backend `AnalyticsService.Anomaly`.

---

## 1. What Questions It Answers

- How much did an event's PV/UV change day-over-day yesterday?
- Did an event's volume today fall below the anomaly threshold of its 7-day baseline? (alerting)
- Which events have shown anomalies recently (sharp drops/spikes)?

---

## 2. Key Metrics

Each `AnomalyPoint` (per event × date) contains:

| Metric | Meaning |
|------|------|
| **PV / UV** | Event volume of the day / distinct users |
| **baseline** | 7-day average (baseline) |
| **wow_change** | Change vs yesterday (positive = up, 0-1) |
| **is_anomaly** | Whether anomalous (day's PV < baseline × threshold, default 0.5) |

---

## 3. Backend API

### gRPC: `AnalyticsService.Anomaly`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Time range (use 8+ recent days to compute the 7-day baseline) |
| `app_id` | uint32 (optional) | Filter by app |
| `event_name` | string (optional) | Event name filter (empty = aggregated over all events) |

Response `AnomalyResponse`: `points[]` (each `AnomalyPoint`), `anomaly_count` (number of anomalous events, distinct).

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/anomaly
Content-Type: application/json

{
  "timeRange": { "startMs": 1717564800000, "endMs": 1718774399000 }
}
```

---

## 4. Anomaly Detection Logic

- **Baseline**: the average PV of the event over the previous 7 days.
- **Day-over-day change**: the rate of change of today's PV versus yesterday's.
- **Anomaly**: `is_anomaly=true` is set when the day's PV falls below `baseline × threshold` (default 0.5, i.e. less than half the baseline).

> It is mainly for **sharp-drop alerting** (e.g. tracking loss or service failures causing a data cliff). Sharp spikes need manual judgment combined with `wow_change`.

---

## 5. Typical Scenarios

### Data quality monitoring

Query `anomaly_count` daily: if any event is flagged, immediately investigate whether it is tracking loss, a reporting failure, or a genuine business decline.

### Event health inspection

Query core events (e.g. `pay_success`, `register`) individually by `event_name`, checking their day-over-day change and baseline to ensure core conversion events report correctly.

### Post-holiday / post-campaign normalization

After big promotions or holidays, use Anomaly to distinguish "natural business falloff" from "abnormal drops" — a natural falloff is usually smooth and does not break the baseline threshold, while an anomaly is a cliff.

---

## 6. Notes and Caveats

- **The time range must be long enough**: computing the 7-day baseline requires at least 8 days of data; a too-short `time_range` makes the baseline unreliable.
- **Threshold defaults to 0.5**: only a drop below 50% of the baseline counts as anomalous — fairly lenient. For stricter monitoring, watch points where `wow_change` is significantly negative.
- **Focus on sharp drops**: the current `is_anomaly` mainly captures sharp drops (PV far below baseline); sharp spikes are not auto-flagged.
- **New events have no baseline**: events launched less than 7 days ago have an unstable baseline, so early anomaly detection is of limited value.

---

## 7. Related Documents

- [Event Trend Analysis](/en/uba/analyst-event-trend.md)
- [Active Users Analysis](/en/uba/analyst-active-users.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
