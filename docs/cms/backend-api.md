# CMS Protobuf API 定义

GoWind CMS 采用 **Protobuf First** 的 API 开发模式，通过双协议（Admin API + App API）分别服务管理后台和前台应用。本文档详解 API 组织结构、内容领域模型和翻译机制。

## 一、Protobuf 目录组织

```
api/protos/
├── admin/service/v1/           # Admin Service 接口定义（41 个 proto 文件）
├── app/service/v1/             # App Service 接口定义（11 个 proto 文件）
├── content/service/v1/         # 内容领域消息（Post/Category/Tag/Page + 翻译）
├── site/service/v1/            # 站点领域消息（Site/Navigation/SiteSetting）
├── identity/                   # 身份管理消息（User/Role/OrgUnit/Tenant...）
├── permission/                 # 权限管理消息
├── authentication/             # 认证消息
├── audit/                      # 审计日志消息
├── comment/                    # 评论消息（共享定义）
├── dict/                       # 字典管理消息
├── internal_message/           # 站内信消息
├── media/                      # 媒体资源消息
├── storage/                    # 文件存储消息
├── task/                       # 任务调度消息
└── translator/                 # 翻译管理消息
```

### 设计原则：接口与消息分离

CMS 的 Protobuf 设计遵循 **接口定义与消息定义分离** 的原则：

- `admin/service/v1/i_post.proto` — 定义 Admin 的 HTTP 路由和 RPC 方法
- `app/service/v1/i_post.proto` — 定义 App 的 HTTP 路由和 RPC 方法
- `content/service/v1/post.proto` — 定义 Post 消息体（两者共享）

## 二、双协议 API 路由

### Admin API（管理后台）

路由前缀：`/admin/v1/`，端口：6600

```protobuf
// admin/service/v1/i_post.proto
service PostService {
  rpc List (pagination.PagingRequest) returns (content.service.v1.ListPostResponse) {
    option (google.api.http) = { get: "/admin/v1/posts" };
  }
  rpc Get (content.service.v1.GetPostRequest) returns (content.service.v1.Post) {
    option (google.api.http) = { get: "/admin/v1/posts/{id}" };
  }
  rpc Create (content.service.v1.CreatePostRequest) returns (content.service.v1.Post) {
    option (google.api.http) = { post: "/admin/v1/posts" body: "*" };
  }
  rpc Update (content.service.v1.UpdatePostRequest) returns (content.service.v1.Post) {
    option (google.api.http) = { put: "/admin/v1/posts/{id}" body: "*" };
  }
  rpc Delete (content.service.v1.DeletePostRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = { delete: "/admin/v1/posts/{id}" };
  }
  // 检查翻译是否存在
  rpc TranslationExists(...) returns (...) {
    option (google.api.http) = { get: "/admin/v1/posts/{post_id}/translations/{language_code}" };
  }
}
```

### App API（前台应用）

路由前缀：`/app/v1/`，端口：6700

```protobuf
// app/service/v1/i_post.proto
service PostService {
  rpc List (pagination.PagingRequest) returns (content.service.v1.ListPostResponse) {
    option (google.api.http) = { get: "/app/v1/posts" };
  }
  rpc Get (content.service.v1.GetPostRequest) returns (content.service.v1.Post) {
    option (google.api.http) = { get: "/app/v1/posts/{id}" };
  }
  rpc Create (content.service.v1.CreatePostRequest) returns (content.service.v1.Post) {
    option (google.api.http) = { post: "/app/v1/posts" body: "*" };
  }
  // 获取翻译数据（前台按语言获取内容）
  rpc GetTranslation(content.service.v1.GetPostRequest) returns (content.service.v1.PostTranslation) {
    option (google.api.http) = { get: "/app/v1/posts/{id}/translation" };
  }
}
```

### Admin API 与 App API 对比

| 对比项 | Admin API | App API |
|--------|-----------|---------|
| 路由前缀 | `/admin/v1/` | `/app/v1/` |
| 认证要求 | 除登录外全部需要 JWT | 浏览类接口免登录 |
| 接口数量 | 40+ Service | 9 个 Service |
| 写操作 | 完整 CRUD | 受限（用户可发帖、评论） |
| 翻译管理 | TranslationExists / CreateTranslation / UpdateTranslation / DeleteTranslation | 仅 GetTranslation（按语言读取） |

## 三、Admin API 接口清单

### 内容管理

