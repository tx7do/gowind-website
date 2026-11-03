# Behavior Sequence Analysis

Behavior Sequence (BehaviorSequence) queries the behavioral timeline of **a specific individual user** — a user-level drill-down investigation tool. It corresponds to the backend `AnalyticsService.BehaviorSequence`.

---

## 1. What Questions It Answers

- What has a specific user recently done (e.g. a user who filed a complaint, or one with abnormal payments)?
- What is the order of a user's behaviors within a given session?
- Troubleshooting: the user claims "I clicked but nothing happened" — which events did they actually trigger?

---

## 2. Difference from Path Analysis

| Model | Granularity | Perspective |
|------|------|------|
| **Behavior Sequence (BehaviorSequence)** | **A single user** | Investigating individual cases, seeing what one person did |
| [Top Conversion Paths (PathSankey)](/en/uba/analyst-path-sankey.md) | **A group** | Mining mainstream paths |

---

## 3. Backend API

### gRPC: `AnalyticsService.BehaviorSequence`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `user_id` | uint32 | **Target user ID** (required) |
| `app_id` | uint32 (optional) | Filter by app |
| `event_name` | string (optional) | Event name filter (empty = all events) |
| `limit` | uint32 (optional) | Maximum number of events returned, default 100 |

Response `BehaviorSequenceResponse`: `user_id`, `events[]` (`SequenceEvent`, sorted by time **ascending**).

Each `SequenceEvent` contains: `timestamp` / `event_name` / `session_id` / `session_seq` / `referer` / `platform` / `channel`.

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/behavior-sequence
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "userId": 1001,
  "limit": 50
}
```

---

## 4. Interpreting Results

The returned events are sorted by `timestamp` ascending — a single timeline. Combined with `session_id` + `session_seq`, you can reconstruct the user's exact order of actions within each session:

- Events with the same `session_id` belong to one session.
- `session_seq` is the index within the session, letting you pinpoint "which step of the session".
- `referer` shows the source page; `platform`/`channel` show the device environment.

---

## 5. Typical Scenarios

### Complaint investigation

A user reports "my order failed" — query that user's `BehaviorSequence` to see whether they actually triggered `submit_order`, and whether `pay_success`/`pay_fail` followed, pinpointing where they got stuck.

### High-value user behavior insights

Query the behavior sequences of top-paying users to understand their usage habits (e.g. whether they browse frequently, whether they make good use of search).

### Risk tracing

Combined with [risk events](/en/uba/analyst-getting-started.md), examine the full behavior chain of a risk-flagged user before and after the risk occurred.

---

## 6. Notes and Caveats

- **userId is required**: the behavior sequence is keyed on `user_id`; anonymous (non-`identify`-ed) users cannot be queried.
- **`limit` truncation**: heavy users may generate far more events than `limit` (default 100); increase it for long-period investigations, but mind performance.
- **Ascending order**: events are returned from earliest to latest for easy reading along the timeline.
- **Across sessions**: one query includes events from multiple sessions within the time range; distinguish them by `session_id`.

---

## 7. Related Documents

- [Segmentation](/en/uba/analyst-segmentation.md)
- [Top Conversion Paths](/en/uba/analyst-path-sankey.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
