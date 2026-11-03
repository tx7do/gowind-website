# Multi-Site Management in Practice

GoWind CMS supports multi-site management: a single system can manage multiple independent sites (such as brand websites, blogs, and documentation sites) at the same time, and each site has its own domain, theme, navigation, SEO configuration, and content. This tutorial explains the design and implementation of the multi-site architecture.

## Prerequisites

- You have read [CMS Backend Architecture Overview](./backend-architecture.md)
- Understand the CMS content management model (Post / Category / Page)

## 1. Multi-Site Architecture

### 1.1 What Is Multi-Site

```mermaid
graph TB
    subgraph GoWind CMS 单实例
        Core[Core Service]
        DB[(共享数据库)]
    end

    subgraph 站点 A - 企业官网
        SiteA[www.brand-a.com]
        SiteANav[导航：首页/产品/案例/关于]
        SiteATheme[蓝色主题]
    end

    subgraph 站点 B - 技术博客
        SiteB[blog.brand-a.com]
        SiteBNav[导航：文章/分类/标签/关于]
        SiteBTheme[暗色主题]
    end

    subgraph 站点 C - 文档中心
        SiteC[docs.brand-a.com]
        SiteCNav[导航：文档/API/指南]
        SiteCTheme[简约主题]
    end

    SiteA --> Core
    SiteB --> Core
    SiteC --> Core
    Core --> DB
```

### 1.2 Multi-Site vs. Multi-Tenancy

| Comparison | Multi-Tenancy | Multi-Site |
|--------|--------|--------|
| Isolation level | Fully isolated data | Shared data, independent site presentation |
| User system | Independent users per tenant | One shared user system |
| Purpose | SaaS serving multiple customers | One organization managing multiple sites |
| Content sharing | Not shared | Selectively shareable |

### 1.3 Site Data Model

| Entity | Description |
|------|------|
| **Site** | Site basic information (domain, title, logo, theme) |
| **SiteSetting** | Site-wide parameters (SEO, upload, cache) |
| **Navigation** | Site navigation bars and navigation items |
| **Post / Page / Category** | Content can be associated with a specific site |

## 2. Site Management

### 2.1 Protobuf Definition

```protobuf
// site/service/v1/site.proto

message Site {
  optional uint32 id = 1;
  optional string name = 2 [json_name = "name"];
  optional string domain = 3 [json_name = "domain"];        // 站点域名
  optional string title = 4 [json_name = "title"];          // 站点标题
  optional string description = 5 [json_name = "description"];
  optional string logo = 6 [json_name = "logo"];            // Logo URL
  optional string favicon = 7 [json_name = "favicon"];
  optional string theme = 8 [json_name = "theme"];           // 主题标识
  optional Status status = 9;
  enum Status {
    SITE_STATUS_ACTIVE = 0;
    SITE_STATUS_INACTIVE = 1;
  }
  optional google.protobuf.Timestamp created_at = 100;
  optional google.protobuf.Timestamp updated_at = 101;
}
```

### 2.2 Admin API Endpoints

```protobuf
// admin/service/v1/i_site.proto
service SiteService {
  rpc List(pagination.PagingRequest) returns (ListSiteResponse) {
    option (google.api.http) = { get: "/admin/v1/sites" };
  }
  rpc Get(GetSiteRequest) returns (Site) {
    option (google.api.http) = { get: "/admin/v1/sites/{id}" };
  }
  rpc Create(CreateSiteRequest) returns (Site) {
    option (google.api.http) = { post: "/admin/v1/sites" body: "*" };
  }
  rpc Update(UpdateSiteRequest) returns (Site) {
    option (google.api.http) = { put: "/admin/v1/sites/{id}" body: "*" };
  }
  rpc Delete(DeleteSiteRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = { delete: "/admin/v1/sites/{id}" };
  }
}
```

### 2.3 Creating a Site

```http
POST /admin/v1/sites
Authorization: Bearer {admin_token}

{
  "name": "技术博客",
  "domain": "blog.example.com",
  "title": "Tech Blog - 技术分享",
  "description": "分享前沿技术、开发经验和行业洞察",
  "logo": "https://oss.example.com/logos/blog-logo.png",
  "favicon": "https://oss.example.com/logos/blog-favicon.ico",
  "theme": "dark",
  "status": "SITE_STATUS_ACTIVE"
}
```

