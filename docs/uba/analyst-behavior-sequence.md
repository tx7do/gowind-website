# 行为序列分析

行为序列（BehaviorSequence）查询**指定单个用户**的行为时间线，是用户级下钻排查工具。对应后端 `AnalyticsService.BehaviorSequence`。

---

## 一、它能回答什么问题

- 某个用户（如客服投诉用户、异常付费用户）最近做了哪些操作？
- 这个用户在某次会话（session）内的行为先后顺序？
- 排查问题：用户声称"点了没反应"，他实际触发了哪些事件？

---

## 二、与路径分析的区别

| 模型 | 粒度 | 视角 |
|------|------|------|
| **行为序列 BehaviorSequence** | **单个用户** | 排查个案、看某人做了什么 |
| [路径 PathSankey](./analyst-path-sankey.md) | **群体** | 挖掘主流路径 |

---

## 三、后端接口

### gRPC：`AnalyticsService.BehaviorSequence`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `user_id` | uint32 | **目标用户 ID**（必填） |
| `app_id` | uint32（可选） | 按应用过滤 |
| `event_name` | string（可选） | 事件名过滤（空 = 全部事件） |
| `limit` | uint32（可选） | 最多返回事件数，默认 100 |

响应 `BehaviorSequenceResponse`：`user_id`、`events[]`（`SequenceEvent`，按时间**升序**排列）。

每个 `SequenceEvent` 含：`timestamp` / `event_name` / `session_id` / `session_seq` / `referer` / `platform` / `channel`。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/behavior-sequence
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "userId": 1001,
  "limit": 50
}
```

---

## 四、结果解读

返回的事件按 `timestamp` 升序，是一条时间线。结合 `session_id` + `session_seq` 可还原用户在每次会话内的具体操作顺序：

- 同一 `session_id` 的事件属于一次会话。
- `session_seq` 是会话内序号，可定位"会话第几步"。
- `referer` 看来源页，`platform`/`channel` 看终端环境。

---

## 五、典型场景

### 客诉排查

用户反馈"下单失败"——查该用户的 `BehaviorSequence`，看他是否真的触发了 `submit_order`、之后有没有 `pay_success`/`pay_fail`，定位卡在哪一步。

### 高价值用户行为洞察

查 top 付费用户的行为序列，理解他们的使用习惯（如是否高频浏览、是否善用搜索）。

### 风控溯源

配合 [风险事件](./analyst-getting-started.md)，查被标记为风险的用户在风险发生前后的完整行为链。

---

## 六、注意事项

- **必须有 userId**：行为序列以 `user_id` 为线索，匿名（未 `identify`）用户无法查询。
- **limit 截断**：高频用户的事件可能远超 `limit`，默认 100 条；排查长周期问题可调大，但注意性能。
- **升序返回**：事件按时间从早到晚，方便顺时间线阅读。
- **跨会话**：一次查询会包含时间范围内多个 session 的事件，用 `session_id` 区分。

---

## 七、相关文档

- [用户分群圈选](./analyst-segmentation.md)
- [热门转化路径](./analyst-path-sankey.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
