# 会话分析

会话分析（SessionAnalysis）从会话（Session）维度统计**跳出率、会话时长分位、会话深度**，衡量用户单次访问的质量。对应后端 `AnalyticsService.SessionAnalysis`。

---

## 一、它能回答什么问题

- 用户的跳出率（只看一个页面就离开）多高？
- 一次会话平均多久？P50 / P90 时长？
- 会话深度（人均事件数）如何？用户活跃还是浅尝辄止？

---

## 二、关键指标

| 指标 | 含义 |
|------|------|
| **会话数** | `session_count` |
| **会话用户数** | `unique_users`（去重） |
| **平均时长** | `avg_duration_sec`（秒） |
| **P50 / P90 时长** | 会话时长分位（秒） |
| **跳出率** | `bounce_rate`（0-1，只触发一个事件就结束的会话占比） |
| **会话深度** | `avg_depth`（人均事件数 = 总事件 / 会话数） |

---

## 三、后端接口

### gRPC：`AnalyticsService.SessionAnalysis`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `app_id` | uint32（可选） | 按应用过滤 |
| `platform` | string（可选） | 平台过滤（空 = 全部） |

响应 `SessionAnalysisResponse`：`session_count` / `unique_users` / `avg_duration_sec` / `p50_duration_sec` / `p90_duration_sec` / `bounce_rate` / `avg_depth`。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/session-analysis
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 }
}
```

---

## 四、数据来源

会话数据来自 `sessions_fact`（会话事实表），由 ETL 从 `events_fact` 聚合而来：

- **会话**：用户连续活跃的一段（按 `session_id` 聚合，超时切分）。
- **时长**：会话内首末事件时间差。
- **深度**：会话内事件数。
- **跳出**：会话仅含 1 个事件。

> 会话聚合由离线 ETL（`sql/doris/06_etl.sql`）或物化视图维护，可能有分钟级延迟。

---

## 五、典型场景

### 落地页质量评估

看 `bounce_rate`：跳出率高说明落地页没接住用户（内容不匹配、加载慢、引导差），需优化首屏。

### 用户参与度

看 `avg_depth` 和 `p50_duration_sec`：深度低/时长短说明用户浅访问，需提升内容粘性与引导。

### 分平台对比

`platform` 分别查 web/ios/android，对比各端的会话质量，定位体验短板的端。

---

## 六、注意事项

- **依赖会话聚合**：会话指标来自 `sessions_fact`，需 ETL/物化视图正常运行；若表为空，先排查 ETL。
- **跳出率口径**：定义为"仅 1 个事件的会话占比"，不同产品可接受水平不同（内容站跳出率通常高于工具站）。
- **分位数为秒**：`p50_duration_sec` / `p90_duration_sec` 单位是秒。
- **会话切分**：会话由 `session_id` 定义，超时规则影响会话数量与时长（切分粒度越细，会话越多、时长越短）。

---

## 七、相关文档

- [分布分析](./analyst-distribution.md)
- [活跃用户分析](./analyst-active-users.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
