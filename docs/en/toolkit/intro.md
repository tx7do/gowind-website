# Introduction to GoWind Toolkit

GoWind Toolkit is an all-in-one toolkit built for the **Go-Kratos microservice ecosystem**, comprising the `gow` CLI (11 subcommands), 7 protoc plugins, and a cross-platform visual desktop client, gowind-uiapp (Wails). It provides all-around support: project scaffolding, automated code generation, development assistance, and ops tooling.

## Project Positioning

Unlike GoWind Admin / CMS / IM / UBA and other **business systems**, GoWind Toolkit is a **development tool**:

| Project   | Nature     | Purpose                              |
|--------|----------|-----------------------------------|
| Admin / CMS / IM / UBA | Business applications | Deployable, runnable service systems              |
| **Toolkit**            | **Development tool** | CLI + desktop app for generating code and managing microservices |

**Core idea**: eliminate repetitive CRUD development so developers can focus on core business logic.

## Feature Overview

| Feature                     | CLI | Desktop UI |
|------------------------|:---:|:-------:|
| Project scaffolding (`gow new`)  | ✅  | ✅      |
| Add a microservice (`gow add service`) | ✅ | ✅ |
| Database-driven backend CRUD code generation | ✅ | ✅ |
| CRUD generation straight from Go source via ent:// / gorm:// (no database needed) | ✅ | ✅ |
| Fully automatic frontend page generation (Vue3/React) | — | ✅ |
| Ent / GORM model generation     | ✅  | ✅      |
| Protobuf gRPC & REST definition generation | ✅ | ✅ |
| Wire dependency-injection generation       | ✅  | ✅      |
| Microservice module extraction (`gow extract`) | ✅ | — |
| Config export to Consul / Etcd / Nacos | — | ✅ |
| Visual table configuration and service assignment   | —   | ✅      |
| AI-assisted DDL generation and microservice partitioning | — | ✅ |
| AI code review             | —   | ✅      |
| Service start/stop management            | —   | ✅      |
| Dev tools (buf/wire/ent) | —   | ✅      |

## Project Structure

```
go-wind-toolkit/
├── gowind/            # Module 1: CLI + shared libraries
│   ├── cmd/gow/       # CLI entry point (go install .../cmd/gow@latest)
│   ├── pkg/           # Exported libraries (shared by CLI and UI)
│   │   ├── generators/      # Code generation templates and engine
│   │   ├── sqlkratos/       # SQL → full Kratos service generator
│   │   ├── sqlorm/          # SQL → ORM (ent/gorm) generator
│   │   ├── sqlproto/        # SQL → Protobuf/gRPC/REST converter
│   │   ├── service/         # Service scaffolding generator
│   │   ├── extract/         # Microservice module extractor
│   │   └── configexporter/  # Config export (Consul/Etcd/Nacos)
│   └── internal/     # CLI-only code
├── gowind-uiapp/      # Module 2: Wails desktop UI
│   ├── main.go
│   ├── frontend/     # Vue.js frontend
│   └── internal/     # UI-only code
│       ├── ai/              # AI-assisted features
│       ├── configexporter/  # Config export
│       ├── database/        # Database connection management
│       ├── detect/          # Automatic project detection
│       ├── devtools/        # Dev tool integration
│       └── generator/       # Code generation
└── README.md
```

## The `gow` CLI Subcommands

`gow` provides 11 subcommands:

| Subcommand | Description |
|--------|------|
| `new` | Create a new project scaffold |
| `add` | Add components to a project (e.g. a `service` microservice) |
| `generate` | Code generation |
| `extract` | Extract microservice modules from a project |
| `run` | Run services |
| `build` | Build services |
| `ent` | Ent ORM model generation |
| `wire` | Wire dependency-injection generation |
| `api` | Protobuf API definition generation |
| `version` | Version information |
| `help` | Help |

## Protoc Plugins

Beyond the CLI, the Toolkit also ships 7 protoc plugins:

| Plugin | Description |
|------|------|
| `protoc-gen-fieldmap` | Declarative field-mapping generator (see [protoc-gen-fieldmap Field Mapping Generator](/en/toolkit/fieldmap.md)) |
| `protoc-gen-wind-errors` | Error code generation |
| `protoc-gen-go-http` | Go HTTP interface code generation |
| `protoc-gen-go-redact` | Field redaction generation |
| `protoc-gen-dart-http` | Dart HTTP client generation |
| `protoc-gen-typescript-http` | TypeScript HTTP client generation |
| `protoc-gen-common` | Common code generation |

## Tech Stack

| Component       | Technology                |
|----------|---------------------|
| CLI      | Go, Cobra           |
| Desktop client | Go, Wails v2        |
| Desktop frontend  | Vue 3, TypeScript   |
| Code generation  | Go text/template    |
| AI integration  | OpenAI Compatible API |
| ORM support  | Ent, GORM           |
| Databases   | MySQL, PostgreSQL, SQLite, Oracle |

## Desktop Client gowind-uiapp

gowind-uiapp is a cross-platform desktop client built on **Vue3 + Wails** that makes all of the Toolkit's code generation capabilities visual:

**Backend code generation**: supports 4 schema import sources — database, OpenAPI documents, and `ent://` / `gorm://` Go source (no database needed; reads the schema definitions straight from your Go source to generate CRUD).

![Create backend project](/assets/images/go_wind_toolkit/create_backend_project.png)

**Frontend code generation**: generate three complete frontend projects in one click — Vue3 + Element Plus, Vue3 + Vben, React + Ant Design Pro.

![Frontend code generator](/assets/images/go_wind_toolkit/frontend_code_generator_init.png)

**Other capabilities**:

- Config export: Consul / Etcd / Nacos
- AI assistant: OpenAI / DeepSeek / Ollama (see below)
- Dev tools panel: integrated buf / wire / ent and other dev tools, plus service start/stop management

For the complete workflows, see [Backend Code Generation](/en/toolkit/backend-code-generation.md) and [Frontend Code Generation](/en/toolkit/frontend-code-generation.md).

## AI Assistant

The desktop client integrates multiple LLM providers:

- **OpenAI** (GPT-4o and more)
- **DeepSeek**
- **Ollama** (local models)
- **Azure OpenAI**
- **Custom** (any OpenAI-compatible API service)

AI capabilities include:
- Generate DDL from natural-language requirements
- AI-assisted microservice partitioning
- AI code review

## How to Get It

**GitHub Releases** (recommended): [https://github.com/tx7do/go-wind-toolkit/releases](https://github.com/tx7do/go-wind-toolkit/releases)

**Gitee mirror** (source code only): [https://gitee.com/tx7do/go-wind-toolkit](https://gitee.com/tx7do/go-wind-toolkit)

**CLI installation**:

```bash
go install github.com/tx7do/go-wind-toolkit/gowind/cmd/gow@latest
```

---

**Related documents**:

- [Backend Code Generation](/en/toolkit/backend-code-generation.md)
- [Frontend Code Generation](/en/toolkit/frontend-code-generation.md)
- [protoc-gen-fieldmap Field Mapping Generator](/en/toolkit/fieldmap.md)
