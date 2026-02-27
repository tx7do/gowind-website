# GoWind Admin 产品介绍

GoWind Admin 是一套面向中大型项目的企业级中后台解决方案，基于 Go 微服务生态（Kratos）与 Vue3 + Vben Admin
前端体系构建，提供开箱即用的后台管理能力、完善的权限体系、丰富的组件库及可扩展的插件机制，旨在降低中后台系统的开发成本，提升交付效率。

## 一、核心特性

### 1. 技术栈优势

| 维度	   | 核心技术	                                                             | 优势说明                                |
|-------|-------------------------------------------------------------------|-------------------------------------|
| 后端	   | Go 1.18+、Kratos 微服务框架、Ent ORM、Protobuf + Buf	                     | 高性能、易扩展的微服务架构，标准化 API 定义与生成，适配云原生部署 |
| 前端	   | Vue3 (Setup Script)、TypeScript、Vite、Ant Design Vue、Vben Admin 生态	 | 现代化前端工程化体系，丰富的开箱即用组件，支持主题定制、响应式布局   |
| 工程化	  | Makefile 自动化构建、Docker 容器化、Buf 代码生成、ESLint/Prettier 规范	            | 全流程工程化管控，降低协作成本，保障代码质量              |
| 扩展能力	 | Lua 脚本扩展、自定义 API 模块、插件化组件	                                        | 支持业务逻辑灵活扩展，无需修改核心代码即可适配个性化需求        |

### 2. 核心功能

- **完善的权限体系**：基于 Kratos 后端的细粒度权限管控，适配前端路由、组件、菜单级别的权限校验；
- **丰富的业务组件**：内置字典管理、可视化图表（ECharts）、富文本编辑器（UEditorPlus）、JSON 查看器等高频业务组件；
- **标准化 API 体系**：基于 Protobuf 定义接口，自动生成 Go/TypeScript 代码及 OpenAPI 文档，前后端对接无成本；
- **多环境适配**：支持开发 / 测试 / 生产环境配置隔离，Docker Compose 一键启动依赖服务（MySQL/PostgreSQL/Redis）；
- **可扩展的脚本能力**：内置 Lua 引擎，支持自定义 API 模块开发，快速适配个性化业务逻辑；
- **全流程工程化**：从代码生成、静态检查、测试到构建部署，提供完整的 Makefile 自动化流程。

## 二、架构设计

### 1. 整体架构

GoWind Admin 采用前后端分离架构，核心分为三层：

- **前端层**：基于 Vben Admin 封装，提供统一的布局、组件、权限管控，适配多终端响应式展示；
- **API 层**：基于 Kratos 实现的微服务接口，通过 Protobuf 标准化定义，支持 HTTP/GRPC 双协议；
- **数据层**：适配 PostgreSQL/MySQL 数据库，基于 Ent ORM 实现数据访问，支持 Redis 缓存、配置中心等扩展能力。

### 2. 后端项目结构

```text
backend/
├── api/                # Protobuf API 定义与生成代码
│   ├── gen/            # 自动生成的 Go/TypeScript 代码
│   └── protos/         # Protobuf 原始定义文件
├── app/                # 应用服务代码（Admin 核心服务）
│   └── admin/service/  # Admin 服务实现（命令行、配置、内部逻辑）
│       ├── cmd/        # 服务入口
│       ├── configs/    # 服务配置（数据库、Redis、客户端等）
│       └── internal/   # 内部业务逻辑（数据访问、中间件、服务实现）
├── pkg/                # 通用工具包（Lua 引擎、加密、OSS 等）
├── script/             # 构建/部署脚本
├── sql/                # 数据库初始化脚本
└── Makefile            # 自动化构建指令
```

### 3. 前端项目结构

```text
frontend/
├── apps/admin/         # 管理端前端核心代码
│   ├── src/views/      # 业务页面（字典管理、权限、可视化等）
│   └── public/         # 静态资源（富文本编辑器、Logo 等）
├── packages/           # 通用包（组件库、工具函数、国际化等）
└── lint-configs/       # 代码规范配置（ESLint、JSDoc 等）
```
### 三、快速体验

#### 1. 环境准备

- **后端**：安装 Go 1.18+、Buf、Docker Compose；
- **前端**：安装 Node.js 16+、pnpm（推荐）。

#### 2. 在线演示

无需部署，直接体验完整功能：

