# 文件上传与对象存储教程

GoWind Admin 基于 MinIO 实现 S3 兼容的对象存储服务，支持文件上传、下载、预览等功能。本教程深入讲解文件管理的架构设计、安全策略和实战场景。

## 一、MinIO 架构

### 1.1 核心概念

| 概念 | 说明 | 示例 |
|------|------|------|
| **Bucket** | 存储桶，类似文件夹 | `images`、`documents`、`temp-uploads` |
| **Object** | 对象，即文件 | `avatar.jpg`、`report.pdf` |
| **Key** | 对象的唯一标识（路径） | `users/123/avatar.jpg` |
| **Policy** | 访问策略，控制读写权限 | 公开读、私有读写 |

### 1.2 部署配置

Docker Compose 配置（`docker-compose.yaml`）：

```yaml
minio:
  image: docker.io/minio/minio:latest
  restart: always
  ports:
    - "9000:9000"      # API 端口
    - "9001:9001"      # Console 管理界面
  environment:
    - MINIO_ROOT_USER=root
    - MINIO_ROOT_PASSWORD=*Abcd123456
    - MINIO_DEFAULT_BUCKETS=images,documents,temp-uploads
  command: server /data --console-address ':9001'
```

访问 MinIO Console：<http://localhost:9001>

### 1.3 GoWind Admin 配置

在 `oss.yaml` 中配置 MinIO 连接：

```yaml
oss:
  minio:
    endpoint: "minio:9000"
    upload_host: "minio:9000"
    download_host: "minio:9000"
    access_key: "root"
    secret_key: "*Abcd123456"
    use_ssl: false
```

## 二、文件上传流程

### 2.1 简单上传

适用于小文件（< 100MB）：

```go
// pkg/oss/minio.go
func (m *MinioClient) UploadFile(bucket, key string, content []byte) (string, error) {
    reader := bytes.NewReader(content)
    
    info, err := m.client.PutObject(
        context.Background(),
        bucket,
        key,
        reader,
        int64(len(content)),
        minio.PutObjectOptions{
            ContentType: getContentType(key),
        },
    )
    
    if err != nil {
        return "", fmt.Errorf("upload failed: %v", err)
    }
    
    // 返回访问 URL
    url := fmt.Sprintf("http://%s/%s/%s", m.downloadHost, bucket, key)
    return url, nil
}
```

**前端调用**：

```typescript
// api/service/file-transfer.ts
export function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  return requestClient.post('/admin/v1/file/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}
```

### 2.2 分片上传

适用于大文件（> 100MB），支持断点续传：

```go
func (m *MinioClient) MultipartUpload(bucket, key string, fileSize int64, reader io.Reader) (string, error) {
    // 1. 初始化分片上传
    uploadID, err := m.client.NewMultipartUpload(
        context.Background(),
        bucket,
        key,
        minio.PutObjectOptions{},
    )
    
    // 2. 分片上传（每片 5MB）
    partSize := int64(5 * 1024 * 1024)
    var parts []minio.CompletePart
    partNumber := 1
    
    for {
        buffer := make([]byte, partSize)
        n, err := reader.Read(buffer)
        if n == 0 {
            break
        }
        
        part, err := m.client.PutObjectPart(
            context.Background(),
            bucket,
            key,
            uploadID,
            partNumber,
            bytes.NewReader(buffer[:n]),
            int64(n),
        )
        
        parts = append(parts, minio.CompletePart{
            PartNumber: partNumber,
            ETag:       part.ETag,
        })
        
        partNumber++
    }
    
    // 3. 完成分片上传
    _, err = m.client.CompleteMultipartUpload(
        context.Background(),
        bucket,
        key,
        uploadID,
        parts,
        minio.PutObjectOptions{},
    )
    
    url := fmt.Sprintf("http://%s/%s/%s", m.downloadHost, bucket, key)
    return url, nil
}
```

### 2.3 预签名上传

