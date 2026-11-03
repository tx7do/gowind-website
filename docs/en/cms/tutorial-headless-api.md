# Headless API Multi-Client Integration in Practice

As a Headless content platform, the core value of GoWind CMS lies in "create once, distribute everywhere". This tutorial takes a deep dive into the dual-protocol design of the Admin API and App API, the public frontend endpoint whitelist mechanism, and how to integrate the four frontends (Vue/React/Taro/Flutter) from scratch.

## Prerequisites

- You have read [CMS Backend Architecture Overview](./backend-architecture.md) and [CMS API Definitions](./backend-api.md)
- Understand basic concepts of RESTful APIs and JWT authentication
- The local development environment is set up

## 1. Headless Architecture Recap

### 1.1 What Is a Headless CMS

```mermaid
graph LR
    subgraph 传统 CMS
        T_BE[后端 + 内容] --> T_FE[前端模板<br/>服务器端渲染]
        T_FE --> T_USER[用户]
    end

    subgraph Headless CMS
        H_BE[后端 + 内容] -->|API| H_API[RESTful API]
        H_API -->|Web| React[React 前台]
        H_API -->|Web| Vue[Vue 前台]
        H_API -->|小程序| Taro[Taro 前台]
        H_API -->|App| Flutter[Flutter App]
        H_API -->|第三方| ThirdParty[第三方系统]
    end
```

**Traditional CMS**: the backend and frontend are coupled (such as WordPress PHP templates), and the display approach is dictated by the backend.

**Headless CMS**: the backend only handles content management and API output, while the frontend is fully independent and can connect to any client.

### 1.2 CMS Dual-Protocol API

| API | Route Prefix | Port | Audience | Permission Requirements |
|-----|---------|------|---------|---------|
| Admin API | `/admin/v1/` | 6600 | Admin console operators | JWT authentication + Casbin permissions |
| App API | `/app/v1/` | 6700 | Frontend end users (C-side) | Some endpoints unauthenticated, the rest require JWT |

### 1.3 Why a Dual Protocol Is Needed

```mermaid
graph TB
    subgraph 安全隔离
        Admin[Admin API<br/>完整 CRUD<br/>45 个 Service]
        App[App API<br/>精简只读+互动<br/>9 个 Service]
    end

    subgraph 权限差异
        AdminAuth[管理员认证<br/>Casbin 角色权限<br/>数据租户隔离]
        AppAuth[前台用户认证<br/>白名单免登录浏览<br/>用户评论需登录]
    end

    subgraph 独立扩展
        AdminScale[可独立扩容<br/>高安全要求]
        AppScale[可独立扩容<br/>高并发要求]
    end
```

## 2. App API Endpoints in Detail

### 2.1 Endpoints Provided by the App Service

The App API only exposes the features the frontend needs, greatly simplified compared to the Admin API:

| Service | Route | Method | Login-Free | Description |
|---------|------|------|--------|------|
| Authentication | `/app/v1/login` | POST | Yes | Frontend user login |
| Authentication | `/app/v1/logout` | POST | No | Log out |
| Post | `/app/v1/posts` | GET | Yes | Post list (pagination, language supported) |
| Post | `/app/v1/posts/{id}` | GET | Yes | Post detail |
| Post | `/app/v1/posts` | POST | No | User posting (login required) |
| Category | `/app/v1/categories` | GET | Yes | Category list |
| Category | `/app/v1/categories/{id}` | GET | Yes | Category detail |
| Tag | `/app/v1/tags` | GET | Yes | Tag list |
| Tag | `/app/v1/tags/{id}` | GET | Yes | Tag detail |
| Comment | `/app/v1/comments` | GET | Yes | Comment list |
| Comment | `/app/v1/comments` | POST | No | Post a comment (login required) |
| Page | `/app/v1/pages` | GET | Yes | Page list |
| Page | `/app/v1/pages/{id}` | GET | Yes | Page detail |
| Navigation | `/app/v1/navigations` | GET | Yes | Navigation menus |
| UserProfile | `/app/v1/user-profile` | GET | No | User profile |
| FileTransfer | `/app/v1/files` | POST | No | File upload |

