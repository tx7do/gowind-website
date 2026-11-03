# AI Plugins

go-wind-plugins provides integrations with large AI models, with three built-in plugins: OpenAI, LangChainGo, and Eino. Each AI sub-module defines its own configuration and client independently and returns the native types of its SDK, supporting both cloud models and local models (such as Ollama).

## 1. Plugin List

| Plugin | Import Path | Framework |
|--------|------------|-----------|
| OpenAI | `plugins/ai/openai` | sashabaranov/go-openai |
| LangChainGo | `plugins/ai/langchaingo` | tmc/langchaingo |
| Eino | `plugins/ai/eino` | cloudwego/eino |

## 2. OpenAI

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
// Returns the native *openai.Client (sashabaranov/go-openai)
```

### Chat Completion

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

### Streaming Chat

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

### YAML Configuration

```yaml
ai:
  openai:
    api_key: ${OPENAI_API_KEY}
    model: gpt-4
    base_url: "https://api.openai.com/v1"
    timeout: 30s
    max_retries: 3
```

## 3. LangChainGo

`NewModel` creates an `llms.Model` from the Config, and helper functions are also provided for Chain / Agent / Memory / Embedding / VectorStore:

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
    // Local: &langchaingo.LocalConfig{ ... },  // local model (e.g. Ollama)
})

resp, err := llm.Call(context.Background(),
    "Explain microservices in one sentence",
)

// Chain orchestration
chain := langchaingo.NewLLMChain(llm, prompt)
result, _ := chains.Call(context.Background(), chain, map[string]any{"text": "..."})

// Agent
agent := langchaingo.NewOneShotAgent(llm, agentTools)
executor := langchaingo.NewExecutor(agent)
```

Options support pass-through to the underlying SDK: `WithOpenaiOptions` / `WithOllamaOptions` / `WithHTTPClient`.

### YAML Configuration

```yaml
ai:
  langchaingo:
    type: cloud            # local | cloud
    model: gpt-4o
    cloud:
      api_key: ${OPENAI_API_KEY}
      base_url: "https://api.openai.com/v1"
```

## 4. Eino

`NewChatModel` creates a CloudWeGo Eino `model.ChatModel`, and helper functions are provided for Chain/Graph/Workflow orchestration and Tool nodes:

```go
import "github.com/tx7do/go-wind-plugins/ai/eino"

chatModel, _ := eino.NewChatModel(ctx, &eino.Config{
    ModelName: "gpt-4o",
}, eino.WithConfigModifier(func(cfg *einoOpenai.ChatModelConfig) {
    // cfg is the native ChatModelConfig of the eino openai implementation; adjust freely
    cfg.Temperature = &temp
}))

// Orchestration
chain := eino.NewChain[Input, Output]()
graph := eino.NewGraph[Input, Output]()

// Tool node
toolNode, _ := eino.NewToolNode(ctx, &compose.ToolsNodeConfig{})
```

### YAML Configuration

```yaml
ai:
  eino:
    model: gpt-4o
    api_key: ${OPENAI_API_KEY}
    base_url: "https://api.openai.com/v1"
```

## 5. Multi-Model Routing

The plugin layer has no shared Client interface (the SDK types are mutually incompatible); when routing is needed, wrap the native clients behind a minimal interface on the business side:

```go
type ChatClient interface {
    Chat(ctx context.Context, prompt string) (string, error)
}

type ModelRouter struct {
    cloud ChatClient   // langchaingo / openai
    local ChatClient   // local model (Ollama, via langchaingo ModelTypeLocal)
}

func (r *ModelRouter) Chat(ctx context.Context, prompt string) (string, error) {
    if isSensitive(prompt) {
        return r.local.Chat(ctx, prompt)   // sensitive data goes to the local model
    }
    return r.cloud.Chat(ctx, prompt)
}
```

## Related Documents

- [Plugin Configuration System](./plugins-config.md)
- [Plugin Overview](./plugins-intro.md)
- [Workflow Plugins](./plugins-workflow.md)
