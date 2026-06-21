# 对象存储插件（OSS）

go-wind-plugins 提供统一的 S3 兼容对象存储接口，支持 MinIO、AWS S3、阿里云 OSS 等。

## 一、OSS 接口

```go
type OSS interface {
    Upload(ctx context.Context, bucket, key string, reader io.Reader, opts ...UploadOption) error
    Download(ctx context.Context, bucket, key string) (io.ReadCloser, error)
    Delete(ctx context.Context, bucket, key string) error
    Exists(ctx context.Context, bucket, key string) (bool, error)
    GetURL(ctx context.Context, bucket, key string, expiry time.Duration) (string, error)
    List(ctx context.Context, bucket, prefix string) ([]ObjectInfo, error)
}
```

## 二、适配器列表

| 适配器 | 导入路径 | 后端 |
|--------|---------|------|
| MinIO | `plugins/oss/minio` | 自建 MinIO（S3 兼容） |
| S3 | `plugins/oss/s3` | AWS S3 |
| Aliyun OSS | `plugins/oss/aliyun` | 阿里云 OSS |
| Qiniu | `plugins/oss/qiniu` | 七牛云 |
| Tencent COS | `plugins/oss/tencent` | 腾讯云 COS |
| GCS | `plugins/oss/gcs` | Google Cloud Storage |

## 三、MinIO

```go
import minioPlugin "github.com/tx7do/go-wind-plugins/oss/minio"

client, _ := minioPlugin.New(
    minioPlugin.WithEndpoint("localhost:9000"),
    minioPlugin.WithAccessKey("minioadmin"),
    minioPlugin.WithSecretKey("minioadmin"),
    minioPlugin.WithSecure(false),
    minioPlugin.WithRegion("us-east-1"),
)
```

### 上传文件

```go
file, _ := os.Open("photo.jpg")
defer file.Close()

err := client.Upload(ctx, "photos", "2024/01/photo.jpg", file,
    oss.WithContentType("image/jpeg"),
    oss.WithMetadata(map[string]string{
        "x-amz-meta-uploaded-by": "alice",
    }),
)
```

### 下载文件

```go
reader, err := client.Download(ctx, "photos", "2024/01/photo.jpg")
defer reader.Close()

io.Copy(os.Stdout, reader)
```

### 生成预签名 URL

```go
// 生成临时下载链接（1小时有效）
url, _ := client.GetURL(ctx, "photos", "2024/01/photo.jpg", 1*time.Hour)
fmt.Println(url)  // https://minio.example.com/photos/2024/01/photo.jpg?X-Amz-...
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
    buckets:
      - name: photos
        region: us-east-1
      - name: documents
        region: us-east-1
```

## 四、AWS S3

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

## 五、Aliyun OSS

```yaml
oss:
  aliyun:
    endpoint: "oss-cn-hangzhou.aliyuncs.com"
    access_key_id: ${ALIYUN_OSS_AK}
    access_key_secret: ${ALIYUN_OSS_SK}
    buckets:
      - name: my-bucket
        region: cn-hangzhou
```

## 六、文件操作示例

### 批量上传

```go
files := []string{"a.jpg", "b.jpg", "c.jpg"}
for _, f := range files {
    file, _ := os.Open(f)
    key := fmt.Sprintf("uploads/%s", f)
    client.Upload(ctx, "photos", key, file)
    file.Close()
}
```

### 列出文件

```go
objects, _ := client.List(ctx, "photos", "2024/01/")
for _, obj := range objects {
    fmt.Printf("%s  %d bytes  %s\n", obj.Key, obj.Size, obj.LastModified)
}
```

### 删除文件

```go
client.Delete(ctx, "photos", "2024/01/photo.jpg")
```

## 相关文档

- [插件配置系统](./plugins-config.md)
- [插件总览](./plugins-intro.md)
