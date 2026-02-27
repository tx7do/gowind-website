# GoWind Admin 安装指南

本文档详细介绍 GoWind Admin 的完整安装流程，包含开发环境安装（用于本地开发调试）和生产环境部署（用于线上运行）两种场景，覆盖
Windows/MacOS/Linux 主流操作系统。

## 一、环境准备

### 1. 基础依赖说明

| 环境类型	 | 核心依赖	                        | 用途说明                  |
|-------|------------------------------|-----------------------|
| 后端	   | Go 1.18+、Docker Compose、Buf	 | 微服务编译、依赖服务管理、API 代码生成 |
| 前端	   | Node.js 16+、pnpm（推荐）	        | 前端工程构建、依赖安装           |

### 2. 操作系统适配

GoWind Admin 支持 Windows、MacOS、Linux（CentOS/Ubuntu/Rocky），不同系统的工具安装方式见下文。

## 二、开发环境安装（本地调试）

### 2.1 后端开发环境安装

#### 步骤 1：安装核心工具

##### Windows 系统（推荐 Scoop 包管理）

```shell
# 安装 Scoop（若未安装）
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# 添加扩展仓库并安装工具
scoop bucket add extras
scoop install git vscode goland docker go protobuf make buf gawk grep sed


# 一键安装（推荐）
./script/prepare_windows.ps1
```

##### MacOS 系统（推荐 Homebrew 包管理）

```shell
# 安装 Homebrew（若未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装核心工具
brew install git docker go protobuf make buf gawk grep gnu-sed
brew install --cask visual-studio-code goland


# 一键安装（推荐）
./script/prepare.sh
```

##### Linux 系统（CentOS/Ubuntu/Rocky）

Linux 系统可直接执行项目内置脚本完成环境初始化：

```shell
# CentOS
./script/prepare_centos.sh

# Ubuntu
./script/prepare_ubuntu.sh

# Rocky
./script/prepare_rocky.sh


# 自适应一键安装（推荐）
./script/prepare.sh
```

#### 步骤 2：安装 Protobuf 插件

后端依赖 Protobuf 相关插件生成 API 代码，可手动安装或通过 Makefile 一键安装：

```shell
# 手动安装
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
go install github.com/go-kratos/kratos/cmd/protoc-gen-go-http/v2@latest
go install github.com/go-kratos/kratos/cmd/protoc-gen-go-errors/v2@latest
go install github.com/google/gnostic/cmd/protoc-gen-openapi@latest
go install github.com/envoyproxy/protoc-gen-validate@latest

# 一键安装（推荐）
cd go-wind-admin/backend
make plugin
```

#### 步骤 3：安装命令行工具

```shell
cd go-wind-admin/backend
make cli
```

### 2.2 前端开发环境安装

#### 步骤 1：安装核心工具

##### Windows 系统

```shell
scoop bucket add extras
scoop install git vscode webstorm nodejs pnpm
```

##### MacOS 系统

```shell
brew install git node pnpm
brew install --cask visual-studio-code webstorm
```

##### Linux 系统

```shell
# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs pnpm git

# CentOS/Rocky
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs pnpm git
```

#### 步骤 2：切换国内镜像源（可选，解决下载慢问题）

```shell
# 方式1：使用 nrm/yrm 管理源
npm install -g nrm
nrm use taobao

# 方式2：直接修改 pnpm 源
pnpm config set registry https://registry.npmmirror.com
```

#### 步骤 3：安装前端依赖

```shell
cd go-wind-admin/frontend
pnpm install
```

### 2.3 启动开发服务

#### 后端启动

```shell
cd go-wind-admin/backend

# 第一次的时候，需要执行准备脚本，安装依赖工具和插件，根据系统环境自动适配（Centos/Rocky/Ubuntu/MacOS）
./script/prepare.sh

# 第一次的时候，安装依赖插件以及工具
make init

# 启动服务
gow run admin
# 或者
cd app/admin/service
make run
```