### 2.4 Site Association

When creating content, the associated site can be specified:

```http
POST /admin/v1/posts
{
  "title": "GoWind 架构解析",
  "siteId": 2,
  "categoryId": 5,
  ...
}
```

Frontend requests automatically match the site via the domain or the `siteId` parameter:

```http
# 通过域名自动匹配（推荐）
GET /app/v1/posts
Host: blog.example.com

# 或通过参数指定
GET /app/v1/posts?siteId=2
```

## 3. Site Settings

### 3.1 Site Settings Model

```protobuf
// site/service/v1/site_setting.proto
message SiteSetting {
  optional uint32 id = 1;
  optional uint32 site_id = 2 [json_name = "siteId"];

  // SEO 配置
  optional string seo_title = 10 [json_name = "seoTitle"];
  optional string seo_description = 11 [json_name = "seoDescription"];
  optional string seo_keywords = 12 [json_name = "seoKeywords"];

  // 上传限制
  optional uint32 max_upload_size = 20 [json_name = "maxUploadSize"];
  optional string allowed_file_types = 21 [json_name = "allowedFileTypes"];

  // 缓存策略
  optional bool cache_enabled = 30 [json_name = "cacheEnabled"];
  optional uint32 cache_ttl = 31 [json_name = "cacheTtl"];

  // 社交链接
  optional string social_github = 40 [json_name = "socialGithub"];
  optional string social_twitter = 41 [json_name = "socialTwitter"];
  optional string social_linkedin = 42 [json_name = "socialLinkedin"];
}
```

### 3.2 Admin Console Settings Page

```vue
<!-- views/site/setting.vue -->
<script setup lang="ts">
import { useGetSiteSettings, useUpdateSiteSettings } from '#/api/composables/site';

const props = defineProps<{ siteId: number }>();
const { data: settings } = useGetSiteSettings(props.siteId);
const updateMutation = useUpdateSiteSettings();

const formData = reactive({
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
  maxUploadSize: 10,
  allowedFileTypes: 'jpg,png,gif,pdf',
  cacheEnabled: true,
  cacheTtl: 600,
});

watchEffect(() => {
  if (settings.value) Object.assign(formData, settings.value);
});

const handleSave = () => {
  updateMutation.mutate({ id: props.siteId, data: formData });
};
</script>

<template>
  <Page title="站点配置">
    <Tabs>
      <TabPane key="seo" tab="SEO 配置">
        <Form :model="formData" layout="vertical">
          <FormItem label="SEO 标题">
            <Input v-model:value="formData.seoTitle" />
          </FormItem>
          <FormItem label="SEO 描述">
            <Textarea v-model:value="formData.seoDescription" :rows="3" />
          </FormItem>
          <FormItem label="SEO 关键词">
            <Input v-model:value="formData.seoKeywords" placeholder="逗号分隔" />
          </FormItem>
        </Form>
      </TabPane>
      <TabPane key="upload" tab="上传限制">
        <Form :model="formData" layout="vertical">
          <FormItem label="最大上传大小（MB）">
            <InputNumber v-model:value="formData.maxUploadSize" :min="1" :max="100" />
          </FormItem>
          <FormItem label="允许的文件类型">
            <Input v-model:value="formData.allowedFileTypes" />
          </FormItem>
        </Form>
      </TabPane>
      <TabPane key="cache" tab="缓存策略">
        <Form :model="formData" layout="vertical">
          <FormItem label="启用缓存">
            <Switch v-model:checked="formData.cacheEnabled" />
          </FormItem>
          <FormItem label="缓存时间（秒）">
            <InputNumber v-model:value="formData.cacheTtl" :min="60" :max="3600" />
          </FormItem>
        </Form>
      </TabPane>
    </Tabs>
    <Button type="primary" @click="handleSave">保存</Button>
  </Page>
</template>
```

## 4. Navigation Management

### 4.1 Navigation Data Model

