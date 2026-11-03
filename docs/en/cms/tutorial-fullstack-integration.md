# Full-Stack Integration in Practice

Through a complete "news publishing system" case study, this tutorial walks you through the entire CMS full-stack development process: from requirements analysis, data modeling, and API definition, to backend implementation, admin console, and frontend display, tying together all the core knowledge points.

## Prerequisites

- You have read the following tutorials (in order):
  - [CMS Backend Architecture Overview](./backend-architecture.md)
  - [Adding a Content Type, Full Stack in Practice](./tutorial-new-content.md)
  - [Content Publishing Workflow in Practice](./tutorial-content-workflow.md)
  - [Content Multilingual Translation in Practice](./tutorial-content-i18n.md)

## 1. Requirements Analysis

### 1.1 News Publishing System Requirements

```mermaid
graph TB
    subgraph 内容管理
        News[新闻文章<br/>多语言]
        Category[新闻分类<br/>时政/财经/科技/体育]
        Tag[新闻标签]
        Author[记者/编辑]
    end

    subgraph 工作流
        Draft[记者撰稿]
        Review[编辑审核]
        Publish[主编发布]
        Featured[首页推荐/置顶]
    end

    subgraph 多端展示
        Web[Web 前台]
        Mobile[移动端]
        Search[搜索引擎]
    end
```

### 1.2 Feature List

| Feature | Description |
|------|------|
| News CRUD | Create, edit, delete, restore |
| Multi-level categories | Politics/Finance/Tech/Sports, with sub-categories |
| Tag system | Each news article can be associated with multiple tags |
| Review workflow | Draft → Pending review → Published / Rejected |
| Multilingual translation | Chinese/English/Japanese |
| Scheduled publishing | Automatic publishing at a specified time |
| Full-text search | Full-text search over title + content |
| Pinned and featured | Homepage headlines + category recommendations |
| View statistics | View count per article |
| Comment interaction | Reader comments + moderation |

## 2. Data Modeling

### 2.1 Entity Relationships

```mermaid
erDiagram
    News ||--o{ NewsTranslation : "多语言翻译"
    News }o--|| Category : "属于分类"
    News }o--o{ Tag : "关联标签"
    News ||--o{ Comment : "评论"
    News }o--|| User : "作者"

    News {
        uint32 id
        string slug
        Status status
        bool pinned
        bool featured
        Timestamp publish_at
        uint32 view_count
        uint32 category_id
        uint32 author_id
    }

    NewsTranslation {
        uint32 id
        uint32 news_id
        string language_code
        string title
        string summary
        string content
        SeoMeta seo
    }
```

### 2.2 Reusing the CMS Content Model

In fact, the CMS Post model already covers the news requirements, so it can be reused directly:

| News Requirement | CMS Implementation |
|---------|---------|
| News articles | Post |
| News categories | Category |
| News tags | Tag |
| Multilingual | PostTranslation |
| Review | Post state machine (DRAFT→PENDING_REVIEW→PUBLISHED) |
| Pinned | Post.pinned |
| Section editing | Section |
| View count | Post.viewCount |

## 3. Backend Implementation

### 3.1 Extending Post Fields

If you need the news-specific "featured" field:

```protobuf
// content/service/v1/post.proto
message Post {
  // ... 已有字段
  optional bool featured = 34 [json_name = "featured"];  // 新增：首页推荐
}
```

### 3.2 Ent Schema Update

```go
// app/core/service/internal/data/ent/schema/post.go
func (Post) Fields() []ent.Field {
    return []ent.Field{
        // ... 已有字段
        field.Bool("featured").Default(false),  // 新增推荐字段
    }
}
```

```shell
cd backend
make ent   # Regenerate the Ent code
```

### 3.3 News Query Service

```go
// app/core/service/internal/service/post_service.go

// GetFeaturedNews 获取首页推荐新闻
func (s *PostService) GetFeaturedNews(ctx context.Context, req *contentV1.GetFeaturedRequest) (*contentV1.ListPostResponse, error) {
    query := s.postRepo.Query().
        Where(
            post.StatusEQ(int(contentV1.Post_POST_STATUS_PUBLISHED)),
            post.FeaturedEQ(true),
        ).
        Order(ent.Desc("publish_at"))

    if locale := req.GetLocale(); locale != "" {
        query = query.WithTranslations()
    }

    items, err := query.Limit(int(req.GetLimit())).All(ctx)
    if err != nil {
        return nil, err
    }

    return &contentV1.ListPostResponse{Items: convertPosts(items, req.GetLocale())}, nil
}
```

### 3.4 Frontend Whitelist

```go
// app/app/service/internal/server/rest_server.go
rpc.AddWhiteList(
    // ... 已有白名单
    appV1.OperationPostServiceGetFeatured,  // 推荐新闻免登录
)
```

## 4. Admin Console

