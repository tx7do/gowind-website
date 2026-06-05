# 后端代码生成

GoWind Toolkit 后端代码生成器可以从数据库 Schema 一键生成完整的 Go-Kratos 微服务代码，包括 Protobuf 定义、ORM 模型、数据访问层、业务逻辑层、Wire 依赖注入等全套分层代码。

## 整体流程

后端代码生成全程只需要 **4 步**，单体、微服务项目全部通用：

1. **初始化项目**：一键生成企业级标准微服务架构
2. **绑定数据库**：直连数据库或导入 SQL，快速导入表结构
3. **配置数据表**：按需选择分包模式，过滤无用表
4. **一键生成**：自动生成全套分层后端业务代码

## 第一步：新建后端项目

![新建后端项目](/assets/images/go_wind_toolkit/create_backend_project.png)

### 操作入口

打开 GoWind Toolkit 桌面客户端，首页右上角点击 **【新建后端项目】**，即可调出创建窗口。

### 配置项说明

| 配置项     | 作用                   | 填写建议                                           |
|----------|------------------------|----------------------------------------------------|
| 父目录   | 项目存放的电脑文件夹   | 纯英文路径，不要中文、空格、特殊符号                |
| 项目名称 | 本地项目文件夹名字     | 短横线命名，示例：`go-wind-demo`                    |
| Go 模块名称 | `go.mod` 依赖引用地址 | 企业项目填仓库地址，个人项目同步项目名即可          |
| 模板仓库 | 自定义项目初始化模板   | 默认留空，使用官方模板；团队可配置私有模板          |
| 分支     | 模板仓库指定分支       | 默认留空，自动拉取主分支                            |

### 创建步骤

1. 选择一个纯英文空白文件夹
2. 填写项目名称与 Go 模块名
3. 模板仓库、分支保持默认
4. 点击确定，工具自动初始化完整项目架构

### 生成的项目目录

```
go-wind-demo/
├── api/          # Proto 协议、gRPC 接口、请求响应结构体
├── cmd/          # 所有服务启动入口
├── internal/     # 核心私有业务代码
│   ├── data/     # 数据库数据访问层
│   ├── server/   # 路由、中间件、服务注册
│   └── service/  # 接口实现层
├── go.mod        # 依赖管理文件
└── go.sum        # 依赖校验文件
```

::: tip CLI 方式
也可以通过 CLI 创建项目：
```bash
gow new myproject
cd myproject && go mod tidy
```
:::

## 第二步：连接数据库 & 导入表结构

![数据库配置](/assets/images/go_wind_toolkit/database_configure.png)

### 导入模式

工具支持三种导入方式：

| 模式         | 说明                           | 推荐场景         |
|------------|--------------------------------|----------------|
| 数据库直连   | 直接连接 MySQL/PostgreSQL 等   | 日常开发（推荐） |
| SQL 文件导入 | 导入 `.sql` 文件               | 离线环境        |
| 手动编写 SQL | 在线编辑器中编写 DDL           | 快速验证        |

### 数据库连接

切换至 **【数据库导入】** 页面，填入数据库连接信息：

```
user:password@tcp(127.0.0.1:3306)/db_name?charset=utf8mb4&parseTime=True&loc=Local
```

支持以下数据库：
- **MySQL** (推荐)
- **PostgreSQL**
- **SQLite**
- **Oracle**

### 导入步骤

1. 填写连接信息后，点击 **【测试连接】**，确认数据库连通
2. 连接成功后，点击 **【导入表结构】**
3. 工具自动加载库内所有数据表，并可视化展示

::: tip CLI 方式
```bash
# 交互式
gow generate

# 完整命令行
gow generate --dsn "mysql://user:pass@tcp(localhost:3306)/dbname" --service user
```
:::

## 第三步：数据表分包配置

![表配置](/assets/images/go_wind_toolkit/table_configure.png)

### 三种分包模式

