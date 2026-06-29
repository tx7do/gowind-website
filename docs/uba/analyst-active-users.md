# 活跃用户分析

活跃用户分析衡量产品的用户活跃规模，核心指标是 **DAU（日活）/ WAU（周活）/ MAU（月活）**，是评估产品健康度与用户粘性的基础模型。对应后端 `AnalyticsService.ActiveUsers`。

---

## 一、它能回答什么问题

- 今天有多少活跃用户（DAU）？趋势如何？
- 周活（WAU）、月活（MAU）相对 DAU 的比值如何？（反映粘性）
- 近 30 天 DAU 是涨是跌？

---

## 二、关键指标

| 指标 | 含义 |
|------|------|
| DAU | 当日活跃用户数（去重） |
| WAU | 周活：滚动 7 天窗口内的去重活跃用户 |
| MAU | 月活：滚动 30 天窗口内的去重活跃用户 |
| WAU/DAU | 反映用户的周内回访频率（越接近 1 说明每天都来） |
| MAU/DAU | 反映月度活跃用户基数相对当日的稀释程度 |

---

## 三、后端接口

### gRPC：`AnalyticsService.ActiveUsers`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `granularity` | `AnalyticsGranularity` | 时间粒度（DAU 按粒度分桶） |
| `app_id` | uint32（可选） | 按应用过滤（0 = 全部租户） |

响应 `ActiveUsersResponse`：`points[]`（每个 `ActiveUsersPoint` 含 `timestamp` / `dau` / `wau` / `mau`）、`latest_dau`（最新一天 DAU）。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/active-users
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "granularity": "DAY"
}
```

> `AnalyticsGranularity` 取值：`UNSPECIFIED`(0) 服务端自动选择 / `HOUR`(1) / `DAY`(2) / `WEEK`(3) / `MONTH`(4)。

---

## 四、实现原理

- **DAU**：按天对 `events_fact.user_id` 去重计数（`count(DISTINCT user_id)`）。
- **WAU / MAU（日级）**：基于 **HLL 滚动窗口**输出真值——预聚合表存储了每天的 `HLL_UNION(HLL_HASH(user_id))` 状态，WAU/MAU 通过对滚动窗口内各天 uv 状态做 `HLL_UNION` 合并得到。

> ⚠️ **小时粒度限制**：HOUR 粒度因无小时级 uv 状态，WAU/MAU 退化为等于 DAU（仅给出下界）。日级及更粗粒度输出真值。详见 [附录 · 已知缺口](./appendix.md)。

---

## 五、典型场景

### 日常运营看板

按 `DAY` 粒度查近 30 天 DAU/WAU/MAU，做成趋势图，监控活跃规模波动。

### 粘性评估

计算 `WAU / DAU`：比值接近 1 说明用户几乎每天都来（高粘性，如工具类）；比值大说明用户分散在周内不同天（如内容类）。

---

## 六、注意事项

- **去重口径**：DAU 按 `user_id` 去重；未登录用户（无 userId）不计入 DAU，需先 `identify` 绑定用户。
- **滚动窗口**：WAU 是"最近 7 天"而非"自然周"，MAU 是"最近 30 天"而非"自然月"。
- **HLL 近似**：WAU/MAU 基于 HLL，结果为近似值（误差通常 <2%），适合趋势监控而非精确对账。
- **空数据**：若 DAU 为 0，先确认事件已落库（见 [上手指南 · 数据落库现状](./analyst-getting-started.md)）。

---

## 七、相关文档

- [数据分析师上手指南](./analyst-getting-started.md)
- [事件趋势分析](./analyst-event-trend.md)
- [维度分组聚合](./analyst-group-by.md)
- [后端 API 契约](./backend-api.md)
