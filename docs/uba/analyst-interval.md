# 间隔时间分析

间隔时间分析（Interval）衡量**两个指定事件之间的时间间隔分布**，回答"从 A 到 B 通常要多久"。对应后端 `AnalyticsService.Interval`。

---

## 一、它能回答什么问题

- 从「注册」到「首次付费」平均要多久？P50 / P90？
- 从「浏览商品」到「下单」的决策时长分布？
- 用户「登录」到「完成关键操作」的间隔有没有长尾？

---

## 二、关键指标

| 指标 | 含义 |
|------|------|
| **分桶分布** | 按间隔时长区间统计样本数占比 |
| **P50** | 中位间隔（小时） |
| **P90** | 90 分位间隔（小时，长尾） |
| **avg** | 平均间隔（小时） |

分桶标签：`instant`（即时）/ `lt_1h`（1 小时内）/ `1_24h`（1-24 小时）/ `1_7d`（1-7 天）/ `7d_plus`（7 天以上）。

---

## 三、后端接口

### gRPC：`AnalyticsService.Interval`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `event_from` | string | **起始事件名**（如 `register`） |
| `event_to` | string | **结束事件名**（如 `pay_success`） |
| `app_id` | uint32（可选） | 按应用过滤 |

响应 `IntervalResponse`：`buckets[]`（`IntervalBucket` 含 `bucket` / `count` / `percentage`）、`p50_hours`、`p90_hours`、`avg_hours`、`count`。

### HTTP（admin 转发）

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

## 四、与分布分析的区别

| 模型 | 度量 | 输入 |
|------|------|------|
| [分布 Distribution](./analyst-distribution.md) | 单个事件的**耗时**（duration） | 一个事件 |
| **间隔 Interval** | **两个事件之间**的时间差 | 起始 + 结束事件 |

---

## 五、典型场景

### 注册到首充时长

`eventFrom=register, eventTo=pay_success`：看用户从注册到首次付费的决策周期。P50 短说明转化快；`7d_plus` 占比高说明很多用户拖延付费，可设计新人限时优惠。

### 浏览到下单决策

`eventFrom=view_product, eventTo=submit_order`：评估购买决策时长，判断是冲动消费（`instant`/`lt_1h`）还是理性比价（`1_24h`+）。

### 转化漏斗时间维度补充

配合 [漏斗分析](./analyst-funnel.md)：漏斗告诉你"转化率多少"，Interval 告诉你"转化的要多快、不转化的卡多久"。

---

## 六、注意事项

- **必须指定两个事件**：`event_from` 和 `event_to` 都必填。
- **按用户配对**：间隔是同一用户从 `event_from` 到（其后首个）`event_to` 的时间差；若用户多次触发，取首次配对。
- **跨用户不配对**：A 用户的 from 不会和 B 用户的 to 配对。
- **单位是小时**：P50/P90/avg 都是小时；分桶标签混合了秒/小时/天，按标签语义读。
- **负值/异常**：若 `event_to` 早于 `event_from`（数据异常或回填），通常被过滤。

---

## 七、相关文档

- [分布分析](./analyst-distribution.md)
- [漏斗分析](./analyst-funnel.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