| 模式             | 说明                           | 推荐场景             |
|----------------|-------------------------------|---------------------|
| 按表独立包       | 每张表一个独立 Proto 包        | 小型单体、个人开发   |
| **按服务分包** | 按业务域拆分服务，解耦性强    | **企业微服务（推荐）** |
| 自定义包名       | 自由指定包路径                | 接入存量项目         |

### 精细化配置

1. 给不同的数据表，划分对应的业务服务
2. 取消勾选日志表、中间表、临时表，避免生成多余代码
3. 支持单独修改表模型名、包名、注释

## 第四步：一键批量生成代码

![生成代码](/assets/images/go_wind_toolkit/do_generate_backend_code.png)

### 生成参数

| 参数         | 说明                                       |
|------------|------------------------------------------|
| 服务类型    | 同时勾选 gRPC + BFF，兼顾内部 RPC 和外部 HTTP |
| ORM 框架   | Ent（推荐，类型安全）或 GORM              |
| BFF 服务名 | 自定义网关服务名，如 admin、user、order    |
| 生成预览   | 核对数据表、服务数量，确认生成范围         |

### 生成内容

点击 **【开始生成代码】**，工具自动一次性生成全套代码：

- **Proto 协议**：gRPC 请求响应结构体
- **ORM 模型**：Ent 实体模型、数据库映射结构
- **Data 层**：DAO 数据库操作代码
- **Biz 层**：完整 CRUD 业务代码
- **Service 层**：接口实现、路由与服务注册代码
- **Wire**：依赖注入代码

### 项目校验

生成完成后，在项目根目录执行：

```bash
go mod tidy
```

无报错即代表项目可用。

::: tip CLI 一键命令
```bash
# 生成指定 ORM 和表
gow generate --dsn "mysql://..." \
  --service user --orm ent --servers grpc --tables users,roles

# 仅生成 proto 文件
gow generate --dsn "postgres://..." --service admin --proto-only

# 生成 REST 服务（代理自 gRPC 服务）
gow generate --dsn "mysql://..." --service user-admin \
  --servers rest --source-module user --skip-orm
```
:::

## CLI 常用命令速查

| 命令                  | 说明                |
|---------------------|---------------------|
| `gow new <name>`     | 创建新项目           |
| `gow add service <name> -s grpc` | 添加 gRPC 服务 |
| `gow add service <name> -s rest` | 添加 REST 服务 |
| `gow add service <name> -s rest -s grpc` | 同时支持两种 |
| `gow generate`       | 交互式代码生成       |
| `gow ent [service]`  | 生成 Ent 代码       |
| `gow wire [service]` | 生成 Wire 代码      |
| `gow api`            | 生成 Proto & API    |
| `gow run [service]`  | 运行服务            |
| `gow extract <src> <dst> -o <entities>` | 提取模块到其他服务 |
| `gow version`        | 查看版本            |

## 微服务演进（模块提取）

当业务增长时，可以使用 `gow extract` 从一个服务中提取模块到新服务：

```bash
# 从 admin 服务提取 role 模块到 user 服务
gow extract admin user -o role

# 提取多个实体
gow extract admin user -o role,permission

# 手动指定 ORM 类型
gow extract admin user -o role --orm gorm

# 保留源文件（默认删除）
gow extract admin user -o role --keep-source
```

目标服务不存在时会自动创建，ORM 类型自动侦测。

## 常见问题

| 问题               | 解决方案                                          |
|------------------|-------------------------------------------------|
| 初始化失败         | 项目路径不能包含中文、空格与特殊符号              |
| 数据库连接失败     | 检查端口、账号密码、数据库外网访问权限            |
| 依赖报错           | 生成后务必执行 `go mod tidy`                     |
| 冗余代码太多       | 配置阶段提前过滤日志表、中间表等无用表            |

---

**相关文档**：

- [GoWind Toolkit 介绍](/toolkit/intro.md)
- [前端代码生成](/toolkit/frontend-code-generation.md)