前端直接上传到 MinIO，减轻后端压力：

```go
func (m *MinioClient) GetPresignedUploadURL(bucket, key string, expiry time.Duration) (string, error) {
    url, err := m.client.PresignedPutObject(
        context.Background(),
        bucket,
        key,
        expiry,
    )
    
    if err != nil {
        return "", err
    }
    
    return url.String(), nil
}
```

**前端使用**：

```typescript
// 1. 获取预签名 URL
const presignedUrl = await getPresignedUploadURL('avatar.jpg');

// 2. 直接上传到 MinIO
await fetch(presignedUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': file.type,
  },
});
```

## 三、文件下载

### 3.1 简单下载

```go
func (m *MinioClient) DownloadFile(bucket, key string) ([]byte, error) {
    object, err := m.client.GetObject(
        context.Background(),
        bucket,
        key,
        minio.GetObjectOptions{},
    )
    
    if err != nil {
        return nil, err
    }
    defer object.Close()
    
    data, err := ioutil.ReadAll(object)
    return data, err
}
```

### 3.2 预签名下载

生成临时下载链接（适合分享）：

```go
func (m *MinioClient) GetPresignedDownloadURL(bucket, key string, expiry time.Duration) (string, error) {
    url, err := m.client.PresignedGetObject(
        context.Background(),
        bucket,
        key,
        expiry,
        nil,
    )
    
    if err != nil {
        return "", err
    }
    
    return url.String(), nil
}

// 使用：生成 1 小时有效的下载链接
url := GetPresignedDownloadURL("documents", "report.pdf", 1*time.Hour)
```

### 3.3 流式下载

避免一次性加载大文件到内存：

```go
func (m *MinioClient) StreamDownload(w http.ResponseWriter, bucket, key string) error {
    object, err := m.client.GetObject(
        context.Background(),
        bucket,
        key,
        minio.GetObjectOptions{},
    )
    
    if err != nil {
        return err
    }
    defer object.Close()
    
    // 设置响应头
    stat, _ := object.Stat()
    w.Header().Set("Content-Type", stat.ContentType)
    w.Header().Set("Content-Length", strconv.FormatInt(stat.Size, 10))
    w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", key))
    
    // 流式传输
    _, err = io.Copy(w, object)
    return err
}
```

## 四、文件管理

### 4.1 文件元数据记录

在数据库中记录文件元信息：

```sql
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    bucket VARCHAR(100),
    key VARCHAR(500),
    original_name VARCHAR(255),
    file_size BIGINT,
    content_type VARCHAR(100),
    storage_path VARCHAR(500),
    uploader_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 文件服务实现

```go
// internal/service/file_service.go
func (s *FileService) Create(ctx context.Context, req *storageV1.CreateFileRequest) (*storageV1.File, error) {
    // 1. 上传到 MinIO
    url, err := s.ossClient.UploadFile(req.Bucket, req.Key, req.Content)
    if err != nil {
        return nil, err
    }
    
    // 2. 记录元数据
    file, err := s.fileRepo.Create(ctx, &storageV1.File{
        TenantId:     auth.GetTenantID(ctx),
        Bucket:       req.Bucket,
        Key:          req.Key,
        OriginalName: req.OriginalName,
        FileSize:     int64(len(req.Content)),
        ContentType:  req.ContentType,
        StoragePath:  url,
        UploaderId:   auth.GetUserID(ctx),
    })
    
    return file, nil
}

