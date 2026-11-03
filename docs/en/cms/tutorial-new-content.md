# Adding a Content Type, Full Stack in Practice

Using the new "Video" content type as an example, this tutorial walks you through the complete full-stack development process of the CMS: from Protobuf API definition → Ent data layer → Core Service business logic → Admin/App Service interface layer → admin console frontend pages → frontend consumption.

## Prerequisites

- You have read [CMS Backend Architecture Overview](./backend-architecture.md) and [CMS API Definitions](./backend-api.md)
- The local development environment is set up (see the [Installation Guide](./installation.md))
- Understand basic concepts of Go, Protobuf, and Vue 3

## Full-Stack Process Overview

```mermaid
graph LR
    S1[1. 定义 Protobuf] --> S2[2. 生成 Go 代码]
    S2 --> S3[3. 定义 Ent Schema]
    S3 --> S4[4. 生成 Ent 代码]
    S4 --> S5[5. 编写 Repository]
    S5 --> S6[6. Core Service 业务逻辑]
    S6 --> S7[7. Admin Service 接口]
    S7 --> S8[8. App Service 接口]
    S8 --> S9[9. Wire 依赖注入]
    S9 --> S10[10. 管理后台页面]
    S10 --> S11[11. 前台消费]
```

## Step 1: Define the Protobuf API

### 1.1 Define Domain Messages

Create `api/protos/content/service/v1/video.proto`:

```protobuf
syntax = "proto3";

package content.service.v1;

import "gnostic/openapi/v3/annotations.proto";
import "google/protobuf/empty.proto";
import "google/protobuf/timestamp.proto";
import "google/protobuf/field_mask.proto";
import "pagination/v1/pagination.proto";
import "content/service/v1/types.proto";

// 视频
message Video {
  optional uint32 id = 1 [json_name = "id"];
  optional string title = 2 [json_name = "title"];
  optional string slug = 3 [json_name = "slug"];
  optional string description = 5 [json_name = "description"];
  optional string video_url = 6 [json_name = "videoUrl"];
  optional string thumbnail = 7 [json_name = "thumbnail"];
  optional uint32 duration = 8 [json_name = "duration"]; // 时长（秒）
  optional uint32 view_count = 9 [json_name = "viewCount"];

  optional Status status = 10;
  enum Status {
    VIDEO_STATUS_DRAFT = 0;
    VIDEO_STATUS_PUBLISHED = 1;
    VIDEO_STATUS_OFFLINE = 2;
  }

  repeated uint32 category_ids = 20 [json_name = "categoryIds"];
  repeated uint32 tag_ids = 21 [json_name = "tagIds"];

  // 多语言翻译
  repeated VideoTranslation translations = 40 [json_name = "translations"];
  repeated string available_languages = 41 [json_name = "availableLanguages"];

  optional uint32 created_by = 100 [json_name = "createdBy"];
  optional google.protobuf.Timestamp created_at = 200 [json_name = "createdAt"];
  optional google.protobuf.Timestamp updated_at = 201 [json_name = "updatedAt"];
}

message VideoTranslation {
  optional uint32 id = 1 [json_name = "id"];
  optional uint32 video_id = 2 [json_name = "videoId"];
  optional string language_code = 3 [json_name = "languageCode"];
  optional string title = 10 [json_name = "title"];
  optional string slug = 11 [json_name = "slug"];
  optional string description = 12 [json_name = "description"];
  optional SeoMeta seo = 20 [json_name = "seo"];
}

message ListVideoResponse {
  repeated Video items = 1;
  uint64 total = 2;
}

message GetVideoRequest {
  oneof query_by {
    uint32 id = 1 [json_name = "id"];
    string code = 2 [json_name = "code"];
  }
  optional string locale = 10 [json_name = "locale"];
}

message CreateVideoRequest { Video data = 1; }

message UpdateVideoRequest {
  uint32 id = 1;
  Video data = 2;
  google.protobuf.FieldMask update_mask = 3 [json_name = "updateMask"];
}

message DeleteVideoRequest { uint32 id = 1; }
```

