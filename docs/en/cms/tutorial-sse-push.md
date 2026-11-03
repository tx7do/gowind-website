# Real-Time Message Push (SSE) in Practice

GoWind CMS integrates SSE (Server-Sent Events) services in both the Admin Service and the App Service to push real-time messages to the admin console and frontend applications. This tutorial explains the SSE architecture design, push scenarios, and the front-/back-end implementation.

## Prerequisites

- You have read [CMS Backend Architecture Overview](./backend-architecture.md)
- Understand the concept of HTTP long-lived connections
- It is recommended to first read the [GoWind Admin SSE Push Tutorial](/en/admin/tutorial-sse-push.md)

## 1. SSE Architecture

### 1.1 The CMS Dual SSE Services

```mermaid
graph TB
    subgraph Core Service
        Event[事件总线]
        Task[异步任务]
    end

    subgraph Admin SSE :6601
        AdminSSE[SSE Server]
        AdminPush[管理员通知<br/>评论审核提醒<br/>系统告警]
    end

    subgraph App SSE :6701
        AppSSE[SSE Server]
        AppPush[前台用户通知<br/>评论回复提醒<br/>互动消息]
    end

    Event --> AdminSSE
    Event --> AppSSE
    Task --> AdminSSE
    Task --> AppSSE
    AdminPush --> AdminBrowser[管理后台浏览器]
    AppPush --> AppBrowser[前台用户浏览器]
```

| SSE Service | Port | Audience | Pushed Content |
|---------|------|---------|---------|
| Admin SSE | 6601 | Administrators | Comment moderation reminders, system alerts, task status |
| App SSE | 6701 | Frontend users | Comment replies, interaction notifications, system messages |

### 1.2 SSE vs. WebSocket

| Comparison | SSE | WebSocket |
|--------|-----|-----------|
| Communication direction | Server → client (one-way) | Bidirectional |
| Protocol | HTTP | WebSocket |
| Reconnection | Automatic browser reconnection | Manual implementation required |
| Complexity | Low | High |
| Use cases | Notification push, status updates | Chat, real-time collaboration |

CMS notification scenarios only require server-side push, so SSE is the simpler choice.

## 2. Server-Side Implementation

### 2.1 The SSE Server

```go
// app/admin/service/internal/server/sse_server.go
type SSEServer struct {
    clients map[uint32]*client.Player  // userId → 客户端连接
    mu      sync.RWMutex
}

func NewSSEServer() *SSEServer {
    return &SSEServer{
        clients: make(map[uint32]*client.Player),
    }
}

// SSE 端点，前端 EventSource 连接
func (s *SSEServer) HandleSSE(c *gin.Context) {
    userId := c.GetUint32("userId")

    c.Header("Content-Type", "text/event-stream")
    c.Header("Cache-Control", "no-cache")
    c.Header("Connection", "keep-alive")
    c.Header("Access-Control-Allow-Origin", "*")

    // 注册客户端连接
    player := client.NewPlayer(userId, c.Writer)
    s.register(userId, player)
    defer s.unregister(userId)

    // 保持连接
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-c.Done():
            return
        case <-ticker.C:
            // 心跳保活
            c.SSEvent("ping", "heartbeat")
            c.Writer.Flush()
        }
    }
}

// 向指定用户推送消息
func (s *SSEServer) Push(userId uint32, event string, data interface{}) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    if client, exists := s.clients[userId]; exists {
        client.Send(event, data)
    }
}

// 广播给所有在线用户
func (s *SSEServer) Broadcast(event string, data interface{}) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    for _, client := range s.clients {
        client.Send(event, data)
    }
}
```

### 2.2 Event Bus Integration

Events in the Core Service trigger SSE push (SSE) through the EventBus:

```go
// app/core/service/internal/service/event_handler.go
func (s *EventHandler) OnCommentCreated(ctx context.Context, event *CommentCreatedEvent) {
    // 1. 通知管理后台：新评论待审核
    s.adminSSEClient.Push(event.PostAuthorId, "comment:pending", map[string]any{
        "commentId": event.CommentId,
        "postId":    event.PostId,
        "content":   event.Content,
        "userName":  event.UserName,
    })

    // 2. 通知前台用户：文章有新评论
    s.appSSEClient.Push(event.PostAuthorId, "comment:new", map[string]any{
        "postId":    event.PostId,
        "postTitle": event.PostTitle,
        "userName":  event.UserName,
    })
}

func (s *EventHandler) OnCommentReplied(ctx context.Context, event *CommentRepliedEvent) {
    // 通知被回复的用户
    s.appSSEClient.Push(event.ReplyToUserId, "comment:reply", map[string]any{
        "commentId":   event.CommentId,
        "postId":      event.PostId,
        "replyByUser": event.UserName,
        "content":     event.Content,
    })
}
```

### 2.3 Registering Event Subscriptions

