# 付费分层（鲸鱼分析）

付费分层（WhaleTier）按累计充值把用户自动分层，识别大课长（鲸鱼）/中课长（海豚）/小课长（小鱼）/免费用户，是游戏与商业化运营的经典模型。对应后端 `AnalyticsService.WhaleTier`。

---

## 一、它能回答什么问题

- 用户按累计充值分层后，各层人数占比如何？
- 哪一层贡献了最多收入？（经典的"鲸鱼贡献大部分营收"是否成立）
- 大课长（鲸鱼）的 ARPPU 是多少？有多少人？

---

## 二、付费分层

| 分层 | 标识 | 含义 |
|------|------|------|
| 大课长 | `whale` | 累计充值最高档（鲸鱼） |
| 中课长 | `dolphin` | 中档（海豚） |
| 小课长 | `minnow` | 低档付费（小鱼） |
| 免费 | `non_pay` | 未付费用户 |

每个 `PayTierSegment` 含：`tier` / `tier_label` 中文名 / `user_count` / `percentage` / `total_amount` 该层累计充值 / `revenue_share` 收入贡献占比 / `arppu` 该层 ARPPU。

---

## 三、后端接口

### gRPC：`AnalyticsService.WhaleTier`

| 字段 | 类型 | 说明 |
|------|------|------|
| `app_id` | uint32（可选） | 按应用过滤 |

> ⚠️ **WhaleTier 是 25 个模型中唯一没有 `timeRange` 的请求**——它统计的是用户**全生命周期累计**充值，不按时间窗口切分。

响应 `WhaleTierResponse`：`segments[]`（各 `PayTierSegment`）、`total_users`、`total_revenue`。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/whale-tier
Content-Type: application/json

{
  "appId": 0
}
```

---

## 四、典型场景

### 营收结构诊断

看 `revenue_share`：典型游戏是 `whale` 层贡献 60-80% 营收（鲸鱼驱动）。若 `non_pay` 占人数绝大多数但 `revenue_share` 集中在 `whale`，说明是典型的"少量大R撑起营收"结构。

### 大R运营

识别 `whale` 层用户，做专属运营（VIP 服务、专属活动），这层流失对营收打击最大。

### 付费转化潜力

看 `non_pay` → `minnow` 的转化空间：免费用户基数大，提升小额付费转化（首充礼包）是营收增长点。

---

## 五、注意事项

- **累计口径**：分层基于用户**累计**充值总额（非时间窗口内），所以无 `timeRange`。
- **依赖 `amount`**：充值事件的 `amount` 字段必须正确上报，否则累计金额失真。
- **分层阈值**：各档阈值由后端预设（基于经验分箱），如需自定义分箱用 [OLAP 查询手册](./analyst-olap-cookbook.md)。
- **与 Revenue 区别**：[营收分析](./analyst-revenue.md) 看时间窗口内的 GMV/ARPU 趋势，WhaleTier 看用户全生命周期的分层结构。

---

## 六、相关文档

- [营收分析](./analyst-revenue.md)
- [历史 LTV](./analyst-ltv.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
