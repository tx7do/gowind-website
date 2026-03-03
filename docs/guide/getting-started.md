# 快速开始

欢迎使用 GoWind 生态！本指南将帮助您快速体验和部署 GoWind 产品。

## 一、在线体验（推荐首先尝试）

无需任何部署，直接在线体验完整功能：

| 产品        | 体验地址                                     | API 文档                                                                                          | 默认账号              |
|-----------|------------------------------------------|-------------------------------------------------------------------------------------------------|-------------------|
| **Admin** | [admin](https://demo.admin.gowind.cloud) | [Swagger](https://api.demo.admin.gowind.cloud/docs/)                                            | `admin` / `admin` |
| **CMS**   | [admin](https://admin.cms.gowind.cloud)  | [Admin](https://api.admin.cms.gowind.cloud/docs/)、[App](https://api.app.cms.gowind.cloud/docs/) | `admin` / `admin` |
| **IM**    | [web](https://im.gowind.cloud)           | -                                                                                               | -                 |
| **UBA**   | 敬请期待                                     | -                                                                                               | -                 |

## 二、选择您的产品

GoWind 生态包含四个核心产品，请根据需求选择：

### 1. GoWind Admin - 企业级后台管理系统

**适用场景**：企业中后台、管理系统、数据平台

**核心功能**：

- 完善的权限体系（RBAC）
- 丰富的业务组件库
- 可视化数据分析
- API 管理和文档
- Lua 脚本扩展能力

**快速开始**：[前往 Admin 文档 →](/admin/intro.md)

**技术栈**：Go 1.18+ / Vue3 / Kratos 框架 / Ant Design Vue

---

### 2. GoWind CMS - 高性能内容管理系统

**适用场景**：新闻资讯、博客、内容门户、电商平台

**核心功能**：

- 灵活的内容管理
- 多端适配发布
- 评论和互动
- 内容审核流程
- SEO 优化

**快速开始**：[前往 CMS 文档 →](/cms/intro.md)

---

### 3. GoWind IM - 轻量级即时通讯组件

**适用场景**：实时聊天、客服系统、在线协作、游戏社交

**核心功能**：

- 私聊和群聊
- 消息推送
- 在线状态检测
- 消息已读回执
- 文件传输

**快速开始**：[前往 IM 文档 →](/im/intro.md)

---

### 4. GoWind UBA - 用户行为分析工具

**适用场景**：产品分析、用户研究、业务决策、数据驱动

**核心功能**：

- 数据采集和埋点
- 事件分析
- 用户画像构建
- 漏斗分析
- 对比分析

**快速开始**：[前往 UBA 文档 →](/uba/intro.md)

---

## 三、环境准备

### 最低系统要求

| 组件                   | 版本要求       | 说明         |
|----------------------|------------|------------|
| **Go**               | 1.18+      | 后端服务运行环境   |
| **Node.js**          | 16+        | 前端构建工具     |
| **Docker**           | 20.10+     | 容器运行环境（可选） |
| **MySQL/PostgreSQL** | 8.0+ / 12+ | 数据库        |
| **Redis**            | 6.0+       | 缓存和消息队列    |
| **MinIO**            |            | 文件存储       |

### 开发工具安装

#### macOS

```bash
# 使用 Homebrew 安装
brew install go node docker

# 安装 pnpm（推荐的包管理器）
npm install -g pnpm
```

#### Ubuntu/Debian

```bash
# 安装 Go
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 pnpm
npm install -g pnpm

# 安装 Docker
sudo apt-get install docker.io docker-compose
```

#### Windows

```powershell
# 使用 Chocolatey 安装
scoop install golang nodejs docker-desktop

# 安装 pnpm
npm install -g pnpm
```

## 四、快速启动（以 Admin 为例）

### 第一步：克隆代码仓库

```bash
git clone https://github.com/tx7do/go-wind-admin.git
cd go-wind-admin
```

### 第二步：启动后端服务

```bash
cd backend

# 首次运行需要执行准备脚本
./script/prepare.sh

# 安装依赖工具和插件
make init

# 启动服务（推荐方式）
gow run admin

# 或者使用传统方式
cd app/admin/service
make run

# 服务将在 http://localhost:7788 启动
```

### 第三步：启动前端服务

```bash
cd ../frontend

# 安装前端依赖
pnpm install

# 启动开发服务
pnpm dev:antd

# 前端将在 http://localhost:5555 启动
```

### 第四步：访问应用

- **管理页面**：[http://localhost:5555](http://localhost:5555)
- **API 文档**：[http://localhost:7788/docs/](http://localhost:7788/docs/)
- **默认账号**：`admin` / `admin`

## 五、Docker Compose 快速启动

如果您希望使用 Docker 启动完整的开发环境（包含数据库、Redis 等依赖）：

```bash
# 在项目根目录执行
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

更多详细说明请参考各产品的安装文档。

## 六、常见问题

### Q: 可以用什么编辑器开发？

A: 推荐使用：

- **Go 后端**：VS Code（Go 扩展）、GoLand、Vim
- **Vue3 前端**：VS Code（Volar 扩展）、WebStorm

### Q: 如何切换数据库为 PostgreSQL？

A: 修改 `backend/app/admin/service/configs/config.yaml` 中的数据库配置，将 `mysql` 改为 `postgres`。

### Q: 前端开发时支持热加载吗？

A: 支持，使用 `pnpm dev:antd` 命令时已自动启用 Vite 热加载。

### Q: 如何部署到生产环境？

A: 请参考各产品的部署指南，或联系社区获取帮助。

## 七、获取帮助

- 📖 **文档**：[GoWind 官方文档](https://gowind.cloud)
- 🐛 **问题反馈**：[GitHub Issues](https://github.com/tx7do/go-wind-admin/issues)
- 💬 **社区讨论**：[GitHub Discussions](https://github.com/tx7do/go-wind-admin/discussions)
- 📧 **邮件支持**：<yanglinbo@gmail.com>

## 八、下一步

- ✅ 完成了快速体验
- 👉 [深入了解 Admin 架构](/admin/intro.md)
- 👉 [查看安装部署指南](/admin/installation.md)
- 👉 [浏览 API 文档](<https://api.demo.admin.gowind.cloud/docs/>)

祝您使用愉快！