| Service | 路由 | 说明 |
|---------|------|------|
| PostService | `/admin/v1/posts` | 帖子管理 + 翻译管理 |
| CategoryService | `/admin/v1/categories` | 分类管理（树形）+ 翻译管理 |
| TagService | `/admin/v1/tags` | 标签管理 + 翻译管理 |
| CommentService | `/admin/v1/comments` | 评论管理（审核/删除/回复） |
| PageService | `/admin/v1/pages` | 页面管理 + 翻译管理 |

### 站点管理

| Service | 路由 | 说明 |
|---------|------|------|
| SiteService | `/admin/v1/sites` | 站点管理（多站点配置） |
| SiteSettingService | `/admin/v1/site-settings` | 站点全局配置 |
| NavigationService | `/admin/v1/navigations` | 导航栏管理 |
| NavigationItemService | `/admin/v1/navigation-items` | 导航项管理 |

### 媒体资源

| Service | 路由 | 说明 |
|---------|------|------|
| MediaAssetService | `/admin/v1/media-assets` | 媒体资产管理（图片/视频/文档） |
| FileService | `/admin/v1/files` | 文件记录管理 |
| FileTransferService | `/admin/v1/files/*` | 文件上传下载（手动注册 Handler） |

### 组织权限与系统管理

与 GoWind Admin 共享相同的服务体系（UserService、RoleService、PermissionService、DictService、TaskService 等），详见 [Admin 后端 API](/admin/backend-api.md)。

## 四、App API 接口清单

| Service | 路由 | 说明 | 免登录 |
|---------|------|------|--------|
| AuthenticationService | `/app/v1/login` `/app/v1/logout` `/app/v1/refresh-token` | 前台用户认证 | 登录免认证 |
| PostService | `/app/v1/posts` | 帖子浏览/发布 + 翻译获取 | List/Get 免认证 |
| CategoryService | `/app/v1/categories` | 分类浏览 | List/Get 免认证 |
| TagService | `/app/v1/tags` | 标签浏览 | List/Get 免认证 |
| CommentService | `/app/v1/comments` | 评论互动 | List/Get 免认证 |
| PageService | `/app/v1/pages` | 页面展示 | List/Get 免认证 |
| NavigationService | `/app/v1/navigations` | 导航获取 | List 免认证 |
| UserProfileService | `/app/v1/user-profile` | 用户资料 | 需登录 |
| FileTransferService | `/app/v1/files/*` | 文件上传下载 | 需登录 |

## 五、内容领域模型

### Post（帖子）

帖子是 CMS 的核心内容实体，支持多语言、分类、标签、密码保护等丰富的内容管理功能：

```protobuf
message Post {
  optional uint32 id = 1;
  optional string title = 2;          // 标题
  optional string slug = 3;           // URL 别名
  optional string content = 5;        // 内容
  optional Post.Status status = 6;    // 状态：草稿/已发布/已下架
  optional EditorType editor_type = 7;// 编辑器类型
  repeated Section sections = 8;      // 内容区块（富文本构建器）

  optional uint32 author_id = 20;     // 作者 ID
  optional string author_name = 21;   // 作者名（游客）

  map<string, string> custom_fields = 30;    // 自定义字段

  repeated PostTranslation translations = 40; // 多语言翻译
  repeated string available_languages = 41;   // 可用语言列表

  repeated uint32 category_ids = 50;  // 关联分类
  repeated uint32 tag_ids = 51;       // 关联标签

  optional string password_hash = 60; // 密码保护
}
```

### Post 状态枚举

```protobuf
enum Status {
  POST_STATUS_DRAFT = 0;      // 草稿
  POST_STATUS_PUBLISHED = 1;  // 已发布
  POST_STATUS_OFFLINE = 2;    // 已下架
}
```

### Section（内容区块）

Post 支持 **区块化内容构建**，类似 Notion / Gutenberg 编辑器：

```protobuf
message Section {
  optional SectionType type = 1;  // 区块类型
  optional string name = 2;       // 区块名称
  optional uint32 sort_order = 3; // 排序
  map<string, string> config = 4; // 区块配置
  map<string, string> content = 5;// 区块内容
}
```

支持的区块类型：富文本、Markdown、标题、图片、图集、视频、按钮、分割线、代码、HTML、表单、轮播图等。

### Category（分类）

分类支持 **树形结构**，使用物化路径（Materialized Path）优化层级查询：