```go
// app/core/service/internal/service/service.go
func InitEventHandlers(eventbus *eventbus.EventBus, adminSSE *sse.Client, appSSE *sse.Client) {
    handler := &EventHandler{adminSSEClient: adminSSE, appSSEClient: appSSE}

    // 订阅评论事件
    eventbus.Subscribe("comment.created", handler.OnCommentCreated)
    eventbus.Subscribe("comment.replied", handler.OnCommentReplied)
    eventbus.Subscribe("comment.approved", handler.OnCommentApproved)

    // 订阅帖子事件
    eventbus.Subscribe("post.published", handler.OnPostPublished)
    eventbus.Subscribe("post.updated", handler.OnPostUpdated)
}
```

## 3. Admin Console Frontend Implementation

### 3.1 SSE Connection Management

```typescript
// frontend/admin/apps/admin/src/utils/sse.ts
class SSEClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;

  connect(token: string) {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource(
      `${import.meta.env.VITE_SSE_URL}/events?token=${token}`,
    );

    this.eventSource.onopen = () => {
      console.log('SSE 已连接');
    };

    this.eventSource.onerror = () => {
      console.log('SSE 连接断开，5 秒后重连...');
      this.eventSource?.close();
      this.reconnectTimer = setTimeout(() => this.connect(token), 5000);
    };

    // 注册事件监听
    this.listeners.forEach((callbacks, eventName) => {
      this.eventSource?.addEventListener(eventName, (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        callbacks.forEach((cb) => cb(data));
      });
    });
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  disconnect() {
    this.eventSource?.close();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }
}

export const sseClient = new SSEClient();
```

### 3.2 Global Notification Integration

```typescript
// frontend/admin/apps/admin/src/App.vue
import { sseClient } from '@/utils/sse';
import { useNotification } from 'ant-design-vue';

const { info, success, warning } = useNotification();
const token = getToken();

// 连接 SSE
sseClient.connect(token);

// 新评论审核提醒
sseClient.on('comment:pending', (data) => {
  warning({
    title: '新评论待审核',
    content: `${data.userName}: ${data.content}`,
    onClick: () => router.push('/content/comment/audit'),
  });
});

// 系统告警
sseClient.on('system:alert', (data) => {
  info({
    title: '系统告警',
    content: data.message,
  });
});

onUnmounted(() => {
  sseClient.disconnect();
});
```

### 3.3 Badge Notifications

```vue
<!-- components/layout/Header.vue -->
<script setup lang="ts">
import { sseClient } from '@/utils/sse';

const pendingCount = ref(0);

onMounted(() => {
  sseClient.on('comment:pending', () => {
    pendingCount.value++;
  });
});

const handleClick = () => {
  router.push('/content/comment/audit');
  pendingCount.value = 0;
};
</script>

<template>
  <Badge :count="pendingCount">
    <BellOutlined @click="handleClick" />
  </Badge>
</template>
```

## 4. Frontend Application SSE

### 4.1 React Frontend SSE

```tsx
// src/lib/sse/client.ts
export class AppSSEClient {
  private eventSource: EventSource | null = null;

  connect(token: string) {
    this.eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_SSE_URL}/events?token=${token}`,
    );

    this.eventSource.addEventListener('comment:reply', this.onCommentReply);
    this.eventSource.addEventListener('notification', this.onNotification);

    this.eventSource.onerror = () => {
      this.eventSource?.close();
      setTimeout(() => this.connect(token), 5000);
    };
  }

  private onCommentReply = (e: MessageEvent) => {
    const data = JSON.parse(e.data);
    // 显示 toast 通知
    toast.success(`${data.replyByUser} 回复了你的评论`);
  };

  private onNotification = (e: MessageEvent) => {
    const data = JSON.parse(e.data);
    // 更新通知角标
    notificationStore.increment();
  };

  disconnect() {
    this.eventSource?.close();
  }
}
```

### 4.2 Notification Center Component

```tsx
// src/components/layout/NotificationBell.tsx
'use client';

import { useEffect, useState } from 'react';
import { Popover, Badge, List } from 'antd';
import { AppSSEClient } from '@/lib/sse/client';

interface Notification {
  id: number;
  title: string;
  content: string;
  type: string;
  createdAt: string;
}

export function NotificationBell({ token }: { token: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) return;

    const sse = new AppSSEClient();
    sse.connect(token);

    return () => sse.disconnect();
  }, [token]);

  return (
    <Popover
      content={
        <List
          dataSource={notifications}
          renderItem={(n) => (
            <List.Item>
              <List.Item.Meta
                title={n.title}
                description={n.content}
              />
            </List.Item>
          )}
        />
      }
      trigger="click"
    >
      <Badge count={unreadCount}>
        <BellIcon />
      </Badge>
    </Popover>
  );
}
```

### 4.3 Flutter Frontend SSE

```dart
// lib/core/network/sse_client.dart
class SSEClient {
  final String baseUrl;
  late final EventSource _eventSource;