func (s *FileService) List(ctx context.Context, req *storageV1.ListFileRequest) (*storageV1.ListFileResponse, error) {
    tenantID := auth.GetTenantID(ctx)
    
    query := s.fileRepo.Query().Where(file.TenantIDEQ(tenantID))
    
    // 分页
    total, _ := query.Count(ctx)
    files, _ := query.
        Offset((req.Page - 1) * req.PageSize).
        Limit(req.PageSize).
        Order(file.Desc(file.FieldCreatedAt)).
        All(ctx)
    
    return &storageV1.ListFileResponse{
        Items: files,
        Total: int32(total),
    }, nil
}
```

### 4.3 删除文件

```go
func (s *FileService) Delete(ctx context.Context, req *storageV1.DeleteFileRequest) error {
    // 1. 从数据库删除记录
    file, _ := s.fileRepo.Get(ctx, req.Id)
    s.fileRepo.Delete(ctx, req.Id)
    
    // 2. 从 MinIO 删除文件
    s.ossClient.DeleteFile(file.Bucket, file.Key)
    
    return nil
}
```

## 五、图片处理

### 5.1 图片压缩

```go
import "github.com/disintegration/imaging"

func CompressImage(input []byte, quality int) ([]byte, error) {
    // 解码图片
    img, err := imaging.Decode(bytes.NewReader(input))
    if err != nil {
        return nil, err
    }
    
    // 调整尺寸（最大宽度 1920）
    if img.Bounds().Dx() > 1920 {
        img = imaging.Resize(img, 1920, 0, imaging.Lanczos)
    }
    
    // 编码为 JPEG
    var buf bytes.Buffer
    err = imaging.Encode(&buf, img, imaging.JPEG, imaging.JPEGQuality(quality))
    
    return buf.Bytes(), err
}

// 使用：压缩到 80% 质量
compressed := CompressImage(originalBytes, 80)
```

### 5.2 生成缩略图

```go
func GenerateThumbnail(input []byte, width, height int) ([]byte, error) {
    img, err := imaging.Decode(bytes.NewReader(input))
    if err != nil {
        return nil, err
    }
    
    // 生成缩略图
    thumb := imaging.Thumbnail(img, width, height, imaging.Lanczos)
    
    var buf bytes.Buffer
    imaging.Encode(&buf, thumb, imaging.JPEG, imaging.JPEGQuality(75))
    
    return buf.Bytes(), nil
}

// 使用：生成 200x200 缩略图
thumbnail := GenerateThumbnail(originalBytes, 200, 200)
```

### 5.3 图片水印

```go
import "golang.org/x/image/font"

func AddWatermark(input []byte, watermarkText string) ([]byte, error) {
    img, _ := imaging.Decode(bytes.NewReader(input))
    
    // 加载字体
    fontFile, _ := os.Open("fonts/arial.ttf")
    fontFace, _ := truetype.Parse(fontFile)
    
    // 绘制文字
    opts := truetype.DrawOptions{
        FontSize: 24,
        Color:    color.RGBA{255, 255, 255, 128},  // 半透明白色
    }
    
    draw.Draw(img, img.Bounds(), &image.Uniform{opts.Color}, image.Point{}, draw.Src)
    
    var buf bytes.Buffer
    imaging.Encode(&buf, img, imaging.JPEG)
    
    return buf.Bytes(), nil
}
```

## 六、文件类型校验

### 6.1 MIME 类型检测

```go
import "net/http"

func DetectContentType(data []byte) string {
    // 只检测前 512 字节
    return http.DetectContentType(data[:512])
}

// 使用
contentType := DetectContentType(fileBytes)
// 输出: "image/jpeg"、"application/pdf" 等
```

### 6.2 文件扩展名校验

```go
var AllowedExtensions = map[string]bool{
    ".jpg":  true,
    ".jpeg": true,
    ".png":  true,
    ".gif":  true,
    ".pdf":  true,
    ".doc":  true,
    ".docx": true,
    ".xls":  true,
    ".xlsx": true,
}

func ValidateExtension(filename string) error {
    ext := strings.ToLower(filepath.Ext(filename))
    
    if !AllowedExtensions[ext] {
        return errors.New("file type not allowed")
    }
    
    return nil
}
```

### 6.3 文件大小限制

```go
const MaxFileSize = 100 * 1024 * 1024  // 100MB

