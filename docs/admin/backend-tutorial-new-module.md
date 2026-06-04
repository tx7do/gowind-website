# 后端新增业务模块实战教程

本教程以"文章管理"（Article）为例，手把手演示如何在 GoWind Admin 后端从零开始新增一个完整的业务模块。

## 一、需求分析

我们要实现一个简单的文章管理功能：

| 字段 | 类型 | 说明 |
|------|------|------|
| ID | uint32 | 文章ID（自增主键） |
| Title | string | 文章标题 |
| Content | string | 文章内容 |
| AuthorId | uint32 | 作者ID |
| Status | int32 | 状态（0-草稿，1-已发布，2-已下架） |
| CreatedAt | timestamp | 创建时间 |
| UpdatedAt | timestamp | 更新时间 |

需要实现的接口：
- 创建文章
- 更新文章
- 删除文章
- 获取文章详情
- 文章列表查询（支持分页和搜索）

## 二、步骤 1：定义 Protobuf

### 2.1 创建消息定义文件

在 `backend/api/protos/article/` 目录下创建 `article.proto`：

```protobuf
syntax = "proto3";

package article.service.v1;

import "gnostic/openapi/v3/annotations.proto";
import "google/api/annotations.proto";
import "google/protobuf/empty.proto";

// 文章实体
message Article {
  uint32 id = 1;
  string title = 2;
  string content = 3;
  uint32 author_id = 4;
  int32 status = 5;
  string created_at = 6;
  string updated_at = 7;
}

// 创建文章请求
message CreateArticleRequest {
  Article data = 1;
}

// 更新文章请求
message UpdateArticleRequest {
  uint32 id = 1;
  Article data = 2;
}

// 获取文章请求
message GetArticleRequest {
  uint32 id = 1;
}

// 删除文章请求
message DeleteArticleRequest {
  uint32 id = 1;
}

// 文章列表请求
message ListArticleRequest {
  int32 page = 1;
  int32 page_size = 2;
  string keyword = 3;
  int32 status = 4;
}

// 文章列表响应
message ListArticleResponse {
  repeated Article items = 1;
  int32 total = 2;
}

// 文章服务
service ArticleService {
  // 创建文章
  rpc CreateArticle (CreateArticleRequest) returns (Article) {
    option (google.api.http) = {
      post: "/admin/v1/article"
      body: "*"
    };
  }

  // 更新文章
  rpc UpdateArticle (UpdateArticleRequest) returns (Article) {
    option (google.api.http) = {
      put: "/admin/v1/article/{id}"
      body: "*"
    };
  }

  // 删除文章
  rpc DeleteArticle (DeleteArticleRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = {
      delete: "/admin/v1/article/{id}"
    };
  }

  // 获取文章详情
  rpc GetArticle (GetArticleRequest) returns (Article) {
    option (google.api.http) = {
      get: "/admin/v1/article/{id}"
    };
  }

  // 文章列表查询
  rpc ListArticle (ListArticleRequest) returns (ListArticleResponse) {
    option (google.api.http) = {
      get: "/admin/v1/article"
    };
  }
}
```

### 2.2 生成代码

在项目根目录执行：

```shell
cd backend
make api
```

生成的代码位于 `api/gen/go/article/service/v1/`。

## 三、步骤 2：创建 Ent Schema

### 3.1 定义 Schema

在 `app/admin/service/internal/data/ent/schema/` 目录下创建 `article.go`：

```go
package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
)

// Article holds the schema definition for the Article entity.
type Article struct {
	ent.Schema
}

// Fields of the Article.
func (Article) Fields() []ent.Field {
	return []ent.Field{
		field.Uint32("id").
			Comment("文章ID"),
		field.String("title").
			MaxLen(200).
			Comment("文章标题"),
		field.Text("content").
			Optional().
			Comment("文章内容"),
		field.Uint32("author_id").
			Default(0).
			Comment("作者ID"),
		field.Int32("status").
			Default(0).
			Comment("状态：0-草稿，1-已发布，2-已下架"),
		field.Time("created_at").
			Default(time.Now).
			Immutable().
			Comment("创建时间"),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now).
			Comment("更新时间"),
	}
}

// Edges of the Article.
func (Article) Edges() []ent.Edge {
	return nil
}

// Annotations of the Article.
func (Article) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "articles"},
	}
}
```

### 3.2 生成 Ent 代码

```shell
cd app/admin/service
make ent
```

生成的代码位于 `internal/data/ent/` 目录。

## 四、步骤 3：实现 Data 层

### 4.1 创建 Repo 文件

在 `app/admin/service/internal/data/` 目录下创建 `article_repo.go`：