```protobuf
// site/service/v1/navigation.proto

message Navigation {
  optional uint32 id = 1;
  optional uint32 site_id = 2 [json_name = "siteId"];
  optional string name = 3;           // 导航栏名称
  optional NavigationType type = 4;   // 类型
  enum NavigationType {
    NAVIGATION_TYPE_HEADER = 0;  // 顶部导航
    NAVIGATION_TYPE_FOOTER = 1;  // 页脚导航
    NAVIGATION_TYPE_SIDEBAR = 2; // 侧边导航
  }
  repeated NavigationItem items = 10 [json_name = "items"];
}

message NavigationItem {
  optional uint32 id = 1;
  optional string title = 2;     // 显示文字
  optional string url = 3;       // 链接地址
  optional string icon = 4;      // 图标
  optional uint32 parent_id = 5 [json_name = "parentId"];  // 父导航项（多级）
  optional uint32 sort = 6;      // 排序
  optional string target = 7;    // 打开方式（_self/_blank）
}
```

### 4.2 Multi-Level Navigation Example

```json
{
  "id": 1,
  "siteId": 2,
  "name": "主导航",
  "type": "NAVIGATION_TYPE_HEADER",
  "items": [
    {
      "id": 1,
      "title": "首页",
      "url": "/",
      "sort": 1
    },
    {
      "id": 2,
      "title": "技术文章",
      "url": "/posts",
      "sort": 2,
      "items": [
        { "parentId": 2, "title": "前端开发", "url": "/categories/frontend", "sort": 1 },
        { "parentId": 2, "title": "后端开发", "url": "/categories/backend", "sort": 2 },
        { "parentId": 2, "title": "DevOps", "url": "/categories/devops", "sort": 3 }
      ]
    },
    {
      "id": 3,
      "title": "关于我们",
      "url": "/about",
      "sort": 3
    }
  ]
}
```

### 4.3 Frontend Navigation Rendering

```tsx
// React 前台导航组件
// src/components/layout/Header.tsx
async function Header({ siteId }: { siteId: number }) {
  const navigations = await getNavigations(siteId);
  const headerNav = navigations.items.find(
    (n) => n.type === 'NAVIGATION_TYPE_HEADER',
  );

  return (
    <header className="border-b">
      <div className="container mx-auto flex items-center justify-between py-4">
        <nav className="flex gap-6">
          {headerNav?.items.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </nav>
      </div>
    </header>
  );
}

function NavItem({ item }: { item: NavigationItem }) {
  const hasChildren = item.items && item.items.length > 0;

  if (hasChildren) {
    return (
      <div className="relative group">
        <Link href={item.url}>{item.title}</Link>
        <div className="absolute hidden group-hover:block">
          {item.items!.map((child) => (
            <Link key={child.id} href={child.url}>
              {child.title}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return <Link href={item.url}>{item.title}</Link>;
}
```

## 5. Domain Routing

### 5.1 Domain-Based Site Matching

The App Service automatically identifies the site based on the request's `Host` header:

```go
// app/app/service/internal/server/rest_server.go
func SiteMiddleware(sites map[string]uint32) middleware.Middleware {
    return func(handler middleware.Handler) middleware.Handler {
        return func(ctx context.Context, req interface{}) (interface{}, error) {
            if httpCtx, ok := http.FromServerContext(ctx); ok {
                host := httpCtx.Request.Host
                // 去掉端口号
                if idx := strings.LastIndex(host, ":"); idx > 0 {
                    host = host[:idx]
                }
                if siteId, exists := sites[host]; exists {
                    // 注入 siteId 到 context
                    ctx = context.WithValue(ctx, SiteIDKey{}, siteId)
                }
            }
            return handler(ctx, req)
        }
    }
}
```

### 5.2 Frontend Multi-Site Nginx Configuration

```nginx
# nginx.conf
# 站点 A：企业官网
server {
    listen 80;
    server_name www.example.com;
    location / {
        proxy_pass http://localhost:3000;  # React 前台
    }
    location /api/ {
        proxy_pass http://localhost:6700/app/v1/;  # App API
    }
}

# 站点 B：技术博客
server {
    listen 80;
    server_name blog.example.com;
    location / {
        proxy_pass http://localhost:3001;  # Vue 前台
    }
    location /api/ {
        proxy_pass http://localhost:6700/app/v1/;
    }
}
```

