# 压缩与序列化插件

go-wind-plugins 提供压缩和序列化辅助插件，减少网络传输体积和存储空间。

## 一、压缩插件

### 1.1 适配器列表

| 适配器 | 导入路径 | 压缩率 | 速度 |
|--------|---------|--------|------|
| Gzip | `plugins/compress/gzip` | 高 | 中 |
| Snappy | `plugins/compress/snappy` | 中 | 极快 |
| LZ4 | `plugins/compress/lz4` | 中 | 极快 |
| Zstd | `plugins/compress/zstd` | 高 | 快 |
| Brotli | `plugins/compress/brotli` | 最高 | 慢 |

### 1.2 使用方式

```go
import compressPlugin "github.com/tx7do/go-wind-plugins/compress/gzip"

compressor := compressPlugin.New(
    compressPlugin.WithLevel(6),        // 1-9
)

// 压缩
compressed, _ := compressor.Compress(data)

// 解压
original, _ := compressor.Decompress(compressed)
```

### 1.3 HTTP 响应压缩

```go
// Transport 自动支持 Accept-Encoding: gzip
// 客户端发送 Accept-Encoding: gzip
// 服务端自动压缩响应体
```

### 1.4 Kafka 消息压缩

```yaml
broker:
  kafka:
    producer:
      compression: zstd         # none | gzip | snappy | lz4 | zstd
```

## 二、序列化对比

| 格式 | 体积 | 速度 | 可读性 | Schema |
|------|------|------|--------|--------|
| JSON | 大 | 快 | 是 | 无 |
| Protobuf | 最小 | 最快 | 否 | .proto |
| MessagePack | 小 | 快 | 否 | 无 |
| YAML | 中 | 慢 | 是 | 无 |
| TOML | 中 | 慢 | 是 | 无 |
| Avro | 小 | 快 | 否 | .avsc |

## 三、Schema 演进

### Protobuf（推荐）

```protobuf
// user.proto
syntax = "proto3";

message User {
    string id = 1;
    string name = 2;
    string email = 3;
    // 新增字段使用新编号，不破坏兼容性
    string phone = 4;
}
```

### 兼容性规则

| 操作 | 兼容性 |
|------|--------|
| 新增字段 | 向前兼容 |
| 删除字段 | 向后兼容（需保留字段号） |
| 修改字段类型 | 不兼容 |
| 修改字段编号 | 不兼容 |

## 相关文档

- [编码解码插件](./plugins-encoding.md)
- [消息中间件插件](./plugins-broker.md)
- [插件总览](./plugins-intro.md)
