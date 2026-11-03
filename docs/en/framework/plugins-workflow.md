# Workflow Plugins

go-wind-plugins provides unified access to workflow engines, supporting four engines: Temporal, Argo Workflows, Conductor, and GoWorkflows; the async task queue Asynq belongs to the transport layer (`transport/asynq`).

## 1. The Client Interface

The four engines use mutually incompatible parameter/return types for workflow operations, so only a minimal common interface `workflow.Client` is extracted:

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

Engine-specific operations such as starting, cancelling, and signaling are exposed as methods on the concrete types.

## 2. Adapter List

| Adapter | Import Path | Framework |
|---------|------------|-----------|
| Temporal | `plugins/workflow/temporal` | temporal.io/sdk (long-running orchestration, state persistence) |
| Argo Workflows | `plugins/workflow/argo` | Argo Workflows REST API |
| Conductor | `plugins/workflow/conductor` | conductor-sdk/conductor-go |
| GoWorkflows | `plugins/workflow/goworkflows` | cschleiden/go-workflows |

## 3. Asynq (Async Task Queue, Now under transport)

Asynq does not live under `workflow/`; it is provided as a transport plugin (`transport/asynq`) for lightweight async task scenarios backed by a Redis task queue:

```go
import asynqPlugin "github.com/tx7do/go-wind-plugins/transport/asynq"

srv := asynqPlugin.NewServer(
    asynqPlugin.WithRedisAddress("127.0.0.1:6379"),
    asynqPlugin.WithConcurrency(10),
    asynqPlugin.WithCodec("json"),
)

// Register task handlers (generic, with automatic payload deserialization)
_ = asynqPlugin.RegisterSubscriber[emailPayload](
    srv, "email:send",
    func(taskType string, msg *emailPayload) error {
        return sendEmail(msg.To, msg.Subject, msg.Body)
    },
)

// Submit tasks / periodic tasks
_, _ = srv.NewTask("email:send", &emailPayload{})
_, _ = srv.NewPeriodicTask("0 9 * * *", "email:send", &emailPayload{})
```

## 4. Temporal (Recommended for Complex Orchestration)

```go
import temporalPlugin "github.com/tx7do/go-wind-plugins/workflow/temporal"

client, _ := temporalPlugin.NewClient(
    temporalPlugin.WithClientHostPort("localhost:7233"),
    temporalPlugin.WithClientNamespace("default"),
)
defer client.Close()

client.WithTracing() // native OTel tracing
```

### Defining a Workflow

```go
func OrderWorkflow(ctx workflow.Context, order Order) error {
    // Step 1: deduct inventory
    var inventoryOK bool
    workflow.ExecuteActivity(ctx, DeductInventoryActivity, order).Get(ctx, &inventoryOK)
    if !inventoryOK {
        return errors.New("inventory deduction failed")
    }

    // Step 2: process payment
    var paymentResult PaymentResult
    workflow.ExecuteActivity(ctx, PaymentActivity, order).Get(ctx, &paymentResult)

    // Step 3: send the confirmation email
    workflow.ExecuteActivity(ctx, SendConfirmationActivity, order).Get(ctx, nil)

    return nil
}
```

### Registering and Starting a Worker

```go
worker, _ := client.NewWorker(temporalPlugin.WorkerOptions{
    TaskQueue:  "my-queue",
    Workflows:  []any{OrderWorkflow},
    Activities: []any{DeductInventoryActivity, PaymentActivity, SendConfirmationActivity},
})
worker.Start(ctx)
```

### Triggering Workflows

```go
// Execute returns the workflowID; ExecuteSync waits for the result synchronously
workflowID, _ := client.Execute(ctx, order, temporalPlugin.ExecuteOptions{
    ID:        "order-" + uuid.New().String(),
    TaskQueue: "my-queue",
})

// Signal / query / cancel / describe
client.Signal(ctx, workflowID, runID, "approve", nil)
result, _ := client.Query(ctx, workflowID, runID, "state", nil)
client.Cancel(ctx, workflowID, runID)
```

### YAML Configuration

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

## 5. Argo / Conductor / GoWorkflows

| Engine | Create Client | Main Operations |
|--------|--------------|-----------------|
| Argo | `argo.NewClient(ClientOptions)` | Submit / Get / Suspend / Resume / Terminate (REST API) |
| Conductor | `conductor.NewClient(ClientOptions)` / `NewClientFromEnv(...)` | Start / Get / Pause / Resume / Terminate, with task Worker support |
| GoWorkflows | `goworkflows.NewClient(backend.Backend)` | Create / Cancel / Signal / Wait, with Workflow + Activity Worker support |

```go
// Argo: submit a workflow (REST integration with Argo Workflows)
argoClient, _ := argo.NewClient(argo.ClientOptions{ /* ... */ })
wf, _ := argoClient.SubmitWorkflow(ctx, wfSpec, opts)

// Conductor: start a workflow
runID, _ := conductorClient.StartWorkflow(ctx, conductor.StartWorkflowOptions{ /* ... */ })

// GoWorkflows: create a workflow instance
instance, _ := goworkflowsClient.CreateWorkflowInstance(ctx, opts, OrderWorkflow, order)
```

## 6. Selection Guide

| Scenario | Recommendation | Rationale |
|----------|----------------|-----------|
| Async tasks | Asynq (transport) | Lightweight, Redis is enough |
| Scheduled cron | Cron (transport) | robfig/cron expression scheduling |
| Order flows | Temporal | State persistence, compensating rollback |
| Approval flows | Temporal | Multi-step, long-running |
| Batch processing | Asynq (transport) | Priority queues |
| Cross-service workflows | Temporal / Conductor | Global orchestration |
| K8s batch processing | Argo | Native Kubernetes CRD ecosystem |

## Related Documents

- [Plugin Configuration System](./plugins-config.md)
- [Message Middleware Plugins](./plugins-broker.md)
- [AI Plugins](./plugins-ai.md)
