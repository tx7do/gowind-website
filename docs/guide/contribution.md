# 贡献指南

感谢您对 GoWind 项目的兴趣！本指南将帮助您了解如何为项目做出贡献。

## 目录

- [贡献方式](#贡献方式)
- [开发环境设置](#开发环境设置)
- [代码规范](#代码规范)
- [提交流程](#提交流程)
- [Pull Request 指南](#pull-request-指南)
- [报告 Bug](#报告-bug)
- [功能建议](#功能建议)
- [许可证](#许可证)

---

## 贡献方式

我们欢迎以下形式的贡献：

### 1. 代码贡献

- 实现新功能
- 修复已知 Bug
- 优化性能
- 改进代码质量

### 2. 文档贡献

- 编写或改进文档
- 完善 API 注释
- 翻译文档
- 补充使用示例

### 3. 测试贡献

- 编写单元测试
- 编写集成测试
- 发现并报告 Bug
- 提供测试用例

### 4. 社区贡献

- 在 GitHub Issues 中回答问题
- 参与 Discussions 讨论
- 分享使用经验和最佳实践
- 推荐给更多用户

---

## 开发环境设置

### 第一步：Fork 项目

访问 [GoWind Admin 仓库](https://github.com/tx7do/go-wind-admin)，点击右上角的 **Fork** 按钮。

### 第二步：克隆您的 Fork

```bash
git clone https://github.com/YOUR_USERNAME/go-wind-admin.git
cd go-wind-admin

# 添加上游仓库
git remote add upstream https://github.com/tx7do/go-wind-admin.git
```

### 第三步：创建功能分支

```bash
# 拉取最新代码
git fetch upstream
git checkout -b feature/your-feature-name upstream/main

# 或者修复 Bug
git checkout -b fix/your-bug-fix upstream/main
```

### 第四步：安装依赖

```bash
# 后端依赖
cd backend
go mod download
make init
make cli

# 前端依赖
cd ../frontend
pnpm install
```

### 第五步：启动开发环境

```bash
# 终端 1: 启动后端服务
cd backend
gow run admin

# 终端 2: 启动前端开发服务
cd frontend
pnpm dev:antd

# 终端 3: 运行测试（可选）
cd backend
make test
```

---

## 代码规范

### 后端代码规范（Go）

#### 命名规范

```go
// 包名：小写，不使用下划线
package mypackage

// 常量：PascalCase
const (
    MaxConnections = 100
    DefaultTimeout = 30
)

// 函数名：PascalCase（导出）或 camelCase（私有）
func GetUserByID(id int) (*User, error) {
    // ...
}

func fetchUserData(id int) (*userData, error) {
    // ...
}

// 变量名：camelCase
var (
    userName string
    userAge  int
)
```

#### 代码格式化

```bash
# 使用 gofmt 格式化代码
gofmt -w .

# 或者使用 go fmt 命令
go fmt ./...

# 检查代码风格问题
golangci-lint run

# 自动修复某些问题
golint ./... | head -20
```

#### 代码注释

```go
// GetUserByID 根据用户 ID 获取用户信息
// 返回用户对象和可能的错误
func GetUserByID(id int) (*User, error) {
    // 首先查询缓存
    if cached := cache.Get(id); cached != nil {
        return cached.(*User), nil
    }
    
    // 从数据库查询
    user, err := db.Query(id)
    if err != nil {
        return nil, fmt.Errorf("failed to query user: %w", err)
    }
    
    // 缓存结果
    cache.Set(id, user)
    return user, nil
}
```

#### 错误处理

```go
// ❌ 不推荐：忽略错误
_ = json.Unmarshal(data, &obj)

// ✅ 推荐：处理错误
if err := json.Unmarshal(data, &obj); err != nil {
    return fmt.Errorf("failed to unmarshal data: %w", err)
}

// ✅ 使用错误包装
err := doSomething()
if err != nil {
    return fmt.Errorf("operation failed: %w", err)
}
```

### 前端代码规范（TypeScript/Vue）

#### 文件结构

```
src/
├── components/        # 公共组件
│   ├── Button.vue
│   └── Modal.vue
├── views/            # 页面组件
│   ├── Dashboard.vue
│   └── UserList.vue
├── stores/           # Pinia 状态管理
│   └── userStore.ts
├── services/         # API 服务
│   └── userService.ts
├── types/            # TypeScript 类型定义
│   └── user.ts
└── utils/            # 工具函数
    └── format.ts
```

#### 命名规范

```typescript
// 组件文件：PascalCase
// components/UserCard.vue

// 页面文件：PascalCase
// views/UserDetail.vue

// 工具文件：camelCase
// utils/formatDate.ts

// 类型定义：PascalCase
interface User {
    id: number;
    name: string;
}

type UserRole = 'admin' | 'user' | 'guest';

// 常量：UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://api.example.com';

// 函数和变量：camelCase
function getUserData(userId: number) {
    // ...
}

const userData = ref<User | null>(null);
```

#### 代码格式化

```bash
# 使用 ESLint 检查代码
pnpm lint

# 使用 Prettier 格式化代码
pnpm format

# 修复 ESLint 问题
pnpm lint:fix
```

#### Vue3 规范

```typescript
// ✅ 推荐：使用 <script setup> 语法
<script setup
lang = "ts" >
import {ref, computed} from 'vue'
import type {User} from '@/types/user'

const userName = ref<string>('')
const userList = ref<User[]>([])

const filteredList = computed(() => {
    return userList.value.filter(user =>
        user.name.includes(userName.value)
    )
})

const handleSubmit = () => {
    // 处理提交
}
</script>

< template >
<div class = "user-container" >
<input v - model = "userName"
placeholder = "搜索用户" / >
    <ul>
        <li v -
for= "user in filteredList" :
key = "user.id" >
    {
{
    user.name
}
}
</li>
< /ul>
< /div>
< /template>

< style
scoped >
.
user - container
{
    padding: 20
    px;
}
</style>
```

#### TypeScript 规范

```typescript
// 总是明确指定类型
interface UserResponse {
    code: number;
    message: string;
    data: User | null;
}

// ✅ 推荐
async function getUserData(id: number): Promise<User | null> {
    try {
        const response = await fetch(`/api/users/${id}`);
        const data: UserResponse = await response.json();
        return data.data;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        return null;
    }
}

// ❌ 不推荐
async function getUserData(id) {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
}
```

### Protobuf 规范

```protobuf
// 包名：小写
package api.v1;

// 消息名：PascalCase
message CreateUserRequest {
    // 字段名：snake_case
    string user_name = 1;
    string user_email = 2;
    int32 user_age = 3;
}

// 服务名：PascalCase
service UserService {
    rpc GetUser(GetUserRequest) returns (GetUserResponse);
    rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
}
```

---

## 提交流程

### 第一步：开发代码

在本地开发分支上实现您的功能或修复。

```bash
# 查看修改的文件
git status

# 查看具体修改
git diff
```

### 第二步：运行测试和检查

```bash
# 后端
cd backend
make test      # 运行单元测试
make lint      # 代码检查
make cover     # 测试覆盖率

# 前端
cd ../frontend
pnpm test      # 运行测试
pnpm lint      # 代码检查
pnpm build     # 构建检查
```

### 第三步：提交代码

使用规范的 Commit 消息格式（遵循 Conventional Commits）：

```bash
git add .
git commit -m "type(scope): description"
```

#### Commit 消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### 类型（type）

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档改动
- `style`: 代码风格改动（格式化、分号等）
- `refactor`: 代码重构（不涉及功能改动）
- `perf`: 性能改进
- `test`: 测试相关
- `chore`: 构建、依赖、工具等改动
- `ci`: CI/CD 配置改动

#### 例子

```bash
# 新增用户模块的获取功能
git commit -m "feat(user): add get user by id endpoint"

# 修复权限检查的 Bug
git commit -m "fix(auth): correct permission validation logic"

# 更新快速开始文档
git commit -m "docs(readme): update quick start guide"

# 优化数据库查询性能
git commit -m "perf(db): optimize user query with indexes"

# 详细的提交消息
git commit -m "feat(user): add user pagination support

- Add page and limit query parameters
- Add total count in response
- Add pagination metadata

Closes #123"
```

### 第四步：推送代码

```bash
# 推送到你的 Fork
git push origin feature/your-feature-name
```

### 第五步：创建 Pull Request

在 GitHub 上创建 Pull Request。

---

## Pull Request 指南

### PR 标题规范

使用相同的格式作为 Commit 消息：

```
feat(admin): add user management page

fix(auth): resolve login failure issue

docs: update installation guide
```

### PR 描述模板

```markdown
## 描述

请简要描述您的更改内容。

## 相关 Issue

Closes #123

## 变更类型

- [ ] Bug 修复
- [ ] 新功能
- [ ] Breaking 改动
- [ ] 文档改动

## 如何测试

请描述测试步骤：

1. 打开页面 ...
2. 点击按钮 ...
3. 验证 ...

## 截图（如适用）

如果是 UI 改动，请附上截图。

## 检查清单

- [ ] 我已遵循项目的代码规范
- [ ] 我已更新相关文档
- [ ] 我已添加必要的测试
- [ ] 所有测试都通过了
- [ ] 没有引入新的警告或错误
```

### PR 审核标准

我们会从以下几个方面审核 PR：

1. **功能正确性** - 代码是否实现了预期功能
2. **代码质量** - 代码是否遵循规范，易于维护
3. **性能影响** - 是否会影响系统性能
4. **向后兼容性** - 是否会破坏现有功能
5. **测试覆盖** - 是否有充分的测试
6. **文档完整性** - 是否更新了相关文档

### PR 合并要求

PR 需要满足以下条件才能合并：

- ✅ 至少 2 个维护者的批准
- ✅ 所有 CI 检查通过
- ✅ 无冲突
- ✅ 代码审核意见已解决

---

## 报告 Bug

### 提交 Bug 报告

在 [GitHub Issues](https://github.com/tx7do/go-wind-admin/issues) 中创建新 issue。

### Bug 报告模板

```markdown
## Bug 描述

清晰简洁地描述 Bug 是什么。

## 重现步骤

重现 Bug 的步骤：

1. 打开...
2. 点击...
3. 看到错误...

## 预期行为

应该发生什么。

## 实际行为

实际发生了什么。

## 环境信息

- OS: [e.g. macOS 12.0]
- Go 版本: [e.g. 1.20]
- Node 版本: [e.g. 18.0]
- 浏览器: [e.g. Chrome 100]

## 错误日志

如果有错误日志，请粘贴到这里。

## 附加信息

任何其他相关信息。
```

### Bug 报告建议

- 搜索已存在的 issues，避免重复报告
- 提供能够重现 Bug 的最小示例
- 包含完整的错误栈跟踪
- 提供您的环境信息
- 如果可能，提供修复建议

---

## 功能建议

### 提交功能建议

在 [GitHub Discussions](https://github.com/tx7do/go-wind-admin/discussions) 中发起讨论，或创建标记为 `enhancement` 的
Issue。

### 功能建议模板

```markdown
## 功能描述

您希望添加什么功能？

## 使用场景

这个功能解决什么问题或带来什么好处？

## 建议的实现

您有什么实现思路吗？

## 相关功能

这与现有的哪些功能相关？

## 附加信息

任何其他信息或参考资料。
```

### 功能建议指南

- 描述使用场景和业务价值
- 提供尽可能详细的需求说明
- 如果可能，提供样例或原型
- 考虑与现有功能的一致性
- 考虑对性能和兼容性的影响

---

## 开发工具和资源

### 推荐的开发工具

#### 后端

- **IDE**: VS Code (+ Go 扩展) / GoLand
- **调试**: Delve 调试器
- **性能分析**: pprof
- **代码检查**: golangci-lint
- **文档**: godoc

#### 前端

- **IDE**: VS Code (+ Volar 扩展) / WebStorm
- **调试**: Vue DevTools
- **性能分析**: Chrome DevTools
- **代码检查**: ESLint / Prettier
- **文档**: VuePress

### 有用的命令

```bash
# 后端
make build      # 构建二进制文件
make test       # 运行测试
make lint       # 代码检查
make proto      # 生成 API 代码
make watch      # 热加载开发

# 前端
pnpm dev:antd   # 开发环境
pnpm build:antd # 生产构建
pnpm test       # 运行测试
pnpm lint       # 代码检查
pnpm format     # 格式化代码
```

### 学习资源

- [Go 官方文档](https://golang.org/doc/)
- [Vue3 官方文档](https://vuejs.org/)
- [Kratos 框架文档](https://go-kratos.dev/)
- [Ent ORM 文档](https://entgo.io/)
- [Protocol Buffers 文档](https://developers.google.com/protocol-buffers)

---

## 社区行为准则

### 我们的承诺

在参与本项目和社区时，我们承诺营造一个开放、友好、尊重和包容的环境。

### 我们的标准

以下行为是被鼓励的：

- 使用欢迎和包容的语言
- 尊重不同的意见和经验
- 接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同情

以下行为是不可接受的：

- 骚扰、侮辱或歧视性评论
- 针对个人的人身攻击
- 发布他人私人信息，如地址或电子邮件
- 不适当的性语言或图像
- 其他可能被合理认为不适当的行为

### 执行

项目维护者有责任阐明可接受行为的标准，并对不可接受的行为采取适当和公平的纠正措施。

对于违反本行为准则的行为，可以通过联系项目团队（contact@gowind.cloud）报告。

---

## FAQ

### Q: 我应该从哪个分支创建 PR？

A: 始终从 `main` 分支创建 PR。确保您的分支已同步最新的上游代码。

### Q: 我的 PR 被拒绝了，我应该怎么做？

A: 查看审核意见，进行必要的更改，然后推送新的提交。PR 会自动更新。

### Q: 多长时间能得到审核反馈？

A: 通常在 1-3 天内，但可能因项目优先级而异。

### Q: 如何追踪我的 PR 进度？

A: 关注 PR 评论和状态。您也可以在 GitHub 项目面板上查看进度。

### Q: 我可以在 PR 合并前做出多个提交吗？

A: 可以，但建议定期推送。如果提交历史过于冗长，我们可能会要求您在合并前进行 squash。

---

## 获得帮助

如果您有任何疑问或需要帮助：

- 📧 邮件：contact@gowind.cloud
- 💬 讨论：[GitHub Discussions](https://github.com/tx7do/go-wind-admin/discussions)
- 📖 文档：[官方文档](https://gowind.cloud)
- 🐛 反馈：[GitHub Issues](https://github.com/tx7do/go-wind-admin/issues)

---

## 许可证

通过对本项目的贡献，您同意您的贡献将根据 MIT 许可证获得许可。

---

感谢您的贡献！🎉