### 2.2 Authentication-Free Whitelist

The App Service configures a whitelist of login-free endpoints in `rest_server.go`:

```go
// app/app/service/internal/server/rest_server.go
rpc.AddWhiteList(
    // 认证接口
    appV1.OperationAuthenticationServiceLogin,

    // 内容浏览接口（免登录）
    appV1.OperationNavigationServiceList,
    appV1.OperationPageServiceList,
    appV1.OperationPostServiceList,
    appV1.OperationCategoryServiceList,
    appV1.OperationCommentServiceList,
    appV1.OperationTagServiceList,

    appV1.OperationPageServiceGet,
    appV1.OperationPostServiceGet,
    appV1.OperationCategoryServiceGet,
    appV1.OperationCommentServiceGet,
    appV1.OperationTagServiceGet,
)
```

**Design principles**:
- Browsing endpoints (List / Get) are login-free → good for SEO and user conversion
- Interaction endpoints (creating comments, posting, file upload) require login → prevents abuse
- Profile endpoints require login → protects user privacy

### 2.3 Frontend Authentication Mechanism

App Service login automatically marks the token type as `app`:

```go
// app/app/service/internal/service/authentication_service.go
func (s *AuthenticationService) Login(
    ctx context.Context, req *authenticationV1.LoginRequest,
) (*authenticationV1.LoginResponse, error) {
    // 标记为前台用户令牌
    req.ClientType = trans.Ptr(authenticationV1.ClientType_app)
    return s.authenticationServiceClient.Login(ctx, req)
}
```

This way the backend can distinguish frontend user tokens from admin console tokens, preventing cross-client usage.

## 3. API Calling Conventions

### 3.1 Unified Pagination Protocol

All list endpoints use unified pagination parameters:

```http
GET /app/v1/posts?page=1&pageSize=10&orderBy=createdAt&orderDesc=true&search=关键词
```

| Parameter | Type | Default | Description |
|------|------|--------|------|
| page | int | 1 | Current page number |
| pageSize | int | 10 | Items per page |
| orderBy | string | createdAt | Sort field |
| orderDesc | bool | false | Descending order or not |
| search | string | - | Full-text search keyword |

Response format:

```json
{
  "items": [...],
  "total": 150
}
```

### 3.2 Multilingual Parameter

Use the `locale` query parameter to specify the language of the returned content:

```http
# 获取中文内容
GET /app/v1/posts?locale=zh-CN

# 获取英文内容
GET /app/v1/posts?locale=en-US

# 获取帖子详情（指定语言）
GET /app/v1/posts/42?locale=ja-JP
```

### 3.3 Authentication Flow

```mermaid
sequenceDiagram
    participant U as 前台用户
    participant A as App Service
    participant C as Core Service

    U->>A: POST /app/v1/login {username, password}
    A->>C: gRPC Login(ClientType=app)
    C-->>A: JWT Token
    A-->>U: {token, user}

    Note over U: 后续请求携带 Token

    U->>A: GET /app/v1/posts (白名单，无需 Token)
    A-->>U: 帖子列表

    U->>A: POST /app/v1/comments (需 Token)
    Note right of A: Authorization: Bearer {token}
    A->>A: JWT 校验（ClientType=app）
    A->>C: gRPC CreateComment()
    C-->>A: 评论创建成功
    A-->>U: 返回评论
```

### 3.4 Error Responses

Unified error response format:

```json
{
  "code": 401,
  "reason": "UNAUTHORIZED",
  "message": "未登录或登录已过期",
  "metadata": {}
}
```

Common error codes:

| HTTP Status Code | reason | Description |
|------------|--------|------|
| 400 | INVALID_ARGUMENT | Invalid parameter |
| 401 | UNAUTHORIZED | Not authenticated |
| 403 | FORBIDDEN | No permission |
| 404 | NOT_FOUND | Resource not found |
| 500 | INTERNAL | Internal server error |

## 4. Integrating the React Frontend (Next.js)

