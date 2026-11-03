# Full-Text Search in Practice

GoWind CMS integrates the OpenSearch search engine to provide the content platform with high-performance full-text search capabilities. This tutorial explains the search architecture design, index management, the search API, and the implementation of frontend search features.

## Prerequisites

- You have read [CMS Backend Architecture Overview](./backend-architecture.md)
- The OpenSearch service is running locally (default port 9200)

## 1. Search Architecture

### 1.1 Why Full-Text Search Is Needed

| Scenario | Database LIKE Query | OpenSearch Full-Text Search |
|------|-----------------|-------------------|
| Keyword search | Slow (full table scan) | Fast (inverted index) |
| Chinese tokenization | Not supported | Supported (IK analyzer) |
| Relevance ranking | Not supported | TF-IDF / BM25 |
| Fuzzy matching | Only LIKE %keyword% | Spelling correction supported |
| Highlighting | Not supported | Search result highlighting supported |
| Aggregation statistics | Slow | Fast (Aggregation) |

### 1.2 Search Architecture

```mermaid
graph LR
    Admin[管理后台] -->|创建/更新/删除内容| Core[Core Service]
    Core -->|写入| DB[(PostgreSQL)]
    Core -->|同步索引| ES[(OpenSearch)]

    App[App API] -->|搜索请求| Core
    Core -->|查询| ES
    ES -->|搜索结果| Core
    Core -->|返回| App
```

### 1.3 Index Design

| Index | Document Type | Description |
|------|---------|------|
| `cms_posts` | Post | Post full-text index |
| `cms_pages` | Page | Page index |
| `cms_categories` | Category | Category index |
| `cms_tags` | Tag | Tag index |

## 2. Index Mappings

### 2.1 Post Index Mapping

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "integer" },
      "title": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      },
      "summary": {
        "type": "text",
        "analyzer": "ik_max_word"
      },
      "content": {
        "type": "text",
        "analyzer": "ik_max_word"
      },
      "slug": { "type": "keyword" },
      "status": { "type": "integer" },
      "categories": {
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "keyword" }
        }
      },
      "tags": {
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "keyword" }
        }
      },
      "author": { "type": "keyword" },
      "language_code": { "type": "keyword" },
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" }
    }
  },
  "settings": {
    "analysis": {
      "analyzer": {
        "ik_max_word": { "type": "ik_max_word" },
        "ik_smart": { "type": "ik_smart" }
      }
    }
  }
}
```

### 2.2 Chinese Tokenization Configuration

OpenSearch requires the IK Analysis plugin for Chinese tokenization:

```shell
# 安装 IK 分词器插件
./bin/opensearch-plugin install https://github.com/medcl/elasticsearch-analysis-ik/releases/download/v2.12.0/elasticsearch-analysis-ik-2.12.0.zip

# 重启 OpenSearch
docker-compose restart opensearch
```

## 3. Index Synchronization

### 3.1 Real-Time Synchronization

Content changes are automatically synchronized to OpenSearch:

```go
// app/core/service/internal/service/post_service.go
func (s *PostService) Create(ctx context.Context, req *contentV1.CreatePostRequest) (*contentV1.Post, error) {
    // 1. 写入数据库
    post, err := s.postRepo.Create(ctx, req)
    if err != nil {
        return nil, err
    }

    // 2. 同步到 OpenSearch（异步任务）
    s.task.Enqueue(ctx, task.TypeIndexPost, &task.IndexPostPayload{
        PostId: post.Id,
        Action: "create",
    })

    return post, nil
}

func (s *PostService) Update(ctx context.Context, req *contentV1.UpdatePostRequest) (*contentV1.Post, error) {
    post, err := s.postRepo.Update(ctx, req)
    if err != nil {
        return nil, err
    }

    // 同步更新索引
    s.task.Enqueue(ctx, task.TypeIndexPost, &task.IndexPostPayload{
        PostId: post.Id,
        Action: "update",
    })

    return post, nil
}

