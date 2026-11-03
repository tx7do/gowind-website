# CMS Protobuf API Definitions

GoWind CMS adopts a **Protobuf First** API development model, serving the admin console and the frontend applications separately through dual protocols (Admin API + App API). This document details the API organization structure, the content domain model, and the translation mechanism.

## 1. Protobuf Directory Organization

```
api/protos/
├── admin/service/v1/           # Admin Service interface definitions (41 proto files)
├── app/service/v1/             # App Service interface definitions (11 proto files)
├── content/service/v1/         # Content domain messages (Post/Category/Tag/Page + translations)
├── site/service/v1/            # Site domain messages (Site/Navigation/SiteSetting)
├── identity/                   # Identity management messages (User/Role/OrgUnit/Tenant...)
├── permission/                 # Permission management messages
├── authentication/             # Authentication messages
├── audit/                      # Audit log messages
├── comment/                    # Comment messages (shared definitions)
├── dict/                       # Dictionary management messages
├── internal_message/           # Internal message notifications
├── media/                      # Media resource messages
├── storage/                    # File storage messages
├── task/                       # Task scheduling messages
└── translator/                 # Translation management messages
```

### Design Principle: Interfaces and Messages Separated

The Protobuf design of the CMS follows the principle of **separating interface definitions from message definitions**:

- `admin/service/v1/i_post.proto` — defines the Admin HTTP routes and RPC methods
- `app/service/v1/i_post.proto` — defines the App HTTP routes and RPC methods
- `content/service/v1/post.proto` — defines the Post message body (shared by both)

## 2. Dual-Protocol API Routes

### Admin API (Admin Console)

Route prefix: `/admin/v1/`, port: 6600

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
  // Check whether a translation exists
  rpc TranslationExists(...) returns (...) {
    option (google.api.http) = { get: "/admin/v1/posts/{post_id}/translations/{language_code}" };
  }
}
```

### App API (Frontend Applications)

Route prefix: `/app/v1/`, port: 6700

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
  // Fetch translation data (frontends fetch content by language)
  rpc GetTranslation(content.service.v1.GetPostRequest) returns (content.service.v1.PostTranslation) {
    option (google.api.http) = { get: "/app/v1/posts/{id}/translation" };
  }
}
```

### Admin API vs App API

| Aspect | Admin API | App API |
|--------|-----------|---------|
| Route prefix | `/admin/v1/` | `/app/v1/` |
| Authentication | All endpoints require JWT except login | Browsing endpoints require no login |
| Number of endpoints | 40+ Services | 9 Services |
| Write operations | Full CRUD | Restricted (users may post and comment) |
| Translation management | TranslationExists / CreateTranslation / UpdateTranslation / DeleteTranslation | GetTranslation only (read by language) |

## 3. Admin API Endpoint List

### Content Management

| Service | Route | Description |
|---------|------|------|
| PostService | `/admin/v1/posts` | Post management + translation management |
| CategoryService | `/admin/v1/categories` | Category management (tree) + translation management |
| TagService | `/admin/v1/tags` | Tag management + translation management |
| CommentService | `/admin/v1/comments` | Comment management (moderation/delete/reply) |
| PageService | `/admin/v1/pages` | Page management + translation management |

### Site Management

| Service | Route | Description |
|---------|------|------|
| SiteService | `/admin/v1/sites` | Site management (multi-site configuration) |
| SiteSettingService | `/admin/v1/site-settings` | Site global settings |
| NavigationService | `/admin/v1/navigations` | Navigation bar management |
| NavigationItemService | `/admin/v1/navigation-items` | Navigation item management |

### Media Resources

| Service | Route | Description |
|---------|------|------|
| MediaAssetService | `/admin/v1/media-assets` | Media asset management (images/videos/documents) |
| FileService | `/admin/v1/files` | File record management |
| FileTransferService | `/admin/v1/files/*` | File upload and download (manually registered Handlers) |

### Organization, Permissions, and System Administration

Shares the same service system as GoWind Admin (UserService, RoleService, PermissionService, DictService, TaskService, etc.); see [Admin Backend API](/en/admin/backend-api.md) for details.

## 4. App API Endpoint List

| Service | Route | Description | Login-Free |
|---------|------|------|--------|
| AuthenticationService | `/app/v1/login` `/app/v1/logout` `/app/v1/refresh-token` | Frontend user authentication | Login is unauthenticated |
| PostService | `/app/v1/posts` | Post browsing/publishing + translation retrieval | List/Get are login-free |
| CategoryService | `/app/v1/categories` | Category browsing | List/Get are login-free |
| TagService | `/app/v1/tags` | Tag browsing | List/Get are login-free |
| CommentService | `/app/v1/comments` | Comment interaction | List/Get are login-free |
| PageService | `/app/v1/pages` | Page display | List/Get are login-free |
| NavigationService | `/app/v1/navigations` | Navigation retrieval | List is login-free |
| UserProfileService | `/app/v1/user-profile` | User profile | Login required |
| FileTransferService | `/app/v1/files/*` | File upload and download | Login required |

## 5. Content Domain Model

### Post

The post is the core content entity of the CMS, supporting rich content management features such as multilingual content, categories, tags, and password protection:

