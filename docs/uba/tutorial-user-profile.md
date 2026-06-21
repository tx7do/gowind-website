# 用户行为画像实战教程

用户行为画像是 UBA 的用户维度数据，聚合了用户的基础信息、活动统计、行为偏好和风险特征。本教程讲解 UserBehaviorProfile 模型、画像构建和查询。

## 前置条件

- 已阅读 [事件分析实战](./tutorial-event-analysis.md)

## 一、UserBehaviorProfile 模型

```protobuf
// uba/service/v1/user_behavior_profile.proto
message UserBehaviorProfile {
  optional uint32 id = 1;

  // --- 身份 ---
  optional string global_user_id = 10 [json_name = "global_user_id"];
  optional string distinct_id = 11 [json_name = "distinct_id"];
  optional string account_id = 12 [json_name = "account_id"];
  optional string user_id = 13 [json_name = "user_id"];
  optional string device_id = 14 [json_name = "device_id"];

  // --- 注册信息 ---
  optional google.protobuf.Timestamp first_seen = 20 [json_name = "first_seen"];
  optional google.protobuf.Timestamp last_active = 21 [json_name = "last_active"];
  optional string registration_source = 22 [json_name = "registration_source"];

  // --- 身份属性 ---
  optional string user_level = 30 [json_name = "user_level"];
  optional string vip_level = 31 [json_name = "vip_level"];
  optional string user_role = 32 [json_name = "user_role"];

  // --- 行为统计 ---
  optional uint64 total_events = 40 [json_name = "total_events"];
  optional uint64 total_sessions = 41 [json_name = "total_sessions"];
  optional uint64 total_page_views = 42 [json_name = "total_page_views"];
  optional double total_pay_amount = 43 [json_name = "total_pay_amount"];
  optional uint64 pay_event_count = 44 [json_name = "pay_event_count"];

  // --- 偏好 ---
  repeated string preferred_categories = 50 [json_name = "preferred_categories"];
  repeated string preferred_objects = 51 [json_name = "preferred_objects"];
  optional string preferred_platform = 52 [json_name = "preferred_platform"];

  // --- 风险 ---
  optional double risk_score = 60 [json_name = "risk_score"];
  optional string risk_level = 61 [json_name = "risk_level"];
  repeated string risk_tags = 62 [json_name = "risk_tags"];

  // --- 地理 ---
  optional string country = 70;
  optional string city = 71;

  // --- 扩展 ---
  map<string, string> profile_map = 80 [json_name = "profile_map"];

  // --- 租户 ---
  optional uint32 tenant_id = 90 [json_name = "tenant_id"];
  optional string app_id = 91 [json_name = "app_id"];
}
```

## 二、画像构建

### 2.1 实时更新

每个行为事件触发时，实时更新用户画像：

```go
func (r *UserDimRepo) Upsert(ctx context.Context, event *ubaV1.BehaviorEvent) error {
    query := `
        INSERT INTO users_dim (
            distinct_id, account_id, first_seen, last_active,
            total_events, total_sessions,
            total_pay_amount, pay_event_count,
            country, city, tenant_id, app_id
        ) VALUES (
            ?, ?, ?, ?,
            1, 0,
            ?, ?,
            ?, ?, ?, ?
        )
        ON DUPLICATE KEY UPDATE
            last_active = VALUES(last_active),
            total_events = total_events + 1,
            total_pay_amount = total_pay_amount + VALUES(total_pay_amount),
            pay_event_count = pay_event_count + VALUES(pay_event_count)
    `

    amount := 0.0
    if event.Amount != nil {
        amount = event.Amount.Value
    }

    isPay := 0
    if event.EventName == "purchase" || event.EventName == "payment_success" {
        isPay = 1
    }

    return r.db.ExecContext(ctx, query,
        event.DistinctId, event.AccountId,
        event.ServerTime.AsTime(), event.ServerTime.AsTime(),
        amount, isPay,
        event.Country, event.City,
        event.TenantId, event.AppId,
    )
}
```

### 2.2 批量聚合

定时任务批量更新用户画像统计数据：

```go
func (s *UserProfileService) RefreshProfiles(ctx context.Context, date time.Time) error {
    // 从事件事实表聚合当日统计
    query := `
        SELECT
            distinct_id,
            count() AS daily_events,
            count(DISTINCT session_id) AS daily_sessions,
            sum(toFloat64OrDefault(properties['amount'], 0)) AS daily_amount
        FROM events_fact
        WHERE toDate(server_time) = ?
        GROUP BY distinct_id
    `

    rows, err := s.eventsRepo.Query(ctx, query, date)
    // ...

    // 批量更新用户维度
    for rows.Next() {
        s.userDimRepo.IncrementStats(ctx, &ubaV1.UserStatsUpdate{
            DistinctId:   row.DistinctId,
            DailyEvents:  row.DailyEvents,
            DailySessions: row.DailySessions,
            DailyAmount:  row.DailyAmount,
        })
    }

    return nil
}
```

