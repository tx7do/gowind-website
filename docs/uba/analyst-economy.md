# 经济系统分析（游戏）

经济系统分析（Economy）统计游戏内各代币（货币）的**产出（Source）与消耗（Sink）平衡**，是游戏数值策划监控通胀/通缩的核心模型。对应后端 `AnalyticsService.Economy`。

> 游戏专属模型，依赖代币产出/消耗事件上报。

---

## 一、它能回答什么问题

- 金币（GOLD）的产出 vs 消耗是否平衡？净流入多少？
- 钻石（DIAMOND）是否在通胀（产出 > 消耗）？
- 各代币的经济健康度如何？

---

## 二、关键概念

| 概念 | 含义 |
|------|------|
| **Source（产出）** | 代币获取：充值、奖励、掉落等 |
| **Sink（消耗）** | 代币支出：购买、升级、抽卡等 |
| **net（净流入）** | source - sink |

每个 `CurrencyBalance`（单代币）含：`currency` 代币类型 / `source` 产出 / `sink` 消耗 / `net` 净流入。

---

## 三、后端接口

### gRPC：`AnalyticsService.Economy`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `app_id` | uint32（可选） | 按应用过滤 |
| `currency` | string（可选） | 代币类型过滤（如 `GOLD`/`DIAMOND`，空 = 全部） |

响应 `EconomyResponse`：`currencies[]`（各 `CurrencyBalance`）。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/economy
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "currency": "GOLD"
}
```

---

## 四、经济健康度解读

| net 值 | 含义 | 风险 |
|--------|------|------|
| **net > 0**（产出 > 消耗） | 代币净流入，**通胀倾向** | 货币贬值、付费意愿下降 |
| **net ≈ 0** | 产出消耗平衡 | 经济健康 |
| **net < 0**（消耗 > 产出） | 代币净流出，**通缩倾向** | 玩家缺钱、挫败感 |

---

## 五、典型场景

### 通胀监控

定期查各代币的 net：若某代币持续 `net > 0`（产出远超消耗），货币在通胀，需增加消耗途径（新商品、限时商店）或削减产出。

### 版本更新效果

大版本上线后查 Economy：新消耗玩法（新抽卡、新装备）是否有效拉高了 sink，让 net 回归平衡。

### 付费代币（钻石）健康度

重点监控付费代币（如 DIAMOND）的 source/sink：充值是主要 source，需有足够的 sink（高价值商品）承接，否则付费意愿下降。

---

## 六、注意事项

- **依赖标准产出/消耗事件**：必须在代币变动时上报产出/消耗事件并携带 `currency`（代币类型）与数量，否则无法统计。
- **net 是核心信号**：单看 source 或 sink 绝对值意义不大，`net` 的正负与趋势才是经济健康度指标。
- **按代币分别看**：不同代币（金币 vs 钻石）经济逻辑不同，不能合并，应逐个分析。
- **时间窗口**：短窗口（如单日）波动大，建议看周/月趋势判断通胀/通缩方向。

---

## 七、相关文档

- [关卡分析](./analyst-level-analysis.md)
- [营收分析](./analyst-revenue.md)
- [C# SDK 接入指南](./sdk-csharp.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
