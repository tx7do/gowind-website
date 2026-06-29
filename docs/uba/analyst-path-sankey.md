# 热门转化路径

热门转化路径（PathSankey）从群体行为中挖掘出现频次最高的事件序列，回答"用户主流的转化路径是什么"。对应后端 `AnalyticsService.PathSankey`。

---

## 一、它能回答什么问题

- 用户从进入 App 到完成购买，主流路径是哪几条？
- 哪条路径的转化率最高/最低？
- 有没有意料之外的"绕路"路径（潜在流失点）？

---

## 二、与漏斗的区别

| 模型 | 逻辑 | 适用 |
|------|------|------|
| [漏斗 Funnel](./analyst-funnel.md) | **预设**固定的有序步骤，衡量转化率 | 已知关键路径，验证转化 |
| **路径 PathSankey** | **自动发现**出现最多的真实事件序列 | 探索用户实际行为路径 |

---

## 三、后端接口

### gRPC：`AnalyticsService.PathSankey`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `app_id` | uint32（可选） | 按应用过滤 |
| `top_n` | uint32（可选） | 返回前 N 条热门路径，默认 20 |

响应 `PathSankeyResponse`：`paths[]`（每个 `PathBucket` 含 `event_sequence` 事件序列字符串 / `support_count` 路径出现次数 / `unique_users` 去重用户数 / `conversion_rate` 转化率）。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/path-sankey
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "topN": 15
}
```

---

## 四、结果解读

`event_sequence` 是以逗号分隔的事件序列，如 `"view_home,view_product,add_to_cart,pay_success"`：

- `support_count`：这条完整序列被多少（用户 ×）样本走完。
- `unique_users`：走过这条路径的**去重用户数**。
- `conversion_rate`：该路径的转化率（走完完整序列的比例）。

结果按 `support_count` 降序，前端通常渲染为桑基图（Sankey）展示路径分流。

---

## 五、典型场景

### 电商主流程路径挖掘

不预设步骤，直接看用户从 `view_home` 出发的真实路径：是 `view_home → view_product → pay`（高效），还是 `view_home → search → view_product → compare → pay`（绕路）？

### 流失前置路径

关注那些 `support_count` 高但走到一半中断的序列，定位流失前的关键页面。

---

## 六、注意事项

- **路径长度**：过长的序列会爆炸式增长，后端通常对序列长度/前 N 有限制。
- **事件序列口径**：按用户、按时间顺序串联事件；跨会话、跨天的行为也会被纳入，注意 `time_range` 覆盖。
- **路径 ≠ 漏斗**：路径是描述性挖掘，漏斗是规范性验证，两者互补。
- **空数据**：先确认事件已落库（见 [上手指南 · 数据落库现状](./analyst-getting-started.md)）。

---

## 七、相关文档

- [漏斗分析](./analyst-funnel.md)
- [行为序列](./analyst-behavior-sequence.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
