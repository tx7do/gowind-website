# 常见问题 (FAQ)

## 项目相关

### Q: GoWind 是什么？

A: GoWind 是一套基于 Go 语言开发的开源项目生态，包含四个核心产品：

- **GoWind Admin** - 企业级后台管理系统
- **GoWind CMS** - 高性能内容管理系统
- **GoWind IM** - 轻量级即时通讯组件
- **GoWind UBA** - 用户行为分析工具

所有项目均基于 MIT 协议开源，可自由用于商业项目。

### Q: 如何选择使用哪个产品？

A: 根据业务场景选择：

| 产品        | 适用场景                |
|-----------|---------------------|
| **Admin** | 企业中后台、管理系统、数据平台     |
| **CMS**   | 新闻资讯、博客、内容门户、电商平台   |
| **IM**    | 实时聊天、客服系统、在线协作、游戏社交 |
| **UBA**   | 产品分析、用户研究、业务决策、数据驱动 |

各产品可独立使用，也可无缝集成。

### Q: GoWind 支持商用吗？

A: 完全支持！所有项目均基于 MIT 协议开源，商用无限制。

### Q: 有演示环境吗？

A: 有的，无需部署即可在线体验：

- **Admin 演示**：<https://demo.admin.gowind.cloud>
- **API 文档**：<https://api.demo.admin.gowind.cloud/docs/>
- **默认账号**：`admin` / `admin`

---

## 环境和安装

### Q: 系统最低要求是什么？

A:

- **Go**：1.18+
- **Node.js**：16+
- **数据库**：MySQL 8.0+ 或 PostgreSQL 12+
- **缓存**：Redis 6.0+（可选）
- **容器**：Docker 20.10+（可选）

### Q: 在 Windows 上如何安装？

A:

1. 下载并安装 Go（<https://go.dev/dl/>）
2. 下载并安装 Node.js（<https://nodejs.org/>）
3. 使用 Chocolatey 安装 Docker（可选）：
   ```powershell
   choco install golang nodejs docker-desktop
   npm install -g pnpm
   ```
4. 克隆仓库并按照快速开始指南操作

### Q: 在 Linux 上如何快速安装所有依赖？

A:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y golang-go nodejs docker.io docker-compose

# 或使用 Docker 环境
docker run -it golang:1.21 bash
```

### Q: 如何使用 Docker 快速启动开发环境？

A: 在项目根目录执行：

```bash
docker-compose up -d
```

这将自动启动：

- MySQL 数据库
- Redis 缓存
- 后端服务
- 前端开发服务

### Q: 如何安装 pnpm？为什么推荐 pnpm？

A: 安装方式：

```bash
npm install -g pnpm
```

推荐理由：

- 速度快（比 npm 快 3 倍以上）
- 磁盘占用小（使用硬链接共享依赖）
- 严格的依赖隔离
- 更好的单体仓库支持

---

## 开发相关

### Q: 推荐使用什么编辑器？

A:

- **Go 后端开发**：
    - VS Code + Go 扩展（免费）
    - GoLand（付费，功能最强）
    - Vim + vim-go（终端编辑）

- **Vue3 前端开发**：
    - VS Code + Volar 扩展（推荐）
    - WebStorm（付费）
    - Vim + coc-volar（终端编辑）

### Q: 后端开发时如何启用热加载？

A:

```bash
cd backend/app/admin/service

# 使用 air 工具实现热加载
gow run admin

# 或使用传统方式
make watch
```

每次修改代码后会自动重启服务。

### Q: 前端开发时支持热加载吗？

A: 是的，使用以下命令启动前端开发服务：

```bash
cd frontend
pnpm dev:antd
```

Vite 会自动监听文件变化并进行热更新，修改代码后浏览器会实时刷新。

### Q: 如何生成 API 代码？

A:

```bash
cd backend

# 生成 Go 和 TypeScript 代码
make proto

# 或使用 buf 工具
buf generate
```

生成的代码会自动放入 `api/gen/` 目录。

### Q: 如何运行单元测试？

A:

```bash
cd backend

# 运行所有测试
make test

# 运行特定包的测试
go test ./app/admin/service/internal/...

# 查看测试覆盖率
make cover
```

### Q: 如何调试后端代码？

A: 使用 VS Code + Go 扩展：

1. 在代码行号处点击设置断点
2. 按 F5 或点击"运行和调试"
3. 选择"Go: Launch program"配置
4. 代码执行到断点时会暂停

或使用 GoLand 的内置调试器。

### Q: 如何修改数据库为 PostgreSQL？

A:

1. 编辑 `backend/app/admin/service/configs/config.yaml`
2. 将数据库配置中的 `mysql` 改为 `postgres`
3. 修改连接字符串：
   ```yaml
   data:
     database:
       driver: postgres
       dsn: "host=localhost port=5432 user=postgres password=postgres dbname=admin sslmode=disable"
   ```

### Q: 如何添加新的数据库表？

A: 使用 Ent ORM 框架：

```bash
cd backend