## 6. Associating Content with Sites

### 6.1 Ent Schema Association

```go
// app/core/service/internal/data/ent/schema/post.go
func (Post) Edges() []ent.Edge {
    return []ent.Edge{
        edge.From("site", Site.Type).Ref("posts").Unique(),  // 帖子关联站点
        // ... 其他关系
    }
}

// app/core/service/internal/data/ent/schema/site.go
func (Site) Edges() []ent.Edge {
    return []ent.Edge{
        edge.To("posts", Post.Type),           // 站点的帖子
        edge.To("pages", Page.Type),           // 站点的页面
        edge.To("navigations", Navigation.Type), // 站点的导航
        edge.To("settings", SiteSetting.Type),   // 站点配置
    }
}
```

### 6.2 Per-Site Queries on the Frontend

```http
# 前台 API 自动根据域名注入站点过滤
GET /app/v1/posts
Host: blog.example.com
# → 等价于 WHERE site_id = 2
```

```go
// app/core/service/internal/data/post_repo.go
func (r *PostRepo) List(ctx context.Context, req *paginationV1.PagingRequest) (*contentV1.ListPostResponse, error) {
    query := r.data.db.Post.Query()

    // 从 context 获取站点 ID
    if siteId, ok := ctx.Value(SiteIDKey{}).(uint32); ok {
        query = query.Where(post.HasSiteWith(site.IDEQ(siteId)))
    }

    // ... 分页、排序
}
```

## 7. Theme Management

### 7.1 Site Theme Configuration

Each site can independently configure its display theme:

| Theme ID | Style | Use Case |
|---------|------|---------|
| `light` | Bright and clean | Corporate websites |
| `dark` | Dark and geeky | Tech blogs |
| `minimal` | Minimalist text-only | Documentation sites |
| `magazine` | Magazine layout | News portals |

### 7.2 Frontend Theme Switching

```tsx
// React 前台根据站点主题加载样式
async function RootLayout({ children }: { children: React.ReactNode }) {
  const siteSettings = await getSiteSettings();
  const theme = siteSettings.theme || 'light';

  return (
    <html data-theme={theme}>
      <body className={themeClasses[theme]}>
        {children}
      </body>
    </html>
  );
}
```

## 8. Best Practices

### 8.1 Multi-Site Content Strategy

```mermaid
graph LR
    subgraph 共享内容
        Tags[标签库]
        Users[用户体系]
        Media[媒体资源]
    end

    subgraph 站点独立内容
        SiteA[站点 A 帖子]
        SiteB[站点 B 帖子]
        SiteC[站点 C 文档]
    end

    subgraph 站点独立配置
        NavA[站点 A 导航]
        NavB[站点 B 导航]
        ThemeA[站点 A 主题]
        ThemeB[站点 B 主题]
    end

    Tags --> SiteA
    Tags --> SiteB
    Users --> SiteA
    Users --> SiteB
    Media --> SiteA
    Media --> SiteB
```

### 8.2 SEO Best Practices

| Setting | Recommendation |
|--------|------|
| Independent domains | Use an independent domain or subdomain for each site |
| Independent sitemaps | Generate a separate sitemap.xml for each site |
| canonical | Set canonical URLs correctly to avoid duplicate content |
| robots.txt | Configure crawler policies per site |

## 9. Checklist

| Check Item | Description |
|--------|------|
| Site creation | Site entity + basic information |
| Site settings | SiteSetting (SEO/upload/cache) |
| Navigation management | Navigation + NavigationItem |
| Domain routing | Automatic site matching via the Host header |
| Content association | Post/Page associated with Site |
| Frontend adaptation | Load theme and navigation per site |
| Nginx configuration | Multi-domain reverse proxy |
| SEO configuration | Independent sitemap + robots |

## Related Documents

- [CMS Backend Architecture Overview](./backend-architecture.md)
- [CMS Protobuf API Definitions](./backend-api.md)
- [Frontend Application Development in Practice](./tutorial-frontend-app.md)
- [Headless API Multi-Client Integration in Practice](./tutorial-headless-api.md)
- [GoWind Admin Multi-Tenancy Architecture in Practice](/en/admin/tutorial-multi-tenancy.md)
