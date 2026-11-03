# Frequently Asked Questions (FAQ)

## Project

### Q: What is GoWind?

A: GoWind is an open-source project ecosystem built on the Go language, comprising four core products:

- **GoWind Admin** - enterprise-grade admin console
- **GoWind CMS** - high-performance content management system
- **GoWind IM** - lightweight instant messaging component
- **GoWind UBA** - user behavior analytics tool

All projects are open sourced under the MIT license and can be freely used in commercial projects.

### Q: How do I choose which product to use?

A: Choose based on your business scenario:

| Product        | Use Cases                |
|-----------|---------------------|
| **Admin** | Enterprise dashboards, management systems, data platforms     |
| **CMS**   | News and media, blogs, content portals, e-commerce platforms   |
| **IM**    | Real-time chat, customer service, online collaboration, gaming and social apps |
| **UBA**   | Product analytics, user research, business decisions, data-driven growth |

Each product can be used independently or integrated seamlessly.

### Q: Can GoWind be used commercially?

A: Absolutely! All projects are open sourced under the MIT license — commercial use has no restrictions.

### Q: Is there a demo environment?

A: Yes — try it online without deploying anything:

- **Admin demo**: <https://demo.admin.gowind.cloud>
- **API docs**: <https://api.demo.admin.gowind.cloud/docs/>
- **Default account**: `admin` / `admin`

---

## Environment and Installation

### Q: What are the minimum system requirements?

A:

- **Go**: 1.18+
- **Node.js**: 16+
- **Database**: MySQL 8.0+ or PostgreSQL 12+
- **Cache**: Redis 6.0+ (optional)
- **Containers**: Docker 20.10+ (optional)

### Q: How do I install on Windows?

A:

