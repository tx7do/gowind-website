# Backend Tutorial: Adding a New Business Module

This tutorial uses "Article Management" (Article) as an example to walk you through adding a complete new business module to the GoWind Admin backend from scratch.

## 1. Requirements Analysis

We will implement a simple article management feature:

| Field | Type | Description |
|------|------|------|
| ID | uint32 | Article ID (auto-increment primary key) |
| Title | string | Article title |
| Content | string | Article content |
| AuthorId | uint32 | Author ID |
| Status | int32 | Status (0 = draft, 1 = published, 2 = taken down) |
| CreatedAt | timestamp | Creation time |
| UpdatedAt | timestamp | Update time |

APIs to implement:
- Create an article
- Update an article
- Delete an article
- Get article details
- Query the article list (with pagination and search support)

## 2. Step 1: Define Protobuf

### 2.1 Create the Message Definition File

Create `article.proto` under the `backend/api/protos/article/` directory:

```protobuf
syntax = "proto3";

package article.service.v1;

import "gnostic/openapi/v3/annotations.proto";
import "google/api/annotations.proto";
import "google/protobuf/empty.proto";

// Article entity
message Article {
  uint32 id = 1;
  string title = 2;
  string content = 3;
  uint32 author_id = 4;
  int32 status = 5;
  string created_at = 6;
  string updated_at = 7;
}

// Create article request
message CreateArticleRequest {
  Article data = 1;
}

// Update article request
message UpdateArticleRequest {
  uint32 id = 1;
  Article data = 2;
}

// Get article request
message GetArticleRequest {
  uint32 id = 1;
}

// Delete article request
message DeleteArticleRequest {
  uint32 id = 1;
}

// Article list request
message ListArticleRequest {
  int32 page = 1;
  int32 page_size = 2;
  string keyword = 3;
  int32 status = 4;
}

// Article list response
message ListArticleResponse {
  repeated Article items = 1;
  int32 total = 2;
}

// Article service
service ArticleService {
  // Create an article
  rpc CreateArticle (CreateArticleRequest) returns (Article) {
    option (google.api.http) = {
      post: "/admin/v1/article"
      body: "*"
    };
  }

  // Update an article
  rpc UpdateArticle (UpdateArticleRequest) returns (Article) {
    option (google.api.http) = {
      put: "/admin/v1/article/{id}"
      body: "*"
    };
  }

  // Delete an article
  rpc DeleteArticle (DeleteArticleRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = {
      delete: "/admin/v1/article/{id}"
    };
  }

  // Get article details
  rpc GetArticle (GetArticleRequest) returns (Article) {
    option (google.api.http) = {
      get: "/admin/v1/article/{id}"
    };
  }

  // Query the article list
  rpc ListArticle (ListArticleRequest) returns (ListArticleResponse) {
    option (google.api.http) = {
      get: "/admin/v1/article"
    };
  }
}
```

### 2.2 Generate Code

Run the following from the project root:

```shell
cd backend
make api
```

The generated code is located in `api/gen/go/article/service/v1/`.

## 3. Step 2: Create the Ent Schema

### 3.1 Define the Schema

Create `article.go` under the `app/admin/service/internal/data/ent/schema/` directory:

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

### 3.2 Generate the Ent Code

```shell
cd app/admin/service
make ent
```

The generated code is located under the `internal/data/ent/` directory.

## 4. Step 3: Implement the Data Layer

### 4.1 Create the Repo File

Create `article_repo.go` under the `app/admin/service/internal/data/` directory:

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

	// Keyword search
	if req.GetKeyword() != "" {
		query = query.Where(article.TitleContains(req.GetKeyword()))
	}

	// Status filter
	if req.GetStatus() >= 0 {
		query = query.Where(article.StatusEQ(req.GetStatus()))
	}

	// Total count
	total, err := query.Count(ctx)
	if err != nil {
		r.log.Errorf("count articles failed: %v", err)
		return nil, err
	}

	// Pagination
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

### 4.2 Register the Provider

Add the following in `internal/data/providers/provider.go`:

```go
var ProviderSet = wire.NewSet(
	NewData,
	NewAuthenticator,
	NewAuthorizer,
	// ... other existing providers

	NewArticleRepo,  // new
)
```

## 5. Step 4: Implement the Service Layer

### 5.1 Create the Service File

Create `article_service.go` under the `app/admin/service/internal/service/` directory:

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

### 5.2 Register the Provider

Add the following in `internal/service/providers/provider.go`:

```go
var ProviderSet = wire.NewSet(
	// ... other existing providers

	NewArticleService,  // new
)
```

## 6. Step 5: Register with the Server

### 6.1 Modify rest_server.go

In the `NewRestServer` function of `app/admin/service/internal/server/rest_server.go`:

**Add a parameter**:

```go
func NewRestServer(
	// ... other parameters

	articleService *service.ArticleService,  // new
) (*http.Server, error) {
```

**Register the handler**:

```go
// Add at the end of the function
articleV1.RegisterArticleServiceHTTPServer(srv, articleService)
```

## 7. Step 6: Regenerate Wire

```shell
cd app/admin/service/cmd/server
wire
```

This automatically generates `wire_gen.go`, completing the dependency injection wiring.

## 8. Step 7: Generate the OpenAPI Documentation

```shell
cd backend
make openapi
```

Visit <http://localhost:7788/docs/> and you will see the new APIs appear in the Swagger UI.

## 9. Step 8: Generate TypeScript Code

```shell
make ts
```

The frontend can now use the auto-generated TypeScript types and request functions.

## 10. Testing and Verification

### 10.1 Start the Service

```shell
cd backend
gow run admin
```

### 10.2 Test with curl

```shell
# Create an article
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

# Get the article list
curl http://localhost:7788/admin/v1/article?page=1&page_size=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 10.3 Test with the Swagger UI

Visit <http://localhost:7788/docs/>, find ArticleService, and test all the APIs directly in the browser.

## 11. Common Issues

### Q1: Wire reports that a provider cannot be found?

Check whether the new provider has been added in `provider.go`, and make sure `wire.go` references the correct ProviderSet.

### Q2: Ent migration fails?

Make sure the database connection is configured correctly; check the database address and password in `data.yaml`.

### Q3: The API returns 404?

Check whether the handler has been registered in `rest_server.go`, and confirm that the route paths match the Protobuf definitions.

### Q4: The permission check fails?

Make sure the user has the corresponding permission code, or temporarily switch the authorization engine to `noop` in `auth.yaml` for testing.

## 12. Summary

In this tutorial, we completed the full workflow from Protobuf definition to Service implementation:

1. **Define the API**: Protobuf → generate Go code
2. **Define the data model**: Ent schema → generate ORM code
3. **Implement the data layer**: the Repo encapsulates database operations
4. **Implement the service layer**: business logic handling
5. **Register with the server**: expose the HTTP APIs
6. **Wire dependency injection**: assemble dependencies automatically
7. **Generate documentation**: OpenAPI + TypeScript

This workflow applies to any new business module. Once you master this pattern, you can quickly extend the features of GoWind Admin.

## 13. Related Documentation

- [Backend Architecture Overview](/en/admin/backend-architecture.md)
- [Backend Core Modules in Detail](/en/admin/backend-modules.md)
- [Backend API and Protobuf Definitions](/en/admin/backend-api.md)
- [Backend Extension Development](/en/admin/backend-extension.md)