```protobuf
message Post {
  optional uint32 id = 1;
  optional string title = 2;          // Title
  optional string slug = 3;           // URL alias
  optional string content = 5;        // Content
  optional Post.Status status = 6;    // Status: draft/published/offline
  optional EditorType editor_type = 7;// Editor type
  repeated Section sections = 8;      // Content sections/blocks (rich-text builder)

  optional uint32 author_id = 20;     // Author ID
  optional string author_name = 21;   // Author name (guest)

  map<string, string> custom_fields = 30;    // Custom fields

  repeated PostTranslation translations = 40; // Multilingual translations
  repeated string available_languages = 41;   // Available language list

  repeated uint32 category_ids = 50;  // Associated categories
  repeated uint32 tag_ids = 51;       // Associated tags

  optional string password_hash = 60; // Password protection
}
```

### Post Status Enum

```protobuf
enum Status {
  POST_STATUS_DRAFT = 0;      // Draft
  POST_STATUS_PUBLISHED = 1;  // Published
  POST_STATUS_OFFLINE = 2;    // Offline
}
```

### Section (Content Block)

The Post supports **section-based content building**, similar to Notion / Gutenberg editors:

```protobuf
message Section {
  optional SectionType type = 1;  // Section type
  optional string name = 2;       // Section name
  optional uint32 sort_order = 3; // Sort order
  map<string, string> config = 4; // Section config
  map<string, string> content = 5;// Section content
}
```

Supported section types: rich text, Markdown, heading, image, gallery, video, button, divider, code, HTML, form, carousel, etc.

### Category

Categories support a **tree structure**, using a materialized path to optimize hierarchy queries:

```protobuf
message Category {
  optional string name = 4;        // Category name
  optional string slug = 5;        // URL alias
  optional string icon = 6;        // Icon
  optional string code = 7;        // Unique code

  optional uint32 parent_id = 60;  // Parent node ID
  repeated Category children = 61; // Child node tree
  optional int32 depth = 62;       // Depth level
  optional string path = 63;       // Materialized path (e.g. "1/5/23")

  repeated CategoryTranslation translations = 20; // Multilingual translations
}
```

## 6. Multilingual Translation Model

Content translation in the CMS adopts the **main table + translation table** design pattern, with a corresponding translation message for every content entity.

### Translation Message Structure

```protobuf
// Post translation
message PostTranslation {
  optional uint32 post_id = 2;        // Associated post ID
  optional string language_code = 3;  // Language code (e.g. zh-CN, en-US)

  optional string title = 10;         // Translated title
  optional string slug = 11;          // Language-specific slug
  optional string summary = 12;       // Translated summary
  optional string content = 13;       // Translated content
  optional string thumbnail = 15;     // Translated thumbnail
  optional string full_path = 17;     // Full path

  optional SeoMeta seo = 20;          // SEO metadata
}
```

### Translation API Design

The Admin API provides full translation CRUD:

```protobuf
// admin/service/v1/i_post.proto
service PostService {
  // Check whether a translation exists
  rpc TranslationExists(PostTranslationExistsRequest) returns (PostTranslationExistsResponse) {
    option (google.api.http) = {
      get: "/admin/v1/posts/{post_id}/translations/{language_code}"
    };
  }
}
```

The App API only provides translation reads:

```protobuf
// app/service/v1/i_post.proto
service PostService {
  // Frontends fetch translated content by language
  rpc GetTranslation(GetPostRequest) returns (PostTranslation) {
    option (google.api.http) = {
      get: "/app/v1/posts/{id}/translation"
    };
  }
}
```

### Translation Query Mechanism

When requesting content, the frontend specifies the language via the `locale` parameter:

```http
# Fetch the English translation of a post
GET /app/v1/posts/42?locale=en-US

# Fetch the Japanese translation of a category
GET /app/v1/categories/10?locale=ja-JP
```

Each content entity also maintains an `available_languages` field so frontends can quickly determine the available languages.

## 7. SEO Metadata

All content entities support the structured `SeoMeta` metadata:

```protobuf
message SeoMeta {
  optional string seo_title = 1;        // SEO title
  optional string meta_keywords = 2;    // SEO keywords
  optional string meta_description = 3; // SEO description

  optional string og_title = 4;         // Open Graph title
  optional string og_description = 5;   // Open Graph description
  optional string og_image = 6;         // Open Graph image

  optional string canonical_url = 33;   // Canonical URL
}
```

SEO metadata can be attached to translations, enabling **independent SEO configuration for each language version**.

## 8. Code Generation Configuration

### Buf Generation Config Files

| File | Description |
|------|------|
| `buf.gen.yaml` | Go server-side code generation |
| `buf.admin.openapi.gen.yaml` | Admin API OpenAPI documents |
| `buf.app.openapi.gen.yaml` | App API OpenAPI documents |
| `buf.admin.typescript.gen.yaml` | Admin console TypeScript code |
| `buf.react.app.typescript.gen.yaml` | React frontend TypeScript code |
| `buf.taro.app.typescript.gen.yaml` | Taro frontend TypeScript code |
| `buf.vue.app.typescript.gen.yaml` | Vue frontend TypeScript code |
| `buf.app.dart.gen.yaml` | Flutter frontend Dart code |

### Generation Commands

```shell
cd backend

make api       # Generate Go code
make openapi   # Generate OpenAPI documents (Admin + App)
make ts        # Generate TypeScript code (Admin + React + Taro + Vue)
make gen       # Generate everything at once (ent + wire + api + openapi)
```

## 9. Swagger UI

| API | Swagger URL |
|-----|-------------|
| Admin API | <http://localhost:6600/docs/> |
| App API | <http://localhost:6700/docs/> |

## 10. Related Documentation

- [CMS Backend Architecture Overview](./backend-architecture.md)
- [CMS Frontend Architecture](./frontend-architecture.md)
- [Content Multilingual Translation in Practice](./tutorial-content-i18n.md)
- [GoWind Admin API](/en/admin/backend-api.md) — shared service system
