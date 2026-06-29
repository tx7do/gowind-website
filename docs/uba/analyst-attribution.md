# 归因分析

归因分析（Attribution）衡量各触点（渠道/来源页）对转化的贡献，回答"转化是谁带来的"。对应后端 `AnalyticsService.Attribution`。

---

## 一、它能回答什么问题

- 哪个渠道带来的付费用户最多？
- 用户最终转化的"最后一击"是哪个来源页？
- 首次触达与末次触达，渠道贡献差异多大？

---

## 二、归因模型

| 模型 | 含义 | 适用 |
|------|------|------|
| **末次触达 `last_touch`**（默认） | 把转化归功于用户转化前的最后一个触点 | 短决策、强调临门一脚 |
| **首次触达 `first_touch`** | 把转化归功于用户首次接触的触点 | 看拉新源头、品牌触达 |

**归因维度**：`channel`（渠道，默认）/ `referer`（来源页）。

---

## 三、后端接口

### gRPC：`AnalyticsService.Attribution`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `conversion_event` | string | **转化事件名**（如 `pay_success`） |
| `dimension` | string（可选） | 归因维度：`channel`（默认）/ `referer` |
| `model` | string（可选） | 归因模型：`last_touch`（默认）/ `first_touch` |
| `app_id` | uint32（可选） | 按应用过滤 |

响应 `AttributionResponse`：`buckets[]`（`AttributionBucket` 含 `label` 触点值 / `converter_uv` 转化用户数 / `percentage` 占比）、`model`、`dimension`、`total_converters` 转化用户总数。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/attribution
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "conversionEvent": "pay_success",
  "dimension": "channel",
  "model": "last_touch"
}
```

---

## 四、典型场景

### 渠道 ROI 归因

`conversionEvent=pay_success, dimension=channel`：看哪个渠道的转化用户占比最高，结合渠道投放成本算 ROI，优化预算分配。

### 落地页效果

`dimension=referer`：看用户转化前最后来自哪个页面，评估各落地页/活动页的转化牵引力。

### 首末触达对比

分别用 `first_touch` 和 `last_touch` 跑一遍，对比渠道排名变化：某些渠道擅长拉新（首次触达占比高）但不擅长临门转化（末次触达占比低），反之亦然。

---

## 五、注意事项

- **必须指定转化事件**：`conversion_event` 是必填，没有它无法界定"转化"。
- **末次触达偏向闭环渠道**：直接入口（如自然搜索）容易在末次触达被高估。
- **首次触达依赖首条记录**：要求用户从首次访问起的行为都被采集，否则首次触达不准。
- **归因 ≠ 因果**：归因是相关性度量，高占比渠道未必是转化的真正原因。

---

## 六、相关文档

- [营收分析](./analyst-revenue.md)
- [维度分组聚合](./analyst-group-by.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