1. Download and install Go (<https://go.dev/dl/>)
2. Download and install Node.js (<https://nodejs.org/>)
3. Install Docker with Chocolatey (optional):
   ```powershell
   choco install golang nodejs docker-desktop
   npm install -g pnpm
   ```
4. Clone the repository and follow the quick start guide

### Q: How do I quickly install all dependencies on Linux?

A:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y golang-go nodejs docker.io docker-compose

# Or use a Docker environment
docker run -it golang:1.21 bash
```

### Q: How do I quickly start the development environment with Docker?

A: Run this from the project root:

```bash
docker-compose up -d
```

This automatically starts:

- The MySQL database
- The Redis cache
- The backend service
- The frontend dev server

### Q: How do I install pnpm? Why is pnpm recommended?

A: Installation:

```bash
npm install -g pnpm
```

Why it's recommended:

- Fast (over 3x faster than npm)
- Disk-efficient (shares dependencies via hard links)
- Strict dependency isolation
- Better monorepo support

---

## Development

### Q: Which editors are recommended?

A:

- **Go backend development**:
    - VS Code + Go extension (free)
    - GoLand (paid, the most full-featured)
    - Vim + vim-go (terminal editing)

- **Vue3 frontend development**:
    - VS Code + Volar extension (recommended)
    - WebStorm (paid)
    - Vim + coc-volar (terminal editing)

### Q: How do I enable hot reload for backend development?

A:

```bash
cd backend/app/admin/service

# Hot reload with the air-based tool
gow run admin

# Or the traditional approach
make watch
```

The service restarts automatically after every code change.

### Q: Does frontend development support hot reload?

A: Yes — start the frontend dev server with:

```bash
cd frontend
pnpm dev:antd
```

Vite watches for file changes and hot-updates automatically; the browser refreshes in real time after you modify code.

### Q: How do I generate API code?

A:

```bash
cd backend

# Generate Go and TypeScript code
make proto

# Or use the buf tool
buf generate
```

Generated code is placed in the `api/gen/` directory automatically.

### Q: How do I run unit tests?

A:

```bash
cd backend

# Run all tests
make test

# Run tests for a specific package
go test ./app/admin/service/internal/...

# Check test coverage
make cover
```

### Q: How do I debug backend code?

A: Use VS Code + the Go extension:

1. Click next to a line number to set a breakpoint
2. Press F5 or click "Run and Debug"
3. Select the "Go: Launch program" configuration
4. Execution pauses when it hits the breakpoint

Or use GoLand's built-in debugger.

### Q: How do I switch the database to PostgreSQL?

A:

1. Edit `backend/app/admin/service/configs/config.yaml`
2. Change `mysql` to `postgres` in the database configuration
3. Update the connection string:
   ```yaml
   data:
     database:
       driver: postgres
       dsn: "host=localhost port=5432 user=postgres password=postgres dbname=admin sslmode=disable"
   ```

### Q: How do I add a new database table?

A: Use the Ent ORM framework:

```bash
cd backend

# Create a new schema
go run entc.go schema <table_name>

# Edit the schema file
vim ent/schema/<table_name>.go

# Generate the code
go generate ./ent

# Create a migration file
go run -mod=mod entgo.io/ent/cmd/ent migrate diff <migration_name>
```

---

## Deployment

### Q: How do I build a production release?

A:

```bash
# Backend build
cd backend
make build

# Frontend build
cd ../frontend
pnpm build:antd
```

Build artifacts:

- Backend: `backend/bin/admin` (executable binary)
- Frontend: `frontend/dist/` (static assets directory)

### Q: How do I deploy to production with Docker?

A:

```bash
# Build the Docker image
docker build -t gowind-admin:latest .

# Run the container
docker run -d \
  -p 7788:7788 \
  -e DATABASE_DSN="your-database-dsn" \
  -e REDIS_ADDR="your-redis-addr" \
  gowind-admin:latest

# View logs
docker logs -f <container-id>
```

### Q: How do I configure a reverse proxy (Nginx)?

A: See the reference configuration in `nginx.conf`:

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

### Q: How do I configure HTTPS?

A: Use Let's Encrypt certificates:

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Request certificates
sudo certbot certonly --nginx -d api.example.com -d admin.example.com

# Enable SSL in the Nginx configuration
listen 443 ssl;
ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
```

### Q: How do I monitor service health?

A: The backend provides health check endpoints:

```bash
# Health check
curl http://localhost:7788/health

# Metrics (Prometheus format)
curl http://localhost:7788/metrics
```

---

## Troubleshooting

### Q: I get a "port already in use" error when starting the backend?

A: Solutions:

```bash
# Find the process occupying port 7788
lsof -i :7788

# Kill the process
kill -9 <PID>

# Or change the port in the configuration file
vim backend/app/admin/service/configs/config.yaml
# Modify server.port
```

### Q: The database connection fails?

A: Check the following:

1. Is the database running properly
2. Is the connection string correct (username, password, host, port)
3. Does the database user have sufficient privileges
4. Is a firewall blocking the connection

```bash
# Test the connection
mysql -h localhost -u root -p

# Or
psql -h localhost -U postgres
```

### Q: The frontend cannot connect to the backend API?

A: Check the following:

1. Is the backend service running properly
2. Is the API address in the frontend configuration correct
3. Are the CORS settings correct
4. Network connectivity and firewall

```bash
# Check the network requests in the browser console (F12)
# Look for CORS-related errors
```

### Q: I get an "out of memory" error when building the frontend?

A: Increase the Node memory limit:

```bash
# Set the Node heap memory to 2GB
export NODE_OPTIONS="--max-old-space-size=2048"

# Rebuild
pnpm build:antd
```

### Q: How do I view detailed error logs?

A:

```bash
# Backend logs (development mode)
gow run admin 2>&1 | tee app.log

# Frontend logs
pnpm dev:antd 2>&1 | tee frontend.log

# System logs
docker logs <container-id>
journalctl -u gowind-admin -f
```

### Q: I forgot the admin password. What should I do?

A: Reset it from the command line:

```bash
cd backend/app/admin/service

# Reset the password
gow run admin cmd admin:reset-password admin newpassword
```

---

## Features

### Q: How do I add new permissions or menus?

A:

1. Add the permission records in the database (`sys_menu` table)
2. The frontend routes sync permissions automatically
3. Use the Admin API to re-fetch the permission list

### Q: How do I customize the theme colors?

A: Edit the frontend theme configuration:

```typescript
// frontend/apps/admin/src/theme.ts
export const themeConfig = {
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#f5222d',
}
```

### Q: Is internationalization (i18n) supported?

A: Yes — i18n support is built in. Language files live in `frontend/packages/i18n/`:

```bash
# Add a new language
cp -r frontend/packages/i18n/zh-CN frontend/packages/i18n/fr-FR
# Edit the translation files
```

### Q: How do I upload files to object storage (OSS)?

A: Configure the OSS parameters:

```yaml
# backend/app/admin/service/configs/config.yaml
oss:
  provider: aliyun  # or minio, aws, etc
  bucket: my-bucket
  endpoint: oss-cn-hangzhou.aliyuncs.com
  access_key: your-access-key
  secret_key: your-secret-key
```

### Q: How do I write a custom Lua script?

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

Call it in your API:

```go
result := luaEngine.Call("custom.hello", "World")
```

---

## Contributing

### Q: How do I contribute to the project?

A:

1. Fork the project repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push the branch: `git push origin feature/my-feature`
5. Create a Pull Request

See the [Contribution Guide](/en/guide/contribution.md) for details.

### Q: What are the coding standards requirements?

A:

- **Go**: follow the Go Code Review Comments (`gofmt`, `golint`)
- **TypeScript/Vue**: format with ESLint and Prettier
- **Commit messages**: follow the Conventional Commits specification

### Q: How do I report a bug?

A: Submit it in GitHub Issues, including:

1. The bug description and steps to reproduce
2. The expected and actual behavior
3. Environment details (OS, Go/Node versions, browser, etc.)
4. Relevant logs or screenshots

### Q: How do I suggest a new feature?

A: Discuss it in GitHub Discussions, or open a GitHub Issue labeled `enhancement`.

---

## Performance and Optimization

### Q: How do I improve backend performance?

A:

1. **Enable Redis caching**
2. **Use connection pools**
3. **Optimize database queries** (add indexes)
4. **Enable GZIP compression**
5. **Serve static assets through a CDN**

### Q: The frontend pages load slowly. What should I do?

A:

1. Enable Vite code splitting
2. Use Tree Shaking to remove unused code
3. Enable Gzip compression
4. Optimize image sizes
5. Use a CDN

### Q: How do I run performance tests and monitoring?

A:

```bash
# Backend performance tests
go test -bench=. -benchmem

# Frontend bundle analysis
pnpm build:antd --analyze

# Real-time monitoring with Prometheus + Grafana
```

---

## Security

### Q: How do I protect API endpoints?

A:

1. **Enable HTTPS**: HTTPS is mandatory in all production environments
2. **API authentication**: use JWT tokens or OAuth
3. **Rate limiting**: protect against DDoS attacks
4. **Input validation**: validate all user input
5. **SQL injection prevention**: use parameterized queries

### Q: How do I prevent XSS attacks?

A:

- Vue3 templates escape HTML automatically
- Avoid `v-html`; use `{{ }}` instead
- Sanitize and validate user input

### Q: How are passwords stored securely?

A: Using the bcrypt algorithm (built into the project):

```go
// Hash the password on the backend
hashedPassword := bcrypt.Generate(password)

// Verify the password
bcrypt.Compare(hashedPassword, inputPassword)
```

### Q: How do I manage sensitive information (such as API keys)?

A:

1. **Never commit it to the repository**
2. **Use environment variables**: `export DATABASE_PASSWORD=xxx`
3. **Use a secrets management service**: HashiCorp Vault
4. **Rotate regularly**: update keys on a schedule

### Q: How do I run a security audit?

A:

```bash
# Check dependencies for vulnerabilities
go list -json -m all | nancy sleuth

# Or use Snyk
snyk test

# Code security scanning
golangci-lint run
```

---

## Other Questions

### Q: Where is the project documentation?

A:

- Official docs: <https://gowind.cloud>
- GitHub Wiki: <https://github.com/tx7do/go-wind-admin/wiki>
- API docs: <https://api.demo.admin.gowind.cloud/docs/>

### Q: How do I get technical support?

A:

- 📧 Email: <yanglinbo@gmail.com>
- 💬 GitHub Discussions: <https://github.com/tx7do/go-wind-admin/discussions>
- 🐛 Bug reports: <https://github.com/tx7do/go-wind-admin/issues>
- 📖 Docs discussions: <https://github.com/tx7do/gowind-website/issues>

### Q: What is the project's development progress?

A: Follow the GitHub Project board: <https://github.com/tx7do/go-wind-admin/projects>

### Q: Is enterprise support available?

A: Yes — contact business@gowind.cloud to inquire about commercial support services.

### Q: How do I stay up to date?

A:

```bash
# Pull the latest code
git pull origin main

# Update dependencies
go mod tidy
pnpm update

# Check the version
cat version.txt
```

### Q: How often is the project updated?

A:

- Major feature updates: monthly
- Bug fixes and patches: released continuously
- Security patches: highest priority, released promptly

---

## More Help

If your question isn't covered in this document, please:

1. 📚 Check the [Quick Start Guide](/en/guide/getting-started.md)
2. 📖 Read the [product documentation](/en/admin/intro.md)
3. 💬 Ask: [GitHub Discussions](https://github.com/tx7do/go-wind-admin/discussions)
4. 📧 Email feedback: <yanglinbo@gmail.com>
5. 🐛 Report bugs: [GitHub Issues](https://github.com/tx7do/go-wind-admin/issues)

Thank you for using and supporting the project!
