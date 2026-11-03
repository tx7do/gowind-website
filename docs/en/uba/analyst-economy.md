# Economy Analysis (Game)

Economy Analysis (Economy) reports the **Source (production) and Sink (consumption) balance** of each in-game currency (token) — the core model for game designers to monitor inflation/deflation. It corresponds to the backend `AnalyticsService.Economy`.

> Game-specific model. It depends on token production/consumption events being reported.

---

## 1. What Questions It Answers

- Are GOLD production and consumption balanced? What is the net inflow?
- Is DIAMOND inflating (production > consumption)?
- How healthy is each currency's economy?

---

## 2. Key Concepts

| Concept | Meaning |
|------|------|
| **Source (production)** | Token acquisition: top-ups, rewards, drops, etc. |
| **Sink (consumption)** | Token spending: purchases, upgrades, gacha pulls, etc. |
| **net (net inflow)** | source - sink |

Each `CurrencyBalance` (per currency) contains: `currency` currency type / `source` production / `sink` consumption / `net` net inflow.

---

## 3. Backend API

### gRPC: `AnalyticsService.Economy`

| Field | Type | Description |
|------|------|------|
| `time_range` | `TimeRange` | Analysis time range |
| `app_id` | uint32 (optional) | Filter by app |
| `currency` | string (optional) | Currency type filter (e.g. `GOLD`/`DIAMOND`, empty = all) |

Response `EconomyResponse`: `currencies[]` (each `CurrencyBalance`).

### HTTP (admin proxy)

```http
POST /admin/v1/analytics/economy
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "currency": "GOLD"
}
```

---

## 4. Interpreting Economic Health

| net Value | Meaning | Risk |
|--------|------|------|
| **net > 0** (production > consumption) | Net token inflow, **inflationary tendency** | Currency devaluation, declining willingness to pay |
| **net ≈ 0** | Production and consumption balanced | Healthy economy |
| **net < 0** (consumption > production) | Net token outflow, **deflationary tendency** | Players starved of currency, frustration |

---

## 5. Typical Scenarios

### Inflation monitoring

Periodically check each currency's net: if a currency keeps `net > 0` (production far exceeds consumption), it is inflating — add consumption sinks (new goods, limited-time shops) or cut production.

### Version update effectiveness

After a major release, query Economy: did the new consumption gameplay (new gacha, new gear) effectively raise the sink and bring net back to balance?

### Premium currency (diamonds) health

Focus on the source/sink of premium currency (e.g. DIAMOND): top-ups are the main source, so there must be enough sink (high-value goods) to absorb it, otherwise willingness to pay declines.

---

## 6. Notes and Caveats

- **Depends on standard production/consumption events**: production/consumption events must be reported whenever tokens change, carrying `currency` (currency type) and the amount, otherwise no statistics are possible.
- **net is the core signal**: the absolute values of source or sink alone mean little; the sign and trend of `net` are the indicators of economic health.
- **Analyze per currency**: different currencies (gold vs diamonds) follow different economic logic and cannot be merged — analyze them one by one.
- **Time window**: short windows (e.g. a single day) fluctuate a lot; use week/month trends to judge inflation/deflation direction.

---

## 7. Related Documents

- [Level Analysis](/en/uba/analyst-level-analysis.md)
- [Revenue Analysis](/en/uba/analyst-revenue.md)
- [C# SDK Integration Guide](/en/uba/sdk-csharp.md)
- [Data Analyst Getting Started Guide](/en/uba/analyst-getting-started.md)
- [Backend API Contract](/en/uba/backend-api.md)
