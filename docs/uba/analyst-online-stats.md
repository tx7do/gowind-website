# 同时在线分析（游戏）

同时在线分析（OnlineStats）基于会话区间推算 **PCU（峰值同时在线）/ ACU（平均同时在线）**，衡量游戏的并发承载与人气。对应后端 `AnalyticsService.OnlineStats`。

> 游戏专属模型，可按区服（`server_id`）过滤。依赖会话（session）数据。

---

## 一、它能回答什么问题

- 统计时段内的 PCU（峰值同时在线）是多少？发生在什么时候？
- ACU（平均同时在线）多少？峰值是平均的几倍？（并发波动）
- 某个区服的同时在线规模？

---

## 二、关键指标

| 指标 | 含义 |
|------|------|
| **PCU** | Peak Concurrent Users，时间段内最大同时在线数 |
| **ACU** | Average Concurrent Users，平均同时在线 |
| **统计时长** | `duration_minutes`（分钟） |
| **总会话数** | `total_sessions` |

---

## 三、后端接口

### gRPC：`AnalyticsService.OnlineStats`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `app_id` | uint32（可选） | 按应用过滤 |
| `server_id` | string（可选） | 区服过滤 |

响应 `OnlineStatsResponse`：`pcu` / `acu` / `duration_minutes` / `total_sessions`。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/online-stats
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "serverId": "5"
}
```

---

## 四、实现原理

PCU/ACU **基于会话区间推算**，而非实时心跳计数：

- 每个会话有开始/结束时间，构成一个"在线区间"。
- 在时间轴上叠加所有会话区间，任一时刻的重叠区间数即为该时刻的并发在线数。
- **PCU** = 区间内最大并发数；**ACU** = 平均并发数。

> 因此 PCU/ACU 是推算值，精度依赖会话的开始/结束是否被准确记录。

---

## 五、典型场景

### 服务器容量规划

看 PCU 历史峰值，规划服务器并发承载能力，确保高峰期（如开服、活动）不崩。

### 活动人气评估

活动时段查 PCU/ACU，对比日常水平，评估活动对在线人气的拉动。

### 区服热度对比

按 `server_id` 分别查，对比各区服的同时在线规模，识别热门服/鬼服。

---

## 六、注意事项

- **推算而非实时**：PCU/ACU 基于会话区间推算，与实时心跳计数可能有出入；需精确实时在线建议走单独的心跳上报。
- **依赖会话数据**：会话的开始/结束时间必须准确，超时切分规则影响结果。
- **时间范围影响**：PCU 是 `time_range` 内的峰值，范围越大越可能包含极端峰值。
- **`server_id` 过滤**：游戏可按区服看在线，需 C# SDK 上报 `serverId`。

---

## 七、相关文档

- [滚服留存](./analyst-server-retention.md)
- [关卡分析](./analyst-level-analysis.md)
- [会话分析](./analyst-session-analysis.md)
- [C# SDK 接入指南](./sdk-csharp.md)
- [后端 API 契约](./backend-api.md)
