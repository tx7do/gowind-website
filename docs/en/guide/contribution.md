# Contribution Guide

Thank you for your interest in the GoWind project! This guide explains how to contribute to the project.

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Setting Up the Development Environment](#setting-up-the-development-environment)
- [Coding Standards](#coding-standards)
- [Submission Workflow](#submission-workflow)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Feature Suggestions](#feature-suggestions)
- [License](#license)

---

## Ways to Contribute

We welcome contributions in the following forms:

### 1. Code Contributions

- Implement new features
- Fix known bugs
- Optimize performance
- Improve code quality

### 2. Documentation Contributions

- Write or improve documentation
- Improve API comments
- Translate documentation
- Add usage examples

### 3. Testing Contributions

- Write unit tests
- Write integration tests
- Find and report bugs
- Provide test cases

### 4. Community Contributions

- Answer questions in GitHub Issues
- Join Discussions
- Share experience and best practices
- Recommend the project to more users

---

## Setting Up the Development Environment

### Step 1: Fork the Project

Visit the [GoWind Admin repository](https://github.com/tx7do/go-wind-admin) and click the **Fork** button in the top-right corner.

### Step 2: Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/go-wind-admin.git
cd go-wind-admin

# Add the upstream repository
git remote add upstream https://github.com/tx7do/go-wind-admin.git
```

### Step 3: Create a Feature Branch

```bash
# Pull the latest code
git fetch upstream
git checkout -b feature/your-feature-name upstream/main

# Or to fix a bug
git checkout -b fix/your-bug-fix upstream/main
```

### Step 4: Install Dependencies

```bash
# Backend dependencies
cd backend
go mod download
make init
make cli

# Frontend dependencies
cd ../frontend
pnpm install
```

### Step 5: Start the Development Environment

```bash
# Terminal 1: start the backend service
cd backend
gow run admin

# Terminal 2: start the frontend dev server
cd frontend
pnpm dev:antd

# Terminal 3: run tests (optional)
cd backend
make test
```

---

## Coding Standards

### Backend Coding Standards (Go)

#### Naming Conventions

```go
// Package name: lowercase, no underscores
package mypackage

// Constants: PascalCase
const (
    MaxConnections = 100
    DefaultTimeout = 30
)

// Function names: PascalCase (exported) or camelCase (private)
func GetUserByID(id int) (*User, error) {
    // ...
}

func fetchUserData(id int) (*userData, error) {
    // ...
}

// Variable names: camelCase
var (
    userName string
    userAge  int
)
```

#### Code Formatting

```bash
# Format code with gofmt
gofmt -w .

# Or use the go fmt command
go fmt ./...

# Check for code style issues
golangci-lint run

# Auto-fix certain issues
golint ./... | head -20
```

#### Code Comments

```go
// GetUserByID returns user information by user ID.
// It returns the user object and a possible error.
func GetUserByID(id int) (*User, error) {
    // Check the cache first
    if cached := cache.Get(id); cached != nil {
        return cached.(*User), nil
    }

    // Query the database
    user, err := db.Query(id)
    if err != nil {
        return nil, fmt.Errorf("failed to query user: %w", err)
    }

    // Cache the result
    cache.Set(id, user)
    return user, nil
}
```

#### Error Handling

```go
// ❌ Not recommended: ignoring errors
_ = json.Unmarshal(data, &obj)

// ✅ Recommended: handle errors
if err := json.Unmarshal(data, &obj); err != nil {
    return fmt.Errorf("failed to unmarshal data: %w", err)
}

// ✅ Wrap errors
err := doSomething()
if err != nil {
    return fmt.Errorf("operation failed: %w", err)
}
```

### Frontend Coding Standards (TypeScript/Vue)

#### File Structure

```
src/
├── components/        # Shared components
│   ├── Button.vue
│   └── Modal.vue
├── views/            # Page components
│   ├── Dashboard.vue
│   └── UserList.vue
├── stores/           # Pinia state management
│   └── userStore.ts
├── services/         # API services
│   └── userService.ts
├── types/            # TypeScript type definitions
│   └── user.ts
└── utils/            # Utility functions
    └── format.ts
```

#### Naming Conventions

```typescript
// Component files: PascalCase
// components/UserCard.vue

// Page files: PascalCase
// views/UserDetail.vue

// Utility files: camelCase
// utils/formatDate.ts

// Type definitions: PascalCase
interface User {
    id: number;
    name: string;
}

type UserRole = 'admin' | 'user' | 'guest';

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://api.example.com';

// Functions and variables: camelCase
function getUserData(userId: number) {
    // ...
}

const userData = ref<User | null>(null);
```

#### Code Formatting

```bash
# Lint code with ESLint
pnpm lint

# Format code with Prettier
pnpm format

# Fix ESLint issues
pnpm lint:fix
```

#### Vue3 Standards

```typescript
// ✅ Recommended: use the <script setup> syntax
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
    // Handle the submission
}
</script>

< template >
<div class = "user-container" >
<input v - model = "userName"
placeholder = "Search users" / >
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

#### TypeScript Standards

```typescript
// Always specify types explicitly
interface UserResponse {
    code: number;
    message: string;
    data: User | null;
}

// ✅ Recommended
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

// ❌ Not recommended
async function getUserData(id) {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
}
```

### Protobuf Standards

```protobuf
// Package name: lowercase
package api.v1;

// Message names: PascalCase
message CreateUserRequest {
    // Field names: snake_case
    string user_name = 1;
    string user_email = 2;
    int32 user_age = 3;
}

// Service names: PascalCase
service UserService {
    rpc GetUser(GetUserRequest) returns (GetUserResponse);
    rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
}
```

---

## Submission Workflow

### Step 1: Develop Your Code

Implement your feature or fix on your local development branch.

```bash
# See the modified files
git status

# See the details of the changes
git diff
```

### Step 2: Run Tests and Checks

```bash
# Backend
cd backend
make test      # Run unit tests
make lint      # Lint the code
make cover     # Test coverage

# Frontend
cd ../frontend
pnpm test      # Run tests
pnpm lint      # Lint the code
pnpm build     # Build check
```

### Step 3: Commit Your Code

Use a standardized commit message format (following Conventional Commits):

```bash
git add .
git commit -m "type(scope): description"
```

#### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Types

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation changes
- `style`: code style changes (formatting, semicolons, etc.)
- `refactor`: code refactoring (no functional changes)
- `perf`: performance improvements
- `test`: test-related changes
- `chore`: build, dependency, and tooling changes
- `ci`: CI/CD configuration changes

#### Examples

```bash
# Add a get-user feature to the user module
git commit -m "feat(user): add get user by id endpoint"

# Fix a bug in permission checks
git commit -m "fix(auth): correct permission validation logic"

# Update the quick start documentation
git commit -m "docs(readme): update quick start guide"

# Optimize database query performance
git commit -m "perf(db): optimize user query with indexes"

# A detailed commit message
git commit -m "feat(user): add user pagination support

- Add page and limit query parameters
- Add total count in response
- Add pagination metadata

Closes #123"
```

### Step 4: Push Your Code

```bash
# Push to your fork
git push origin feature/your-feature-name
```

### Step 5: Create a Pull Request

Create a Pull Request on GitHub.

---

## Pull Request Guidelines

### PR Title Convention

Use the same format as commit messages:

```
feat(admin): add user management page

fix(auth): resolve login failure issue

docs: update installation guide
```

### PR Description Template

```markdown
## Description

Briefly describe your changes.

## Related Issue

Closes #123

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How to Test

Describe the testing steps:

1. Open the page ...
2. Click the button ...
3. Verify ...

## Screenshots (if applicable)

For UI changes, please attach screenshots.

## Checklist

- [ ] I have followed the project's coding standards
- [ ] I have updated the relevant documentation
- [ ] I have added the necessary tests
- [ ] All tests pass
- [ ] No new warnings or errors introduced
```

### PR Review Criteria

We review PRs along the following dimensions:

1. **Functional correctness** - whether the code implements the expected behavior
2. **Code quality** - whether the code follows the standards and is easy to maintain
3. **Performance impact** - whether it could affect system performance
4. **Backward compatibility** - whether it could break existing functionality
5. **Test coverage** - whether there are sufficient tests
6. **Documentation completeness** - whether the relevant documentation has been updated

### PR Merge Requirements

A PR can be merged only when all of the following are met:

- ✅ Approved by at least 2 maintainers
- ✅ All CI checks pass
- ✅ No conflicts
- ✅ All code review comments resolved

---

## Reporting Bugs

### Submitting a Bug Report

Create a new issue in [GitHub Issues](https://github.com/tx7do/go-wind-admin/issues).

### Bug Report Template

```markdown
## Bug Description

A clear and concise description of what the bug is.

## Steps to Reproduce

Steps to reproduce the bug:

1. Open ...
2. Click ...
3. See the error ...

## Expected Behavior

What should happen.

## Actual Behavior

What actually happens.

## Environment

- OS: [e.g. macOS 12.0]
- Go version: [e.g. 1.20]
- Node version: [e.g. 18.0]
- Browser: [e.g. Chrome 100]

## Error Logs

If there are error logs, paste them here.

## Additional Context

Any other relevant information.
```

### Bug Reporting Tips

- Search existing issues first to avoid duplicate reports
- Provide a minimal example that reproduces the bug
- Include the full stack trace
- Provide your environment details
- Suggest a fix if possible

---

## Feature Suggestions

### Submitting a Feature Suggestion

Start a discussion in [GitHub Discussions](https://github.com/tx7do/go-wind-admin/discussions), or open an issue labeled `enhancement`.

### Feature Suggestion Template

```markdown
## Feature Description

What feature would you like to add?

## Use Case

What problem does this feature solve, or what benefit does it bring?

## Suggested Implementation

Do you have an idea of how to implement it?

## Related Features

Which existing features does this relate to?

## Additional Context

Any other information or references.
```

### Feature Suggestion Guidelines

- Describe the use case and business value
- Provide the requirements in as much detail as possible
- Provide samples or prototypes if possible
- Consider consistency with existing features
- Consider the impact on performance and compatibility

---

## Development Tools and Resources

### Recommended Development Tools

#### Backend

- **IDE**: VS Code (+ Go extension) / GoLand
- **Debugging**: Delve debugger
- **Profiling**: pprof
- **Linting**: golangci-lint
- **Docs**: godoc

#### Frontend

- **IDE**: VS Code (+ Volar extension) / WebStorm
- **Debugging**: Vue DevTools
- **Profiling**: Chrome DevTools
- **Linting**: ESLint / Prettier
- **Docs**: VuePress

### Useful Commands

```bash
# Backend
make build      # Build the binary
make test       # Run tests
make lint       # Lint the code
make proto      # Generate API code
make watch      # Hot-reload development

# Frontend
pnpm dev:antd   # Development environment
pnpm build:antd # Production build
pnpm test       # Run tests
pnpm lint       # Lint the code
pnpm format     # Format the code
```

### Learning Resources

- [Go official documentation](https://golang.org/doc/)
- [Vue3 official documentation](https://vuejs.org/)
- [Kratos framework documentation](https://go-kratos.dev/)
- [Ent ORM documentation](https://entgo.io/)
- [Protocol Buffers documentation](https://developers.google.com/protocol-buffers)

---

## Community Code of Conduct

### Our Pledge

In participating in this project and community, we pledge to foster an open, friendly, respectful, and inclusive environment.

### Our Standards

The following behaviors are encouraged:

- Using welcoming and inclusive language
- Respecting differing opinions and experiences
- Accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy toward other community members

The following behaviors are unacceptable:

- Harassment, insulting, or discriminatory comments
- Personal attacks on individuals
- Publishing others' private information, such as addresses or email addresses
- Inappropriate sexual language or imagery
- Other conduct that could reasonably be considered inappropriate

### Enforcement

Project maintainers are responsible for clarifying the standards of acceptable behavior and for taking appropriate and fair corrective action in response to unacceptable behavior.

Violations of this code of conduct can be reported by contacting the project team (<yanglinbo@gmail.com>).

---

## FAQ

### Q: Which branch should I base my PR on?

A: Always create PRs from the `main` branch. Make sure your branch is synced with the latest upstream code.

### Q: My PR was rejected. What should I do?

A: Read the review comments, make the necessary changes, and push new commits. The PR updates automatically.

### Q: How long does it take to get review feedback?

A: Usually within 1-3 days, but it may vary depending on project priorities.

### Q: How do I track the progress of my PR?

A: Watch the PR comments and status. You can also check progress on the GitHub project board.

### Q: Can I make multiple commits before my PR is merged?

A: Yes, but pushing regularly is recommended. If the commit history becomes too verbose, we may ask you to squash it before merging.

---

## Getting Help

If you have any questions or need help:

- 📧 Email: <yanglinbo@gmail.com>
- 💬 Discussions: [GitHub Discussions](https://github.com/tx7do/go-wind-admin/discussions)
- 📖 Docs: [official documentation](https://gowind.cloud)
- 🐛 Feedback: [GitHub Issues](https://github.com/tx7do/go-wind-admin/issues)

---

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT license.

---

Thank you for contributing! 🎉