### 1.2 Define the Admin Service Interface

Create `api/protos/admin/service/v1/i_video.proto`:

```protobuf
syntax = "proto3";

package admin.service.v1;

import "google/api/annotations.proto";
import "google/protobuf/empty.proto";
import "pagination/v1/pagination.proto";
import "content/service/v1/video.proto";

service VideoService {
  rpc List(pagination.PagingRequest) returns (content.service.v1.ListVideoResponse) {
    option (google.api.http) = { get: "/admin/v1/videos" };
  }
  rpc Get(content.service.v1.GetVideoRequest) returns (content.service.v1.Video) {
    option (google.api.http) = { get: "/admin/v1/videos/{id}" };
  }
  rpc Create(content.service.v1.CreateVideoRequest) returns (content.service.v1.Video) {
    option (google.api.http) = { post: "/admin/v1/videos" body: "*" };
  }
  rpc Update(content.service.v1.UpdateVideoRequest) returns (content.service.v1.Video) {
    option (google.api.http) = { put: "/admin/v1/videos/{id}" body: "*" };
  }
  rpc Delete(content.service.v1.DeleteVideoRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = { delete: "/admin/v1/videos/{id}" };
  }
}
```

### 1.3 Define the App Service Interface

Create `api/protos/app/service/v1/i_video.proto`:

```protobuf
syntax = "proto3";

package app.service.v1;

import "google/api/annotations.proto";
import "pagination/v1/pagination.proto";
import "content/service/v1/video.proto";

service VideoService {
  rpc List(pagination.PagingRequest) returns (content.service.v1.ListVideoResponse) {
    option (google.api.http) = { get: "/app/v1/videos" };
  }
  rpc Get(content.service.v1.GetVideoRequest) returns (content.service.v1.Video) {
    option (google.api.http) = { get: "/app/v1/videos/{id}" };
  }
}
```

## Step 2: Generate Go Code

```shell
cd backend
make api
```

The generated content is output to the `api/gen/go/` directory:
- `content/service/v1/video.pb.go` — message definitions
- `content/service/v1/video_grpc.pb.go` — gRPC service interfaces
- `admin/service/v1/i_video.pb.go` — Admin HTTP service interfaces
- `app/service/v1/i_video.pb.go` — App HTTP service interfaces

## Step 3: Define the Ent Schema

Create `app/core/service/internal/data/ent/schema/video.go`:

```go
package schema

import (
    "entgo.io/ent"
    "entgo.io/ent/schema/field"
    "entgo.io/ent/schema/edge"
    "entgo.io/ent/schema/mixin"
)

type Video struct{ ent.Schema }

func (Video) Mixin() []ent.Mixin {
    return []ent.Mixin{
        mixin.Time{},
    }
}

func (Video) Fields() []ent.Field {
    return []ent.Field{
        field.String("title"),
        field.String("slug").Unique(),
        field.Text("description").Optional(),
        field.String("video_url").Optional(),
        field.String("thumbnail").Optional(),
        field.Uint32("duration").Default(0),
        field.Uint32("view_count").Default(0),
        field.Int("status").Default(1),
    }
}

func (Video) Edges() []ent.Edge {
    return []ent.Edge{
        edge.To("translations", VideoTranslation.Type),
        edge.From("categories", Category.Type).Ref("videos"),
        edge.From("tags", Tag.Type).Ref("videos"),
    }
}
```

Create the translation schema `app/core/service/internal/data/ent/schema/video_translation.go`:

```go
package schema

import (
    "entgo.io/ent"
    "entgo.io/ent/schema/field"
    "entgo.io/ent/schema/edge"
    "entgo.io/ent/schema/mixin"
)

type VideoTranslation struct{ ent.Schema }

func (VideoTranslation) Mixin() []ent.Mixin {
    return []ent.Mixin{mixin.Time{}}

}

func (VideoTranslation) Fields() []ent.Field {
    return []ent.Field{
        field.String("language_code"),
        field.String("title").Optional(),
        field.String("slug").Optional(),
        field.Text("description").Optional(),
        field.JSON("seo", map[string]any{}).Optional(),
    }
}

func (VideoTranslation) Edges() []ent.Edge {
    return []ent.Edge{
        edge.From("video", Video.Type).Ref("translations").Unique(),
    }
}
```

