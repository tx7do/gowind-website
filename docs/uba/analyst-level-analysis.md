# 关卡分析（游戏）

关卡分析（LevelAnalysis）统计游戏各关卡的通过率、失败率、卡关率与分数分布，是**数值平衡与流失点定位**的核心模型。对应后端 `AnalyticsService.LevelAnalysis`。

> 游戏专属模型，依赖 C# SDK 上报的关卡事件（`level_start` / `level_finish` / `level_fail`）与 `level` 字段。详见 [C# SDK 接入指南](./sdk-csharp.md)。

---

## 一、它能回答什么问题

- 哪一关的通过率最低？（卡关点，流失高发）
- 各关的满星率（`star3_rate`）如何？难度曲线是否合理？
- 哪一关挑战人数骤降？（玩家在前一关大量流失）

---

## 二、关键指标

每个 `LevelStat`（单关）含：

| 指标 | 含义 |
|------|------|
| **attempt_count** | 尝试次数（`level_start`） |
| **finish_count** | 完成次数（`level_finish`） |
| **fail_count** | 失败次数（`level_fail`） |
| **pass_rate** | 通过率（finish / (finish+fail)） |
| **stuck_rate** | 卡关率（1 - pass_rate，值越高越难/流失点） |
| **avg_score** | 平均分 |
| **star3_rate** | 满星率（context['stars']==3 占比） |
| **player_count** | 挑战该关的玩家数（去重） |

---

## 三、后端接口

### gRPC：`AnalyticsService.LevelAnalysis`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `app_id` | uint32（可选） | 按应用过滤 |
| `level_id` | string（可选） | 指定关卡 ID（空 = 全部关卡） |

响应 `LevelAnalysisResponse`：`levels[]`（各 `LevelStat`，按 `player_count` 降序）。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/level-analysis
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 }
}
```

---

## 四、典型场景

### 难度曲线调优

按关卡顺序看 `pass_rate` 与 `stuck_rate`：理想曲线是平稳缓升。若某关 `stuck_rate` 突增，说明难度断层，需降低该关难度或加强前序关卡引导。

### 流失点定位

看 `player_count` 沿关卡的衰减：相邻关卡挑战人数骤降处即流失点，通常对应高 `stuck_rate` 的关卡。

### 满星率评估

`star3_rate` 反映关卡对高端玩家的挑战度。满星率过高（人人三星）说明太简单；过低说明三星条件过苛。

---

## 五、注意事项

- **依赖标准关卡事件**：必须上报 `level_start` / `level_finish` / `level_fail`，且事件携带 `level`（关卡 ID/名）字段，否则无法统计。
- **满星率依赖 context**：`star3_rate` 从事件的 `context['stars']` 取值，需客户端上报星级。
- **通过率口径**：`pass_rate = finish / (finish + fail)`，不含未结束的进行中尝试。
- **player_count 衰减是关键信号**：单看通过率不够，要结合玩家数衰减定位真实流失点。

---

## 六、相关文档

- [滚服留存](./analyst-server-retention.md)
- [经济系统](./analyst-economy.md)
- [C# SDK 接入指南](./sdk-csharp.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