### 4.1 News Editing Page

```vue
<!-- views/content/post/form.vue -->
<script setup lang="ts">
const formData = reactive({
  title: '',
  categoryId: null,
  tagIds: [],
  status: 0,
  pinned: false,
  featured: false,      // 新增推荐开关
  publishAt: null,
  sections: [],         // 区块编辑器
});

const canPublish = computed(() => formData.status === 0 || formData.status === 3);

const handleSave = async () => {
  // 根据状态选择保存方式
  if (formData.status === 0) {
    await saveDraft();
  }
};
</script>

<template>
  <Page title="编辑新闻">
    <!-- 基本信息 -->
    <Form :model="formData" layout="vertical">
      <FormItem label="标题（中文）">
        <Input v-model:value="formData.title" />
      </FormItem>

      <Row :gutter="16">
        <Col :span="8">
          <FormItem label="分类">
            <TreeSelect v-model:value="formData.categoryId" :tree-data="categories" />
          </FormItem>
        </Col>
        <Col :span="8">
          <FormItem label="标签">
            <Select v-model:value="formData.tagIds" mode="multiple">
              <SelectOption v-for="t in tags" :key="t.id" :value="t.id">{{ t.name }}</SelectOption>
            </Select>
          </FormItem>
        </Col>
        <Col :span="8">
          <FormItem label="定时发布">
            <DatePicker v-model:value="formData.publishAt" show-time />
          </FormItem>
        </Col>
      </Row>

      <Row :gutter="16">
        <Col :span="6">
          <FormItem label="置顶">
            <Switch v-model:checked="formData.pinned" />
          </FormItem>
        </Col>
        <Col :span="6">
          <FormItem label="首页推荐">
            <Switch v-model:checked="formData.featured" />
          </FormItem>
        </Col>
      </Row>
    </Form>

    <!-- 区块编辑器 -->
    <SectionEditor v-model="formData.sections" />

    <!-- 多语言翻译 -->
    <TranslationTabs :post-id="editId" />

    <!-- 操作按钮 -->
    <Space class="mt-4">
      <Button type="primary" @click="saveDraft">保存草稿</Button>
      <Button @click="submitReview" v-if="formData.status === 0">提交审核</Button>
      <Button type="primary" @click="publish" v-if="canPublish">发布</Button>
    </Space>
  </Page>
</template>
```

### 4.2 News List

```vue
<!-- views/content/post/index.vue -->
<template>
  <Page title="新闻管理">
    <Tabs v-model:activeKey="filterStatus">
      <TabPane key="" tab="全部" />
      <TabPane key="0" tab="草稿" />
      <TabPane key="3" tab="待审核" />
      <TabPane key="1" tab="已发布" />
      <TabPane key="2" tab="已下架" />
    </Tabs>

    <Table :data="data?.items" :loading="isLoading">
      <TableColumn title="标题" data-index="title" />
      <TableColumn title="分类" data-index="category.name" />
      <TableColumn title="状态">
        <template #default="{ record }">
          <Tag :color="statusColors[record.status]">{{ statusLabels[record.status] }}</Tag>
        </template>
      </TableColumn>
      <TableColumn title="浏览" data-index="viewCount" />
      <TableColumn title="推荐">
        <template #default="{ record }">
          <Tag v-if="record.featured" color="gold">推荐</Tag>
          <Tag v-if="record.pinned" color="red">置顶</Tag>
        </template>
      </TableColumn>
      <TableColumn title="操作">
        <template #default="{ record }">
          <Button size="small" @click="goEdit(record.id)">编辑</Button>
          <Button v-if="record.status === 3" type="primary" size="small" @click="approve(record.id)">通过</Button>
        </template>
      </TableColumn>
    </Table>
  </Page>
</template>
```

## 5. Frontend Display

### 5.1 Home Page (Featured + Latest)

```tsx
// src/app/[locale]/page.tsx
export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const [featured, latest, categories] = await Promise.all([
    getPosts({ locale, featured: true, pageSize: 5 }),
    getPosts({ locale, page: 1, pageSize: 10 }),
    getCategories(locale),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 头条新闻 */}
      {featured.items[0] && (
        <section className="mb-12">
          <FeaturedNewsCard post={featured.items[0]} locale={locale} />
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 最新新闻 */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">最新新闻</h2>
          <div className="space-y-6">
            {latest.items.map((post) => (
              <NewsCard key={post.id} post={post} locale={locale} />
            ))}
          </div>
          <Pagination current={1} total={latest.total} pageSize={10} />
        </div>

        {/* 侧边栏 */}
        <aside className="space-y-6">
          <CategoryWidget categories={categories.items} />
          <PopularTagsWidget />
          <PopularNewsWidget />
        </aside>
      </div>
    </div>
  );
}
```

### 5.2 News Detail Page

