# GoWind CMS 产品介绍

GoWind CMS 是一套高性能的内容管理系统，基于 Go 后端和 Vue3 前端构建，专为现代内容创作者和出版商设计。支持灵活的内容组织、多端适配、内容审核流程、SEO
优化等企业级功能。

## 一、核心特性

### 1. 灵活的内容管理

- **多类型内容支持**：文章、视频、图片、多媒体等
- **自定义字段**：根据业务需求自定义内容字段和结构
- **内容分类和标签**：灵活的分类体系和多标签管理
- **批量操作**：支持批量导入、导出、删除等操作
- **版本控制**：自动保存内容历史版本，支持版本回滚

### 2. 发布管理

- **定时发布**：支持预设发布时间
- **审核流程**：多级审核机制，确保内容质量
- **发布计划**：规划和安排内容发布计划
- **多渠道发布**：同时发布到多个终端（Web、App、小程序）
- **自动存档**：过期内容自动存档处理

### 3. 评论和互动

- **评论系统**：支持评论审核、回复、置顶等
- **点赞和收藏**：用户互动功能
- **留言板**：实时用户反馈
- **社交分享**：集成社交分享功能
- **用户互动统计**：追踪评论、点赞、分享等数据

### 4. 多端适配

- **响应式设计**：自动适配各种屏幕尺寸
- **H5 优化**：专为移动端优化
- **小程序支持**：支持发布到微信小程序等
- **App 集成**：原生 App 内容推送
- **预览功能**：发布前多端实时预览

### 5. SEO 优化

- **元数据管理**：自定义 Title、Description、Keywords
- **URL 友好**：自定义 URL Slug
- **Sitemap 生成**：自动生成搜索引擎地图
- **内链优化**：智能推荐相关内容
- **Schema.org 支持**：结构化数据标记

### 6. 性能和可扩展性

- **高并发处理**：支持百万级内容和用户
- **CDN 友好**：内容静态化和 CDN 加速支持
- **缓存策略**：多层缓存机制
- **搜索优化**：集成全文搜索引擎（Elasticsearch）
- **API 开放**：标准 REST API，便于第三方集成

### 7. 数据分析

- **访问统计**：实时访问数据和用户行为分析
- **热度排行**：自动统计热门文章、作者等
- **推荐引擎**：基于用户行为的智能推荐
- **转化追踪**：追踪用户转化漏斗
- **报表系统**：可视化数据报表和导出

## 二、应用场景

### 新闻媒体

快速发布新闻、评论、专题等内容，支持多编辑协作和审核流程。

### 博客平台

个人或企业博客，支持内容分类、标签、存档等功能。

### 内容门户

大型内容聚合平台，支持多频道、多分类、推荐算法等。

### 电商平台

产品资讯、使用教程、用户评价等内容管理。

### 知识库

企业内部或对外的知识库、文档管理。

### 社区论坛

话题讨论、评论互动、用户生成内容管理。

## 三、技术架构

### 技术栈

| 层次      | 技术                               | 说明              |
|---------|----------------------------------|-----------------|
| **后端**  | Go 1.18+、Kratos 框架、Elasticsearch | 高性能、可扩展的内容处理和搜索 |
| **前端**  | Vue3、TypeScript、Vite、TailwindCSS | 现代化用户界面和管理后台    |
| **数据库** | MySQL / PostgreSQL               | 可靠的内容数据存储       |
| **缓存**  | Redis                            | 内容缓存和会话管理       |
| **存储**  | OSS / Minio                      | 文件和多媒体存储        |
| **搜索**  | Elasticsearch                    | 全文搜索和内容发现       |

### 系统架构

```
┌─────────────────────────────────────┐
│     前端管理系统 & 用户网站          │
│   (Vue3 + TailwindCSS)               │
└──────────────┬──────────────────────┘
               │
        ┌──────▼──────┐
        │   API 网关   │
        └──────┬──────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼──┐  ┌───▼──┐  ┌───▼──┐
│内容服务 │  │评论服务 │  │用户服务 │
└───┬──┘  └───┬──┘  └───┬──┘
    │         │         │
┌───▼──────────▼─────────▼──┐
│   数据层（MySQL/PG）      │
│   缓存层（Redis）         │
│   搜索层（Elasticsearch） │
│   存储层（OSS/Minio）     │
└──────────────────────────┘
```