# 创建新的 schema
go run entc.go schema <table_name>

# 编辑 schema 文件
vim ent/schema/<table_name>.go

# 生成代码
go generate ./ent

# 创建迁移文件
go run -mod=mod entgo.io/ent/cmd/ent migrate diff <migration_name>
```

---

## 部署相关

### Q: 如何构建生产环境版本？

A:

```bash
# 后端构建
cd backend
make build

# 前端构建
cd ../frontend
pnpm build:antd
```

生成的产物：

- 后端：`backend/bin/admin`（二进制可执行文件）
- 前端：`frontend/dist/`（静态资源目录）

### Q: 如何使用 Docker 部署到生产环境？

A:

```bash
# 构建 Docker 镜像
docker build -t gowind-admin:latest .

# 运行容器
docker run -d \
  -p 7788:7788 \
  -e DATABASE_DSN="your-database-dsn" \
  -e REDIS_ADDR="your-redis-addr" \
  gowind-admin:latest

# 查看日志
docker logs -f <container-id>
```

### Q: 如何配置反向代理（Nginx）？

A: 参考配置文件 `nginx.conf`：

```nginx
upstream admin_backend {
    server localhost:7788;
}

upstream admin_frontend {
    server localhost:5555;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://admin_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name admin.example.com;

    location / {
        proxy_pass http://admin_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Q: 如何配置 HTTPS？

A: 使用 Let's Encrypt 证书：

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 申请证书
sudo certbot certonly --nginx -d api.example.com -d admin.example.com

# 在 Nginx 配置中启用 SSL
listen 443 ssl;
ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
```

### Q: 如何监控服务运行状态？

A: 后端提供健康检查接口：

```bash
# 健康检查
curl http://localhost:7788/health

# 指标查询（Prometheus 格式）
curl http://localhost:7788/metrics
```

---

## 问题排查

### Q: 启动后端服务时出现 "port already in use" 错误？

A: 解决方案：

```bash
# 查找占用 7788 端口的进程
lsof -i :7788

# 杀死进程
kill -9 <PID>

# 或者修改配置文件中的端口
vim backend/app/admin/service/configs/config.yaml
# 修改 server.port
```

### Q: 连接数据库失败？

A: 检查以下项目：

1. 数据库是否正常运行
2. 连接字符串是否正确（用户名、密码、主机、端口）
3. 数据库用户是否有足够权限
4. 防火墙是否阻止连接

```bash
# 测试连接
mysql -h localhost -u root -p

# 或
psql -h localhost -U postgres
```

### Q: 前端无法连接到后端 API？

A: 检查以下项目：

1. 后端服务是否正常运行
2. 前端配置中的 API 地址是否正确
3. CORS 跨域设置是否正确
4. 网络连接和防火墙

```bash
# 查看浏览器控制台（F12）的网络请求
# 检查是否有 CORS 相关错误
```

### Q: 构建前端时出现 "out of memory" 错误？

A: 增加 Node 内存限制：

```bash
# 设置 Node 堆内存为 2GB
export NODE_OPTIONS="--max-old-space-size=2048"

# 重新构建
pnpm build:antd
```

### Q: 如何查看详细的错误日志？

A:

```bash
# 后端日志（开发模式）
gow run admin 2>&1 | tee app.log

# 前端日志
pnpm dev:antd 2>&1 | tee frontend.log

# 系统日志
docker logs <container-id>
journalctl -u gowind-admin -f
```

### Q: 忘记后台管理员密码怎么办？

A: 使用命令行重置：

```bash
cd backend/app/admin/service

# 重置密码
gow run admin cmd admin:reset-password admin newpassword
```

---

## 功能相关

### Q: 如何添加新的权限或菜单？

A:

1. 在数据库中添加权限记录（`sys_menu` 表）
2. 前端路由会自动同步权限
3. 使用 Admin API 重新获取权限列表

### Q: 如何自定义主题颜色？

A: 编辑前端主题配置：

```typescript
// frontend/apps/admin/src/theme.ts
export const themeConfig = {
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#f5222d',
}
```

### Q: 是否支持国际化（i18n）？

A: 是的，已内置国际化支持。语言文件位于 `frontend/packages/i18n/`：

```bash
# 添加新语言
cp -r frontend/packages/i18n/zh-CN frontend/packages/i18n/fr-FR
# 编辑翻译文件
```

### Q: 如何上传文件到对象存储（OSS）？

A: 配置 OSS 参数：

```yaml
# backend/app/admin/service/configs/config.yaml
oss:
  provider: aliyun  # 或 minio, aws, etc
  bucket: my-bucket
  endpoint: oss-cn-hangzhou.aliyuncs.com
  access_key: your-access-key
  secret_key: your-secret-key
```

### Q: 如何编写自定义 Lua 脚本？

A:

```lua
-- scripts/custom.lua
local function hello(name)
  return "Hello, " .. name
end

return {
  hello = hello
}
```

在 API 中调用：

```go
result := luaEngine.Call("custom.hello", "World")
```

---

## 贡献相关

### Q: 如何参与项目贡献？

A:

1. Fork 项目仓库
2. 创建功能分支：`git checkout -b feature/my-feature`
3. 提交更改：`git commit -m 'Add my feature'`
4. 推送分支：`git push origin feature/my-feature`
5. 创建 Pull Request

详见 [贡献指南](/guide/contribution.md)

### Q: 代码规范有哪些要求？

A:

- **Go**：遵循 Go Code Review Comments（`gofmt`, `golint`）
- **TypeScript/Vue**：使用 ESLint 和 Prettier 格式化
- **Commit 消息**：遵循 Conventional Commits 规范

### Q: 如何报告 Bug？

A: 在 GitHub Issues 中提交，包含：

1. Bug 描述和重现步骤
2. 预期行为和实际行为
3. 环境信息（OS、Go/Node 版本、浏览器等）
4. 相关日志或截图

### Q: 如何提出新功能建议？

A: 在 GitHub Discussions 中讨论，或创建 GitHub Issues（标记为 `enhancement`）。

---

## 性能和优化

### Q: 如何提升后端服务性能？

A:

1. **启用 Redis 缓存**
2. **使用连接池**
3. **启用数据库查询优化**（加索引）
4. **开启 GZIP 压缩**
5. **使用 CDN 加速静态资源**

### Q: 前端页面加载速度较慢怎么办？

A:

1. 启用 Vite 的代码分割
2. 使用 Tree Shaking 移除未使用代码
3. 启用 Gzip 压缩
4. 优化图片大小
5. 使用 CDN 加速

### Q: 如何进行性能测试和监控？

A:

```bash
# 后端性能测试
go test -bench=. -benchmem

# 前端性能分析
pnpm build:antd --analyze

# 使用 Prometheus + Grafana 进行实时监控
```

---

## 安全相关

### Q: 如何保护 API 接口？

A:

1. **启用 HTTPS**：所有生产环境必须使用 HTTPS
2. **API 认证**：使用 JWT Token 或 OAuth
3. **速率限制**：防止 DDoS 攻击
4. **输入验证**：验证所有用户输入
5. **SQL 防注入**：使用参数化查询

### Q: 如何防止 XSS 攻击？

A:

- Vue3 模板自动转义 HTML
- 避免使用 `v-html`，改用 `{{ }}`
- 对用户输入进行清理和验证

### Q: 密码如何加密存储？

A: 使用 bcrypt 算法（项目已内置）：

```go
// 后端密码加密
hashedPassword := bcrypt.Generate(password)

// 验证密码
bcrypt.Compare(hashedPassword, inputPassword)
```

### Q: 敏感信息（如 API Key）如何管理？

A:

1. **不要提交到代码仓库**
2. **使用环境变量**：`export DATABASE_PASSWORD=xxx`
3. **使用密钥管理服务**：HashiCorp Vault
4. **定期轮换**：定期更新密钥

### Q: 如何进行安全审计？

A:

```bash
# 检查依赖漏洞
go list -json -m all | nancy sleuth

# 或使用 Snyk
snyk test

# 代码安全扫描
golangci-lint run
```

---

## 其他问题

### Q: 项目文档在哪里？

A:

- 官方文档：<https://gowind.cloud>
- GitHub Wiki：<https://github.com/tx7do/go-wind-admin/wiki>
- API 文档：<https://api.demo.admin.gowind.cloud/docs/>

### Q: 如何获得技术支持？

A:

- 📧 邮件：<yanglinbo@gmail.com>
- 💬 GitHub Discussions：<https://github.com/tx7do/go-wind-admin/discussions>
- 🐛 Bug 反馈：<https://github.com/tx7do/go-wind-admin/issues>
- 📖 文档讨论：<https://github.com/tx7do/gowind-website/issues>

### Q: 项目的开发进度如何？

A: 关注 GitHub Project 面板：<https://github.com/tx7do/go-wind-admin/projects>

### Q: 是否有企业级支持？

A: 是的，可联系 business@gowind.cloud 咨询商业支持服务。

### Q: 如何保持最新版本？

A:

```bash
# 拉取最新代码
git pull origin main

# 更新依赖
go mod tidy
pnpm update

# 查看版本号
cat version.txt
```

### Q: 项目更新频率如何？

A:

- 主要功能更新：每月一次
- Bug 修复和补丁：实时发布
- 安全补丁：优先级最高，及时发布

---

## 更多帮助

如果您的问题未在本文档中列出，欢迎：

1. 📚 查看 [快速开始指南](/guide/getting-started.md)
2. 📖 阅读 [产品文档](/admin/intro.md)
3. 💬 提问：[GitHub Discussions](https://github.com/tx7do/go-wind-admin/discussions)
4. 📧 邮件反馈：<yanglinbo@gmail.com>
5. 🐛 报告 Bug：[GitHub Issues](https://github.com/tx7do/go-wind-admin/issues)

感谢您的使用和支持！