```tsx
// src/app/[locale]/news/[slug]/page.tsx
export default async function NewsDetail({ params: { locale, slug } }) {
  const post = await getPostBySlug(slug, locale);

  // 增加浏览量
  trackView(post.id);

  return (
    <article className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="text-sm mb-4">
        <Link href={`/${locale}`}>首页</Link> &gt;
        <Link href={`/${locale}/categories/${post.category.slug}`}>{post.category.name}</Link>
      </nav>

      {/* 文章头 */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
        <div className="flex items-center gap-4 text-gray-500">
          <span>记者：{post.author.name}</span>
          <time>{formatDate(post.publishAt, locale)}</time>
          <span>浏览：{post.viewCount}</span>
        </div>
      </header>

      {/* 区块内容 */}
      <SectionRenderer sections={post.sections} />

      {/* 标签 */}
      <div className="flex gap-2 mt-8">
        {post.tags.map((tag) => (
          <Link key={tag.slug} href={`/${locale}/tags/${tag.slug}`}>
            #{tag.name}
          </Link>
        ))}
      </div>

      {/* 评论区 */}
      <CommentSection postId={post.id} />

      {/* 相关新闻 */}
      <RelatedNews categoryId={post.category.id} excludeId={post.id} locale={locale} />
    </article>
  );
}
```

### 5.3 Language Switching

```tsx
// 语言切换自动获取对应翻译
function LanguageSwitcher({ currentLocale, slug }: { currentLocale: string; slug: string }) {
  return (
    <select
      value={currentLocale}
      onChange={(e) => router.push(`/${e.target.value}/news/${slug}`)}
    >
      <option value="zh-CN">中文</option>
      <option value="en-US">English</option>
      <option value="ja-JP">日本語</option>
    </select>
  );
}
```

## 6. SEO Optimization

### 6.1 Metadata

```tsx
export async function generateMetadata({ params: { locale, slug } }) {
  const post = await getPostBySlug(slug, locale);

  return {
    title: post.title,
    description: post.summary,
    alternates: {
      canonical: `/${locale}/news/${slug}`,
      languages: {
        'zh-CN': `/zh-CN/news/${slug}`,
        'en-US': `/en-US/news/${slug}`,
        'ja-JP': `/ja-JP/news/${slug}`,
      },
    },
    openGraph: {
      type: 'article',
      title: post.title,
      images: post.thumbnail ? [post.thumbnail] : [],
    },
  };
}

// ISR 增量静态再生
export const revalidate = 60;
```

### 6.2 Structured Data

```tsx
<JsonLd data={{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  headline: post.title,
  datePublished: post.publishAt,
  author: { "@type": "Person", name: post.author.name },
  publisher: { "@type": "Organization", name: siteName },
}} />
```

## 7. Event Integration

### 7.1 News Publishing Event Chain

```mermaid
sequenceDiagram
    participant Editor as 编辑
    participant Admin as Admin API
    participant Core as Core Service
    participant EB as EventBus
    participant Sub as 订阅者

    Editor->>Admin: 发布新闻
    Admin->>Core: Publish
    Core->>Core: 状态 → PUBLISHED
    Core->>EB: post.published

    par 并行处理
        EB->>Sub: 索引同步 → OpenSearch
    and
        EB->>Sub: 浏览量初始化
    and
        EB->>Sub: 缓存清除
    and
        EB->>Sub: 订阅者通知推送
    end
```

### 7.2 Lua Automation

```lua
-- 新闻发布后自动推送到社交媒体
eventbus.subscribe("post.published", function(event)
    if event.CategorySlug ~= "news" then return end

    -- 生成短链接
    local url = "https://news.example.com/posts/" .. event.PostId

    -- 推送微博
    http.post("https://api.weibo.com/2/statuses/update.json", {
        headers = { ["Authorization"] = "Bearer weibo-token" },
        body = json.encode({ status = event.Title .. " " .. url })
    })
end)
```

## 8. Checklist

| Check Item | Description |
|--------|------|
| Data modeling | Reuse the Post model + extension fields |
| Backend API | Featured news endpoint + frontend whitelist |
| Admin console | Edit page (sections + translations + workflow) + list page |
| Frontend display | Home + detail + categories + tags |
| Multilingual | Chinese/English/Japanese switching |
| SEO | Metadata + structured data + ISR |
| Event integration | Publish event + Lua automation |
| Search | OpenSearch full-text search |
| Comments | Comment moderation + interaction |
| Cache | Redis hot-spot caching |

## Related Documents

- [Adding a Content Type, Full Stack in Practice](./tutorial-new-content.md)
- [Content Publishing Workflow in Practice](./tutorial-content-workflow.md)
- [Content Multilingual Translation in Practice](./tutorial-content-i18n.md)
- [Section Editor in Practice](./tutorial-section-editor.md)
- [Frontend Application Development in Practice](./tutorial-frontend-app.md)