## 三、偏好分析

### 3.1 类别偏好

```sql
-- 用户最喜欢的商品类别
SELECT
    e.distinct_id,
    e.properties['category'] AS category,
    count() AS view_count
FROM events_fact e
WHERE e.app_id = 'app_001'
  AND e.event_name = 'view_product'
  AND e.server_time >= today() - 30
GROUP BY e.distinct_id, category
ORDER BY view_count DESC
LIMIT 5;  -- 每用户 TOP 5 类别
```

### 3.2 活跃度分析

```sql
-- 用户活跃度评分（RFM 模型简化版）
SELECT
    distinct_id,
    dateDiff('day', max(server_time), now()) AS recency,  -- 最近一次活跃距今天数
    count() AS frequency,  -- 总事件数
    sum(toFloat64OrDefault(properties['amount'], 0)) AS monetary  -- 总消费
FROM events_fact
WHERE app_id = 'app_001'
GROUP BY distinct_id;
```

## 四、Admin API

```http
# 用户画像列表
GET /admin/v1/user-behavior-profiles?
  appId=app_001&
  riskLevel=high&
  page=1&pageSize=20

# 单个用户画像详情
GET /admin/v1/user-behavior-profiles/distinct-id-xxx

# 高风险用户列表
GET /admin/v1/user-behavior-profiles?appId=app_001&riskLevel=critical

# 高价值用户列表
GET /admin/v1/user-behavior-profiles?appId=app_001&orderBy=totalPayAmount&order=desc
```

## 五、前端画像展示

```vue
<!-- views/analytics/user/ProfileDetail.vue -->
<script setup lang="ts">
import { useUserProfile } from '@/api/composables/profile';

const route = useRoute();
const distinctId = computed(() => route.params.id as string);
const { data: profile, isLoading } = useUserProfile(distinctId);
</script>

<template>
  <ASpin :spinning="isLoading">
    <a-descriptions title="用户画像" :column="3" bordered>
      <a-descriptions-item label="用户ID">{{ profile?.distinctId }}</a-descriptions-item>
      <a-descriptions-item label="账号">{{ profile?.accountId || '匿名' }}</a-descriptions-item>
      <a-descriptions-item label="首次出现">{{ formatDate(profile?.firstSeen) }}</a-descriptions-item>

      <a-descriptions-item label="总事件数">{{ profile?.totalEvents }}</a-descriptions-item>
      <a-descriptions-item label="总会话数">{{ profile?.totalSessions }}</a-descriptions-item>
      <a-descriptions-item label="总消费">{{ formatCurrency(profile?.totalPayAmount) }}</a-descriptions-item>

      <a-descriptions-item label="风险评分">
        <a-progress
          :percent="profile?.riskScore ?? 0"
          :stroke-color="getRiskColor(profile?.riskLevel)"
        />
      </a-descriptions-item>
      <a-descriptions-item label="风险等级">
        <a-tag :color="getRiskColor(profile?.riskLevel)">{{ profile?.riskLevel }}</a-tag>
      </a-descriptions-item>
      <a-descriptions-item label="风险标签">
        <a-tag v-for="tag in profile?.riskTags" :key="tag" color="red">{{ tag }}</a-tag>
      </a-descriptions-item>

      <a-descriptions-item label="偏好类别" :span="3">
        <a-tag v-for="cat in profile?.preferredCategories" :key="cat" color="blue">{{ cat }}</a-tag>
      </a-descriptions-item>
    </a-descriptions>
  </ASpin>
</template>
```

## 六、用户分层

基于画像数据进行用户分层：

| 分层 | 条件 | 说明 |
|------|------|------|
| 高价值用户 | totalPayAmount > 10000 且 lastActive < 7天 | VIP 用户，优先服务 |
| 活跃用户 | lastActive < 1天 | 日活用户 |
| 流失用户 | lastActive 30~90天 | 需要召回 |
| 高风险用户 | riskScore > 70 | 需要风控关注 |
| 新用户 | firstSeen < 7天 | 需要引导 |

## 七、检查清单

| 检查项 | 说明 |
|--------|------|
| 画像构建 | 事件触发时正确更新 users_dim |
| 统计准确 | totalEvents/totalSessions/totalPayAmount |
| 偏好分析 | preferredCategories 正确计算 |
| 风险关联 | riskScore/riskLevel 正确同步 |
| 前端展示 | 画像详情页渲染正常 |

## 相关文档

- [事件分析实战](./tutorial-event-analysis.md)
- [用户分群与标签系统](./tutorial-user-segmentation.md)
- [风控检测引擎](./tutorial-risk-detection.md)
- [留存分析实战](./tutorial-retention-analysis.md)
