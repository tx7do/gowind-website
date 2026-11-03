# 工作流插件

go-wind-plugins 提供统一的工作流引擎接入，支持 Temporal、Argo Workflows、Conductor、GoWorkflows 四个引擎；异步任务队列 Asynq 归属传输层（`transport/asynq`）。

## 一、Client 接口

四个引擎的工作流操作参数/返回值类型互不兼容，仅提取最小公共接口 `workflow.Client`：

```go
type Client interface {
    // Close releases the client connection and cleans up resources.
    Close() error
}

type Worker interface {
    // Stop signals the worker to stop polling for tasks.
    Stop()
    // IsRunning returns whether the worker is still active.
    IsRunning() bool
}
```

启动、取消、信号等引擎特定操作以具体类型的方法暴露。

## 二、适配器列表

| 适配器 | 导入路径 | 框架 |
|--------|---------|------|
| Temporal | `plugins/workflow/temporal` | temporal.io/sdk（长流程编排、状态持久化） |
| Argo Workflows | `plugins/workflow/argo` | Argo Workflows REST API |
| Conductor | `plugins/workflow/conductor` | conductor-sdk/conductor-go |
| GoWorkflows | `plugins/workflow/goworkflows` | cschleiden/go-workflows |

## 三、Asynq（异步任务队列，已归属 transport）

Asynq 不在 `workflow/` 下，而是作为传输层插件提供（`transport/asynq`），面向 Redis 任务队列的轻量异步任务场景：

```go
import asynqPlugin "github.com/tx7do/go-wind-plugins/transport/asynq"

srv := asynqPlugin.NewServer(
    asynqPlugin.WithRedisAddress("127.0.0.1:6379"),
    asynqPlugin.WithConcurrency(10),
    asynqPlugin.WithCodec("json"),
)

// 注册任务 Handler（泛型，自动反序列化 payload）
_ = asynqPlugin.RegisterSubscriber[emailPayload](
    srv, "email:send",
    func(taskType string, msg *emailPayload) error {
        return sendEmail(msg.To, msg.Subject, msg.Body)
    },
)

// 提交任务 / 定时任务
_, _ = srv.NewTask("email:send", &emailPayload{})
_, _ = srv.NewPeriodicTask("0 9 * * *", "email:send", &emailPayload{})
```

## 四、Temporal（推荐复杂编排）

```go
import temporalPlugin "github.com/tx7do/go-wind-plugins/workflow/temporal"

client, _ := temporalPlugin.NewClient(
    temporalPlugin.WithClientHostPort("localhost:7233"),
    temporalPlugin.WithClientNamespace("default"),
)
defer client.Close()

client.WithTracing() // 原生 OTel 追踪
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

### 注册并启动 Worker

```go
worker, _ := client.NewWorker(temporalPlugin.WorkerOptions{
    TaskQueue:  "my-queue",
    Workflows:  []any{OrderWorkflow},
    Activities: []any{DeductInventoryActivity, PaymentActivity, SendConfirmationActivity},
})
worker.Start(ctx)
```

### 触发工作流

```go
// Execute 返回 workflowID，ExecuteSync 同步等待结果
workflowID, _ := client.Execute(ctx, order, temporalPlugin.ExecuteOptions{
    ID:        "order-" + uuid.New().String(),
    TaskQueue: "my-queue",
})

// 信号 / 查询 / 取消 / 描述
client.Signal(ctx, workflowID, runID, "approve", nil)
result, _ := client.Query(ctx, workflowID, runID, "state", nil)
client.Cancel(ctx, workflowID, runID)
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

## 五、Argo / Conductor / GoWorkflows

| 引擎 | 创建客户端 | 主要操作 |
|------|-----------|---------|
| Argo | `argo.NewClient(ClientOptions)` | Submit / Get / Suspend / Resume / Terminate（REST API） |
| Conductor | `conductor.NewClient(ClientOptions)` / `NewClientFromEnv(...)` | Start / Get / Pause / Resume / Terminate，支持任务 Worker |
| GoWorkflows | `goworkflows.NewClient(backend.Backend)` | Create / Cancel / Signal / Wait，支持 Workflow + Activity Worker |

```go
// Argo：提交工作流（REST 对接 Argo Workflows）
argoClient, _ := argo.NewClient(argo.ClientOptions{ /* ... */ })
wf, _ := argoClient.SubmitWorkflow(ctx, wfSpec, opts)

// Conductor：启动工作流
runID, _ := conductorClient.StartWorkflow(ctx, conductor.StartWorkflowOptions{ /* ... */ })

// GoWorkflows：创建工作流实例
instance, _ := goworkflowsClient.CreateWorkflowInstance(ctx, opts, OrderWorkflow, order)
```

## 六、选择指南

| 场景 | 推荐 | 理由 |
|------|------|------|
| 异步任务 | Asynq（transport） | 轻量、Redis 即可 |
| 定时 Cron | Cron（transport） | robfig/cron 表达式调度 |
| 订单流程 | Temporal | 状态持久化、补偿回滚 |
| 审批流程 | Temporal | 多步骤、长时间运行 |
| 批量处理 | Asynq（transport） | 优先级队列 |
| 跨服务工作流 | Temporal / Conductor | 全局编排 |
| K8s 批处理 | Argo | 原生 Kubernetes CRD 生态 |

## 相关文档

- [插件配置系统](./plugins-config.md)
- [消息中间件插件](./plugins-broker.md)
- [AI 插件](./plugins-ai.md)