```go
package data

import (
	"context"

	"go-wind-admin/app/admin/service/internal/data/ent"
	"go-wind-admin/app/admin/service/internal/data/ent/article"
	articleV1 "go-wind-admin/api/gen/go/article/service/v1"
)

// ArticleRepo is the repository for Article.
type ArticleRepo struct {
	data *Data
	log  log.Logger
}

// NewArticleRepo creates a new ArticleRepo.
func NewArticleRepo(data *Data, logger log.Logger) *ArticleRepo {
	return &ArticleRepo{
		data: data,
		log:  log.NewHelper(logger),
	}
}

// Create creates a new Article.
func (r *ArticleRepo) Create(ctx context.Context, req *articleV1.CreateArticleRequest) (*articleV1.Article, error) {
	entity, err := r.data.db.Article.Create().
		SetTitle(req.GetData().GetTitle()).
		SetContent(req.GetData().GetContent()).
		SetAuthorID(req.GetData().GetAuthorID()).
		SetStatus(req.GetData().GetStatus()).
		Save(ctx)
	if err != nil {
		r.log.Errorf("create article failed: %v", err)
		return nil, err
	}
	return r.entityToProto(entity), nil
}

// Update updates an existing Article.
func (r *ArticleRepo) Update(ctx context.Context, req *articleV1.UpdateArticleRequest) (*articleV1.Article, error) {
	entity, err := r.data.db.Article.UpdateOneID(req.GetId()).
		SetTitle(req.GetData().GetTitle()).
		SetContent(req.GetData().GetContent()).
		SetStatus(req.GetData().GetStatus()).
		Save(ctx)
	if err != nil {
		r.log.Errorf("update article [%d] failed: %v", req.GetId(), err)
		return nil, err
	}
	return r.entityToProto(entity), nil
}

// Delete deletes an Article by ID.
func (r *ArticleRepo) Delete(ctx context.Context, req *articleV1.DeleteArticleRequest) error {
	err := r.data.db.Article.DeleteOneID(req.GetId()).Exec(ctx)
	if err != nil {
		r.log.Errorf("delete article [%d] failed: %v", req.GetId(), err)
		return err
	}
	return nil
}

// Get gets an Article by ID.
func (r *ArticleRepo) Get(ctx context.Context, req *articleV1.GetArticleRequest) (*articleV1.Article, error) {
	entity, err := r.data.db.Article.Get(ctx, req.GetId())
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, articleV1.ErrorArticleNotFound("article not found")
		}
		r.log.Errorf("get article [%d] failed: %v", req.GetId(), err)
		return nil, err
	}
	return r.entityToProto(entity), nil
}

// List lists Articles with pagination and filters.
func (r *ArticleRepo) List(ctx context.Context, req *articleV1.ListArticleRequest) (*articleV1.ListArticleResponse, error) {
	query := r.data.db.Article.Query()

	// 关键词搜索
	if req.GetKeyword() != "" {
		query = query.Where(article.TitleContains(req.GetKeyword()))
	}

	// 状态筛选
	if req.GetStatus() >= 0 {
		query = query.Where(article.StatusEQ(req.GetStatus()))
	}

	// 总数
	total, err := query.Count(ctx)
	if err != nil {
		r.log.Errorf("count articles failed: %v", err)
		return nil, err
	}

	// 分页
	offset := (req.GetPage() - 1) * req.GetPageSize()
	entities, err := query.
		Order(ent.Desc(article.FieldCreatedAt)).
		Offset(int(offset)).
		Limit(int(req.GetPageSize())).
		All(ctx)
	if err != nil {
		r.log.Errorf("list articles failed: %v", err)
		return nil, err
	}

	items := make([]*articleV1.Article, 0, len(entities))
	for _, e := range entities {
		items = append(items, r.entityToProto(e))
	}

	return &articleV1.ListArticleResponse{
		Items: items,
		Total: int32(total),
	}, nil
}

// entityToProto converts ent entity to protobuf message.
func (r *ArticleRepo) entityToProto(e *ent.Article) *articleV1.Article {
	return &articleV1.Article{
		Id:        e.ID,
		Title:     e.Title,
		Content:   e.Content,
		AuthorId:  e.AuthorID,
		Status:    e.Status,
		CreatedAt: e.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt: e.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}
```

### 4.2 注册 Provider

在 `internal/data/providers/provider.go` 中添加：

```go
var ProviderSet = wire.NewSet(
	NewData,
	NewAuthenticator,
	NewAuthorizer,
	// ... 其他已有的 Provider
	
	NewArticleRepo,  // 新增
)
```

## 五、步骤 4：实现 Service 层

### 5.1 创建 Service 文件

在 `app/admin/service/internal/service/` 目录下创建 `article_service.go`：