func (s *PostService) Delete(ctx context.Context, req *contentV1.DeletePostRequest) (*emptypb.Empty, error) {
    if err := s.postRepo.Delete(ctx, req); err != nil {
        return nil, err
    }

    // 删除索引
    s.task.Enqueue(ctx, task.TypeIndexPost, &task.IndexPostPayload{
        PostId: req.GetId(),
        Action: "delete",
    })

    return &emptypb.Empty{}, nil
}
```

### 3.2 Index Task Handler

```go
// app/core/service/internal/server/asynq_server.go
func HandleIndexPost(ctx context.Context, t *asynq.Task) error {
    var payload task.IndexPostPayload
    if err := json.Unmarshal(t.Payload(), &payload); err != nil {
        return err
    }

    switch payload.Action {
    case "create", "update":
        // 从数据库获取最新数据
        post, err := postRepo.Get(ctx, payload.PostId)
        if err != nil {
            return err
        }
        // 索引到 OpenSearch
        return searchClient.Index(ctx, "cms_posts", post)

    case "delete":
        // 从 OpenSearch 删除
        return searchClient.Delete(ctx, "cms_posts", fmt.Sprint(payload.PostId))
    }

    return nil
}
```

### 3.3 Full Index Rebuild

```go
func (s *PostService) RebuildIndex(ctx context.Context) error {
    // 1. 删除旧索引
    s.searchClient.DeleteIndex(ctx, "cms_posts")

    // 2. 创建新索引
    s.searchClient.CreateIndex(ctx, "cms_posts", postMapping)

    // 3. 分批导入数据
    pageSize := 100
    page := 1
    for {
        posts, err := s.postRepo.List(ctx, &pagination.PagingRequest{
            Page: uint32(page), PageSize: uint32(pageSize),
        })
        if err != nil {
            return err
        }

        // 批量索引
        s.searchClient.BulkIndex(ctx, "cms_posts", posts.Items)

        if len(posts.Items) < pageSize {
            break
        }
        page++
    }

    return nil
}
```

## 4. Search API

### 4.1 App API Search Endpoint

Frontend search is implemented through the `search` parameter of the Post List endpoint:

```http
GET /app/v1/posts?search=GoWind&locale=zh-CN&page=1&pageSize=10
```

### 4.2 Advanced Search Endpoint

A custom search endpoint can be added:

```protobuf
// app/service/v1/i_search.proto
service SearchService {
  rpc Search(SearchRequest) returns (SearchResponse) {
    option (google.api.http) = { get: "/app/v1/search" };
  }
}

message SearchRequest {
  string query = 1;                          // 搜索关键词
  optional string locale = 2;                // 语言
  optional uint32 category_id = 3;           // 分类过滤
  repeated string tag_names = 4;             // 标签过滤
  optional int32 page = 10;
  optional int32 page_size = 11;
  optional string sort_by = 12;              // 排序：relevance / date
}

message SearchResponse {
  repeated SearchHit hits = 1;
  uint64 total = 2;
  optional uint64 took_ms = 3;               // 耗时（毫秒）
}