  final _commentReplyController = StreamController<Map<String, dynamic>>.broadcast();
  final _notificationController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get onCommentReply => _commentReplyController.stream;
  Stream<Map<String, dynamic>> get onNotification => _notificationController.stream;

  SSEClient({required this.baseUrl});

  Future<void> connect(String token) async {
    _eventSource = await EventSource.connect(
      '$baseUrl/events?token=$token',
    );

    _eventSource.addEventListener('comment:reply', (event) {
      final data = jsonDecode(event.data);
      _commentReplyController.add(data);
    });

    _eventSource.addEventListener('notification', (event) {
      final data = jsonDecode(event.data);
      _notificationController.add(data);
    });
  }

  void dispose() {
    _eventSource.close();
    _commentReplyController.close();
    _notificationController.close();
  }
}
```

```dart
// 使用示例：在 BLoC 中监听 SSE
class NotificationBloc extends Bloc<NotificationEvent, NotificationState> {
  final SSEClient sseClient;

  NotificationBloc({required this.sseClient}) : super(NotificationInitial()) {
    sseClient.onCommentReply.listen((data) {
      add(ReceiveNotification(
        title: '${data['replyByUser']} 回复了你',
        content: data['content'],
      ));
    });
  }
}
```

## 5. Push Scenarios

### 5.1 CMS Push Scenario Overview

```mermaid
graph TD
    Trigger[触发源] --> AdminPush[管理后台推送]
    Trigger --> AppPush[前台用户推送]

    AdminPush --> A1[新评论待审核]
    AdminPush --> A2[内容发布成功]
    AdminPush --> A3[系统告警]
    AdminPush --> A4[任务执行完成]
    AdminPush --> A5[缓存清理完成]

    AppPush --> P1[评论被回复]
    AppPush --> P2[文章被点赞]
    AppPush --> P3[关注的人发新文]
    AppPush --> P4[系统维护通知]
```

### 5.2 Custom Push

Push logic can be customized through Lua scripts:

```lua
-- 文章发布时推送通知给所有关注者
eventbus.subscribe("post.published", function(event)
    local post_id = event.post_id
    local author_id = event.author_id

    -- 查询所有关注者
    local followers = api.get("/admin/v1/users/" .. author_id .. "/followers")

    for _, follower_id in ipairs(followers) do
        -- 推送 SSE 通知
        sse.push_to_app_user(follower_id, "post:new", {
            postId = post_id,
            authorName = event.author_name,
            title = event.title,
        })
    end
end)
```

## 6. Performance and Reliability

### 6.1 Connection Management

| Metric | Recommendation |
|------|------|
| Maximum connections | 5000-10000 per instance |
| Heartbeat interval | 30 seconds |
| Timeout disconnect | No response for 60 seconds |
| Horizontal scaling | Nginx load balancing + Redis Pub/Sub |

### 6.2 Horizontal Scaling

When deploying multiple instances, pushes are synchronized through Redis Pub/Sub:

```mermaid
graph LR
    Pusher[推送服务] --> Redis[Redis Pub/Sub]
    Redis --> SSE1[SSE 实例 1]
    Redis --> SSE2[SSE 实例 2]
    Redis --> SSE3[SSE 实例 3]
    SSE1 --> User1[用户 A]
    SSE2 --> User2[用户 B]
    SSE3 --> User3[用户 C]
```

```go
// Redis Pub/Sub 广播
func (s *SSEServer) Push(userId uint32, event string, data interface{}) {
    msg := PushMessage{
        UserId: userId,
        Event:  event,
        Data:   data,
    }
    payload, _ := json.Marshal(msg)
    // 发布到 Redis，所有 SSE 实例订阅
    redisClient.Publish(ctx, "sse:push", payload)
}

// 每个 SSE 实例订阅 Redis
func (s *SSEServer) SubscribeRedis() {
    sub := redisClient.Subscribe(ctx, "sse:push")
    for msg := range sub.Channel() {
        var pushMsg PushMessage
        json.Unmarshal([]byte(msg.Payload), &pushMsg)

        // 只推送给本实例连接的用户
        s.localPush(pushMsg.UserId, pushMsg.Event, pushMsg.Data)
    }
}
```

## 7. Checklist

| Check Item | Description |
|--------|------|
| SSE server | Dual services: Admin SSE + App SSE |
| Event subscription | EventBus integration |
| Admin console frontend | SSE connection + notification display |
| Frontend client | React/Flutter SSE clients |
| Heartbeat keep-alive | 30-second heartbeat |
| Automatic reconnection | Reconnect 5 seconds after disconnection |
| Horizontal scaling | Redis Pub/Sub broadcast |
| Message types | Comments/notifications/system alerts |

## Related Documents

- [CMS Backend Architecture Overview](./backend-architecture.md)
- [Comment System in Practice](./tutorial-comment-system.md)
- [Task Scheduling in Practice](./tutorial-task-scheduling.md)
- [GoWind Admin SSE Push Tutorial](/en/admin/tutorial-sse-push.md)
