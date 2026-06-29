# 历史 LTV 分析

历史 LTV（Life-Time Value）衡量某同期群用户在注册后第 N 天的**累计人均付费价值**，是评估用户长期价值与渠道质量的核心模型。对应后端 `AnalyticsService.LTV`。

---

## 一、它能回答什么问题

- 某批新用户（同期群）注册后第 7 天 / 30 天的累计人均付费（LTV）是多少？
- 不同渠道拉来的用户，LTV 曲线谁更高？（评估渠道长期质量）
- 回本周期：LTV 何时超过获客成本（CAC）？

---

## 二、关键概念

| 概念 | 含义 |
|------|------|
| **同期群** | 按 `register_time`（注册时间范围）圈定的用户群 |
| **day_n** | 注册后第 N 天（0 = 注册当天） |
| **LTV** | 该同期群到第 N 天的**累计人均付费**（总付费 / 同期群人数） |
| **cohort_size** | 该同期群人数 |

LTV 是一条随 `day_n` 递增的曲线（累计值只增不减）。

---

## 三、后端接口

### gRPC：`AnalyticsService.LTV`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | **注册时间范围**（按 `register_time` 过滤同期群） |
| `app_id` | uint32（可选） | 按应用过滤 |
| `dimension` | string（可选） | 归因维度，默认 `channel`（按渠道分组 LTV） |

响应 `LTVResponse`：`points[]`（`LTVPoint` 含 `label` 维度值 / `day_n` / `ltv` / `cohort_size` / `total_amount`）、`max_days`（观察的最大天数）。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/ltv
Content-Type: application/json

{
  "timeRange": { "startMs": 1717459200000, "endMs": 1718064000000 },
  "dimension": "channel"
}
```

---

## 四、典型场景

### 渠道长期质量评估

`dimension=channel`：对比各渠道的 LTV 曲线。某渠道 CAC 低但 LTV 也低（劣质流量）；某渠道 CAC 高但 LTV 远超（高质量用户，值得加大投入）。

### 回本周期测算

LTV 曲线与 CAC（获客成本）的交点就是回本周期。LTV 增长越快、回本越早，渠道越健康。

### 同期群价值监控

固定一个注册批次，持续观察其 LTV 曲线增长是否达预期，评估产品变现能力。

---

## 五、注意事项

- **时间范围是注册时间**：`time_range` 过滤的是 `register_time`（圈同期群），不是付费时间。
- **LTV 是累计值**：第 N 天的 LTV 包含了 0~N 天的所有付费，只增不减。
- **依赖注册与付费事件**：需要 `register` 事件（确定 cohort）和带 `amount` 的付费事件都正确采集。
- **观察期限制**：`max_days` 受数据存在时间限制——新注册的同期群只能看到前几天 LTV，长期 LTV 需等数据积累。
- **与 Revenue 区别**：[营收分析](./analyst-revenue.md) 看时间窗口 GMV，LTV 看特定同期群的长期累计人均价值。

---

## 六、相关文档

- [营收分析](./analyst-revenue.md)
- [付费分层](./analyst-whale-tier.md)
- [归因分析](./analyst-attribution.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
