# 前后端联调完整实战教程

本教程以"文章管理"模块为例，从后端到前端全链路打通，涵盖权限配置、菜单配置、API 对接等完整流程。

## 一、准备工作

### 1.1 环境检查

确保以下环境已就绪：

- Go 1.18+
- Node.js 16+
- pnpm
- Docker Compose（用于启动依赖服务）
- PostgreSQL / MySQL
- Redis

### 1.2 启动后端依赖

```shell
cd backend
./scripts/docker/libs_only.sh
```

这会启动 PostgreSQL、Redis、MinIO 等依赖服务。

## 二、后端开发（已完成）

假设后端已完成"文章管理"模块的开发（参考 [后端新增业务模块实战教程](./backend-tutorial-new-module.md)），包括：

- ✅ Protobuf 定义
- ✅ Ent Schema
- ✅ Data 层实现
- ✅ Service 层实现
- ✅ Server 注册
- ✅ Wire 依赖注入
- ✅ OpenAPI 文档生成

验证后端接口：

```shell
cd backend
gow run admin
```

访问 <http://localhost:7788/docs/>，确认 ArticleService 的接口已出现在 Swagger UI 中。

## 三、前端开发（已完成）

假设前端已完成页面开发（参考 [前端新增业务页面实战教程](./frontend-tutorial-new-page.md)），包括：

- ✅ API Service 层
- ✅ Composable 层
- ✅ 页面组件
- ✅ 路由注册

## 四、权限与菜单配置

这是前后端联调的关键步骤，需要在后台管理系统中配置菜单和权限。

### 4.1 登录后台

使用默认账号 `admin` / `admin` 登录后台管理系统。

### 4.2 创建菜单

进入 **权限管理 → 菜单管理**，点击"新建菜单"。

#### 创建一级目录

| 字段 | 值 |
|------|-----|
| 菜单名称 | 文章管理 |
| 父级菜单 | 无（顶级） |
| 菜单类型 | 目录 |
| 路由路径 | `/app/article` |
| 组件路径 | 留空 |
| 图标 | `mdi:file-document-outline` |
| 排序 | 100 |
| 是否显示 | 是 |
| 是否缓存 | 否 |

点击"提交"保存。

#### 创建二级菜单（列表页）

再次点击"新建菜单"：

| 字段 | 值 |
|------|-----|
| 菜单名称 | 文章列表 |
| 父级菜单 | 文章管理 |
| 菜单类型 | 菜单 |
| 路由路径 | `index` |
| 组件路径 | `/app/article/index` |
| 图标 | 留空 |
| 排序 | 1 |
| 是否显示 | 是 |
| 是否缓存 | 是 |
| 权限标识 | `article:list` |

点击"提交"保存。

#### 创建按钮权限（可选）

如果需要按钮级别的权限控制，继续创建：

**新建按钮**：

| 字段 | 值 |
|------|-----|
| 菜单名称 | 新建文章 |
| 父级菜单 | 文章列表 |
| 菜单类型 | 按钮 |
| 权限标识 | `article:create` |

**编辑按钮**：

| 字段 | 值 |
|------|-----|
| 菜单名称 | 编辑文章 |
| 父级菜单 | 文章列表 |
| 菜单类型 | 按钮 |
| 权限标识 | `article:update` |

**删除按钮**：

| 字段 | 值 |
|------|-----|
| 菜单名称 | 删除文章 |
| 父级菜单 | 文章列表 |
| 菜单类型 | 按钮 |
| 权限标识 | `article:delete` |

### 4.3 分配权限给角色

进入 **权限管理 → 角色管理**，选择需要授权的角色（如"超级管理员"）。

1. 点击"设置权限"
2. 在权限树中勾选"文章管理"及其子菜单
3. 点击"确定"保存

### 4.4 验证菜单显示

退出登录，重新登录后查看左侧菜单，应该能看到"文章管理"菜单项。

## 五、API 对接测试

### 5.1 检查环境变量

确认前端 `.env.development` 中的 API 地址配置正确：

```ini
VITE_GLOB_API_URL=http://localhost:7788
```

### 5.2 启动前端

```shell
cd frontend/admin/vue-vben
pnpm dev:antd
```

访问 <http://localhost:5666>。

### 5.3 功能测试

#### 测试列表查询

1. 进入"文章管理 → 文章列表"
2. 打开浏览器开发者工具（F12）
3. 切换到 Network 标签
4. 刷新页面，观察是否有请求发送到 `/admin/v1/article`
5. 检查响应数据是否正确

如果看到 401 错误，说明 Token 未携带或已过期，尝试重新登录。

如果看到 403 错误，说明权限不足，检查角色是否已分配对应权限。

#### 测试新建文章

1. 点击"新建"按钮
2. 填写表单信息
3. 点击"提交"
4. 观察 Network 标签，确认 POST 请求发送到 `/admin/v1/article`
5. 检查响应状态码是否为 200

#### 测试编辑文章

1. 点击某条记录的"编辑"按钮
2. 修改表单内容
3. 点击"提交"
4. 观察 Network 标签，确认 PUT 请求发送到 `/admin/v1/article/{id}`

