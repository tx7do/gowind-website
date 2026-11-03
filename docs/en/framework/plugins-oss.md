# Object Storage Plugins (OSS)

go-wind-plugins provides object storage adapters covering MinIO and AWS S3. The two implementations use incompatible underlying SDKs and return types, so each defines its own local `Config` without extracting a shared interface.

## 1. Plugin List

| Plugin | Import Path | Framework |
|--------|------------|-----------|
| MinIO | `plugins/oss/minio` | minio/minio-go (works with various S3-compatible stores) |
| S3 | `plugins/oss/s3` | aws/aws-sdk-go-v2 |

## 2. MinIO

```go
import "github.com/tx7do/go-wind-plugins/oss/minio"

storage := minio.NewStorage(&minio.Config{
    Endpoint:  "127.0.0.1:9000",
    AccessKey: "your-access-key",
    SecretKey: "your-secret-key",
    UseSsl:    false,
    // Region:         "us-east-1",   // required for signature v4 by some S3-compatible stores
    // ForcePathStyle: true,          // path-style addressing (needed by some S3 implementations)
})
```

### Uploading Files

```go
file, _ := os.Open("photo.jpg")
defer file.Close()

_, err := storage.PutObject(ctx, "photos", "2024/01/photo.jpg", file, "image/jpeg")
```

### Downloading Files

```go
obj, err := storage.GetObject(ctx, "photos", "2024/01/photo.jpg")
defer obj.Close()

io.Copy(os.Stdout, obj)
```

### Using the Native SDK Directly

```go
// For scenarios outside the Storage wrapper, grab the native client directly
mc := storage.SDK()
info, _ := mc.StatObject(ctx, "photos", "2024/01/photo.jpg", minio.StatObjectOptions{})
```

### YAML Configuration

```yaml
oss:
  minio:
    endpoint: "localhost:9000"
    access_key: "minioadmin"
    secret_key: "minioadmin"
    secure: false
    region: "us-east-1"
```

## 3. AWS S3

```go
import "github.com/tx7do/go-wind-plugins/oss/s3"

storage := s3.NewStorage(&s3.Config{
    Region:    "us-east-1",
    AccessKey: "your-access-key",
    SecretKey: "your-secret-key",
    Bucket:    "my-bucket",
})

// The S3 version of PutObject is bound to the default bucket, so no bucket argument
_, err := storage.PutObject(ctx, "2024/01/photo.jpg", file, "image/jpeg")
_, err = storage.GetObject(ctx, "2024/01/photo.jpg")
```

### YAML Configuration

```yaml
oss:
  s3:
    region: "us-east-1"
    access_key_id: ${AWS_ACCESS_KEY_ID}
    secret_access_key: ${AWS_SECRET_ACCESS_KEY}
    session_token: ${AWS_SESSION_TOKEN}     # optional
    buckets:
      - name: my-bucket
        region: us-east-1
```

## 4. Selection Notes

| Scenario | Recommendation | Notes |
|----------|----------------|-------|
| Self-hosted object storage / on-prem deployment | MinIO | minio-go works with various S3-compatible stores (MinIO, Ceph, SeaweedFS, etc.) |
| Storage on AWS | S3 | aws-sdk-go-v2, default-bucket mode |
| Alibaba Cloud OSS / Tencent Cloud COS | MinIO plugin | Both offer S3-compatible endpoints; connect with Endpoint + ForcePathStyle |

## Related Documents

- [Plugin Configuration System](./plugins-config.md)
- [Plugin Overview](./plugins-intro.md)
