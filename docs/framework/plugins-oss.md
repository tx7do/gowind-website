# 对象存储插件（OSS）

go-wind-plugins 提供对象存储适配器，覆盖 MinIO 与 AWS S3。两个实现的底层 SDK 和返回类型不兼容，因此各自定义本地 `Config`，不提取共享接口。

## 一、插件列表

| 插件 | 导入路径 | 框架 |
|------|---------|------|
| MinIO | `plugins/oss/minio` | minio/minio-go（兼容各类 S3 兼容存储） |
| S3 | `plugins/oss/s3` | aws/aws-sdk-go-v2 |

## 二、MinIO

```go
import "github.com/tx7do/go-wind-plugins/oss/minio"

storage := minio.NewStorage(&minio.Config{
    Endpoint:  "127.0.0.1:9000",
    AccessKey: "your-access-key",
    SecretKey: "your-secret-key",
    UseSsl:    false,
    // Region:         "us-east-1",   // 部分 S3 兼容存储签名 v4 必需
    // ForcePathStyle: true,          // path-style 寻址（兼容部分 S3 实现）
})
```

### 上传文件

```go
file, _ := os.Open("photo.jpg")
defer file.Close()

_, err := storage.PutObject(ctx, "photos", "2024/01/photo.jpg", file, "image/jpeg")
```

### 下载文件

```go
obj, err := storage.GetObject(ctx, "photos", "2024/01/photo.jpg")
defer obj.Close()

io.Copy(os.Stdout, obj)
```

### 直接使用原生 SDK

```go
// Storage 包装器之外的场景可直接取原生客户端
mc := storage.SDK()
info, _ := mc.StatObject(ctx, "photos", "2024/01/photo.jpg", minio.StatObjectOptions{})
```

### YAML 配置

```yaml
oss:
  minio:
    endpoint: "localhost:9000"
    access_key: "minioadmin"
    secret_key: "minioadmin"
    secure: false
    region: "us-east-1"
```

## 三、AWS S3

```go
import "github.com/tx7do/go-wind-plugins/oss/s3"

storage := s3.NewStorage(&s3.Config{
    Region:    "us-east-1",
    AccessKey: "your-access-key",
    SecretKey: "your-secret-key",
    Bucket:    "my-bucket",
})

// S3 版 PutObject 绑定默认桶，无需传 bucket
_, err := storage.PutObject(ctx, "2024/01/photo.jpg", file, "image/jpeg")
_, err = storage.GetObject(ctx, "2024/01/photo.jpg")
```

### YAML 配置

```yaml
oss:
  s3:
    region: "us-east-1"
    access_key_id: ${AWS_ACCESS_KEY_ID}
    secret_access_key: ${AWS_SECRET_ACCESS_KEY}
    session_token: ${AWS_SESSION_TOKEN}     # 可选
    buckets:
      - name: my-bucket
        region: us-east-1
```

## 四、选型说明

| 场景 | 推荐 | 说明 |
|------|------|------|
| 自建对象存储 / 私有化部署 | MinIO | minio-go 兼容各类 S3 兼容存储（MinIO、Ceph、SeaweedFS 等） |
| AWS 云上存储 | S3 | aws-sdk-go-v2，默认桶模式 |
| 阿里云 OSS / 腾讯云 COS | MinIO 插件 | 均提供 S3 兼容端点，配 Endpoint + ForcePathStyle 接入 |

## 相关文档

- [插件配置系统](./plugins-config.md)
- [插件总览](./plugins-intro.md)
