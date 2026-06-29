# 流失与回流分析

流失与回流分析（Churn）量化用户流失的时长分布与回流情况，回答"用户流失多久了、有多少回流了、回流是被什么触发的"。对应后端 `AnalyticsService.Churn`。

---

## 一、它能回答什么问题

- 流失用户的"静默时长"分布如何？（流失 30-60 天 / 60-90 天 / 90+ 天 各多少）
- 近期有多少流失用户回流了？回流率多少？
- 用户回流是被什么事件触发的？（如某次活动、某个功能）

---

## 二、关键指标

| 指标 | 含义 |
|------|------|
| **流失时长分桶** | `30_60d` / `60_90d` / `90_plus` 各档流失用户数 |
| **流失用户数** | `churned_users`（最后活跃距今 > `churn_days`） |
| **回流用户数** | `reactivated_users`（曾是流失、近 `reactivation_days` 内又活跃） |
| **回流率** | `reactivation_rate` = 回流 / 流失 |
| **回流触发 TOP** | 回流用户回归后最常做的事（`triggers`） |

---

## 三、后端接口

### gRPC：`AnalyticsService.Churn`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 时间范围（`end_ms` 视为"今天"，`start_ms` 起为回流观察窗口） |
| `app_id` | uint32（可选） | 按应用过滤 |
| `churn_days` | uint32（可选） | 流失判定天数（最后活跃距今 > N 算流失），默认 30 |
| `reactivation_days` | uint32（可选） | 回流窗口（近 N 天内重新活跃算回流），默认 7 |

响应 `ChurnResponse`：`churn_buckets[]`（流失时长分布）、`churned_users`、`reactivated_users`、`reactivation_rate`、`triggers[]`（`ReactivationTrigger` 含 `event_name` / `count` / `percentage`）。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/churn
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "churnDays": 30,
  "reactivationDays": 7
}
```

---

## 四、典型场景

### 流失深度评估

看 `churn_buckets`：`90_plus` 占比高说明大量用户流失很久了（召回难度大）；`30_60d` 占比高说明近期流失（尚可挽回）。

### 召回活动效果

活动前后对比 `reactivated_users` 和 `reactivation_rate`，评估召回活动的实际效果。

### 回流触点分析

看 `triggers`：回流用户回归后最常触发的事件，往往是真正吸引他们回来的功能/内容，可作为后续运营重点。

---

## 五、注意事项

- **流失阈值**：`churn_days` 默认 30 天，不同产品节奏不同（游戏可能 14 天、SaaS 可能 60 天），按业务调整。
- **回流窗口**：`reactivation_days` 默认 7 天，窗口越长统计到的回流越多但可能包含"偶然打开"。
- **与生命周期的关系**：本模型专注"流失深度 + 回流"，[用户生命周期](./analyst-lifecycle.md) 是更宏观的阶段分布，两者互补。
- **依赖活跃记录**：流失/回流判定基于最后活跃时间，需事件持续上报。

---

## 六、相关文档

- [用户生命周期](./analyst-lifecycle.md)
- [新老用户对比](./analyst-new-vs-old.md)
- [用户分群圈选](./analyst-segmentation.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