### 4.1 API Client Wrapper

```typescript
// src/lib/api/client.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:6700/app/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截：自动注入 Token 和 locale
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：统一错误处理
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
```

### 4.2 API Function Wrappers

```typescript
// src/lib/api/post.ts
import { apiClient } from './client';

export interface PostListParams {
  locale?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDesc?: boolean;
  search?: string;
}

export async function getPosts(params: PostListParams = {}) {
  return apiClient.get('/posts', { params });
}

export async function getPostBySlug(slug: string, locale: string) {
  return apiClient.get(`/posts/${slug}`, { params: { locale } });
}

export async function getPostsByCategory(categoryId: number, locale: string, page = 1) {
  return apiClient.get('/posts', {
    params: { locale, page, categoryId },
  });
}

export async function getPostsByTag(tagId: number, locale: string, page = 1) {
  return apiClient.get('/posts', {
    params: { locale, page, tagId },
  });
}
```

### 4.3 SSR Page Component

```tsx
// src/app/[locale]/page.tsx（首页）
import { getPosts, getNavigations, getCategories } from '@/lib/api';

export default async function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const [postsRes, navRes, catRes] = await Promise.all([
    getPosts({ locale, page: 1, pageSize: 10 }),
    getNavigations(),
    getCategories({ locale }),
  ]);

  return (
    <div className="container mx-auto">
      {/* 导航栏 */}
      <nav>
        {navRes.items.map((item) => (
          <Link key={item.id} href={item.url}>{item.title}</Link>
        ))}
      </nav>

      {/* 文章列表 */}
      <main className="grid grid-cols-3 gap-6">
        {postsRes.items.map((post) => (
          <article key={post.id}>
            <Link href={`/${locale}/posts/${post.slug}`}>
              <h2>{post.title}</h2>
              <p>{post.summary}</p>
            </Link>
          </article>
        ))}
      </main>

      {/* 侧边栏分类 */}
      <aside>
        <h3>分类</h3>
        {catRes.items.map((cat) => (
          <Link key={cat.id} href={`/${locale}/categories/${cat.slug}`}>
            {cat.name}
          </Link>
        ))}
      </aside>
    </div>
  );
}
```

### 4.4 Authentication and Comments

```tsx
// src/components/CommentSection.tsx
'use client';
import { useState } from 'react';
import { apiClient } from '@/lib/api/client';

export function CommentSection({ postId }: { postId: number }) {
  const [content, setContent] = useState('');
  const [comments, setComments] = useState([]);

  const handleSubmit = async () => {
    try {
      const newComment = await apiClient.post('/comments', {
        postId,
        content,
      });
      setComments([...comments, newComment]);
      setContent('');
    } catch (error) {
      if (error.response?.status === 401) {
        alert('请先登录');
      }
    }
  };

  return (
    <div>
      <h3>评论</h3>
      {comments.map((c) => (
        <div key={c.id}>{c.content}</div>
      ))}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button onClick={handleSubmit}>发表评论</button>
    </div>
  );
}
```

## 5. Integrating the Flutter Frontend

### 5.1 Retrofit API Auto-Generation

The Flutter version generates the API client from the OpenAPI document via `swagger_parser`:

```yaml
# build.yaml
targets:
  $default:
    builders:
      swagger_parser:
        options:
          output_dir: 'lib/core/network/generated'
          api_base_url: 'http://localhost:6700/app/v1'
```

```shell
# 从 OpenAPI 生成 Dart API 代码
dart run swagger_parser
```

### 5.2 The Generated API Client

```dart
// lib/core/network/generated/api/post_api.dart（自动生成）
@RestApi(baseUrl: '/app/v1')
abstract class PostApi {
  factory PostApi(Dio dio, {String? baseUrl}) = _PostApi;

  @GET('/posts')
  Future<ListPostResponse> listPosts({
    @Query('locale') String? locale,
    @Query('page') int? page,
    @Query('pageSize') int? pageSize,
    @Query('search') String? search,
  });

  @GET('/posts/{id}')
  Future<Post> getPost(
    @Path('id') int id, {
    @Query('locale') String? locale,
  });
}
```