func ValidateFileSize(size int64) error {
    if size > MaxFileSize {
        return errors.New("file size exceeds limit")
    }
    return nil
}
```

## 七、安全防护

### 7.1 防病毒扫描

集成 ClamAV 进行病毒扫描：

```go
import "github.com/dutchcoders/go-clamd"

func ScanForVirus(fileContent []byte) error {
    clam := clamd.NewClamd("/var/run/clamav/clamd.ctl")
    
    result, err := clam.ScanStream(bytes.NewReader(fileContent))
    if err != nil {
        return err
    }
    
    if result.Status == clamd.RES_FOUND {
        return errors.New("virus detected")
    }
    
    return nil
}
```

### 7.2 文件名安全处理

防止路径遍历攻击：

```go
func SanitizeFilename(filename string) string {
    // 移除路径信息
    filename = filepath.Base(filename)
    
    // 移除特殊字符
    filename = regexp.MustCompile(`[^a-zA-Z0-9._-]`).ReplaceAllString(filename, "_")
    
    // 添加随机前缀防止冲突
    uuid := util.GenerateUUID()
    ext := filepath.Ext(filename)
    name := strings.TrimSuffix(filename, ext)
    
    return fmt.Sprintf("%s_%s%s", uuid, name, ext)
}

// 使用
safeName := SanitizeFilename("../../etc/passwd")
// 输出: "a1b2c3d4_passwd"
```

### 7.3 访问权限控制

通过预签名 URL 控制访问时效：

```go
// 私有文件：生成短期有效的下载链接
if file.IsPrivate {
    url := oss.GetPresignedDownloadURL(bucket, key, 5*time.Minute)
    return url
}

// 公开文件：直接返回永久链接
return file.StoragePath
```

## 八、实战场景

### 8.1 场景一：用户头像上传

```vue
<template>
  <Upload
    :before-upload="beforeUpload"
    :custom-request="handleUpload"
    accept="image/*"
  >
    <Button icon={<UploadOutlined />}>上传头像</Button>
  </Upload>
</template>

<script setup>
import { uploadFile } from '@/api/service/file-transfer';

async function beforeUpload(file) {
  // 校验文件类型
  if (!file.type.startsWith('image/')) {
    message.error('只能上传图片文件');
    return false;
  }
  
  // 校验文件大小（2MB）
  if (file.size > 2 * 1024 * 1024) {
    message.error('图片大小不能超过 2MB');
    return false;
  }
  
  return true;
}

async function handleUpload({ file }) {
  try {
    const res = await uploadFile(file);
    message.success('上传成功');
    
    // 更新用户头像
    await updateUserProfile({ avatar: res.url });
  } catch (error) {
    message.error('上传失败');
  }
}
</script>
```

### 8.2 场景二：文档批量上传

```go
func (s *FileService) BatchUpload(ctx context.Context, files []*multipart.FileHeader) ([]*storageV1.File, error) {
    var uploadedFiles []*storageV1.File
    
    for _, fileHeader := range files {
        // 打开文件
        file, _ := fileHeader.Open()
        content, _ := ioutil.ReadAll(file)
        
        // 生成唯一 key
        key := fmt.Sprintf("documents/%d/%s", 
            auth.GetUserID(ctx), 
            SanitizeFilename(fileHeader.Filename))
        
        // 上传到 MinIO
        url, _ := s.ossClient.UploadFile("documents", key, content)
        
        // 记录元数据
        fileRecord, _ := s.fileRepo.Create(ctx, &storageV1.File{
            Bucket:       "documents",
            Key:          key,
            OriginalName: fileHeader.Filename,
            FileSize:     fileHeader.Size,
            ContentType:  fileHeader.Header.Get("Content-Type"),
            StoragePath:  url,
        })
        
        uploadedFiles = append(uploadedFiles, fileRecord)
    }
    
    return uploadedFiles, nil
}
```

### 8.3 场景三：文件分享链接

```go
func (s *FileService) GenerateShareLink(ctx context.Context, fileID uint32, expiryHours int) (string, error) {
    file, _ := s.fileRepo.Get(ctx, fileID)
    
    // 生成 7 天有效的预签名 URL
    expiry := time.Duration(expiryHours) * time.Hour
    url, err := s.ossClient.GetPresignedDownloadURL(file.Bucket, file.Key, expiry)
    
    if err != nil {
        return "", err
    }
    
    // 记录分享日志
    s.shareLogRepo.Create(ctx, &ShareLog{
        FileID:     fileID,
        SharedBy:   auth.GetUserID(ctx),
        ExpiresAt:  time.Now().Add(expiry),
        AccessURL:  url,
    })
    
    return url, nil
}
```

### 8.4 场景四：定时清理临时文件

结合任务调度（参考 [任务调度教程](./tutorial-task-scheduling.md)）：

```lua
-- scripts/cleanup_temp_files.lua

