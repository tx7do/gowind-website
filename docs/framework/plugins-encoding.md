# 编码解码插件

go-wind-plugins 提供统一的编解码接口，用于序列化/反序列化 HTTP 请求体、gRPC 消息、Broker 消息等。

## 一、Codec 接口

```go
type Codec interface {
    Marshal(v interface{}) ([]byte, error)
    Unmarshal(data []byte, v interface{}) error
    Name() string
}
```

## 二、内置编码

| 编码 | 导入路径 | Content-Type |
|------|---------|-------------|
| JSON | `plugins/encoding/json` | `application/json` |
| Protobuf | `plugins/encoding/protobuf` | `application/protobuf` |
| YAML | `plugins/encoding/yaml` | `application/yaml` |
| XML | `plugins/encoding/xml` | `application/xml` |
| MessagePack | `plugins/encoding/msgpack` | `application/msgpack` |
| TOML | `plugins/encoding/toml` | `application/toml` |
| Gob | `plugins/encoding/gob` | `application/gob` |

## 三、注册 Codec

```go
import (
    _ "github.com/tx7do/go-wind-plugins/encoding/json"
    _ "github.com/tx7do/go-wind-plugins/encoding/protobuf"
)

// init() 自动注册到全局 Codec 注册表
```

## 四、使用方式

### 4.1 编解码

```go
import "github.com/tx7do/go-wind/encoding"

// 获取 codec
jsonCodec := encoding.GetCodec("json")

// 编码
data, _ := jsonCodec.Marshal(user)

// 解码
var user User
jsonCodec.Unmarshal(data, &user)
```

### 4.2 HTTP 请求/响应

```go
// Transport 层根据 Content-Type 自动选择 codec
// 客户端发送 application/json → 使用 JSON codec
// 客户端发送 application/protobuf → 使用 Protobuf codec
```

### 4.3 Broker 消息

```go
msg := &broker.Message{
    Headers: map[string]string{
        "Content-Type": "application/json",
    },
    Body: jsonData,
}
```

## 五、自定义 Codec

```go
package mycodec

import "github.com/tx7do/go-wind/encoding"

type Codec struct{}

func (c *Codec) Marshal(v interface{}) ([]byte, error) {
    // 自定义序列化逻辑
    return serialize(v)
}

func (c *Codec) Unmarshal(data []byte, v interface{}) error {
    // 自定义反序列化逻辑
    return deserialize(data, v)
}

func (c *Codec) Name() string { return "my-format" }

func init() {
    encoding.RegisterCodec("my-format", &Codec{})
}
```

## 相关文档

- [插件配置系统](./plugins-config.md)
- [插件注册机制](./plugins-registry.md)
- [消息中间件插件](./plugins-broker.md)
