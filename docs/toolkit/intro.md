# GoWind Toolkit 介绍

GoWind Toolkit 是一个为 **Go-Kratos 微服务生态** 打造的一站式全能工具集，包含 `gow` 命令行工具（11 个子命令）、7 个 protoc 插件和跨平台可视化桌面客户端 gowind-uiapp（Wails），提供项目脚手架、自动化代码生成、开发辅助、运维工具等全方位支持。

## 项目定位

GoWind Toolkit 与 GoWind Admin / CMS / IM / UBA 等**业务系统**不同，它是一个**开发工具**：

| 项目   | 性质     | 用途                              |
|--------|----------|-----------------------------------|
| Admin / CMS / IM / UBA | 业务应用 | 可部署运行的服务系统              |
| **Toolkit**            | **开发工具** | CLI + 桌面应用，生成代码、管理微服务 |

**核心理念**：消除重复 CRUD 开发，让开发者专注于核心业务逻辑。

## 功能一览

| 功能                     | CLI | 桌面 UI |
|------------------------|:---:|:-------:|
| 项目脚手架 (`gow new`)  | ✅  | ✅      |
| 添加微服务 (`gow add service`) | ✅ | ✅ |
| 数据库驱动后端 CRUD 代码生成 | ✅ | ✅ |
| ent:// / gorm:// Go 源码直接生成 CRUD（免数据库） | ✅ | ✅ |
| 前端页面全自动生成（Vue3/React） | — | ✅ |
| Ent / GORM 模型生成     | ✅  | ✅      |
| Protobuf gRPC & REST 定义生成 | ✅ | ✅ |
| Wire 依赖注入生成       | ✅  | ✅      |
| 微服务模块提取 (`gow extract`) | ✅ | — |
| 配置导出到 Consul / Etcd / Nacos | — | ✅ |
| 可视化表配置与服务分配   | —   | ✅      |
| AI 辅助 DDL 生成与微服务划分 | — | ✅ |
| AI 代码审查             | —   | ✅      |
| 服务启停管理            | —   | ✅      |
| 开发工具 (buf/wire/ent) | —   | ✅      |

## 项目结构

```
go-wind-toolkit/
├── gowind/            # 模块 1: CLI + 共享库
│   ├── cmd/gow/       # CLI 入口 (go install .../cmd/gow@latest)
│   ├── pkg/           # 导出库（CLI 和 UI 共用）
│   │   ├── generators/      # 代码生成模板与引擎
│   │   ├── sqlkratos/       # SQL → 完整 Kratos 服务生成器
│   │   ├── sqlorm/          # SQL → ORM (ent/gorm) 生成器
│   │   ├── sqlproto/        # SQL → Protobuf/gRPC/REST 转换器
│   │   ├── service/         # 服务脚手架生成器
│   │   ├── extract/         # 微服务模块提取器
│   │   └── configexporter/  # 配置导出 (Consul/Etcd/Nacos)
│   └── internal/     # CLI 专用代码
├── gowind-uiapp/      # 模块 2: Wails 桌面 UI
│   ├── main.go
│   ├── frontend/     # Vue.js 前端
│   └── internal/     # UI 专用代码
│       ├── ai/              # AI 辅助功能
│       ├── configexporter/  # 配置导出
│       ├── database/        # 数据库连接管理
│       ├── detect/          # 项目自动检测
│       ├── devtools/        # 开发工具集成
│       └── generator/       # 代码生成
└── README.md
```

## gow CLI 子命令

`gow` 共提供 11 个子命令：

| 子命令 | 说明 |
|--------|------|
| `new` | 创建新项目脚手架 |
| `add` | 向项目添加组件（如微服务 service） |
| `generate` | 代码生成 |
| `extract` | 从项目中提取微服务模块 |
| `run` | 运行服务 |
| `build` | 构建服务 |
| `ent` | Ent ORM 模型生成 |
| `wire` | Wire 依赖注入生成 |
| `api` | Protobuf API 定义生成 |
| `version` | 版本信息 |
| `help` | 帮助信息 |

## Protoc 插件

除 CLI 外，Toolkit 还提供 7 个 protoc 插件：

| 插件 | 说明 |
|------|------|
| `protoc-gen-fieldmap` | 声明式字段映射生成器（详见 [protoc-gen-fieldmap 字段映射生成器](/toolkit/fieldmap.md)） |
| `protoc-gen-wind-errors` | 错误码生成 |
| `protoc-gen-go-http` | Go HTTP 接口代码生成 |
| `protoc-gen-go-redact` | 字段脱敏生成 |
| `protoc-gen-dart-http` | Dart HTTP 客户端生成 |
| `protoc-gen-typescript-http` | TypeScript HTTP 客户端生成 |
| `protoc-gen-common` | 公共代码生成 |

## 技术栈

| 组件       | 技术                |
|----------|---------------------|
| CLI      | Go, Cobra           |
| 桌面客户端 | Go, Wails v2        |
| 桌面前端  | Vue 3, TypeScript   |
| 代码生成  | Go text/template    |
| AI 集成  | OpenAI Compatible API |
| ORM 支持  | Ent, GORM           |
| 数据库   | MySQL, PostgreSQL, SQLite, Oracle |

## 桌面客户端 gowind-uiapp

gowind-uiapp 是基于 **Vue3 + Wails** 的跨平台桌面客户端，将 Toolkit 的代码生成能力全部可视化：

**后端代码生成**：支持 4 种 Schema 导入源 —— 数据库、OpenAPI 文档、`ent://` 与 `gorm://` Go 源码（免数据库，直接读取 Go 源码中的 schema 定义生成 CRUD）。

![新建后端项目](/assets/images/go_wind_toolkit/create_backend_project.png)

**前端代码生成**：一键生成三套前端工程 —— Vue3 + Element Plus、Vue3 + Vben、React + Ant Design Pro。

![前端代码生成器](/assets/images/go_wind_toolkit/frontend_code_generator_init.png)

**其他能力**：

- 配置导出：Consul / Etcd / Nacos
- AI 助手：OpenAI / DeepSeek / Ollama（见下文）
- 开发工具面板：集成 buf / wire / ent 等开发工具与服务启停管理

完整操作流程见 [后端代码生成](/toolkit/backend-code-generation.md) 与 [前端代码生成](/toolkit/frontend-code-generation.md)。

## AI 助手

桌面客户端集成了多种 LLM 提供商，支持：

- **OpenAI** (GPT-4o 等)
- **DeepSeek**
- **Ollama** (本地模型)
- **Azure OpenAI**
- **自定义** (兼容 OpenAI API 的任意服务)

AI 能力包括：
- 从自然语言需求生成 DDL
- AI 辅助微服务划分
- AI 代码审查

## 获取方式

**GitHub Releases**（推荐）：[https://github.com/tx7do/go-wind-toolkit/releases](https://github.com/tx7do/go-wind-toolkit/releases)

**Gitee 镜像**（仅源码）：[https://gitee.com/tx7do/go-wind-toolkit](https://gitee.com/tx7do/go-wind-toolkit)

**CLI 安装**：

```bash
go install github.com/tx7do/go-wind-toolkit/gowind/cmd/gow@latest
```

---

**相关文档**：

- [后端代码生成](/toolkit/backend-code-generation.md)
- [前端代码生成](/toolkit/frontend-code-generation.md)
- [protoc-gen-fieldmap 字段映射生成器](/toolkit/fieldmap.md)