#### 测试删除文章

1. 点击某条记录的"删除"按钮
2. 确认删除操作
3. 观察 Network 标签，确认 DELETE 请求发送到 `/admin/v1/article/{id}`

## 六、常见问题排查

### 6.1 菜单不显示

**可能原因**：
1. 菜单未正确配置
2. 用户角色未分配权限
3. 浏览器缓存未清除

**解决方法**：
1. 检查后端数据库中 `menus` 表是否有对应记录
2. 检查 `role_menus` 关联表是否正确
3. 清除浏览器缓存（Ctrl + Shift + Delete）
4. 退出登录后重新登录

### 6.2 API 请求 401

**可能原因**：
1. Token 未携带
2. Token 已过期
3. Token 格式错误

**解决方法**：
1. 检查请求 Header 中是否有 `Authorization: Bearer <token>`
2. 重新登录获取新 Token
3. 检查前端代码中是否正确配置了 Axios 拦截器

### 6.3 API 请求 403

**可能原因**：
1. 用户没有对应权限
2. 权限标识配置错误
3. 授权引擎未正确初始化

**解决方法**：
1. 检查用户角色是否已分配对应菜单权限
2. 检查菜单的"权限标识"字段是否与后端一致
3. 临时将 `auth.yaml` 中的 `authz.type` 改为 `noop` 进行测试

### 6.4 API 请求 404

**可能原因**：
1. 接口路径错误
2. 后端服务未启动
3. Handler 未注册

**解决方法**：
1. 检查前端请求路径是否与 Protobuf 定义一致
2. 确认后端服务正在运行
3. 检查 `rest_server.go` 中是否已注册对应的 Handler

### 6.5 TypeScript 类型报错

**可能原因**：
1. 未生成最新的 TypeScript 代码
2. IDE 缓存问题

**解决方法**：
1. 在后端执行 `make ts` 重新生成代码
2. 重启前端开发服务器
3. 重启 IDE（VSCode / WebStorm）

## 七、调试技巧

### 7.1 后端日志

后端默认输出日志到控制台，可以通过调整 `logger.yaml` 中的日志级别来获取更多调试信息：

```yaml
logger:
  type: std
  zap:
    level: "debug"  # 改为 debug 查看更多细节
```

### 7.2 前端调试

在浏览器开发者工具中：

1. **Console 标签**：查看 JavaScript 错误和 console.log 输出
2. **Network 标签**：查看 HTTP 请求和响应
3. **Vue Devtools**：安装 Vue Devtools 插件，查看组件状态和事件

### 7.3 Swagger UI 测试

在开发阶段，可以优先使用 Swagger UI 测试后端接口：

1. 访问 <http://localhost:7788/docs/>
2. 找到 ArticleService
3. 点击"Authorize"输入 Token
4. 逐个测试接口

这样可以先确保后端接口正常，再调试前端。

## 八、性能优化建议

### 8.1 后端优化

1. **数据库索引**：为常用查询字段添加索引
   ```sql
   CREATE INDEX idx_articles_title ON articles(title);
   CREATE INDEX idx_articles_status ON articles(status);
   ```

2. **分页查询**：避免一次性加载大量数据，始终使用分页

3. **缓存热点数据**：对于频繁读取的数据，可以使用 Redis 缓存

### 8.2 前端优化

1. **懒加载路由**：Vben Admin 已默认启用路由懒加载
2. **组件按需引入**：避免引入未使用的 Ant Design Vue 组件
3. **图片压缩**：上传前对图片进行压缩处理

## 九、部署注意事项

### 9.1 后端部署

生产环境部署时：

1. 修改 `data.yaml` 中的数据库地址和密码
2. 修改 `auth.yaml` 中的 JWT 密钥
3. 关闭 Swagger UI（`enable_swagger: false`）
4. 启用 HTTPS

### 9.2 前端部署

1. 修改 `.env.production` 中的 API 地址为生产环境地址
2. 执行 `pnpm run build:antd` 构建生产版本
3. 将 `dist/` 目录部署到 Nginx 或其他 Web 服务器

### 9.3 CORS 配置

如果前后端部署在不同域名下，需要在后端 `server.yaml` 中配置 CORS：

```yaml
server:
  rest:
    cors:
      origins:
        - "https://your-frontend-domain.com"
```

## 十、总结

通过本教程，我们完成了前后端联调的完整流程：

1. **后端开发**：Protobuf → Ent → Data → Service → Server
2. **前端开发**：API → Composable → 页面 → 路由
3. **权限配置**：菜单管理 → 角色授权
4. **联调测试**：功能验证 → 问题排查

掌握这套流程后，可以快速开发任何新的业务模块，并确保前后端无缝对接。

## 十一、相关文档

- [后端新增业务模块实战教程](./backend-tutorial-new-module.md)
- [前端新增业务页面实战教程](./frontend-tutorial-new-page.md)
- [后端 API 与 Protobuf 定义](./backend-api.md)
- [前端核心功能详解](./frontend-modules.md)
