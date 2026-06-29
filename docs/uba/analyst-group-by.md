# 维度分组聚合

维度分组聚合（GroupBy）按某个维度字段（平台、渠道、地区、版本等）对事件指标进行分组统计，回答"按 X 维度看，分布/对比如何"。对应后端 `AnalyticsService.GroupBy`。

---

## 一、它能回答什么问题

- 各渠道（channel）带来的事件量占比？哪个渠道最多？
- iOS / Android / Web 三端的活跃对比？
- 不同 App 版本的用户分布？

---

## 二、关键概念

| 概念 | 说明 |
|------|------|
| **维度（dimension）** | 分组依据的字段，走**白名单**（见下） |
| **指标（metric）** | 聚合方式：`COUNT` 事件数（默认）/ `UNIQUE_USER` 去重用户数 / `SUM_AMOUNT` 金额求和 |
| **占比（percentage）** | 每个分组占总量比例 |

**支持的白名单维度**：`platform` / `channel` / `country` / `app_version` / `event_name` / `event_category` / `os` / `network`（游戏模型另支持 `server_id` / `level` 等）。

---

## 三、后端接口

### gRPC：`AnalyticsService.GroupBy`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `dimension` | string | 分组维度字段名（白名单内） |
| `metric` | string（可选） | `COUNT` / `UNIQUE_USER` / `SUM_AMOUNT`，默认 `COUNT` |
| `app_id` | uint32（可选） | 按应用过滤 |
| `event_name` | string（可选） | 事件名过滤（空 = 全部事件） |
| `top_n` | uint32（可选） | 返回前 N 个分组，默认 20 |

响应 `GroupByResponse`：`buckets[]`（每个 `GroupByBucket` 含 `label` / `value` / `percentage`）、`dimension`、`total`。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/group-by
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "dimension": "channel",
  "metric": "UNIQUE_USER",
  "topN": 10
}
```

---

## 四、SQL 原理

```sql
SELECT channel AS label, count(DISTINCT user_id) AS value
FROM events_fact
WHERE event_time BETWEEN :start AND :end
GROUP BY channel
ORDER BY value DESC
LIMIT 10;
```

应用层再用各分组的 `value` 除以 `total` 得到 `percentage`。

> 维度字段走**白名单**校验（防 SQL 注入）：只有上述白名单内的字段名才允许作为 `dimension`，否则后端拒绝。

---

## 五、典型场景

### 渠道质量评估

`dimension=channel, metric=UNIQUE_USER`：看各渠道的去重用户数，评估投放渠道的获客规模。

### 版本分布

`dimension=app_version, metric=COUNT`：看各版本的事件量，评估版本迁移进度与新版本是否异常。

### 平台对比

`dimension=platform`：对比 Web/iOS/Android 的事件规模。

---

## 六、注意事项

- **维度必须在白名单内**，自定义字段不能直接作为 dimension（可用 `properties` 自定义属性走其他分析或 Superset 自建查询）。
- **`top_n` 截断**：长尾分组（如上百个国家）会被截断到前 N，剩余的不会单列。
- **`SUM_AMOUNT` 依赖 `amount` 字段**：只有上报时填了 `amount` 的事件（如支付）才有意义。

---

## 七、相关文档

- [数据分析师上手指南](./analyst-getting-started.md)
- [事件趋势分析](./analyst-event-trend.md)
- [营收分析](./analyst-revenue.md)
- [后端 API 契约](./backend-api.md)