message SearchHit {
  string type = 1;                           // 结果类型：post / page
  uint32 id = 2;
  string title = 3;
  string summary = 4;
  string url = 5;
  optional string highlight = 6;             // 高亮片段
  optional float score = 7;                  // 相关度分数
}
```

### 4.3 Search Query Implementation

```go
// app/core/service/internal/service/search_service.go
func (s *SearchService) Search(ctx context.Context, req *searchV1.SearchRequest) (*searchV1.SearchResponse, error) {
    query := opensearch.NewBoolQuery()

    // 全文搜索
    if req.GetQuery() != "" {
        multiMatch := opensearch.NewMultiMatchQuery(req.GetQuery()).
            Field("title", 3).      // 标题权重 3
            Field("summary", 2).    // 摘要权重 2
            Field("content", 1).    // 正文权重 1
            Type("best_fields").
            Analyzer("ik_smart")
        query.Must(multiMatch)
    }

    // 语言过滤
    if locale := req.GetLocale(); locale != "" {
        query.Filter(opensearch.NewTermQuery("language_code", locale))
    }

    // 分类过滤
    if categoryId := req.GetCategoryId(); categoryId > 0 {
        query.Filter(opensearch.NewTermQuery("categories.id", categoryId))
    }

    // 标签过滤
    for _, tagName := range req.GetTagNames() {
        query.Filter(opensearch.NewTermQuery("tags.name", tagName))
    }

    // 只搜索已发布内容
    query.Filter(opensearch.NewTermQuery("status", 1))

    // 构建搜索请求
    searchSource := opensearch.NewSearchSource().
        Query(query).
        From(int((req.GetPage() - 1) * req.GetPageSize())).
        Size(int(req.GetPageSize())).
        Highlight(opensearch.NewHighlight().
            Field("title").
            Field("summary").
            PreTags("<em>").
            PostTags("</em>"))

    // 排序
    if req.GetSortBy() == "date" {
        searchSource.Sort("created_at", false)
    } else {
        searchSource.Sort("_score", false)
    }

    // 执行搜索
    result, err := s.searchClient.Search(ctx, "cms_posts", searchSource)
    if err != nil {
        return nil, err
    }

    // 构建响应
    hits := make([]*searchV1.SearchHit, len(result.Hits))
    for i, hit := range result.Hits {
        hits[i] = &searchV1.SearchHit{
            Type:      "post",
            Id:        hit.Source.Id,
            Title:     hit.Source.Title,
            Summary:   hit.Source.Summary,
            Url:       fmt.Sprintf("/posts/%s", hit.Source.Slug),
            Highlight: hit.Highlight["title"],
            Score:     hit.Score,
        }
    }

    return &searchV1.SearchResponse{
        Hits:   hits,
        Total:  result.Total,
        TookMs: result.Took,
    }, nil
}
```

## 5. Frontend Search

### 5.1 React Search Component

```tsx
// src/components/search/SearchBar.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function SearchBar({ locale }: { locale: string }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout>();

  // 防抖搜索建议
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&locale=${locale}&pageSize=5`);
      const data = await res.json();
      setSuggestions(data.hits || []);
      setIsOpen(true);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, locale]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/${locale}/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索文章..."
          className="w-full px-4 py-2 border rounded"
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
      </form>

      {/* 搜索建议下拉 */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50">
          {suggestions.map((hit) => (
            <a
              key={hit.id}
              href={hit.url}
              className="block px-4 py-2 hover:bg-gray-100"
            >
              <div dangerouslySetInnerHTML={{ __html: hit.highlight || hit.title }} />
              <p className="text-sm text-gray-500">{hit.summary}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 5.2 Search Results Page

```tsx
// src/app/[locale]/search/page.tsx
export default async function SearchPage({
  params: { locale },
  searchParams: { q, page = '1' },
}: {
  params: { locale: string };
  searchParams: { q: string; page?: string };
}) {
  const results = await fetch(
    `${API_BASE}/search?query=${encodeURIComponent(q)}&locale=${locale}&page=${page}&pageSize=10`,
  ).then((res) => res.json());

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">搜索结果</h1>
      <p className="text-gray-500 mb-6">找到约 {results.total} 条「{q}」相关结果</p>

      <div className="space-y-6">
        {results.hits.map((hit) => (
          <article key={hit.id} className="border-b pb-4">
            <a href={hit.url}>
              <h2
                className="text-xl font-semibold hover:text-blue-600"
                dangerouslySetInnerHTML={{ __html: hit.highlight || hit.title }}
              />
              <p className="text-gray-600 mt-1">{hit.summary}</p>
            </a>
          </article>
        ))}
      </div>

      <Pagination
        current={Number(page)}
        total={results.total}
        pageSize={10}
      />
    </div>
  );
}
```

## 6. Search Optimization

### 6.1 Search Weight Tuning

```go
// 标题匹配权重最高，摘要次之，正文最低
multiMatch := opensearch.NewMultiMatchQuery(query).
    Field("title^3").        // 权重 3
    Field("title.prefix^2"). // 前缀匹配权重 2
    Field("summary^2").
    Field("content^1").
    Type("best_fields").
    TieBreaker(0.3)
```

### 6.2 Synonym Configuration

```json
{
  "settings": {
    "analysis": {
      "filter": {
        "synonym_filter": {
          "type": "synonym",
          "synonyms": [
            "GoWind,gowind,go-wind",
            "CMS,content management system,内容管理系统",
            "前端,frontend,front-end"
          ]
        }
      },
      "analyzer": {
        "synonym_analyzer": {
          "tokenizer": "ik_max_word",
          "filter": ["synonym_filter", "lowercase"]
        }
      }
    }
  }
}
```

## 7. Checklist

| Check Item | Description |
|--------|------|
| OpenSearch service | Started with Docker Compose |
| IK analyzer | Chinese tokenization plugin installed |
| Index mappings | Fields + analyzer configuration |
| Index sync | Real-time async task synchronization |
| Full rebuild | Batch import feature |
| Search API | Advanced search endpoint |
| Frontend search | Search bar + results page + highlighting |
| Search optimization | Weights + synonyms |

## Related Documents

- [CMS Backend Architecture Overview](./backend-architecture.md)
- [Task Scheduling in Practice](./tutorial-task-scheduling.md)
- [Headless API Multi-Client Integration in Practice](./tutorial-headless-api.md)
- [Frontend Application Development in Practice](./tutorial-frontend-app.md)
