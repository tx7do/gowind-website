# AI 插件

go-wind-plugins 提供统一的 AI 大模型接口，支持 OpenAI、Claude、Gemini、Ollama 等。

## 一、Client 接口

```go
type Client interface {
    Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error)
    ChatStream(ctx context.Context, req *ChatRequest) (<-chan ChatChunk, error)
    Embedding(ctx context.Context, text string) ([]float32, error)
    Models(ctx context.Context) ([]Model, error)
}
```

## 二、适配器列表

| 适配器 | 导入路径 | 后端模型 |
|--------|---------|---------|
| OpenAI | `plugins/ai/openai` | GPT-4, GPT-3.5, DALL-E |
| Claude | `plugins/ai/claude` | Claude 3.5 Sonnet/Opus/Haiku |
| Gemini | `plugins/ai/gemini` | Gemini Pro/Ultra |
| Ollama | `plugins/ai/ollama` | Llama 3, Mistral 等本地模型 |
| DeepSeek | `plugins/ai/deepseek` | DeepSeek V3, R1 |

## 三、OpenAI

```go
import openaiPlugin "github.com/tx7do/go-wind-plugins/ai/openai"

client := openaiPlugin.New(
    openaiPlugin.WithAPIKey("sk-xxx"),
    openaiPlugin.WithModel("gpt-4"),
    openaiPlugin.WithBaseURL("https://api.openai.com/v1"),
    openaiPlugin.WithTimeout(30*time.Second),
)
```

### 对话

```go
resp, _ := client.Chat(ctx, &ai.ChatRequest{
    Messages: []ai.Message{
        {Role: "system", Content: "You are a helpful assistant."},
        {Role: "user", Content: "Explain Go interfaces in one sentence."},
    },
    Temperature: 0.7,
    MaxTokens:   200,
})
fmt.Println(resp.Content)
```

### 流式对话

```go
stream, _ := client.ChatStream(ctx, &ai.ChatRequest{
    Messages: []ai.Message{
        {Role: "user", Content: "Write a haiku about Go programming."},
    },
})

for chunk := range stream {
    fmt.Print(chunk.Content)
}
```

### Embedding

```go
embedding, _ := client.Embedding(ctx, "Go is a statically typed language.")
// []float32{0.0123, -0.0456, 0.0789, ...}
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

## 四、Claude

```go
import claudePlugin "github.com/tx7do/go-wind-plugins/ai/claude"

client := claudePlugin.New(
    claudePlugin.WithAPIKey("sk-ant-xxx"),
    claudePlugin.WithModel("claude-sonnet-4-6"),
    claudePlugin.WithMaxTokens(4096),
)
```

### YAML 配置

```yaml
ai:
  claude:
    api_key: ${ANTHROPIC_API_KEY}
    model: claude-sonnet-4-6
    max_tokens: 4096
    timeout: 60s
```

### 特有功能：System Prompt

```go
resp, _ := client.Chat(ctx, &ai.ChatRequest{
    System: "You are a code reviewer. Respond with specific feedback.",
    Messages: []ai.Message{
        {Role: "user", Content: "Review this function: func foo() {...}"},
    },
})
```

## 五、Ollama（本地模型）

```go
import ollamaPlugin "github.com/tx7do/go-wind-plugins/ai/ollama"

client := ollamaPlugin.New(
    ollamaPlugin.WithBaseURL("http://localhost:11434"),
    ollamaPlugin.WithModel("llama3.2"),
)
```

### YAML 配置

```yaml
ai:
  ollama:
    base_url: "http://localhost:11434"
    model: llama3.2
    timeout: 120s
    options:
      temperature: 0.7
      top_p: 0.9
      num_ctx: 4096
```

特点：
- 数据完全本地化，隐私安全
- 无 API 费用
- 需要较强的本地 GPU

## 六、Gemini

```go
import geminiPlugin "github.com/tx7do/go-wind-plugins/ai/gemini"

client := geminiPlugin.New(
    geminiPlugin.WithAPIKey("AIza-xxx"),
    geminiPlugin.WithModel("gemini-2.0-flash"),
)
```

### YAML 配置

```yaml
ai:
  gemini:
    api_key: ${GEMINI_API_KEY}
    model: gemini-2.0-flash
    generation_config:
      temperature: 0.9
      top_p: 1.0
      max_output_tokens: 2048
```

## 七、多模型路由

```go
type ModelRouter struct {
    openai  ai.Client
    claude  ai.Client
    local   ai.Client
}

func (r *ModelRouter) Chat(ctx context.Context, req *ai.ChatRequest) (*ai.ChatResponse, error) {
    switch req.Model {
    case "gpt-4":
        return r.openai.Chat(ctx, req)
    case "claude":
        return r.claude.Chat(ctx, req)
    default:
        return r.local.Chat(ctx, req)   // fallback to local
    }
}
```

### YAML 配置

```yaml
ai:
  default: openai
  fallback: ollama
  providers:
    openai:
      api_key: ${OPENAI_API_KEY}
      model: gpt-4
    claude:
      api_key: ${ANTHROPIC_API_KEY}
      model: claude-sonnet-4-6
    ollama:
      base_url: http://localhost:11434
      model: llama3.2
```

## 相关文档

- [插件配置系统](./plugins-config.md)
- [插件总览](./plugins-intro.md)
- [工作流插件](./plugins-workflow.md)