```protobuf
message Category {
  optional string name = 4;        // 分类名称
  optional string slug = 5;        // URL 别名
  optional string icon = 6;        // 图标
  optional string code = 7;        // 唯一代码

  optional uint32 parent_id = 60;  // 父节点 ID
  repeated Category children = 61; // 子节点树
  optional int32 depth = 62;       // 层级深度
  optional string path = 63;       // 物化路径（如 "1/5/23"）

  repeated CategoryTranslation translations = 20; // 多语言翻译
}
```

## 六、多语言翻译模型

CMS 的内容翻译采用 **主表 + 翻译表** 的设计模式，每个内容实体都有对应的翻译消息。

### 翻译消息结构

```protobuf
// 帖子翻译
message PostTranslation {
  optional uint32 post_id = 2;        // 关联的帖子 ID
  optional string language_code = 3;  // 语言代码（如 zh-CN, en-US）

  optional string title = 10;         // 翻译标题
  optional string slug = 11;          // 语言特定 slug
  optional string summary = 12;       // 翻译摘要
  optional string content = 13;       // 翻译内容
  optional string thumbnail = 15;     // 翻译缩略图
  optional string full_path = 17;     // 完整路径

  optional SeoMeta seo = 20;          // SEO 元数据
}
```

### 翻译 API 设计

Admin API 提供完整的翻译 CRUD：

```protobuf
// admin/service/v1/i_post.proto
service PostService {
  // 检查翻译是否存在
  rpc TranslationExists(PostTranslationExistsRequest) returns (PostTranslationExistsResponse) {
    option (google.api.http) = {
      get: "/admin/v1/posts/{post_id}/translations/{language_code}"
    };
  }
}
```

App API 仅提供翻译读取：

```protobuf
// app/service/v1/i_post.proto
service PostService {
  // 前台按语言获取翻译内容
  rpc GetTranslation(GetPostRequest) returns (PostTranslation) {
    option (google.api.http) = {
      get: "/app/v1/posts/{id}/translation"
    };
  }
}
```

### 翻译查询机制

前端请求内容时通过 `locale` 参数指定语言：

```http
# 获取帖子的英文翻译
GET /app/v1/posts/42?locale=en-US

# 获取分类的日文翻译
GET /app/v1/categories/10?locale=ja-JP
```

每个内容实体还维护 `available_languages` 字段，便于前端快速判断可用语言。

## 七、SEO 元数据

所有内容实体均支持 `SeoMeta` 结构化元数据：

```protobuf
message SeoMeta {
  optional string seo_title = 1;        // SEO 标题
  optional string meta_keywords = 2;    // SEO 关键词
  optional string meta_description = 3; // SEO 描述

  optional string og_title = 4;         // Open Graph 标题
  optional string og_description = 5;   // Open Graph 描述
  optional string og_image = 6;         // Open Graph 图片

  optional string canonical_url = 33;   // 规范 URL
}
```

SEO 元数据可以挂在翻译上，实现 **每个语言版本独立的 SEO 配置**。

## 八、代码生成配置

### Buf 生成配置文件

| 文件 | 说明 |
|------|------|
| `buf.gen.yaml` | Go 服务端代码生成 |
| `buf.admin.openapi.gen.yaml` | Admin API OpenAPI 文档 |
| `buf.app.openapi.gen.yaml` | App API OpenAPI 文档 |
| `buf.admin.typescript.gen.yaml` | 管理后台 TypeScript 代码 |
| `buf.react.app.typescript.gen.yaml` | React 前台 TypeScript 代码 |
| `buf.taro.app.typescript.gen.yaml` | Taro 前台 TypeScript 代码 |
| `buf.vue.app.typescript.gen.yaml` | Vue 前台 TypeScript 代码 |
| `buf.app.dart.gen.yaml` | Flutter 前台 Dart 代码 |

### 生成命令

```shell
cd backend

make api       # 生成 Go 代码
make openapi   # 生成 OpenAPI 文档（Admin + App）
make ts        # 生成 TypeScript 代码（Admin + React + Taro + Vue）
make gen       # 一键生成全部（ent + wire + api + openapi）
```

## 九、Swagger UI

| API | Swagger 地址 |
|-----|-------------|
| Admin API | <http://localhost:6600/docs/> |
| App API | <http://localhost:6700/docs/> |

## 十、相关文档

- [CMS 后端架构总览](./backend-architecture.md)
- [CMS 前端架构](./frontend-architecture.md)
- [内容多语言翻译实战](./tutorial-content-i18n.md)
- [GoWind Admin API](/admin/backend-api.md) — 共享服务体系
