# 留存分析

留存分析用于衡量用户在首次发生某行为后的**第 N 天（周/月）是否再次回访**，是评估产品粘性、用户生命周期的核心模型。对应后端 `AnalyticsService.Retention`。

---

## 一、它能回答什么问题

- 6 月 1 日新增的用户，在第 1、7、30 天的留存率是多少？
- 不同渠道来的用户，留存差异如何？
- 按「注册」事件还是「活跃」来计算留存更合适？

---

## 二、留存原理：队列（Cohort）矩阵

留存以**队列**为单位计算：把某天（或某周/月）首次发生目标行为的用户归为一个 cohort，再统计这个 cohort 在后续第 N 天的回访人数与比例。

```
           Day0   Day1   Day2  ...  Day7
6月1日队列  1000   420    310       180     ← 各列 = 第N天回访人数
6月2日队列  950    390    280       160
...
留存率(%)   100%   42%    31%       18%
```

- **cohort size**：该队列首日用户数。
- **cell.rate**：第 N 天回访率 = 第 N 天回访人数 / cohort size。

---

## 三、后端接口

### gRPC：`AnalyticsService.Retention`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 队列选取的时间范围 |
| `app_id` | uint32（可选） | 按应用过滤 |
| `retention_type` | 枚举（可选） | `ACTIVE`（默认，按活跃）/ `EVENT`（按指定事件） |
| `event_name` | string（可选） | `retention_type=EVENT` 时的事件名 |
| `max_offset_days` | int32（可选） | 最大回看天数，默认 **7** |

响应 `RetentionResponse`：`cohorts[]`（每个 `RetentionCohort` 含 `cohort_date` / `size` / `cells[]`，cell 含 `offset_days` / `count` / `rate`）、`offset_days`（所有 offset 列）。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/retention
Content-Type: application/json

{
  "timeRange": { "startMs": 1717200000000, "endMs": 1719791999000 },
  "retentionType": "RETENTION_TYPE_EVENT",
  "eventName": "register",
  "maxOffsetDays": 7
}
```

---

## 四、SQL 原理

### 步骤拆解

1. **建 cohort**：在 `time_range` 内，按天取首次发生目标行为的用户集合，得到 `cohort_date` 与 `size`。
2. **算回访**：对每个 cohort 的用户，统计在 `cohort_date + offset_days` 当天是否还有事件记录。
3. **算留存率**：`rate = count / size`。

### Doris 示例（按事件 `register` 的 7 日留存）

```sql
-- cohort：每天注册的用户
WITH cohorts AS (
    SELECT user_id, DATE(event_time) AS cohort_date
    FROM events_fact
    WHERE event_name = 'register'
      AND event_time BETWEEN :start AND :end
    GROUP BY user_id, cohort_date
)
-- 回访：每个 cohort 在后续第 N 天的活跃
SELECT
    c.cohort_date,
    DATEDIFF(DATE(e.event_time), c.cohort_date) AS offset_days,
    count(DISTINCT c.user_id) AS retained
FROM cohorts c
JOIN events_fact e ON e.user_id = c.user_id
WHERE DATEDIFF(DATE(e.event_time), c.cohort_date) BETWEEN 0 AND 7
GROUP BY c.cohort_date, offset_days;
```

> 后端实际实现按 `event_ts` 日期建 cohort，再对每个 offset 做 `count(DISTINCT user_id)`，逻辑等价。详见 `app/core/service/internal/data/doris/analytics_repo.go`。

---

## 五、留存类型选择

| 类型 | 字段 | 适用 |
|------|------|------|
| **ACTIVE（默认）** | 不需要 `event_name` | 衡量「用户是否还活跃」——只要当天有任何事件就算留存。评估整体粘性。 |
| **EVENT** | 需 `event_name` | 衡量「用户是否重复做了某事」——如「注册后第 N 天是否再次购买」。评估功能复购。 |

- 新用户留存通常用 `ACTIVE`（cohort = 注册当天）。
- 功能留存用 `EVENT`（如 `purchase` 复购留存）。

---

## 六、典型问题示例

### Q1：6 月新增用户的次日/7 日留存

`retention_type=ACTIVE`，`time_range` 选 6 月整月，`max_offset_days=7`。结果矩阵的 Day1 列即次日留存率，Day7 列即 7 日留存。

### Q2：付费用户的复购留存

`retention_type=EVENT`，`event_name=purchase`，`max_offset_days=30`。衡量首次付费后第 N 天是否再次付费。

### Q3：渠道留存对比

当前 `Retention` 接口不直接支持按渠道分组。对比渠道时在 Superset 写 SQL，对 `register_channel` 分组建 cohort：

```sql
WITH cohorts AS (
    SELECT u.user_id, u.register_channel, DATE(u.register_time) AS cohort_date
    FROM users_dim u
    WHERE u.register_time BETWEEN :start AND :end
)
SELECT c.register_channel, DATEDIFF(DATE(e.event_time), c.cohort_date) AS offset_days,
       count(DISTINCT c.user_id) AS retained
FROM cohorts c
JOIN events_fact e ON e.user_id = c.user_id
WHERE DATEDIFF(DATE(e.event_time), c.cohort_date) BETWEEN 0 AND 7
GROUP BY c.register_channel, offset_days;
```

---

## 七、注意事项

- **max_offset 默认 7**：要看 30 日留存需显式传 `max_offset_days=30`。
- **时间范围要够长**：要看 N 日留存，`time_range` 结束时间至少要到「最后一批 cohort + N 天」，否则后续列会缺数据。
- **空数据**：留存依赖回访事件已落库；若查不到回访，确认 OLAP 引擎的 Kafka 消费作业是否正常运行（见 [上手指南 · 数据落库现状](./analyst-getting-started.md)）。

---

## 八、相关文档

- [数据分析师上手指南](./analyst-getting-started.md)
- [事件趋势分析](./analyst-event-trend.md)
- [漏斗分析](./analyst-funnel.md)
- [OLAP 查询手册](./analyst-olap-cookbook.md)
- [后端 API 契约](./backend-api.md)