## Step 4: Generate Ent Code

```shell
cd backend
make ent
```

## Step 5: Write the Repository

Create `app/core/service/internal/data/video_repo.go`:

```go
package data

import (
    "context"

    "github.com/go-kratos/kratos/v2/log"
    paginationV1 "github.com/tx7do/go-crud/api/gen/go/pagination/v1"
    "github.com/tx7do/kratos-bootstrap/bootstrap"

    contentV1 "go-wind-cms/api/gen/go/content/service/v1"
    "go-wind-cms/app/core/service/internal/data/ent"
)

type VideoRepo struct {
    data *Data
    log  *log.Helper
}

func NewVideoRepo(ctx *bootstrap.Context, data *Data) *VideoRepo {
    return &VideoRepo{
        data: data,
        log:  ctx.NewLoggerHelper("video/repo"),
    }
}

func (r *VideoRepo) List(ctx context.Context, req *paginationV1.PagingRequest) (*contentV1.ListVideoResponse, error) {
    // 构建 Ent 查询，支持分页、排序、搜索
    query := r.data.db.Video.Query()
    // ... 分页和排序逻辑（参考 post_repo.go）
    items, err := query.All(ctx)
    if err != nil {
        return nil, err
    }
    // 转换为 protobuf 消息
    // ...
    return &contentV1.ListVideoResponse{Items: results, Total: total}, nil
}

func (r *VideoRepo) Get(ctx context.Context, req *contentV1.GetVideoRequest) (*contentV1.Video, error) {
    // 按 ID 或 code 查询
    // ...
}

func (r *VideoRepo) Create(ctx context.Context, req *contentV1.CreateVideoRequest) (*contentV1.Video, error) {
    // 使用 Ent 创建 Video 记录
    // 自动处理分类、标签关联
    // ...
}

func (r *VideoRepo) Update(ctx context.Context, req *contentV1.UpdateVideoRequest) (*contentV1.Video, error) {
    // 使用 FieldMask 精确更新字段
    // ...
}

func (r *VideoRepo) Delete(ctx context.Context, req *contentV1.DeleteVideoRequest) error {
    // 软删除（设置 deleted_at）
    // ...
}
```

::: tip Reference
For a complete Repository implementation, refer to `app/core/service/internal/data/post_repo.go` (about 700 lines). It is the most complete example, covering all patterns such as pagination, sorting, translation association, and category/tag association.
:::

## Step 6: Core Service Business Logic

Create `app/core/service/internal/service/video_service.go`:

```go
package service

import (
    "context"

    "github.com/go-kratos/kratos/v2/log"
    "github.com/tx7do/go-utils/trans"
    "github.com/tx7do/kratos-bootstrap/bootstrap"
    "google.golang.org/protobuf/types/known/emptypb"

    "go-wind-cms/app/core/service/internal/data"
    contentV1 "go-wind-cms/api/gen/go/content/service/v1"
    paginationV1 "github.com/tx7do/go-crud/api/gen/go/pagination/v1"
)

type VideoService struct {
    contentV1.UnimplementedVideoServiceServer

    videoRepo *data.VideoRepo
    log       *log.Helper
}

func NewVideoService(ctx *bootstrap.Context, repo *data.VideoRepo) *VideoService {
    return &VideoService{
        videoRepo: repo,
        log:       ctx.NewLoggerHelper("video/service/core-service"),
    }
}

func (s *VideoService) List(ctx context.Context, req *paginationV1.PagingRequest) (*contentV1.ListVideoResponse, error) {
    return s.videoRepo.List(ctx, req)
}

func (s *VideoService) Get(ctx context.Context, req *contentV1.GetVideoRequest) (*contentV1.Video, error) {
    return s.videoRepo.Get(ctx, req)
}

func (s *VideoService) Create(ctx context.Context, req *contentV1.CreateVideoRequest) (*contentV1.Video, error) {
    // 业务规则：新视频默认状态为"已发布"
    if req.Data.Status == nil {
        req.Data.Status = trans.Ptr(contentV1.Video_VIDEO_STATUS_PUBLISHED)
    }
    return s.videoRepo.Create(ctx, req)
}

func (s *VideoService) Update(ctx context.Context, req *contentV1.UpdateVideoRequest) (*contentV1.Video, error) {
    return s.videoRepo.Update(ctx, req)
}

func (s *VideoService) Delete(ctx context.Context, req *contentV1.DeleteVideoRequest) (*emptypb.Empty, error) {
    if err := s.videoRepo.Delete(ctx, req); err != nil {
        return nil, err
    }
    return &emptypb.Empty{}, nil
}
```

