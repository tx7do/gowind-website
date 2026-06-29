# 用户生命周期

用户生命周期（Lifecycle）按用户活跃状态划分阶段，统计各阶段用户分布，回答"用户处在生命周期的哪个阶段"。对应后端 `AnalyticsService.Lifecycle`。

---

## 一、它能回答什么问题

- 当前用户里，多少是新用户、多少是活跃老用户、多少流失了？
- 流失阶段用户占比是否在扩大？（流失预警）
- 回流用户（曾流失又回来）有多少？

---

## 二、生命周期阶段

| 阶段 | 标识 | 含义 |
|------|------|------|
| 新用户 | `new_user` | 注册距今 ≤ `new_user_days`（默认 7 天） |
| 活跃 | `active` | 近期活跃的非新用户 |
| 留存 | `retained` | 持续活跃的老用户 |
| 流失 | `churned` | 最后活跃距今 > `churn_days`（默认 30 天） |
| 回流 | `reactivated` | 曾流失、近期又重新活跃 |

> 判定基准日为 `time_range.end_ms`（视为"今天"）。

---

## 三、后端接口

### gRPC：`AnalyticsService.Lifecycle`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 时间范围（`end_ms` 视为基准日） |
| `app_id` | uint32（可选） | 按应用过滤 |
| `new_user_days` | uint32（可选） | 新用户判定天数，默认 7 |
| `churn_days` | uint32（可选） | 流失判定天数，默认 30 |

响应 `LifecycleResponse`：`stages[]`（`LifecycleStage` 含 `stage` / `stage_label` 中文名 / `user_count` / `percentage`）、`total_users`。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/lifecycle
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "newUserDays": 7,
  "churnDays": 30
}
```

---

## 四、典型场景

### 用户健康度总览

查当前各阶段分布，做成饼图。理想结构是"活跃+留存"为主、新用户持续流入、流失占比可控。

### 流失预警监控

对比不同时间点的流失阶段占比，若 `churned` 占比持续上升，触发流失预警，配合 [流失回流分析](./analyst-churn.md) 深挖。

### 新用户引导效果评估

调整 `new_user_days`，看新用户阶段规模变化，评估拉新与新手引导效果。

---

## 五、注意事项

- **阈值可调**：`new_user_days` 和 `churn_days` 决定阶段划分，不同业务（高频工具 vs 低频 SaaS）应设不同阈值。
- **基准日是 `end_ms`**："今天"由 `time_range.end_ms` 定义，不是服务端实时时间。
- **依赖活跃记录**：阶段判定基于用户最后活跃时间，需事件持续上报才准确。
- **阶段互斥**：每个用户只归入一个阶段，各阶段 `user_count` 之和 = `total_users`。

---

## 六、相关文档

- [流失与回流分析](./analyst-churn.md)
- [新老用户对比](./analyst-new-vs-old.md)
- [用户分群圈选](./analyst-segmentation.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
