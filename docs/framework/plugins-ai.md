# AI 插件

go-wind-plugins 提供 AI 大模型集成，内置 OpenAI、LangChainGo、Eino 三个插件。每个 AI 子模块独立定义配置和客户端，返回各 SDK 的原生类型，支持云端模型与本地模型（如 Ollama）。

## 一、插件列表

| 插件 | 导入路径 | 框架 |
|------|---------|------|
| OpenAI | `plugins/ai/openai` | sashabaranov/go-openai |
| LangChainGo | `plugins/ai/langchaingo` | tmc/langchaingo |
| Eino | `plugins/ai/eino` | cloudwego/eino |

## 二、OpenAI

```go
import "github.com/tx7do/go-wind-plugins/ai/openai"

client, _ := openai.NewClient(&openai.Config{
    Type:           openai.ModelTypeCloud,        // ModelTypeLocal | ModelTypeCloud
    ModelName:      "gpt-4",
    TimeoutSeconds: 30,
    Cloud: &openai.CloudConfig{
        ApiKey:  "sk-xxx",
        BaseUrl: "https://api.openai.com/v1",
    },
})
// 返回原生 *openai.Client（sashabaranov/go-openai）
```

### 对话

```go
resp, err := client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
    Model: "gpt-4",
    Messages: []openai.ChatCompletionMessage{
        {Role: "system", Content: "You are a helpful assistant."},
        {Role: "user", Content: "Explain Go interfaces in one sentence."},
    },
    Temperature: 0.7,
    MaxTokens:   200,
})
fmt.Println(resp.Choices[0].Message.Content)
```

### 流式对话

```go
stream, _ := client.CreateChatCompletionStream(ctx, req)
defer stream.Close()

for {
    chunk, err := stream.Recv()
    if err != nil {
        break
    }
    fmt.Print(chunk.Choices[0].Delta.Content)
}
```

### YAML 配置

```yaml
ai:
  openai:
    api_key: ${OPENAI_API_KEY}
    model: gpt-4
    base_url: "https://api.openai.com/v1"
    timeout: 30s
    max_retries: 3
```

## 三、LangChainGo

`NewModel` 按 Config 创建 `llms.Model`，另提供 Chain / Agent / Memory / Embedding / VectorStore 辅助函数：

```go
import "github.com/tx7do/go-wind-plugins/ai/langchaingo"

llm, err := langchaingo.NewModel(&langchaingo.Config{
    Type:           langchaingo.ModelTypeCloud,
    ModelName:      "gpt-4o",
    TimeoutSeconds: 60,
    Cloud: &langchaingo.CloudConfig{
        ApiKey:  "sk-xxx",
        BaseUrl: "https://api.openai.com/v1",
    },
    // Local: &langchaingo.LocalConfig{ ... },  // 本地模型（如 Ollama）
})

resp, err := llm.Call(context.Background(),
    "Explain microservices in one sentence",
)

// 链式编排
chain := langchaingo.NewLLMChain(llm, prompt)
result, _ := chains.Call(context.Background(), chain, map[string]any{"text": "..."})

// Agent
agent := langchaingo.NewOneShotAgent(llm, agentTools)
executor := langchaingo.NewExecutor(agent)
```

选项支持透传底层 SDK：`WithOpenaiOptions` / `WithOllamaOptions` / `WithHTTPClient`。

### YAML 配置

```yaml
ai:
  langchaingo:
    type: cloud            # local | cloud
    model: gpt-4o
    cloud:
      api_key: ${OPENAI_API_KEY}
      base_url: "https://api.openai.com/v1"
```

## 四、Eino

`NewChatModel` 创建 CloudWeGo Eino 的 `model.ChatModel`，并提供 Chain/Graph/Workflow 编排与 Tool 节点辅助函数：

```go
import "github.com/tx7do/go-wind-plugins/ai/eino"

chatModel, _ := eino.NewChatModel(ctx, &eino.Config{
    ModelName: "gpt-4o",
}, eino.WithConfigModifier(func(cfg *einoOpenai.ChatModelConfig) {
    // cfg 为 eino openai 实现的原生 ChatModelConfig，可自由调整
    cfg.Temperature = &temp
}))

// 编排
chain := eino.NewChain[Input, Output]()
graph := eino.NewGraph[Input, Output]()

// Tool 节点
toolNode, _ := eino.NewToolNode(ctx, &compose.ToolsNodeConfig{})
```

### YAML 配置

```yaml
ai:
  eino:
    model: gpt-4o
    api_key: ${OPENAI_API_KEY}
    base_url: "https://api.openai.com/v1"
```

## 五、多模型路由

插件层不设共享 Client 接口（各 SDK 类型互不兼容）；需要路由时，在业务侧用一个最小接口包装各原生客户端：

```go
type ChatClient interface {
    Chat(ctx context.Context, prompt string) (string, error)
}

type ModelRouter struct {
    cloud ChatClient   // langchaingo / openai
    local ChatClient   // 本地模型（Ollama，经 langchaingo ModelTypeLocal）
}

func (r *ModelRouter) Chat(ctx context.Context, prompt string) (string, error) {
    if isSensitive(prompt) {
        return r.local.Chat(ctx, prompt)   // 隐私数据走本地模型
    }
    return r.cloud.Chat(ctx, prompt)
}
```

## 相关文档

- [插件配置系统](./plugins-config.md)
- [插件总览](./plugins-intro.md)
- [工作流插件](./plugins-workflow.md)