## Step 7: Admin Service Interface Layer

Create `app/admin/service/internal/service/video_service.go` (gRPC forwarding proxy):

```go
package service

import (
    "context"

    "github.com/go-kratos/kratos/v2/log"
    "github.com/tx7do/kratos-bootstrap/bootstrap"
    "google.golang.org/protobuf/types/known/emptypb"

    adminV1 "go-wind-cms/api/gen/go/admin/service/v1"
    contentV1 "go-wind-cms/api/gen/go/content/service/v1"
    paginationV1 "github.com/tx7do/go-crud/api/gen/go/pagination/v1"
)

type VideoService struct {
    adminV1.VideoServiceHTTPServer

    videoClient contentV1.VideoServiceClient // gRPC 客户端
    log         *log.Helper
}

func NewVideoService(ctx *bootstrap.Context, client contentV1.VideoServiceClient) *VideoService {
    return &VideoService{
        videoClient: client,
        log:         ctx.NewLoggerHelper("video/service/admin-service"),
    }
}

func (s *VideoService) List(ctx context.Context, req *paginationV1.PagingRequest) (*contentV1.ListVideoResponse, error) {
    return s.videoClient.List(ctx, req)
}

func (s *VideoService) Get(ctx context.Context, req *contentV1.GetVideoRequest) (*contentV1.Video, error) {
    return s.videoClient.Get(ctx, req)
}

func (s *VideoService) Create(ctx context.Context, req *contentV1.CreateVideoRequest) (*contentV1.Video, error) {
    return s.videoClient.Create(ctx, req)
}

func (s *VideoService) Update(ctx context.Context, req *contentV1.UpdateVideoRequest) (*contentV1.Video, error) {
    return s.videoClient.Update(ctx, req)
}

func (s *VideoService) Delete(ctx context.Context, req *contentV1.DeleteVideoRequest) (*emptypb.Empty, error) {
    return s.videoClient.Delete(ctx, req)
}
```

## Step 8: App Service Interface Layer

Create `app/app/service/internal/service/video_service.go`:

```go
package service

import (
    "context"

    "github.com/go-kratos/kratos/v2/log"
    "github.com/tx7do/kratos-bootstrap/bootstrap"

    appV1 "go-wind-cms/api/gen/go/app/service/v1"
    contentV1 "go-wind-cms/api/gen/go/content/service/v1"
    paginationV1 "github.com/tx7do/go-crud/api/gen/go/pagination/v1"
)

type VideoService struct {
    appV1.VideoServiceHTTPServer

    videoClient contentV1.VideoServiceClient
    log         *log.Helper
}

func NewVideoService(ctx *bootstrap.Context, client contentV1.VideoServiceClient) *VideoService {
    return &VideoService{
        videoClient: client,
        log:         ctx.NewLoggerHelper("video/service/app-service"),
    }
}

// 仅暴露 List 和 Get（前台只读）
func (s *VideoService) List(ctx context.Context, req *paginationV1.PagingRequest) (*contentV1.ListVideoResponse, error) {
    return s.videoClient.List(ctx, req)
}

func (s *VideoService) Get(ctx context.Context, req *contentV1.GetVideoRequest) (*contentV1.Video, error) {
    return s.videoClient.Get(ctx, req)
}
```

## Step 9: Register Routes and Dependency Injection