## 四、核心功能模块

### 1. 内容编辑

- **富文本编辑器**：功能完整的内容编辑工具
- **Markdown 支持**：支持 Markdown 语法编写
- **媒体库**：集中管理图片、视频等资源
- **自动保存**：防止数据丢失
- **草稿管理**：支持多版本草稿

### 2. 发布管理

```bash
内容编辑 → 草稿保存 → 待审核 → 审核通过 → 定时发布 → 已发布
                     ↓
                 审核驳回 → 编辑修改
```

### 3. 权限管理

- **角色权限**：编辑、审核、发布等不同角色
- **频道权限**：可管理特定频道的内容
- **字段权限**：特定字段的编辑和查看权限
- **操作日志**：记录所有操作历史

### 4. 评论管理

- **评论审核**：发布前审核评论内容
- **评论过滤**：关键词过滤、垃圾识别
- **评论通知**：新评论邮件或通知提醒
- **评论统计**：评论数据分析

## 五、快速开始

### 1. 在线演示

敬请期待...

### 2. 环境准备

与 Admin 相同：

- Go 1.18+
- Node.js 16+
- MySQL 8.0+ 或 PostgreSQL 12+
- Redis 6.0+（可选）

### 3. 快速启动

```bash
git clone https://github.com/tx7do/go-wind-cms.git
cd go-wind-cms

# 后端启动
cd backend
make init
gow run cms

# 前端启动
cd ../frontend
pnpm install
pnpm dev:antd
```

### 4. 访问地址

- 管理后台：http://localhost:5555
- API 文档：http://localhost:7799/docs/
- 公开网站：http://localhost:8080

## 六、API 概览

### 内容管理 API

```bash
# 创建内容
POST /api/v1/contents
{
  "title": "文章标题",
  "content": "文章内容",
  "category": "news",
  "tags": ["标签1", "标签2"],
  "publish_at": "2024-02-27T10:00:00Z"
}

# 获取内容列表
GET /api/v1/contents?category=news&page=1&limit=20

# 获取单个内容
GET /api/v1/contents/{id}

# 更新内容
PUT /api/v1/contents/{id}

# 删除内容
DELETE /api/v1/contents/{id}
```

### 评论 API

```bash
# 获取评论列表
GET /api/v1/contents/{content_id}/comments

# 发布评论
POST /api/v1/contents/{content_id}/comments
{
  "content": "评论内容",
  "author": "评论者",
  "email": "邮箱"
}

# 删除评论
DELETE /api/v1/comments/{id}
```

## 七、部署指南

### Docker 部署

```bash
docker build -t gowind-cms:latest .
docker run -d \
  -p 7799:7799 \
  -e DATABASE_DSN="your-database-dsn" \
  -e REDIS_ADDR="your-redis-addr" \
  gowind-cms:latest
```

### Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gowind-cms
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gowind-cms
  template:
    metadata:
      labels:
        app: gowind-cms
    spec:
      containers:
        - name: cms
          image: gowind-cms:latest
          ports:
            - containerPort: 7799
          env:
            - name: DATABASE_DSN
              valueFrom:
                secretKeyRef:
                  name: cms-secrets
                  key: database-dsn
```

## 八、常见问题

### Q: CMS 支持多个网站吗？

A: 是的，通过多站点管理功能，一个 CMS 实例可以管理多个独立的网站。

### Q: 如何集成第三方评论系统（如 Disqus）？

A: 可以通过 API 集成或使用 iframe 嵌入第三方评论系统。

### Q: 是否支持 CDN 加速？

A: 支持。静态资源可上传到 CDN，并配置 CDN 源站。

### Q: 如何进行数据备份？

A: 定期备份数据库和文件存储即可。支持自动备份脚本。

### Q: 是否支持全文搜索？

A: 是的，集成 Elasticsearch 提供强大的全文搜索能力。

## 九、获取帮助

- 📖 [快速开始指南](/get-started.md)
- 📧 邮件：contact@gowind.cloud
- 💬 讨论：[GitHub Discussions](https://github.com/tx7do/go-wind-cms/discussions)
- 🐛 反馈：[GitHub Issues](https://github.com/tx7do/go-wind-cms/issues)

---

更详细的安装和使用说明，请参考 [CMS 安装指南](/cms/installation.md)。
