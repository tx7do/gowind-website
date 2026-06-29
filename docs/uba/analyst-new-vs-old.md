# 新老用户对比

新老用户对比（NewVsOld）把用户分为新/老两群，对比他们在规模、行为、付费上的差异，回答"新老用户有什么不同"。对应后端 `AnalyticsService.NewVsOld`。

---

## 一、它能回答什么问题

- 当前活跃里新用户占比多少？老用户占多少？
- 新用户的付费率 vs 老用户付费率，差距多大？
- 新用户的事件量（活跃度）是否低于老用户？（新手期流失信号）

---

## 二、对比维度

每个 `NewVsOldSegment`（新/老）含：

| 指标 | 含义 |
|------|------|
| `user_count` | 该群用户数 |
| `event_count` | 该群事件总量 |
| `pay_users` | 该群付费用户数 |
| `pay_rate` | 该群付费率（0-1） |

用户类型：`new`（新用户）/ `old`（老用户）。新用户判定：注册距今 ≤ `new_user_days`（默认 7 天）。

---

## 三、后端接口

### gRPC：`AnalyticsService.NewVsOld`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `app_id` | uint32（可选） | 按应用过滤 |
| `new_user_days` | uint32（可选） | 新用户判定天数（注册距今 N 天内算新），默认 7 |

响应 `NewVsOldResponse`：`segments[]`（两个 `NewVsOldSegment`：new / old）。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/new-vs-old
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "newUserDays": 7
}
```

---

## 四、典型场景

### 新手期付费转化

对比 new / old 的 `pay_rate`：若新用户付费率远低于老用户，说明新手期付费转化是瓶颈，需优化引导或新人优惠。

### 活跃度差异

对比 `event_count / user_count`（人均事件）：新用户人均事件低，可能是新手引导没接住，流失风险高。

### 拉新vs留存平衡

看 new/old 的 `user_count` 占比：新用户占比过高（涌入快）可能稀释整体质量；老用户占比过低说明留存差。

---

## 五、注意事项

- **新用户阈值可调**：`new_user_days` 默认 7 天，长周期产品可调大（如 30 天），短周期调小。
- **依赖注册时间**：新用户判定基于 `register_time`，要求注册事件被正确采集。
- **二分对比**：只分新/老两类，不做更细的分层（如"次新"），需要细分用 [用户生命周期](./analyst-lifecycle.md)。
- **付费率口径**：`pay_rate` = 付费用户 / 该群用户，受时间范围内付费事件是否上报影响。

---

## 六、相关文档

- [用户生命周期](./analyst-lifecycle.md)
- [流失与回流分析](./analyst-churn.md)
- [营收分析](./analyst-revenue.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