### 9.1 Register HTTP Routes

Register in `app/admin/service/internal/server/rest_server.go`:

```go
func NewRestServer(
    // ... 已有参数
    videoService *service.VideoService, // 新增
) *http.Server {
    // ... 已有代码

    // 注册 Video HTTP Handler
    adminV1.RegisterVideoServiceHTTPServer(srv, videoService)

    // ... 返回
}
```

Register likewise in `app/app/service/internal/server/rest_server.go`, and add the login-free endpoints to the whitelist:

```go
rpc.AddWhiteList(
    // ... 已有白名单
    appV1.OperationVideoServiceList, // 新增：视频列表免登录
    appV1.OperationVideoServiceGet,  // 新增：视频详情免登录
)
```

### 9.2 Register the gRPC Service

Register in `app/core/service/internal/server/grpc_server.go`:

```go
func NewGRPCServer(
    // ... 已有参数
    videoService *service.VideoService, // 新增
) *grpc.Server {
    // ... 已有代码
    contentV1.RegisterVideoServiceServer(srv, videoService)
    return srv
}
```

### 9.3 Wire Dependency Injection

```shell
cd backend
make wire
```

Wire automatically generates the dependency injection code. If you configure providers manually, add the following to `wire.go`:

```go
// app/core/service/cmd/server/wire.go
var CoreProviderSet = wire.NewSet(
    // ... 已有 Provider
    data.NewVideoRepo,
    service.NewVideoService,
)

// app/admin/service/cmd/server/wire.go
var AdminProviderSet = wire.NewSet(
    // ... 已有 Provider
    service.NewVideoService,
)
```

## Step 10: Admin Console Pages

### 10.1 Generate TypeScript API Code

```shell
cd backend
make ts
```

### 10.2 Create Vue Query Composables

Create `frontend/admin/apps/admin/src/api/composables/video.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { apiClient } from '#/api/client';
import { makeUpdateMask, type PaginationQuery } from '#/transport/rest';

// 视频列表
export function useListVideos(query: PaginationQuery) {
  return useQuery({
    queryKey: ['listVideos', query],
    queryFn: () => apiClient.videoService.List(query.toRawParams()),
  });
}

// 视频详情
export function useGetVideo(id: number) {
  return useQuery({
    queryKey: ['getVideo', id],
    queryFn: () => apiClient.videoService.Get({ id }),
    enabled: !!id,
  });
}

// 创建视频
export function useCreateVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.videoService.Create({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['listVideos'] }),
  });
}

// 更新视频
export function useUpdateVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.videoService.Update({
        id,
        data,
        updateMask: makeUpdateMask(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['listVideos'] }),
  });
}

// 删除视频
export function useDeleteVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.videoService.Delete({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['listVideos'] }),
  });
}
```

### 10.3 List Page

Create `views/content/video/index.vue`:

```vue
<script setup lang="ts">
import { useListVideos, useDeleteVideo } from '#/api/composables/video';
import { PaginationQuery } from '#/transport/rest';

const pagination = reactive(new PaginationQuery());
const { data, isLoading } = useListVideos(pagination);
const deleteMutation = useDeleteVideo();

const handleDelete = (id: number) => {
  Modal.confirm({
    title: '确认删除该视频？',
    onOk: () => deleteMutation.mutate(id),
  });
};
</script>

<template>
  <Page title="视频管理">
    <Table :loading="isLoading" :data="data?.items">
      <TableColumn title="标题" data-index="title" />
      <TableColumn title="状态" data-index="status" />
      <TableColumn title="时长" data-index="duration" />
      <TableColumn title="播放量" data-index="viewCount" />
      <TableColumn title="操作">
        <template #default="{ record }">
          <Button @click="goEdit(record.id)">编辑</Button>
          <Button danger @click="handleDelete(record.id)">删除</Button>
        </template>
      </TableColumn>
    </Table>
  </Page>
</template>
```

### 10.4 Form Page

Create `views/content/video/form.vue`:

