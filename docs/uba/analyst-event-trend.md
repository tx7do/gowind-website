# 事件趋势分析

事件趋势分析用于回答「某事件在一段时间内的量级与变化趋势」。这是最基础也最常用的分析模型，对应后端 `AnalyticsService.EventTrend`。

> 本系列教程面向数据分析师，会给出后端接口、SQL 原理与典型问题示例。

---

## 一、它能回答什么问题

- 最近 30 天「注册」事件的趋势如何？
- 「支付成功」事件按小时分布，有没有高峰时段？
- 不同平台（iOS/Android/Web）的事件量对比趋势？

---

## 二、后端接口

### gRPC：`AnalyticsService.EventTrend`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | `start_ms` / `end_ms`（Unix 毫秒，含）。未传默认：结束=现在、开始=7 天前 |
| `granularity` | `AnalyticsGranularity` | `HOUR` / `DAY` / `WEEK` / `MONTH`。未传（UNSPECIFIED）自动判断：跨度 >3 天用 DAY，否则 HOUR |
| `app_id` | uint32（可选） | 按应用（→ 租户）过滤 |
| `event_name` | string（可选） | 按事件名过滤，如 `register` / `payment_success` |
| `platform` | string（可选） | 按平台过滤，如 `web` / `ios` |

响应 `EventTrendResponse`：`points[]`（每个 `TimeSeriesPoint` 含 `timestamp` + `value`）、`granularity`、`total`。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/event-trend
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "granularity": "ANALYTICS_GRANULARITY_DAY",
  "eventName": "register"
}
```

> 完整契约见 [后端 API 契约](./backend-api.md)。

---

## 三、SQL 原理

事件趋势本质是「按时间分桶的 `count()` 聚合」。后端在 OLAP 上跑原生 SQL，按所选引擎方言生成时间分桶表达式。

### Doris（默认引擎）

```sql
-- 按天的事件趋势
SELECT
    DATE_FORMAT(event_time, '%Y-%m-%d') AS day,
    count() AS event_count
FROM events_fact
WHERE event_time >= FROM_UNIXTIME(:start_ms / 1000)
  AND event_time <= FROM_UNIXTIME(:end_ms / 1000)
  AND event_name = 'register'
GROUP BY day
ORDER BY day;
```

按小时：

```sql
SELECT
    DATE_FORMAT(event_time, '%Y-%m-%d %H:00') AS hour,
    count() AS event_count
FROM events_fact
WHERE event_name = 'register'
  AND event_time >= ...
GROUP BY hour
ORDER BY hour;
```

### ClickHouse（切到该引擎时）

```sql
-- 按天
SELECT
    toDate(event_time) AS day,
    count() AS event_count
FROM events_fact
WHERE event_name = 'register'
  AND event_time >= fromUnixTimestamp64Milli(toInt64(:start_ms))
GROUP BY day
ORDER BY day;

-- 按小时
SELECT
    toStartOfHour(event_time) AS hour,
    count() AS event_count
FROM events_fact
...
GROUP BY hour;
```

> 方言差异要点：Doris 用 `DATE_FORMAT`，ClickHouse 用 `toStartOfHour` / `toDate`。详见 [OLAP 查询手册](./analyst-olap-cookbook.md)。

---

## 四、典型问题示例

### Q1：最近 30 天「注册」事件趋势

接口请求：

```jsonc
{
  "timeRange": { "startMs": <30天前的毫秒>, "endMs": <现在的毫秒> },
  "granularity": "ANALYTICS_GRANULARITY_DAY",
  "eventName": "register"
}
```

在管理后台「数据分析 / 事件趋势」选择事件 `register`、时间范围 30 天、粒度「天」即可得到折线图。

### Q2：「支付成功」按小时的高峰时段

把 `granularity` 设为 `ANALYTICS_GRANULARITY_HOUR`，`eventName` 设为 `payment_success`，时间范围选当天。结果会呈现一天 24 小时的分布，找出高峰时段。

### Q3：不同平台的事件量对比趋势

`EventTrend` 一次只支持一个 `platform` 过滤。多平台对比有两种做法：

- 多次调用，分别传不同 `platform`，前端叠加曲线；
- 直接写 SQL（Superset）按 `platform` 分组：

```sql
SELECT DATE_FORMAT(event_time, '%Y-%m-%d') AS day, platform, count() AS cnt
FROM events_fact
WHERE event_name = 'purchase'
GROUP BY day, platform
ORDER BY day;
```

---

## 五、注意事项

- **时间范围默认值**：不传 `time_range` 时，后端默认取最近 7 天。
- **粒度自动判断**：不传 `granularity` 时，跨度 >3 天用 DAY，否则用 HOUR。
- **空数据**：若查询无结果，先确认数据是否已落库（当前 Kafka 消费未实现，见 [上手指南 · 数据落库现状](./analyst-getting-started.md)）。
- **大时间范围**：跨度很大时建议用 DAY/WEEK/MONTH，避免按小时返回过多点。

---

## 六、相关文档

- [数据分析师上手指南](./analyst-getting-started.md)
- [漏斗分析](./analyst-funnel.md)
- [留存分析](./analyst-retention.md)
- [OLAP 查询手册](./analyst-olap-cookbook.md)
- [后端 API 契约](./backend-api.md)
