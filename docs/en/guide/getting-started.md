# Quick Start

Welcome to the GoWind ecosystem! This guide helps you quickly try out and deploy GoWind products.

## 1. Try It Online (Recommended First Step)

No deployment required — experience the full functionality directly online:

| Product        | Demo                                     | API Docs                                                                                          | Default Account              |
|-----------|------------------------------------------|-------------------------------------------------------------------------------------------------|-------------------|
| **Admin** | [react](https://react.admin.gowind.cloud) (also [ele](https://ele.admin.gowind.cloud) / [vben](https://vben.admin.gowind.cloud)) | [Swagger](https://api.demo.admin.gowind.cloud/docs/)                                            | `admin` / `Abcd@1234` |
| **CMS**   | [admin](https://admin.cms.gowind.cloud)  | [Admin](https://api.admin.cms.gowind.cloud/docs/), [App](https://api.cms.gowind.cloud/docs/) | `admin` / `admin` |
| **IM**    | [Demo site](https://im.gowind.cloud) ([Web IM](https://web.im.gowind.cloud)) | -                                                                                               | -                 |
| **UBA**   | Coming soon                                     | -                                                                                               | -                 |

## 2. Choose Your Product

The GoWind ecosystem includes four core products. Choose based on your needs:

### 1. GoWind Admin - Enterprise-Grade Admin Console

**Use cases**: enterprise dashboards, management systems, data platforms

**Core features**:

- A complete permission system (RBAC)
- A rich business component library
- Visual data analysis
- API management and documentation
- Lua script extensibility

**Quick start**: [Go to the Admin docs →](/en/admin/intro.md)

**Tech stack**: Go 1.18+ / Vue3 / Kratos framework / Ant Design Vue

---

### 2. GoWind CMS - High-Performance Content Management System

**Use cases**: news and media, blogs, content portals, e-commerce platforms

**Core features**:

- Flexible content management
- Multi-platform publishing
- Comments and interaction
- Content review workflow
- SEO optimization

**Quick start**: [Go to the CMS docs →](/en/cms/intro.md)

---

### 3. GoWind IM - Lightweight Instant Messaging Component

**Use cases**: real-time chat, customer service, online collaboration, gaming and social apps

**Core features**:

- Private and group chat
- Message push
- Presence detection
- Read receipts
- File transfer

**Quick start**: [Go to the IM docs →](/en/im/intro.md)

---

### 4. GoWind UBA - User Behavior Analytics Tool

**Use cases**: product analytics, user research, business decisions, data-driven growth

**Core features**:

- Data collection and event tracking
- Event analysis
- User profiling
- Funnel analysis
- Comparative analysis

**Quick start**: [Go to the UBA docs →](/en/uba/intro.md)

---

## 3. Environment Setup

### Minimum System Requirements

| Component                   | Version Required       | Notes         |
|----------------------|------------|------------|
| **Go**               | 1.18+      | Backend runtime   |
| **Node.js**          | 16+        | Frontend build tooling     |
| **Docker**           | 20.10+     | Container runtime (optional) |
| **MySQL/PostgreSQL** | 8.0+ / 12+ | Database        |
| **Redis**            | 6.0+       | Cache and message queue    |
| **MinIO**            |            | File storage       |

### Installing Development Tools

#### macOS

```bash
# Install with Homebrew
brew install go node docker

# Install pnpm (the recommended package manager)
npm install -g pnpm
```

#### Ubuntu/Debian

```bash
# Install Go
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install Docker
sudo apt-get install docker.io docker-compose
```

#### Windows

```powershell
# Install with Chocolatey
scoop install golang nodejs docker-desktop

# Install pnpm
npm install -g pnpm
```

## 4. Quick Start (Admin as an Example)

### Step 1: Clone the Repository

```bash
git clone https://github.com/tx7do/go-wind-admin.git
cd go-wind-admin
```

### Step 2: Start the Backend

```bash
cd backend

# Run the preparation script on first launch
./script/prepare.sh

# Install dependency tools and plugins
make init

# Start the service (recommended)
gow run admin

# Or use the traditional approach
cd app/admin/service
make run

# The service will start at http://localhost:7788
```

### Step 3: Start the Frontend

```bash
cd ../frontend

# Install frontend dependencies
pnpm install

# Start the dev server
pnpm dev:antd

# The frontend will start at http://localhost:5555
```

### Step 4: Open the Application

- **Admin pages**: [http://localhost:5555](http://localhost:5555)
- **API docs**: [http://localhost:7788/docs/](http://localhost:7788/docs/)
- **Default account**: `admin` / `admin`

## 5. Quick Start with Docker Compose

If you prefer to bring up the complete development environment with Docker (including the database, Redis, and other dependencies):

```bash
# Run from the project root
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

For more details, refer to each product's installation documentation.

## 6. FAQ

### Q: What editors can I use for development?

A: Recommended:

- **Go backend**: VS Code (Go extension), GoLand, Vim
- **Vue3 frontend**: VS Code (Volar extension), WebStorm

### Q: How do I switch the database to PostgreSQL?

A: Edit the database configuration in `backend/app/admin/service/configs/config.yaml` and change `mysql` to `postgres`.

### Q: Does frontend development support hot reload?

A: Yes — Vite hot reload is enabled automatically when you run `pnpm dev:antd`.

### Q: How do I deploy to production?

A: See each product's deployment guide, or reach out to the community for help.

## 7. Getting Help

- 📖 **Docs**: [GoWind official documentation](https://gowind.cloud)
- 🐛 **Issues**: [GitHub Issues](https://github.com/tx7do/go-wind-admin/issues)
- 💬 **Community discussions**: [GitHub Discussions](https://github.com/tx7do/go-wind-admin/discussions)
- 📧 **Email support**: <yanglinbo@gmail.com>

## 8. Next Steps

- ✅ Quick experience complete
- 👉 [Learn more about the Admin architecture](/en/admin/intro.md)
- 👉 [Read the installation and deployment guide](/en/admin/installation.md)
- 👉 [Browse the API documentation](<https://api.demo.admin.gowind.cloud/docs/>)

Happy building!