- **前端管理页面**：<https://demo.admin.gowind.cloud>
- **后端 API 文档（Swagger）**：<https://api.demo.admin.gowind.cloud/docs/>
- **默认账号密码**：`admin` / `admin`

#### 3. 一键启动

##### 后端启动

```shell
git clone https://github.com/tx7do/go-wind-admin.git

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

##### 前端启动

```shell
cd go-wind-admin/frontend

# 安装依赖
pnpm install

# 启动开发服务（AntdVue版本）
pnpm dev:antd
```

#### 4. 访问地址

- 前端管理页面：<http://localhost:5555>；
- 后端 API 文档（Swagger）：<http://localhost:7788/docs/>；
- OpenAPI 配置文件：<http://localhost:7788/docs/openapi.yaml>。

## 四、核心能力详解

### 1. 权限体系

GoWind Admin 基于 Casbin、OPA等 实现后端权限管控，前端适配 Vben Admin 的权限逻辑：

- 后端：基于Casbin、OPA中间件实现接口级权限校验，支持自定义认证方式；
- 前端：支持路由守卫、组件级权限、菜单可见性控制，适配多角色权限隔离；
- 扩展能力：可通过 Lua、Javascript 脚本扩展权限校验逻辑，适配复杂业务场景。

### 2. 标准化 API 开发

基于 Protobuf 定义接口，通过 Buf 自动生成：

- Go 服务端代码、TypeScript 前端请求代码；
- OpenAPI v3 文档，直接对接 Swagger UI；

一键生成指令：

```shell
# 生成 Go 代码
make api

# 生成 OpenAPI 文档
make openapi

# 生成 TypeScript 代码
make ts
```

### 3. 扩展开发

#### 后端扩展（Lua API 模块）

支持自定义 Lua API 模块，快速扩展业务逻辑：

```go
// 注册自定义 Lua API
func (e *Engine) registerAPIs(L *lua.LState) {
    api.RegisterMyAPI(L, e.myService, e.logger)
}
```

#### 前端扩展（自定义组件）

复用通用组件库快速开发业务页面：

```vue
<script lang="ts" setup>
import { ColPage, JsonViewer } from '@vben/common-ui';
</script>

<template>
  <ColPage leftWidth="40" rightWidth="60">
    <template #left>自定义左侧内容</template>
    <JsonViewer :value="data" copyable />
  </ColPage>
</template>
```

### 4. 富文本编辑器

内置 Hiptap 富文本编辑器，支持：

- 格式化文本、表格、公式、代码块；
- 草稿箱自动保存 / 恢复、快捷键操作；
- 图片上传、Word 图片导入等实用功能。

## 五、工程化与规范

### 1. 代码规范

- **后端**：Go 代码遵循 golangci-lint 规范，通过 Makefile 自动校验；
- **前端**：ESLint + Prettier 规范，内置 JSDoc 注释校验，保障代码可读性；
- **文档规范**：Markdown 格式统一，适配多语言国际化。

### 2. 构建与部署

- **自动化构建**：Makefile 封装编译、测试、打包全流程；
- **容器化部署**：支持 Docker 镜像构建，Docker Compose 一键部署依赖服务；
- **多环境适配**：配置文件隔离开发 / 测试 / 生产环境，支持配置中心扩展。

## 六、开源协议与生态

GoWind Admin 基于 MIT 协议开源，可自由用于商业项目，核心生态依赖：

- **后端**：Kratos 微服务框架、Ent ORM、Buf 工具链；
- **前端**：Vben Admin、Ant Design Vue、Vite；
- **扩展生态**：Lua 脚本引擎、ECharts 可视化、UEditorPlus 富文本编辑器。

## 七、适用场景

- 企业级中后台系统开发；
- 微服务架构的管理平台建设；
- 需要快速交付、易扩展的后台项目；
- 对权限管控、工程化有高要求的团队。

## 八、相关资源

- 源码仓库：[Github][3]、[Gitee][4]；
- 技术站点：<https://www.gowind.cloud>；
- 前端参考文档：[Vben Admin 官方文档][1]；
- 后端参考文档：[Kratos 官方文档][2]。

[1]:(https://doc.vben.pro)
[2]:(https://go-kratos.dev/docs/)
[3]:(https://github.com/tx7do/go-wind-admin)
[4]:(https://gitee.com/tx7do/go-wind-admin)

