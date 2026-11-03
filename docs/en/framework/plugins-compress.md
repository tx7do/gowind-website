# Compression and Serialization Plugins

::: warning Family Status Note (defer to the repository)
The go-wind-plugins repository **no longer contains a `compress/` plugin family** — there are no plugin directories for gzip / snappy / lz4 / zstd / brotli. Compression is not provided as standalone plugins, and their whereabouts are not officially documented:

- **Message compression**: supported by each message middleware engine in its connection/producer configuration (e.g. the Kafka producer's `compression: none | gzip | snappy | lz4 | zstd`; NSQ's snappy and RocketMQ's brotli exist as part of the engine dependencies);
- **HTTP response compression**: there is no built-in compression middleware plugin; handle it at the business/gateway layer following standard `Accept-Encoding` semantics;
- **Serialization**: handled by the 12 codec plugins of the `encoding/` family (see the comparison table in Section 2 and [Encoding Plugins](./plugins-encoding.md)).

The plugin list in Section 1 "Compression Plugins" below is retained from historical documentation; **defer to the actual repository state**.
:::

go-wind-plugins provides compression and serialization helper plugins to reduce network transfer size and storage footprint.

## 1. Compression Plugins

### 1.1 Adapter List

| Adapter | Import Path | Compression Ratio | Speed |
|---------|------------|-------------------|-------|
| Gzip | `plugins/compress/gzip` | High | Medium |
| Snappy | `plugins/compress/snappy` | Medium | Very fast |
| LZ4 | `plugins/compress/lz4` | Medium | Very fast |
| Zstd | `plugins/compress/zstd` | High | Fast |
| Brotli | `plugins/compress/brotli` | Highest | Slow |

### 1.2 Usage

```go
import compressPlugin "github.com/tx7do/go-wind-plugins/compress/gzip"

compressor := compressPlugin.New(
    compressPlugin.WithLevel(6),        // 1-9
)

// Compress
compressed, _ := compressor.Compress(data)

// Decompress
original, _ := compressor.Decompress(compressed)
```

### 1.3 HTTP Response Compression

```go
// The transport supports Accept-Encoding: gzip automatically
// The client sends Accept-Encoding: gzip
// The server compresses the response body automatically
```

### 1.4 Kafka Message Compression

```yaml
broker:
  kafka:
    producer:
      compression: zstd         # none | gzip | snappy | lz4 | zstd
```

## 2. Serialization Comparison

| Format | Size | Speed | Human-Readable | Schema |
|--------|------|-------|----------------|--------|
| JSON | Large | Fast | Yes | None |
| Protobuf | Smallest | Fastest | No | .proto |
| MessagePack | Small | Fast | No | None |
| YAML | Medium | Slow | Yes | None |
| TOML | Medium | Slow | Yes | None |
| Avro | Small | Fast | No | .avsc |

## 3. Schema Evolution

### Protobuf (Recommended)

```protobuf
// user.proto
syntax = "proto3";

message User {
    string id = 1;
    string name = 2;
    string email = 3;
    // new fields use new numbers, preserving compatibility
    string phone = 4;
}
```

### Compatibility Rules

| Operation | Compatibility |
|-----------|---------------|
| Add a field | Forward compatible |
| Remove a field | Backward compatible (field number must be reserved) |
| Change a field type | Incompatible |
| Change a field number | Incompatible |

## Related Documents

- [Encoding Plugins](./plugins-encoding.md)
- [Message Middleware Plugins](./plugins-broker.md)
- [Plugin Overview](./plugins-intro.md)