```go
package service

import (
	"context"

	"github.com/go-kratos/kratos/v2/log"
	"google.golang.org/protobuf/types/known/emptypb"

	articleV1 "go-wind-admin/api/gen/go/article/service/v1"
	"go-wind-admin/app/admin/service/internal/data"
)

// ArticleService implements the ArticleService interface.
type ArticleService struct {
	articleV1.UnimplementedArticleServiceServer
	log    *log.Helper
	repo   *data.ArticleRepo
}

// NewArticleService creates a new ArticleService.
func NewArticleService(repo *data.ArticleRepo, logger log.Logger) *ArticleService {
	return &ArticleService{
		log:  log.NewHelper(logger),
		repo: repo,
	}
}

// CreateArticle creates a new article.
func (s *ArticleService) CreateArticle(ctx context.Context, req *articleV1.CreateArticleRequest) (*articleV1.Article, error) {
	return s.repo.Create(ctx, req)
}

// UpdateArticle updates an existing article.
func (s *ArticleService) UpdateArticle(ctx context.Context, req *articleV1.UpdateArticleRequest) (*articleV1.Article, error) {
	return s.repo.Update(ctx, req)
}

// DeleteArticle deletes an article by ID.
func (s *ArticleService) DeleteArticle(ctx context.Context, req *articleV1.DeleteArticleRequest) (*emptypb.Empty, error) {
	err := s.repo.Delete(ctx, req)
	if err != nil {
		return nil, err
	}
	return &emptypb.Empty{}, nil
}

// GetArticle gets an article by ID.
func (s *ArticleService) GetArticle(ctx context.Context, req *articleV1.GetArticleRequest) (*articleV1.Article, error) {
	return s.repo.Get(ctx, req)
}

// ListArticle lists articles with pagination.
func (s *ArticleService) ListArticle(ctx context.Context, req *articleV1.ListArticleRequest) (*articleV1.ListArticleResponse, error) {
	return s.repo.List(ctx, req)
}
```

### 5.2 注册 Provider

在 `internal/service/providers/provider.go` 中添加：

```go
var ProviderSet = wire.NewSet(
	// ... 其他已有的 Provider
	
	NewArticleService,  // 新增
)
```

## 六、步骤 5：注册到 Server

### 6.1 修改 rest_server.go

在 `app/admin/service/internal/server/rest_server.go` 的 `NewRestServer` 函数中：

**添加参数**：

```go
func NewRestServer(
	// ... 其他参数
	
	articleService *service.ArticleService,  // 新增
) (*http.Server, error) {
```

**注册 Handler**：

```go
// 在函数末尾添加
articleV1.RegisterArticleServiceHTTPServer(srv, articleService)
```

## 七、步骤 6：重新生成 Wire

```shell
cd app/admin/service/cmd/server
wire
```

这会自动生成 `wire_gen.go`，完成依赖注入的编排。

## 八、步骤 7：生成 OpenAPI 文档

```shell
cd backend
make openapi
```

访问 <http://localhost:7788/docs/> 可以看到新接口已出现在 Swagger UI 中。

## 九、步骤 8：生成 TypeScript 代码

```shell
make ts
```

前端可以使用自动生成的 TypeScript 类型和请求函数。

## 十、测试验证

### 10.1 启动服务

```shell
cd backend
gow run admin
```

### 10.2 使用 curl 测试

```shell
# 创建文章
curl -X POST http://localhost:7788/admin/v1/article \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "data": {
      "title": "Hello GoWind",
      "content": "This is a test article.",
      "author_id": 1,
      "status": 1
    }
  }'

# 获取文章列表
curl http://localhost:7788/admin/v1/article?page=1&page_size=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 10.3 使用 Swagger UI 测试

访问 <http://localhost:7788/docs/>，找到 ArticleService，直接在浏览器中测试所有接口。

## 十一、常见问题

### Q1: Wire 报错找不到 Provider？

检查 `provider.go` 中是否已添加新的 Provider，并确保 `wire.go` 中引用了正确的 ProviderSet。

### Q2: Ent 迁移失败？

确保数据库连接配置正确，检查 `data.yaml` 中的数据库地址和密码。

### Q3: 接口返回 404？

检查 `rest_server.go` 中是否已注册 Handler，并确认路由路径与 Protobuf 定义一致。

### Q4: 权限校验失败？

确保用户拥有对应的权限代码，或在 `auth.yaml` 中临时将授权引擎改为 `noop` 进行测试。

## 十二、总结

通过本教程，我们完成了从 Protobuf 定义到 Service 实现的完整流程：

1. **定义 API**：Protobuf → 生成 Go 代码
2. **定义数据模型**：Ent Schema → 生成 ORM 代码
3. **实现 Data 层**：Repo 封装数据库操作
4. **实现 Service 层**：业务逻辑处理
5. **注册到 Server**：暴露 HTTP 接口
6. **Wire 依赖注入**：自动组装依赖
7. **生成文档**：OpenAPI + TypeScript

这套流程适用于任何新增的业务模块，掌握了这个模式，就可以快速扩展 GoWind Admin 的功能。

## 十三、相关文档

- [后端架构总览](./backend-architecture.md)
- [后端核心模块详解](./backend-modules.md)
- [后端 API 与 Protobuf 定义](./backend-api.md)
- [后端扩展开发](./backend-extension.md)
