# 会话分析实战教程

会话（Session）是用户行为的聚合单元，一个会话代表用户的一次连续交互过程。本教程讲解会话模型的定义、切分规则和分析方法。

## 前置条件

- 已阅读 [事件分析实战](./tutorial-event-analysis.md)

## 一、会话模型

### 1.1 什么是会话

```mermaid
graph LR
    subgraph Session1["会话1（3 个事件）"]
        E1["浏览首页<br/>10:00:00"] --> E2["搜索商品<br/>10:01:30"] --> E3["查看详情<br/>10:02:45"]
    end

    --- 30 分钟无操作 ---

    subgraph Session2["会话2（2 个事件）"]
        E4["浏览首页<br/>10:45:00"] --> E5["退出<br/>10:46:00"]
    end
```

### 1.2 Session 数据模型

```protobuf
// uba/service/v1/session.proto
message Session {
  optional uint32 id = 1;
  optional string session_id = 2 [json_name = "session_id"];
  optional string distinct_id = 3 [json_name = "distinct_id"];
  optional string account_id = 4 [json_name = "account_id"];

  // --- 时间 ---
  optional google.protobuf.Timestamp start_time = 10 [json_name = "start_time"];
  optional google.protobuf.Timestamp end_time = 11 [json_name = "end_time"];
  optional uint32 duration_seconds = 12 [json_name = "duration_seconds"];

  // --- 事件统计 ---
  optional uint32 event_count = 20 [json_name = "event_count"];
  optional uint32 page_view_count = 21 [json_name = "page_view_count"];
  optional uint32 action_count = 22 [json_name = "action_count"];

  // --- 入口/出口 ---
  optional string entry_page = 30 [json_name = "entry_page"];
  optional string exit_page = 31 [json_name = "exit_page"];
  optional bool is_bounce = 32 [json_name = "is_bounce"];  // 跳出

  // --- 设备 ---
  optional string platform = 40;
  optional string os = 41;
  optional string app_version = 42 [json_name = "app_version"];

  // --- 地理 ---
  optional string country = 50;
  optional string city = 51;

  // --- 业务指标 ---
  optional double total_amount = 60 [json_name = "total_amount"];
  optional uint32 pay_event_count = 61 [json_name = "pay_event_count"];

  // --- 风控 ---
  optional string risk_level = 70 [json_name = "risk_level"];
  repeated string risk_tags = 71 [json_name = "risk_tags"];

  // --- 租户 ---
  optional uint32 tenant_id = 80 [json_name = "tenant_id"];
  optional string app_id = 81 [json_name = "app_id"];
  map<string, string> context = 90;
}
```

## 二、会话切分规则

### 2.1 超时切分

```go
// 会话切分逻辑（Core Service）
const SessionTimeout = 30 * time.Minute

func (s *SessionService) AssignSession(ctx context.Context, event *ubaV1.BehaviorEvent) (string, error) {
    // 查找用户最近一次会话
    lastSession, err := s.sessionRepo.GetLastSession(ctx, event.DistinctId, event.AppId)
    if err != nil {
        return s.createNewSession(ctx, event)
    }

    // 检查是否超时
    timeSinceLastEvent := event.ServerTime.AsTime().Sub(lastSession.EndTime.AsTime())
    if timeSinceLastEvent > SessionTimeout {
        // 超时，创建新会话
        return s.createNewSession(ctx, event)
    }

    // 未超时，追加到现有会话
    s.sessionRepo.AppendEvent(ctx, lastSession.SessionId, event)
    return lastSession.SessionId, nil
}
```

### 2.2 会话更新

```go
func (r *SessionRepo) AppendEvent(ctx context.Context, sessionId string, event *ubaV1.BehaviorEvent) error {
    update := `
        ALTER TABLE sessions_fact UPDATE
            end_time = ?,
            duration_seconds = dateDiff('second', start_time, ?),
            event_count = event_count + 1,
            page_view_count = page_view_count + if(event_name = 'page_view', 1, 0),
            exit_page = if(event_name = 'page_view', ?, exit_page),
            total_amount = total_amount + toFloat64OrDefault(properties['amount'], 0)
        WHERE session_id = ?
    `
    return r.conn.Exec(ctx, update,
        event.ServerTime.AsTime(),
        event.ServerTime.AsTime(),
        event.Properties["page_url"],
        sessionId,
    )
}
```