```vue
<script setup lang="ts">
import { useGetVideo, useCreateVideo, useUpdateVideo } from '#/api/composables/video';

const route = useRoute();
const editId = computed(() => Number(route.params.id));

const { data: videoData } = useGetVideo(editId.value);
const createMutation = useCreateVideo();
const updateMutation = useUpdateVideo();

const formData = reactive({
  title: '',
  slug: '',
  description: '',
  videoUrl: '',
  thumbnail: '',
  duration: 0,
});

watch(videoData, (val) => {
  if (val) Object.assign(formData, val);
});

const handleSubmit = async () => {
  if (editId.value) {
    await updateMutation.mutateAsync({ id: editId.value, data: formData });
  } else {
    await createMutation.mutateAsync(formData);
  }
  router.push('/content/video');
};
</script>

<template>
  <Page :title="editId ? '编辑视频' : '新建视频'">
    <Form :model="formData" @finish="handleSubmit">
      <FormItem label="标题" name="title" :rules="[{ required: true }]">
        <Input v-model:value="formData.title" />
      </FormItem>
      <FormItem label="视频地址" name="videoUrl">
        <Input v-model:value="formData.videoUrl" />
      </FormItem>
      <FormItem label="描述" name="description">
        <Textarea v-model:value="formData.description" :rows="4" />
      </FormItem>
      <Button type="primary" html-type="submit">保存</Button>
    </Form>
  </Page>
</template>
```

## Step 11: Frontend Consumption

### React (Next.js) Frontend

```tsx
// frontend/app/react/src/app/[locale]/videos/page.tsx
import { apiClient } from '@/lib/api/client';

export default async function VideoList({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const { data } = await apiClient.get('/videos', {
    params: { locale, page: 1, pageSize: 12 },
  });

  return (
    <div className="grid grid-cols-3 gap-6">
      {data.items.map((video: any) => (
        <div key={video.id}>
          <img src={video.thumbnail} alt={video.title} />
          <h3>{video.title}</h3>
          <p>{video.description}</p>
        </div>
      ))}
    </div>
  );
}
```

### Flutter Frontend

```dart
// features/video/presentation/bloc/video_list_bloc.dart
class VideoListBloc extends Bloc<VideoListEvent, VideoListState> {
  final dio = Dio();
  final api = VideoApi(dio);

  VideoListBloc() : super(VideoListInitial()) {
    on<FetchVideos>(_onFetchVideos);
  }

  Future<void> _onFetchVideos(FetchVideos event, Emitter<VideoListState> emit) async {
    emit(VideoListLoading());
    try {
      final response = await api.listVideos(locale: event.locale);
      emit(VideoListLoaded(response.items));
    } catch (e) {
      emit(VideoListError(e.toString()));
    }
  }
}
```

## Verification

### Backend Verification

```shell
# 启动服务
make run-core
make run-admin
make run-app

# 测试 Admin API
curl http://localhost:6600/admin/v1/videos

# 测试 App API
curl http://localhost:6700/app/v1/videos

# 查看 Swagger 文档
# Admin: http://localhost:6600/docs/
# App: http://localhost:6700/docs/
```

### Frontend Verification

```shell
# 管理后台
cd frontend/admin
pnpm dev

# React 前台
cd frontend/app/react
pnpm dev
```

## Checklist

| Check Item | Description |
|--------|------|
| Complete Protobuf definitions | content domain messages + Admin interface + App interface |
| Ent schema definitions | Main table + translation table + edge relations |
| Code generation passes | `make api && make ent && make wire` |
| Core Service registration | gRPC server registration |
| Admin Service forwarding | HTTP Handler registration |
| App Service forwarding | HTTP Handler + whitelist registration |
| Admin console pages | List page + form page + Vue Query hooks |
| Frontend consumption | At least one frontend can fetch the data |

## Related Documents

- [CMS Backend Architecture Overview](./backend-architecture.md)
- [CMS Protobuf API Definitions](./backend-api.md)
- [CMS Frontend Architecture](./frontend-architecture.md)
- [Content Multilingual Translation in Practice](./tutorial-content-i18n.md)
- [Headless API Multi-Client Integration in Practice](./tutorial-headless-api.md)
