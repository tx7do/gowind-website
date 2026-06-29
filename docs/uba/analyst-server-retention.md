# 滚服留存（游戏）

滚服留存（ServerRetention）按**区服（server_id）**分组统计留存，对比各区服的用户粘性。对应后端 `AnalyticsService.ServerRetention`。

> 游戏专属模型，依赖 C# SDK 上报的 `serverId`（区服 ID）字段。详见 [C# SDK 接入指南](./sdk-csharp.md)。

---

## 一、它能回答什么问题

- 各区服（如 1 区、2 区、3 区）的次日/7 日留存对比如何？
- 哪个区服留存最差？（可能是合服、运营或版本问题）
- 新开的区服，前期留存是否达标？

---

## 二、与通用留存的区别

| 模型 | 分组 | 适用 |
|------|------|------|
| [留存 Retention](./analyst-retention.md) | 按同期群（注册日） | 通用 Web/APP |
| **滚服留存 ServerRetention** | 按区服 `server_id` | 游戏，对比各区服 |

---

## 三、后端接口

### gRPC：`AnalyticsService.ServerRetention`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 时间范围（按首次活跃日过滤） |
| `app_id` | uint32（可选） | 按应用过滤 |
| `server_id` | string（可选） | 区服 ID 过滤（空 = 全部区服对比） |
| `max_offset_days` | uint32（可选） | 最大偏移天数，默认 7 |

响应 `ServerRetentionResponse`：`rows[]`（`ServerRetentionRow` 含 `server_id` / `cohort_size` 首日新增 / `retention_rates` 各偏移天留存率 map）、`offset_days`（偏移天列表）。

> `retention_rates` 是 `map<string, double>`，key 为天数（如 `"1"`/`"3"`/`"7"`），是 25 个模型里唯一的 map 字段。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/server-retention
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "maxOffsetDays": 7
}
```

---

## 四、典型场景

### 区服质量对比

不传 `server_id`，看所有区服的留存对比表，找出留存异常的区服（明显低于均值）。

### 新服开服评估

针对新开的 `server_id`，看其前 7 天留存曲线，评估新服的玩家承接质量。

### 合服/运营效果

合服或大版本更新前后，对比相关区服的留存变化，评估运营动作效果。

---

## 五、注意事项

- **依赖 `serverId` 上报**：必须用 C# SDK 在事件里上报 `serverId`（落到 `events_fact.server_id` 列），否则无法按区服分组。
- **cohort_size 口径**：每区服的同期群规模是该服首日新增用户数。
- **map 字段**：`retention_rates` 是 map，前端展示时按 `offset_days` 列对齐成表格。
- **与通用留存互补**：游戏既看整体留存，也按区服下钻，两者结合定位问题是全局还是单服。

---

## 六、相关文档

- [留存分析](./analyst-retention.md)
- [关卡分析](./analyst-level-analysis.md)
- [同时在线](./analyst-online-stats.md)
- [C# SDK 接入指南](./sdk-csharp.md)
- [后端 API 契约](./backend-api.md)
