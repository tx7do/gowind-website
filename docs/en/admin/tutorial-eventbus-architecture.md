# Event Bus and Decoupled Architecture

GoWind Admin has a built-in event bus (EventBus) that provides a publish/subscribe, event-driven mechanism for loose coupling between modules. This tutorial explains the EventBus architecture, usage, and practical scenarios in depth.

## 1. Event-Driven Architecture

### 1.1 Core Concepts

```mermaid
graph LR
    Publisher["Publisher<br/>(publisher)"] -->|Publish| EventBus["EventBus<br/>(event bus)"]
    EventBus -->|Subscribe| Subscriber["Subscriber<br/>(subscriber)"]
    EventBus -->|Subscribe| Subscriber2["Subscriber<br/>(subscriber)"]
    EventBus -->|Subscribe| SubscriberN["...more subscribers"]
```

| Concept | Description | Example |
|------|------|------|
| **Event** | An event, containing a type and a payload | `user.created`, `order.paid` |
| **Publisher** | The event publisher that triggers events | The user service publishes an event after creating a user |
| **Subscriber** | The event subscriber that handles events | The email service subscribes to the user created event |
| **Handler** | The event handler that executes business logic | Sending a welcome email |
| **Middleware** | Event middleware for cross-cutting concerns | Logging, error retries |

### 1.2 Advantages

- **Decoupling**: publishers do not need to know who the subscribers are
- **Extensibility**: new features only require adding subscribers, without modifying publishers
- **Asynchronous processing**: events can be processed asynchronously, improving responsiveness
- **Testability**: each module can be tested independently

## 2. Core EventBus API

### 2.1 Defining Events

```go
// pkg/eventbus/event.go
type Event struct {
    Type      string                 // 事件类型
    Payload   map[string]interface{} // 事件载荷
    Timestamp time.Time              // 时间戳
    ID        string                 // 事件ID（UUID）
}

// 创建事件
func NewEvent(eventType string, payload map[string]interface{}) *Event {
    return &Event{
        Type:      eventType,
        Payload:   payload,
        Timestamp: time.Now(),
        ID:        uuid.New().String(),
    }
}
```

### 2.2 Publishing Events

```go
// pkg/eventbus/eventbus.go
var bus = NewEventBus()

// 发布事件
func Publish(event *Event) error {
    return bus.Publish(context.Background(), event)
}

// 使用示例
Publish(NewEvent("user.created", map[string]interface{}{
    "user_id":  123,
    "username": "john",
    "email":    "john@example.com",
}))
```

### 2.3 Subscribing to Events

```go
// 订阅事件
func Subscribe(eventType string, handler Handler) {
    bus.Subscribe(eventType, handler)
}

// 定义处理器
type Handler func(ctx context.Context, event *Event) error

// 使用示例
Subscribe("user.created", func(ctx context.Context, event *Event) error {
    userID := event.Payload["user_id"].(uint32)
    email := event.Payload["email"].(string)
    
    log.Infof("new user created: id=%d, email=%s", userID, email)
    
    // 发送欢迎邮件
    return sendWelcomeEmail(email)
})
```

### 2.4 Unsubscribing

```go
// 取消订阅
func Unsubscribe(eventType string, handler Handler) {
    bus.Unsubscribe(eventType, handler)
}
```

## 3. Event Middleware

### 3.1 Logging Middleware

Log the execution of all events:

```go
// pkg/eventbus/middleware.go
func LoggingMiddleware() Middleware {
    return func(next Handler) Handler {
        return func(ctx context.Context, event *Event) error {
            startTime := time.Now()
            
            log.Infof("[event:%s] processing started", event.Type)
            
            err := next(ctx, event)
            
            elapsed := time.Since(startTime)
            if err != nil {
                log.Errorf("[event:%s] failed after %v: %v", 
                    event.Type, elapsed, err)
            } else {
                log.Infof("[event:%s] completed in %v", 
                    event.Type, elapsed)
            }
            
            return err
        }
    }
}

// 注册中间件
bus.Use(LoggingMiddleware())
```

### 3.2 Retry Middleware

Retry automatically on failure:

```go
func RetryMiddleware(maxRetries int, delay time.Duration) Middleware {
    return func(next Handler) Handler {
        return func(ctx context.Context, event *Event) error {
            var lastErr error
            
            for i := 0; i <= maxRetries; i++ {
                err := next(ctx, event)
                if err == nil {
                    return nil
                }
                
                lastErr = err
                log.Warnf("[event:%s] retry %d/%d after error: %v", 
                    event.Type, i+1, maxRetries, err)
                
                if i < maxRetries {
                    time.Sleep(delay)
                }
            }
            
            return lastErr
        }
    }
}

// 使用：最多重试 3 次，每次间隔 1 秒
bus.Use(RetryMiddleware(3, 1*time.Second))
```

### 3.3 Rate Limiting Middleware

Limit the event processing rate:

```go
import "golang.org/x/time/rate"

func RateLimitMiddleware(limit rate.Limit, burst int) Middleware {
    limiter := rate.NewLimiter(limit, burst)
    
    return func(next Handler) Handler {
        return func(ctx context.Context, event *Event) error {
            // 等待令牌
            err := limiter.Wait(ctx)
            if err != nil {
                return err
            }
            
            return next(ctx, event)
        }
    }
}

// 使用：每秒最多处理 10 个事件
bus.Use(RateLimitMiddleware(10, 20))
```

### 3.4 Tracing Middleware

Integrate OpenTelemetry for distributed tracing:

```go
import "go.opentelemetry.io/otel/trace"

func TracingMiddleware(tracer trace.Tracer) Middleware {
    return func(next Handler) Handler {
        return func(ctx context.Context, event *Event) error {
            ctx, span := tracer.Start(ctx, fmt.Sprintf("event.%s", event.Type))
            defer span.End()
            
            // 将 Span ID 注入事件
            event.Payload["trace_id"] = span.SpanContext().TraceID().String()
            
            return next(ctx, event)
        }
    }
}
```

## 4. Built-in Event List

GoWind Admin predefines the following events:

| Event Type | Trigger | Payload Fields |
|----------|----------|----------|
| `user.created` | After a user is created | `user_id`, `username`, `email` |
| `user.updated` | After a user is updated | `user_id`, `changes` |
| `user.deleted` | After a user is deleted | `user_id` |
| `login.success` | After a successful login | `user_id`, `ip`, `device` |
| `login.failed` | After a failed login | `username`, `ip`, `reason` |
| `order.created` | After an order is created | `order_id`, `user_id`, `amount` |
| `order.paid` | After an order is paid | `order_id`, `payment_method` |
| `file.uploaded` | After a file is uploaded | `file_id`, `uploader_id`, `size` |
| `permission.changed` | After permissions change | `role_id`, `action` |

## 5. Practical Scenarios

### 5.1 Scenario 1: Multiple Operations After User Registration

**Requirement**: after a user registers successfully, the system needs to:
1. Send a welcome email
2. Initialize the user's default settings
3. Record the registration log
4. Push a new-user notification to administrators

**The traditional approach (coupled)**:

```go
func (s *UserService) Register(ctx context.Context, req *RegisterRequest) error {
    // 1. 创建用户
    user, _ := s.userRepo.Create(ctx, req)
    
    // 2. 发送欢迎邮件（耦合）
    emailService.SendWelcomeEmail(user.Email)
    
    // 3. 初始化设置（耦合）
    settingsService.InitDefaultSettings(user.ID)
    
    // 4. 记录日志（耦合）
    auditLogRepo.Create(...)
    
    // 5. 通知管理员（耦合）
    notificationService.NotifyAdmin("New user registered")
    
    return nil
}
```

**Problems**:
- UserService depends on multiple services
- Adding a new operation requires modifying UserService
- Each operation is hard to test in isolation

**The event-driven approach (decoupled)**:

```go
func (s *UserService) Register(ctx context.Context, req *RegisterRequest) error {
    // 1. 创建用户
    user, _ := s.userRepo.Create(ctx, req)
    
    // 2. 发布事件（解耦）
    eventbus.Publish(eventbus.NewEvent("user.created", map[string]interface{}{
        "user_id":  user.ID,
        "username": user.Username,
        "email":    user.Email,
    }))
    
    return nil
}

// 订阅者 1：发送欢迎邮件
eventbus.Subscribe("user.created", func(ctx context.Context, event *Event) error {
    email := event.Payload["email"].(string)
    return emailService.SendWelcomeEmail(email)
})

// 订阅者 2：初始化设置
eventbus.Subscribe("user.created", func(ctx context.Context, event *Event) error {
    userID := event.Payload["user_id"].(uint32)
    return settingsService.InitDefaultSettings(userID)
})

// 订阅者 3：记录日志
eventbus.Subscribe("user.created", func(ctx context.Context, event *Event) error {
    return auditLogRepo.Create(...)
})

// 订阅者 4：通知管理员
eventbus.Subscribe("user.created", func(ctx context.Context, event *Event) error {
    username := event.Payload["username"].(string)
    return notificationService.NotifyAdmin(fmt.Sprintf("New user: %s", username))
})
```

**Advantages**:
- UserService is only responsible for creating users
- Adding a new operation only requires adding a subscriber
- Each subscriber can be tested independently

---

### 5.2 Scenario 2: Business Flow After Order Payment

**Requirement**: after an order is paid successfully, the system needs to:
1. Deduct the inventory
2. Generate an invoice
3. Send a payment success notification
4. Update the user's points

**Implementation**:

```go
// 发布者：订单服务
func (s *OrderService) Pay(ctx context.Context, orderID uint32) error {
    // 1. 更新订单状态
    s.orderRepo.UpdateStatus(ctx, orderID, Order_PAID)
    
    // 2. 发布事件
    eventbus.Publish(eventbus.NewEvent("order.paid", map[string]interface{}{
        "order_id":       orderID,
        "user_id":        order.UserID,
        "amount":         order.Amount,
        "payment_method": order.PaymentMethod,
        "items":          order.Items,
    }))
    
    return nil
}

// 订阅者 1：扣减库存
eventbus.Subscribe("order.paid", func(ctx context.Context, event *Event) error {
    items := event.Payload["items"].([]OrderItem)
    
    for _, item := range items {
        stockService.Decrease(item.ProductID, item.Quantity)
    }
    
    return nil
})

// 订阅者 2：生成发票
eventbus.Subscribe("order.paid", func(ctx context.Context, event *Event) error {
    orderID := event.Payload["order_id"].(uint32)
    return invoiceService.Generate(orderID)
})

// 订阅者 3：发送通知
eventbus.Subscribe("order.paid", func(ctx context.Context, event *Event) error {
    userID := event.Payload["user_id"].(uint32)
    amount := event.Payload["amount"].(float64)
    
    user, _ := userService.Get(userID)
    return notificationService.Send(user.Email, 
        fmt.Sprintf("Payment successful: $%.2f", amount))
})

// 订阅者 4：更新积分
eventbus.Subscribe("order.paid", func(ctx context.Context, event *Event) error {
    userID := event.Payload["user_id"].(uint32)
    amount := event.Payload["amount"].(float64)
    
    points := int(amount * 10)  // 每消费 1 元获得 10 积分
    return pointsService.Add(userID, points)
})
```

---

### 5.3 Scenario 3: Post-Upload File Processing

**Requirement**: after a file is uploaded, process it differently depending on the file type:
- Images: generate thumbnails
- Documents: extract text for search
- Videos: transcode into multiple formats

**Implementation**:

```go
// 发布者：文件服务
func (s *FileService) Upload(ctx context.Context, file *FileUpload) error {
    // 1. 上传到 MinIO
    url, _ := s.ossClient.UploadFile(file.Bucket, file.Key, file.Content)
    
    // 2. 记录元数据
    fileRecord, _ := s.fileRepo.Create(ctx, file)
    
    // 3. 发布事件
    eventbus.Publish(eventbus.NewEvent("file.uploaded", map[string]interface{}{
        "file_id":      fileRecord.ID,
        "content_type": file.ContentType,
        "size":         file.Size,
        "uploader_id":  auth.GetUserID(ctx),
    }))
    
    return nil
}

// 订阅者 1：图片处理
eventbus.Subscribe("file.uploaded", func(ctx context.Context, event *Event) error {
    contentType := event.Payload["content_type"].(string)
    
    if !strings.HasPrefix(contentType, "image/") {
        return nil  // 非图片文件，跳过
    }
    
    fileID := event.Payload["file_id"].(uint32)
    return imageService.GenerateThumbnails(fileID)
})

// 订阅者 2：文档索引
eventbus.Subscribe("file.uploaded", func(ctx context.Context, event *Event) error {
    contentType := event.Payload["content_type"].(string)
    
    if !isDocument(contentType) {
        return nil
    }
    
    fileID := event.Payload["file_id"].(uint32)
    return searchService.IndexDocument(fileID)
})

// 订阅者 3：视频转码
eventbus.Subscribe("file.uploaded", func(ctx context.Context, event *Event) error {
    contentType := event.Payload["content_type"].(string)
    
    if !strings.HasPrefix(contentType, "video/") {
        return nil
    }
    
    fileID := event.Payload["file_id"].(uint32)
    
    // 异步转码（避免阻塞）
    task.Enqueue("transcode_video", map[string]interface{}{
        "file_id": fileID,
    })
    
    return nil
})
```

---

### 5.4 Scenario 4: Permission Change Auditing

**Requirement**: record an audit log and notify the security team for every permission change.

**Implementation**:

```go
// 发布者：角色服务
func (s *RoleService) AddPermissions(ctx context.Context, req *AddPermissionsRequest) error {
    // 1. 添加权限
    s.roleRepo.AddPermissions(ctx, req.RoleId, req.PermissionIds)
    
    // 2. 发布事件
    eventbus.Publish(eventbus.NewEvent("permission.changed", map[string]interface{}{
        "role_id":        req.RoleId,
        "permission_ids": req.PermissionIds,
        "action":         "add",
        "operator_id":    auth.GetUserID(ctx),
    }))
    
    return nil
}

// 订阅者 1：记录审计日志
eventbus.Subscribe("permission.changed", func(ctx context.Context, event *Event) error {
    return auditLogRepo.Create(&PermissionAuditLog{
        Action:        event.Payload["action"].(string),
        RoleID:        event.Payload["role_id"].(uint32),
        OperatorID:    event.Payload["operator_id"].(uint32),
        CreatedAt:     time.Now(),
    })
})

// 订阅者 2：安全告警
eventbus.Subscribe("permission.changed", func(ctx context.Context, event *Event) error {
    roleID := event.Payload["role_id"].(uint32)
    operatorID := event.Payload["operator_id"].(uint32)
    
    // 如果是敏感权限变更，发送告警
    if isSensitivePermissionChange(event) {
        return alertService.SendSecurityAlert(fmt.Sprintf(
            "User %d changed permissions for role %d", 
            operatorID, roleID))
    }
    
    return nil
})
```

## 6. Events in Lua Scripts

Events can be subscribed to and published conveniently from Lua scripts:

```lua
-- scripts/user_events.lua

-- 订阅用户创建事件
eventbus.subscribe("user.created", function(event)
    local user_id = event.user_id
    local email = event.email
    
    logger.info("新用户注册: %d, %s", user_id, email)
    
    -- 发送欢迎邮件
    task.enqueue("send_welcome_email", {
        email = email
    })
end)

-- 订阅登录失败事件
eventbus.subscribe("login.failed", function(event)
    local username = event.username
    local ip = event.ip
    
    logger.warn("登录失败: %s, IP: %s", username, ip)
    
    -- 检查是否需要锁定账号
    check_login_failures(username, ip)
end)
```

## 7. Asynchronous vs Synchronous Events

### 7.1 Synchronous Events

Event handlers execute immediately, blocking the publisher:

```go
// 同步发布
err := eventbus.PublishSync(event)
if err != nil {
    log.Errorf("event handling failed: %v", err)
    // 可以选择回滚操作
}
```

**Applicable scenarios**:
- The event handling must be guaranteed to succeed
- Handlers execute quickly
- The handling result is needed immediately

### 7.2 Asynchronous Events

Event handlers execute in the background without blocking the publisher:

```go
// 异步发布（默认）
go func() {
    err := eventbus.Publish(event)
    if err != nil {
        log.Errorf("async event handling failed: %v", err)
    }
}()
```

**Applicable scenarios**:
- Handlers take a long time to execute
- The result is not needed immediately
- Short delays are tolerable

### 7.3 The Hybrid Mode

Critical operations are synchronous; non-critical operations are asynchronous:

```go
func (s *OrderService) Pay(ctx context.Context, orderID uint32) error {
    // 1. 更新订单状态
    s.orderRepo.UpdateStatus(ctx, orderID, Order_PAID)
    
    // 2. 同步事件：扣减库存（必须成功）
    err := eventbus.PublishSync(eventbus.NewEvent("order.stock.decrease", ...))
    if err != nil {
        // 库存扣减失败，回滚订单
        s.orderRepo.UpdateStatus(ctx, orderID, Order_PENDING)
        return err
    }
    
    // 3. 异步事件：发送通知（可以延迟）
    go func() {
        eventbus.Publish(eventbus.NewEvent("order.notification", ...))
    }()
    
    return nil
}
```

## 8. Event Persistence

### 8.1 Event Storage

Persist events to the database for auditing and replay:

```sql
CREATE TABLE events (
    id VARCHAR(36) PRIMARY KEY,
    type VARCHAR(100),
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    error TEXT
);
```

```go
func (b *EventBus) Publish(ctx context.Context, event *Event) error {
    // 1. 持久化事件
    b.eventRepo.Save(ctx, event)
    
    // 2. 发布到订阅者
    return b.dispatch(event)
}
```

### 8.2 Event Replay

Reprocess historical events:

```go
func ReplayEvents(eventType string, fromTime time.Time) error {
    events, _ := eventRepo.QueryByTypeAndTime(eventType, fromTime)
    
    for _, event := range events {
        err := eventbus.Publish(event)
        if err != nil {
            log.Errorf("replay event failed: %v", err)
        }
    }
    
    return nil
}

// 使用：重放过去 24 小时的用户创建事件
ReplayEvents("user.created", time.Now().Add(-24*time.Hour))
```

## 9. Performance Optimization

### 9.1 Batch Publishing

Avoid publishing single events in a loop:

```go
// ❌ 错误做法
for _, user := range users {
    eventbus.Publish(NewEvent("user.created", ...))
}

// ✅ 正确做法
var events []*Event
for _, user := range users {
    events = append(events, NewEvent("user.created", ...))
}
eventbus.PublishBatch(events)
```

### 9.2 Event Filtering

Subscribers only process the events they are interested in:

```go
eventbus.Subscribe("user.created", func(ctx context.Context, event *Event) error {
    // 只处理 VIP 用户
    if event.Payload["user_type"] != "vip" {
        return nil
    }
    
    return handleVIPUser(event)
})
```

### 9.3 Concurrent Processing

Use a worker pool to process events concurrently:

```go
func (b *EventBus) StartWorkers(concurrency int) {
    for i := 0; i < concurrency; i++ {
        go func() {
            for event := range b.eventQueue {
                b.handleEvent(event)
            }
        }()
    }
}
```

## 10. Common Issues

### Q1: What if event handling fails?

1. Use the retry middleware to retry automatically
2. Record failed events into the dead letter queue
3. Replay failed events manually

### Q2: How do I make sure events are not lost?

1. Persist events to the database
2. Use transactions to ensure atomicity
3. Back up the event logs regularly

### Q3: How do I handle event ordering?

Events of the same type are processed in publish order:

```go
// 使用有序队列
queue := NewOrderedQueue()
queue.Push(event1)
queue.Push(event2)

// 按顺序处理
for event := range queue.Pop() {
    handleEvent(event)
}
```

### Q4: How do I monitor event handling?

1. Use the tracing middleware
2. Record the event handling duration
3. Monitor the failure rate and retry counts

## 11. Related Documentation

- [Backend Extension Development](/en/admin/backend-extension.md)
- [Task Scheduling and Asynchronous Processing](/en/admin/tutorial-task-scheduling.md)
- [Lua Script Extension Tutorial](/en/admin/tutorial-lua-extension.md)