task.enqueue_periodic("cleanup_temp_uploads", "0 3 * * *", {})

hook.register("on_task_cleanup_temp_uploads", function(params)
    logger.info("开始清理临时上传文件...")
    
    local bucket = "temp-uploads"
    local files = oss.list_files(bucket, "")
    
    local now = util.timestamp()
    local deleted_count = 0
    
    for _, file in ipairs(files) do
        -- 删除超过 24 小时的文件
        if (now - file.created_at) > 86400 then
            oss.delete_file(bucket, file.name)
            deleted_count = deleted_count + 1
        end
    end
    
    logger.info("清理完成，删除 %d 个文件", deleted_count)
end)
```

## 九、性能优化

### 9.1 CDN 加速

将 MinIO 对接 CDN：

```yaml
oss:
  minio:
    endpoint: "minio:9000"
    upload_host: "minio:9000"
    download_host: "cdn.example.com"  # CDN 域名
```

### 9.2 并发上传

前端使用并发上传提升速度：

```typescript
async function batchUpload(files: File[]) {
  const promises = files.map(file => uploadFile(file));
  const results = await Promise.all(promises);
  return results;
}
```

### 9.3 缓存策略

对于公开文件，设置浏览器缓存：

```go
w.Header().Set("Cache-Control", "public, max-age=31536000")  // 1 年
w.Header().Set("ETag", etag)
```

## 十、常见问题

### Q1: 上传大文件超时怎么办？

1. 使用分片上传
2. 增加超时时间：`asynq.Timeout(30*time.Minute)`
3. 前端显示上传进度

### Q2: 如何限制用户上传空间？

按租户统计存储空间：

```go
func GetTenantStorageUsage(tenantID uint32) int64 {
    totalSize, _ := fileRepo.SumFileSizeByTenant(ctx, tenantID)
    return totalSize
}

// 检查配额
if GetTenantStorageUsage(tenantID) > quota {
    return errors.New("storage quota exceeded")
}
```

### Q3: 如何实现秒传（去重）？

计算文件哈希值，相同哈希只存储一份：

```go
import "crypto/md5"

func CalculateFileHash(content []byte) string {
    hash := md5.Sum(content)
    return hex.EncodeToString(hash[:])
}

// 上传前检查是否已存在
hash := CalculateFileHash(fileContent)
existingFile := fileRepo.GetByHash(hash)

if existingFile != nil {
    // 秒传：直接返回已有文件链接
    return existingFile.StoragePath
}
```

### Q4: MinIO 集群如何部署？

生产环境使用分布式 MinIO：

```shell
docker run -p 9000:9000 -p 9001:9001 \
  minio/minio server \
  http://node{1...4}/data{1...2} \
  --console-address ":9001"
```

## 十一、相关文档

- [后端配置与部署](./backend-config-deploy.md)
- [任务调度与异步处理](./tutorial-task-scheduling.md)
- [Lua 脚本扩展实战](./tutorial-lua-extension.md)
