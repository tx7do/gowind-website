# 分布分析

分布分析（Distribution）统计某事件**耗时（duration）的分桶分布与分位数**，回答"这件事通常花多久、有没有长尾"。对应后端 `AnalyticsService.Distribution`。

---

## 一、它能回答什么问题

- 用户完成一局游戏平均多久？P50 / P90 是多少？
- 页面停留时长的分布如何？有没有大量"秒退"？
- 加载耗时的长尾（P90）有多严重？

---

## 二、关键指标

| 指标 | 含义 |
|------|------|
| **分桶分布** | 按耗时区间统计事件数占比 |
| **avg** | 平均耗时（秒） |
| **P50** | 中位数（一半事件快于它） |
| **P90** | 90 分位（仅 10% 事件慢于它，反映长尾） |
| **max** | 最大值 |

分桶标签：`0_10s` / `10_60s` / `1_5min` / `5min_plus`。

---

## 三、后端接口

### gRPC：`AnalyticsService.Distribution`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `event_name` | string | **目标事件名**（如 `page_view`、`game_round`） |
| `app_id` | uint32（可选） | 按应用过滤 |

响应 `DistributionResponse`：`buckets[]`（`DistributionBucket` 含 `bucket` 分桶标签 / `count` / `percentage`）、`summary`（`DistributionSummary` 含 `avg_sec` / `p50_sec` / `p90_sec` / `max_sec` / `count`）。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/distribution
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "eventName": "page_view"
}
```

---

## 四、实现原理

依赖事件上报时的 `duration_ms`（耗时，毫秒）字段：

- 把每个事件的 `duration_ms` 落入预设分桶，统计各桶数量。
- 在分桶基础上计算 avg / P50 / P90 分位数摘要。

> 因此**只有上报时填了 `duration_ms` 的事件**才有分布意义。耗时需在客户端 SDK 上报时显式传入（如 `track('page_view', {...}, { durationMs: ... })`）。

---

## 五、典型场景

### 页面停留时长分布

`eventName=page_view`：看用户在页面的停留分布，P50 反映典型停留，`0_10s` 占比高说明秒退严重。

### 游戏/视频时长分析

`eventName=game_round`：看一局游戏时长，评估游戏节奏是否合理（太长流失、太短缺乏沉浸）。

### 性能监控

把 `duration_ms` 用作接口/加载耗时，监控 P90 长尾，发现性能劣化。

---

## 六、注意事项

- **依赖 `duration_ms`**：事件未上报耗时，则分布无意义（所有事件可能落在 0 桶）。
- **分桶固定**：分桶区间是预设的，无法自定义；需要自定义分箱时用 [OLAP 查询手册](./analyst-olap-cookbook.md) 自建 SQL。
- **P90 ≠ 最慢**：P90 反映长尾但不是极值，`max` 才是单点最慢。
- **单位是秒**：响应里 avg/p50/p90/max 都是**秒**，`duration_ms` 入库是毫秒。

---

## 七、相关文档

- [间隔时间分析](./analyst-interval.md)
- [会话分析](./analyst-session-analysis.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