## 三、会话分析指标

| 指标 | 说明 |
|------|------|
| 会话数 | 总会话数 |
| 会话时长 | 平均/中位数会话时长 |
| 每会话事件数 | 平均每次会话的事件数 |
| 跳出率 | 单页面会话占比 |
| 页面深度 | 平均每会话浏览页数 |
| 转化率 | 包含转化事件的会话占比 |

### 3.1 会话统计查询

```sql
-- 每日会话统计
SELECT
    toDate(start_time) AS date,
    count() AS session_count,
    avg(duration_seconds) AS avg_duration,
    quantile(0.5)(duration_seconds) AS median_duration,
    avg(event_count) AS avg_events,
    sum(is_bounce) / count() * 100 AS bounce_rate,
    avg(page_view_count) AS avg_page_depth
FROM sessions_fact
WHERE app_id = 'app_001'
  AND start_time >= today() - 30
GROUP BY date
ORDER BY date ASC;
```

### 3.2 单个用户会话列表

```sql
SELECT
    session_id,
    start_time,
    end_time,
    duration_seconds,
    event_count,
    page_view_count,
    entry_page,
    exit_page,
    is_bounce,
    total_amount
FROM sessions_fact
WHERE distinct_id = 'uuid-xxx'
  AND app_id = 'app_001'
ORDER BY start_time DESC
LIMIT 20;
```

## 四、Admin API

```http
# 会话列表
GET /admin/v1/sessions?appId=app_001&dateFrom=2024-06-01&dateTo=2024-06-30&page=1&pageSize=20

# 会话详情（含事件序列）
GET /admin/v1/sessions/sess-xxx/detail

# 会话统计
GET /admin/v1/sessions/stats?appId=app_001&dateFrom=2024-06-01&dateTo=2024-06-30&granularity=day
```

## 五、前端可视化

### 5.1 会话列表

```vue
<script setup lang="ts">
import { useSessionList } from '@/api/composables/session';

const query = ref({ appId: 'app_001', page: 1, pageSize: 20 });
const { data, isLoading } = useSessionList(query);

const columns = [
  { title: '会话ID', dataIndex: 'sessionId', width: 200 },
  { title: '用户', dataIndex: 'accountId', customRender: ({ text }) => text || '匿名' },
  { title: '开始时间', dataIndex: 'startTime' },
  { title: '时长', dataIndex: 'durationSeconds', customRender: ({ text }) => formatDuration(text) },
  { title: '事件数', dataIndex: 'eventCount' },
  { title: '页面数', dataIndex: 'pageViewCount' },
  { title: '跳出', dataIndex: 'isBounce', customRender: ({ text }) => text ? '是' : '否' },
  { title: '操作', key: 'action' },
];
</script>
```

### 5.2 会话详情时间线

```vue
<template>
  <a-timeline>
    <a-timeline-item v-for="event in sessionEvents" :key="event.id">
      <div class="event-item">
        <span class="time">{{ formatTime(event.serverTime) }}</span>
        <a-tag :color="getEventColor(event.eventName)">
          {{ event.eventName }}
        </a-tag>
        <span class="properties">{{ JSON.stringify(event.properties) }}</span>
      </div>
    </a-timeline-item>
  </a-timeline>
</template>
```

## 六、检查清单

| 检查项 | 说明 |
|--------|------|
| 会话切分 | 超时切分规则正确 |
| 会话更新 | 事件追加到正确会话 |
| 跳出判定 | 单页面会话标记 is_bounce |
| 统计查询 | 会话数/时长/跳出率正确 |
| 前端列表 | 会话列表渲染正常 |
| 时间线 | 会话事件时间线展示 |

## 相关文档

- [事件分析实战](./tutorial-event-analysis.md)
- [路径分析实战](./tutorial-path-analysis.md)
- [留存分析实战](./tutorial-retention-analysis.md)
