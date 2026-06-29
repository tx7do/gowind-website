# 同比环比与异常检测

异常检测（Anomaly）计算事件 PV/UV 的环比涨跌，并基于 7 日均值基线做异常预警，回答"数据有没有异常波动"。对应后端 `AnalyticsService.Anomaly`。

---

## 一、它能回答什么问题

- 昨天某事件的 PV/UV 环比涨跌多少？
- 某事件今天的量是否跌破 7 日基线的异常阈值？（预警）
- 近期哪些事件出现了异常（骤降/骤升）？

---

## 二、关键指标

每个 `AnomalyPoint`（按事件 × 日期）含：

| 指标 | 含义 |
|------|------|
| **PV / UV** | 当日事件量 / 去重用户数 |
| **baseline** | 7 日均值（基线） |
| **wow_change** | 环比昨日涨跌（正为涨，0-1） |
| **is_anomaly** | 是否异常（当日 PV < baseline × 阈值，默认 0.5） |

---

## 三、后端接口

### gRPC：`AnalyticsService.Anomaly`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 时间范围（建议取近 8+ 天以算 7 日基线） |
| `app_id` | uint32（可选） | 按应用过滤 |
| `event_name` | string（可选） | 事件名过滤（空 = 全部事件聚合） |

响应 `AnomalyResponse`：`points[]`（各 `AnomalyPoint`）、`anomaly_count`（异常事件数，去重）。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/anomaly
Content-Type: application/json

{
  "timeRange": { "startMs": 1717564800000, "endMs": 1718774399000 }
}
```

---

## 四、异常判定逻辑

- **基线**：某事件前 7 天的 PV 均值。
- **环比**：当日 PV 相对昨日的变化率。
- **异常**：当日 PV 低于 `baseline × 阈值`（默认 0.5，即跌破基线一半）时标记 `is_anomaly=true`。

> 主要用于**骤降预警**（如埋点丢失、服务故障导致数据断崖）。骤升异常需结合 `wow_change` 人工判断。

---

## 五、典型场景

### 数据质量监控

每日查 `anomaly_count`：若有事件被标记异常，第一时间排查是埋点丢失、上报故障还是真实业务下跌。

### 事件健康巡检

按 `event_name` 单独查核心事件（如 `pay_success`、`register`），看其环比与基线，确保核心转化事件数据正常。

### 节后/活动后回归

大促或节假后，用 Anomaly 区分"业务自然回落"与"异常下跌"——回落通常平稳且不破基线阈值，异常则断崖。

---

## 六、注意事项

- **时间范围要够长**：算 7 日基线需要至少 8 天数据，`time_range` 太短则基线不准。
- **阈值默认 0.5**：跌破基线 50% 才算异常，较宽松；严苛监控可关注 `wow_change` 显著为负的点。
- **侧重骤降**：当前 `is_anomaly` 主要捕获骤降（PV 远低于基线），骤升不会自动标异常。
- **新事件无基线**：新上线的事件历史不足 7 天，基线不稳，初期异常判定参考性低。

---

## 七、相关文档

- [事件趋势分析](./analyst-event-trend.md)
- [活跃用户分析](./analyst-active-users.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