### 5.3 Calling with the BLoC Pattern

```dart
// features/post_list/presentation/bloc/post_list_bloc.dart
class PostListBloc extends Bloc<PostListEvent, PostListState> {
  final PostApi postApi;
  final String locale;

  PostListBloc({required this.postApi, required this.locale})
      : super(PostListInitial()) {
    on<FetchPosts>(_onFetchPosts);
    on<RefreshPosts>(_onRefreshPosts);
    on<LoadMorePosts>(_onLoadMorePosts);
  }

  int _currentPage = 1;
  List<Post> _allPosts = [];

  Future<void> _onFetchPosts(
    FetchPosts event,
    Emitter<PostListState> emit,
  ) async {
    emit(PostListLoading());
    try {
      _currentPage = 1;
      final response = await postApi.listPosts(
        locale: locale,
        page: _currentPage,
        pageSize: 10,
      );
      _allPosts = response.items;
      emit(PostListLoaded(_allPosts, hasMore: response.items.length >= 10));
    } catch (e) {
      emit(PostListError(e.toString()));
    }
  }

  Future<void> _onLoadMorePosts(
    LoadMorePosts event,
    Emitter<PostListState> emit,
  ) async {
    try {
      _currentPage++;
      final response = await postApi.listPosts(
        locale: locale,
        page: _currentPage,
        pageSize: 10,
      );
      _allPosts = [..._allPosts, ...response.items];
      emit(PostListLoaded(_allPosts, hasMore: response.items.length >= 10));
    } catch (e) {
      _currentPage--;
      emit(PostListLoaded(_allPosts, hasMore: true, error: e.toString()));
    }
  }
}
```

### 5.4 Dio Interceptor Configuration

```dart
// lib/core/network/dio_client.dart
class DioClient {
  static Dio create() {
    final dio = Dio(BaseOptions(
      baseUrl: 'http://localhost:6700/app/v1',
      connectTimeout: Duration(seconds: 10),
      receiveTimeout: Duration(seconds: 15),
    ));

    // 请求拦截：注入 Token
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = TokenStorage.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          // Token 过期，跳转登录
          TokenStorage.clear();
          NavigationService.navigateTo('/login');
        }
        handler.next(error);
      },
    ));

    return dio;
  }
}
```

## 6. Integrating the Taro Mini Program

### 6.1 API Wrapper

```typescript
// src/services/api.ts
import Taro from '@tarojs/taro';

const BASE_URL = 'http://localhost:6700/app/v1';

export function request<T = any>(
  url: string,
  options: { method?: keyof Taro.request.Method; data?: any } = {},
): Promise<T> {
  const token = Taro.getStorageSync('token');
  return new Promise((resolve, reject) => {
    Taro.request({
      url: `${BASE_URL}${url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else if (res.statusCode === 401) {
          Taro.navigateTo({ url: '/pages/login/index' });
          reject(new Error('未登录'));
        } else {
          reject(new Error(res.data?.message || '请求失败'));
        }
      },
      fail: reject,
    });
  });
}

export const api = {
  getPosts: (params: { locale?: string; page?: number }) =>
    request('/posts', { data: params }),

  getPost: (id: number, locale?: string) =>
    request(`/posts/${id}`, { data: { locale } }),

  login: (data: { username: string; password: string }) =>
    request('/login', { method: 'POST', data }),

  createComment: (data: { postId: number; content: string }) =>
    request('/comments', { method: 'POST', data }),
};
```

### 6.2 Calling from Pages

```tsx
// src/pages/posts/index.tsx
import { View, Text } from '@tarojs/components';
import { useState, useEffect } from 'react';
import { api } from '@/services/api';

export default function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPosts({ locale: 'zh-CN', page: 1 }).then((res) => {
      setPosts(res.items);
      setLoading(false);
    });
  }, []);

  if (loading) return <Text>加载中...</Text>;

  return (
    <View>
      {posts.map((post) => (
        <View key={post.id} onClick={() => navigateToDetail(post.id)}>
          <Text>{post.title}</Text>
          <Text>{post.summary}</Text>
        </View>
      ))}
    </View>
  );
}
```

## 7. Custom Third-Party Integration

### 7.1 Calling from Any HTTP Client

The App API is a standard RESTful API that can be integrated from any language:

```python
# Python 对接示例
import requests

