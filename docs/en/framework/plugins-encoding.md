# Encoding Plugins

go-wind-plugins provides a unified codec interface for serializing/deserializing HTTP request bodies, gRPC messages, Broker messages, and more.

## 1. The Codec Interface

```go
type Codec interface {
    Marshal(v interface{}) ([]byte, error)
    Unmarshal(data []byte, v interface{}) error
    Name() string
}
```

## 2. Built-in Encodings

There are 12 codec plugins in total:

| Encoding | Import Path | Engine |
|----------|------------|--------|
| JSON | `plugins/encoding/json` | encoding/json |
| Protobuf | `plugins/encoding/proto` | google.golang.org/protobuf |
| YAML | `plugins/encoding/yaml` | gopkg.in/yaml.v3 |
| TOML | `plugins/encoding/toml` | pelletier/go-toml |
| XML | `plugins/encoding/xml` | encoding/xml |
| MessagePack | `plugins/encoding/msgpack` | vmihailenco/msgpack |
| Avro | `plugins/encoding/avro` | linkedin/goavro |
| BSON | `plugins/encoding/bson` | go.mongodb.org/mongo-driver |
| CBOR | `plugins/encoding/cbor` | fxamacker/cbor |
| FlatBuffers | `plugins/encoding/flatbuffers` | google/flatbuffers |
| Gob | `plugins/encoding/gob` | encoding/gob |
| Thrift | `plugins/encoding/thrift` | Apache Thrift |

## 3. Registering Codecs

```go
import (
    _ "github.com/tx7do/go-wind-plugins/encoding/json"
    _ "github.com/tx7do/go-wind-plugins/encoding/proto"
)

// init() registers them into the global codec registry automatically
```

## 4. Usage

### 4.1 Encoding and Decoding

```go
import "github.com/tx7do/go-wind-plugins/encoding"

// Get a codec
jsonCodec := encoding.GetCodec("json")

// Encode
data, _ := jsonCodec.Marshal(user)

// Decode
var user User
jsonCodec.Unmarshal(data, &user)
```

### 4.2 HTTP Requests/Responses

```go
// The transport layer picks the codec automatically based on Content-Type
// A client sending application/json → the JSON codec is used
// A client sending application/protobuf → the Protobuf codec is used
```

### 4.3 Broker Messages

```go
msg := &broker.Message{
    Headers: map[string]string{
        "Content-Type": "application/json",
    },
    Body: jsonData,
}
```

## 5. Custom Codecs

```go
package mycodec

import "github.com/tx7do/go-wind-plugins/encoding"

type Codec struct{}

func (c *Codec) Marshal(v interface{}) ([]byte, error) {
    // custom serialization logic
    return serialize(v)
}

func (c *Codec) Unmarshal(data []byte, v interface{}) error {
    // custom deserialization logic
    return deserialize(data, v)
}

func (c *Codec) Name() string { return "my-format" }

func init() {
    // the registry keys entries by Name() (case-insensitive)
    encoding.RegisterCodec(&Codec{})
}
```

## Related Documents

- [Plugin Configuration System](./plugins-config.md)
- [Plugin Registration Mechanism](./plugins-registry.md)
- [Message Middleware Plugins](./plugins-broker.md)
