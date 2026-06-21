# 工作流插件

go-wind-plugins 提供统一的工作流引擎接口，支持 Temporal、Celery 等。

## 一、Engine 接口

```go
type Engine interface {
    Start(ctx context.Context) error
    Stop(ctx context.Context) error
    Submit(ctx context.Context, task *Task) (TaskID, error)
    GetResult(ctx context.Context, id TaskID) (*Result, error)
    Cancel(ctx context.Context, id TaskID) error
}
```

## 二、适配器列表

| 适配器 | 导入路径 | 特点 |
|--------|---------|------|
| Asynq | `plugins/workflow/asynq` | Redis 队列任务、轻量 |
| Temporal | `plugins/workflow/temporal` | 长流程编排、状态持久化 |

## 三、Asynq（推荐轻量场景）

```go
import asynqPlugin "github.com/tx7do/go-wind-plugins/workflow/asynq"

engine := asynqPlugin.New(
    asynqPlugin.WithAddr("localhost:6379"),
    asynqPlugin.WithConcurrency(10),
    asynqPlugin.WithQueues(
        asynqPlugin.Queue{Name: "critical", Priority: 6},
        asynqPlugin.Queue{Name: "default", Priority: 3},
        asynqPlugin.Queue{Name: "low", Priority: 1},
    ),
)
```

### 定义任务

```go
type EmailTask struct {
    To      string
    Subject string
    Body    string
}

func HandleEmailTask(ctx context.Context, task *asynqPlugin.Task) error {
    var payload EmailTask
    json.Unmarshal(task.Payload, &payload)
    return sendEmail(payload.To, payload.Subject, payload.Body)
}

// 注册 Handler
engine.Register("send:email", HandleEmailTask)
```

### 提交任务

```go
payload, _ := json.Marshal(EmailTask{
    To: "user@example.com",
    Subject: "Welcome",
    Body: "Welcome to GoWind!",
})

taskID, _ := engine.Submit(ctx, &workflow.Task{
    Type:    "send:email",
    Payload: payload,
    Queue:   "default",
    Delay:   5 * time.Minute,    // 延迟执行
    MaxRetry: 3,
    Timeout:  30 * time.Second,
})
```

### 定时任务

```go
// Cron 表达式
engine.Schedule("0 9 * * *", &workflow.Task{
    Type: "daily:report",
    Payload: reportPayload,
})
```

### YAML 配置

```yaml
workflow:
  asynq:
    addr: "localhost:6379"
    db: 0
    concurrency: 10
    queues:
      - name: critical
        priority: 6
      - name: default
        priority: 3
      - name: low
        priority: 1
    retry:
      max_attempts: 5
      max_duration: 24h
    monitor:
      enabled: true
      addr: ":8090"     # Asynqmon UI
```

## 四、Temporal（推荐复杂编排）

```go
import temporalPlugin "github.com/tx7do/go-wind-plugins/workflow/temporal"

client, _ := temporalPlugin.New(
    temporalPlugin.WithHostPort("localhost:7233"),
    temporalPlugin.WithNamespace("default"),
    temporalPlugin.WithTaskQueue("my-queue"),
)
```

### 定义工作流

```go
func OrderWorkflow(ctx workflow.Context, order Order) error {
    // 步骤 1：扣减库存
    var inventoryOK bool
    workflow.ExecuteActivity(ctx, DeductInventoryActivity, order).Get(ctx, &inventoryOK)
    if !inventoryOK {
        return errors.New("inventory deduction failed")
    }

    // 步骤 2：处理支付
    var paymentResult PaymentResult
    workflow.ExecuteActivity(ctx, PaymentActivity, order).Get(ctx, &paymentResult)

    // 步骤 3：发送确认邮件
    workflow.ExecuteActivity(ctx, SendConfirmationActivity, order).Get(ctx, nil)

    return nil
}
```

### 注册并启动

```go
worker := temporalPlugin.NewWorker(client, "my-queue")
worker.RegisterWorkflow(OrderWorkflow)
worker.RegisterActivity(DeductInventoryActivity)
worker.RegisterActivity(PaymentActivity)
worker.RegisterActivity(SendConfirmationActivity)

worker.Start(ctx)
```

### 触发工作流

```go
workflowID := "order-" + uuid.New().String()
client.ExecuteWorkflow(ctx, temporalPlugin.StartWorkflowOptions{
    ID:        workflowID,
    TaskQueue: "my-queue",
}, OrderWorkflow, order)
```

### YAML 配置

```yaml
workflow:
  temporal:
    host_port: "localhost:7233"
    namespace: "default"
    task_queue: "my-queue"
    worker:
      max_concurrent_activities: 10
      max_concurrent_workflows: 5
```

## 五、选择指南

| 场景 | 推荐 | 理由 |
|------|------|------|
| 异步任务 | Asynq | 轻量、Redis 即可 |
| 定时 Cron | Asynq | 内置 Cron 调度 |
| 订单流程 | Temporal | 状态持久化、补偿回滚 |
| 审批流程 | Temporal | 多步骤、长时间运行 |
| 批量处理 | Asynq | 优先级队列 |
| 跨服务工作流 | Temporal | 全局编排 |

## 相关文档

- [插件配置系统](./plugins-config.md)
- [消息中间件插件](./plugins-broker.md)
- [AI 插件](./plugins-ai.md)
