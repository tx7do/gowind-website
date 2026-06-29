# 营收分析

营收分析（Revenue）衡量付费/营收规模，核心指标是 **GMV / ARPU / ARPPU / 付费率**，并按时间粒度展示趋势。对应后端 `AnalyticsService.Revenue`。

---

## 一、它能回答什么问题

- 近 30 天 GMV（总成交额）趋势？哪天是营收高峰？
- ARPU（人均贡献）/ ARPPU（付费人均贡献）是多少？
- 付费率（pay_rate）健康吗？在涨还是跌？

---

## 二、关键指标

| 指标 | 含义 |
|------|------|
| **GMV** | 总成交额（`amount` 求和） |
| **付费用户数** | `pay_users`（去重） |
| **付费订单数** | `pay_orders` |
| **ARPU** | GMV / 活跃用户数（人均贡献） |
| **ARPPU** | GMV / 付费用户数（付费人均贡献） |
| **付费率** | `pay_rate` = 付费用户 / 活跃用户 |
| **客单价** | `avg_order_value` = GMV / 订单数 |

---

## 三、后端接口

### gRPC：`AnalyticsService.Revenue`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `app_id` | uint32（可选） | 按应用过滤 |
| `granularity` | `AnalyticsGranularity` | 时间粒度，默认 `DAY` |

响应 `RevenueResponse`：`points[]`（`RevenuePoint` 含 `timestamp` / `gmv` / `pay_users` / `pay_orders` / `arpu` / `arppu` / `pay_rate`）、`total_gmv`、`total_pay_users`、`total_pay_orders`、`avg_order_value`。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/revenue
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "granularity": "DAY"
}
```

---

## 四、实现原理

依赖支付类事件上报时的 `amount`（金额）字段：

- **GMV**：时间范围内所有支付事件的 `amount` 求和。
- **付费用户/订单**：按 `user_id` / 订单去重计数。
- **ARPU**：`gmv / 活跃用户数`（活跃用户另查 [活跃用户](./analyst-active-users.md)）。
- **ARPPU**：`gmv / pay_users`。

> 因此**支付事件必须上报 `amount`**，否则 GMV/ARPU 等指标失真。

---

## 五、典型场景

### 营收趋势看板

按 `DAY` 粒度查 GMV 趋势，配合 `pay_rate` 和 ARPPU，监控营收健康度。

### 大促效果评估

活动前后对比 `total_gmv`、`avg_order_value`、`pay_rate`，评估促销对营收的拉动（是增量还是透支）。

### 付费转化漏斗补充

配合 [漏斗](./analyst-funnel.md)：漏斗看"支付转化率"，Revenue 看"支付金额规模与人均"，组合评估商业化。

---

## 六、注意事项

- **依赖 `amount` 字段**：支付事件未上报金额，GMV 为 0。金额单位需全站统一（如元）。
- **ARPU 需活跃用户**：ARPU 的分母是活跃用户，需结合 ActiveUsers 一起看，单独的 Revenue 响应已内算。
- **去重口径**：`pay_users` 按 `user_id` 去重；同一用户多次付费只算 1 个付费用户。
- **退款处理**：当前 GMV 是 `amount` 正向求和，若需扣除退款，需在事件层标记退款事件并自建查询。

---

## 七、相关文档

- [付费分层](./analyst-whale-tier.md)
- [历史 LTV](./analyst-ltv.md)
- [活跃用户分析](./analyst-active-users.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