API_BASE = "http://localhost:6700/app/v1"

# 获取文章列表
response = requests.get(f"{API_BASE}/posts", params={
    "locale": "zh-CN",
    "page": 1,
    "pageSize": 10,
})
posts = response.json()

# 登录获取 Token
login_resp = requests.post(f"{API_BASE}/login", json={
    "username": "user@example.com",
    "password": "password123",
})
token = login_resp.json()["token"]

# 发表评论（需认证）
requests.post(
    f"{API_BASE}/comments",
    json={"postId": 42, "content": "很棒的文章！"},
    headers={"Authorization": f"Bearer {token}"},
)
```

### 7.2 Webhook Integration

After content is published, the event bus triggers Webhook notifications to third parties:

```lua
-- 监听帖子发布事件，触发 Webhook
eventbus.subscribe("post.published", function(event)
    local post_id = event.post_id
    local post = api.get("/app/v1/posts/" .. post_id)

    -- 发送到第三方系统
    http.post("https://your-webhook.com/content", {
        headers = { ["Content-Type"] = "application/json" },
        body = json.encode({
            event = "post.published",
            data = post,
            timestamp = os.time()
        })
    })
end)
```

## 8. Performance Optimization

### 8.1 Caching Strategy

```mermaid
graph LR
    Client[前台应用] -->|1. 请求| CDN[CDN 缓存]
    CDN -->|2. 未命中| API[App API]
    API -->|3. 查询| Redis[Redis 缓存]
    Redis -->|4. 未命中| DB[PostgreSQL]
```

| Layer | Caching Strategy | TTL | Use Case |
|------|---------|-----|---------|
| CDN | Static assets + page cache | Long term | SSR pages, images |
| Application layer | Redis caches hot content | 5-15 minutes | Post lists, categories |
| Database | Query cache | Real time | Latest data |

### 8.2 Frontend Cache Configuration

The global cache strategy can be configured in site settings:

```http
GET /app/v1/site-settings
```

```json
{
  "cache": {
    "enabled": true,
    "ttl": 600,
    "strategy": "stale-while-revalidate"
  }
}
```

## 9. Security Considerations

### 9.1 API Protection

| Risk | Protection Measure |
|------|---------|
| Brute-force attacks | Rate limiting on the login endpoint (IP + account) |
| DDoS | API gateway rate limiting + WAF |
| Data scraping | Frequency limits + anomaly detection |
| XSS | HTML escaping of content output |
| CSRF | Token authentication (not cookies) |

### 9.2 CORS Configuration

```yaml
# app/app/service/configs/server.yaml
server:
  rest:
    cors:
      enabled: true
      allow_origins:
        - "https://vue.cms.gowind.cloud"
        - "https://react.cms.gowind.cloud"
        - "https://taro.cms.gowind.cloud"
      allow_methods: [GET, POST, PUT, DELETE]
      allow_headers: [Authorization, Content-Type]
```

## 10. Checklist

| Check Item | Description |
|--------|------|
| App Service whitelist configuration | Browsing endpoints are login-free |
| Token type distinction | Frontend ClientType=app |
| Unified pagination protocol | page / pageSize / orderBy |
| Multilingual parameter | locale query parameter |
| Frontend API client | Encapsulates authentication and error handling |
| CORS configuration | Allows cross-origin requests from frontend domains |
| Caching strategy | Reasonable TTL settings |

## Related Documents

- [CMS Backend Architecture Overview](./backend-architecture.md)
- [CMS Protobuf API Definitions](./backend-api.md)
- [CMS Frontend Architecture](./frontend-architecture.md)
- [Content Multilingual Translation in Practice](./tutorial-content-i18n.md)
- [Frontend Application Development in Practice](./tutorial-frontend-app.md)