#### 前端启动

```shell
cd go-wind-admin/frontend

# 安装依赖
pnpm install

# 启动开发服务（AntdVue版本）
pnpm dev:antd
```

#### 验证访问

- 前端管理页面：<http://localhost:5555>
- 后端 Swagger 文档：<http://localhost:7788/docs/>

## 三、生产环境部署

### 3.1 部署前准备

#### 1. 服务器环境初始化（执行对应系统的初始化脚本）：

```shell
# 进入后端目录
cd go-wind-admin/backend

# 赋予脚本执行权限
chmod +x ./script/*.sh

# 执行系统初始化脚本（根据服务器操作系统选择对应脚本）
./script/prepare.sh
```

#### 2. 修改 hosts 文件（解决容器服务域名解析问题）：

```ini
# Linux/MacOS: /etc/hosts ；
# Windows: C:\Windows\System32\drivers\etc\hosts
127.0.0.1 postgres
127.0.0.1 redis
127.0.0.1 minio
127.0.0.1 jaeger
```

### 3.2 部署方式选择

GoWind Admin 提供两种生产部署方式，可根据实际需求选择：

#### 方式 1：全 Docker 部署（推荐）

三方中间件（PostgreSQL/Redis/MinIO）和微服务均运行在 Docker 容器中：

```shell
cd go-wind-admin/backend
./script/docker_compose_install.sh
```

#### 方式 2：混合部署

三方中间件运行在 Docker，微服务运行在宿主机（通过 PM2 管理）：

```shell
cd go-wind-admin/backend

# 仅安装 Docker 依赖中间件
./script/docker_compose_install_depends.sh

# 构建并安装微服务到宿主机
./script/build_install.sh
```

### 3.3 前端生产部署

#### 方式 1：Docker 镜像部署

```shell
cd go-wind-admin/frontend/scripts/deploy
./build-local-docker-image.sh

# 启动前端容器
docker run -d -p 8010:8080 --name vben-admin-local vben-admin-local
```

#### 方式 2：静态资源部署

```shell
cd go-wind-admin/frontend
pnpm run build:antd

# 将 dist 目录下的文件部署到 Nginx/Apache 等 Web 服务器
```
## 四、常见问题解决

### 4.1 后端部署问题

#### 4.1.1 脚本执行权限不足：

执行 `chmod +x ./script/*.sh` 赋予脚本执行权限。

#### 4.1.2 依赖服务启动失败：

检查 Docker Compose 版本，确保 `docker-compose up` 命令可正常执行。

### 4.2 前端部署问题

#### 4.2.1 依赖安装缓慢 / 失败：

切换国内镜像源（如淘宝源），参考「2.2 步骤 3」。

#### 4.2.2 Docker 镜像构建失败：

查看日志文件 `build-local-docker-image.log`，检查依赖安装或构建命令是否报错。

### 4.3 加密配置相关问题

#### 4.3.1 配置加密迁移失败：

- 检查数据库连接是否正常；
- 验证加密密钥（ENCRYPTION_KEY）是否正确；
- 查看迁移工具输出日志定位具体错误。

## 五、验证部署结果

1. 访问前端生产地址（如 <http://服务器IP:8010>）；
2. 访问后端 API 文档（<http://服务器IP:7788/docs/>）；
3. 检查核心依赖服务状态：
    ```shell
    # 查看 Docker 容器状态
    docker ps
    
    # 查看宿主机微服务状态（PM2）
    pm2 list
    ```

## 六、补充说明

1. 所有部署脚本均位于 `backend/script` 目录，Docker 配置文件位于 `backend` 根目录；
2. 数据库初始化脚本位于 `backend/sql` 目录，可按需执行；
3. 如需扩展 Lua 脚本能力，可参考 `backend/pkg/lua/api/README.md` 编写自定义 API 模块；
4. 生产环境建议配置加密密钥（参考 `backend/pkg/crypto/README.md`），保障配置安全。
