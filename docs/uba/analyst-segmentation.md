# 用户分群圈选

用户分群圈选（Segmentation）通过"做过 / 未做过某些事件"的条件，筛选出目标人群的用户 ID 列表。对应后端 `AnalyticsService.Segmentation`。

---

## 一、它能回答什么问题

- 找出"近 30 天加购但未下单"的用户（购物车放弃人群），做挽回营销。
- "近 7 天连续登录 ≥3 次"的高活跃用户有哪些？
- 圈定做过 `level_5_finish` 但没做 `level_6_finish` 的卡关玩家。

---

## 二、圈选条件

| 条件类型 | 含义 | 示例 |
|---------|------|------|
| **`include`（做过）** | 必须触发过的事件（满足任一即纳入"做过集合"） | `add_to_cart` |
| **`exclude`（未做过）** | 必须未触发的事件（做过任一即排除） | `pay_success` |

每个条件（`SegmentCondition`）可带 `min_times`（至少触发次数，默认 1 = "做过"）。

> 逻辑：用户同时满足"include 做过"且"exclude 未做过"，才被圈中。

---

## 三、后端接口

### gRPC：`AnalyticsService.Segmentation`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `include` | `SegmentCondition[]` | 必须做过的事件（含 `event_name` / `min_times`） |
| `exclude` | `SegmentCondition[]` | 必须未做过的事件 |
| `app_id` | uint32（可选） | 按应用过滤 |
| `limit` | uint32（可选） | 最多返回用户数，默认 5000 |

响应 `SegmentationResponse`：`user_ids[]`（命中的用户 ID 列表）、`total`（命中总数）。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/segmentation
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "include": [{ "eventName": "add_to_cart", "minTimes": 1 }],
  "exclude": [{ "eventName": "pay_success", "minTimes": 1 }],
  "limit": 1000
}
```

---

## 四、典型场景

### 流失挽回人群

`include=cart_add, exclude=pay_success`：圈出加购未支付用户，推送优惠券。

### 高价值活跃人群

`include=[{eventName: app_open, minTimes: 3}]`：近 7 天打开 App ≥3 次的用户。

### 游戏卡关人群

`include=level_5_finish, exclude=level_6_finish`：过了第 5 关但卡在第 6 关的玩家。

---

## 五、注意事项

- **`total` 与 `user_ids`**：`total` 是命中总数，`user_ids` 受 `limit` 截断；人群很大时只返回前 N 个 ID。
- **行为而非属性**：Segmentation 基于"做过/没做过事件"，不是用户静态属性（如年龄、地区）。后者用 `users_dim` 表在 Superset 查。
- **时间范围**：判断"做过/没做过"都限定在 `time_range` 内，区间外的行为不计。
- **结合行为序列下钻**：圈出人群后，可用 [行为序列](./analyst-behavior-sequence.md) 查单个用户的完整行为。

---

## 六、相关文档

- [行为序列](./analyst-behavior-sequence.md)
- [用户生命周期](./analyst-lifecycle.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
