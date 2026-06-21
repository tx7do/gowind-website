# Bootstrap 配置系统

go-wind-bootstrap 提供强大的 YAML 配置系统，支持多文件、环境变量、热更新和动态配置中心。

## 一、配置结构

### 1.1 完整配置模板

```yaml
# config.yaml

# 应用元信息
name: my-service
version: 1.0.0
description: "My microservice"

# 传输层
server:
  http:
    addr: ":8080"
    timeout: 30s
    cors:
      enabled: true
      origins: ["*"]
  grpc:
    addr: ":9090"

# 日志
log:
  zap:
    level: info
    format: json
    output: stdout

# 数据库
database:
  default:
    driver: mysql
    dsn: "user:pass@tcp(localhost:3306)/db?parseTime=true"
    max_open_conns: 100

# 缓存
cache:
  redis:
    addr: "localhost:6379"
    db: 0

# 消息队列
broker:
  kafka:
    addrs: ["localhost:9092"]
    group_id: "my-service"

# 服务注册发现
registry:
  consul:
    addr: "localhost:8500"

# 链路追踪
tracer:
  jaeger:
    endpoint: "http://jaeger:14268/api/traces"
    sample_ratio: 0.1

# 指标监控
metrics:
  prometheus:
    enabled: true
    path: /metrics

# 认证
auth:
  jwt:
    signing_method: HS256
    key: ${JWT_SECRET}
    expiry: 24h

# 限流
ratelimit:
  tokenbucket:
    rate: 100
    burst: 50

# 生命周期
lifecycle:
  shutdown_timeout: 30s
  grace_period: 15s
  signal: true
```

## 二、环境变量

### 2.1 ${VAR} 语法

```yaml
database:
  default:
    dsn: "${DB_USER}:${DB_PASS}@tcp(${DB_HOST}:3306)/${DB_NAME}?parseTime=true"
```

### 2.2 默认值

```yaml
database:
  default:
    dsn: "${DB_DSN|root:root@tcp(localhost:3306)/app?parseTime=true}"
```

### 2.3 从 .env 加载

Bootstrap 自动加载 `.env` 文件：

```bash
# .env
DB_USER=appuser
DB_PASS=s3cret
DB_HOST=prod-db.internal
DB_NAME=myapp
JWT_SECRET=my-secret-key
```

## 三、多环境配置

### 3.1 配置继承

```yaml
# config.yaml（基础配置）
name: my-service
server:
  http:
    addr: ":8080"

log:
  zap:
    level: info
```

```yaml
# config.production.yaml（生产覆盖）
# 继承基础配置，仅覆盖差异部分
server:
  http:
    addr: ":80"
    tls:
      enabled: true
      cert_file: /etc/certs/tls.crt
      key_file: /etc/certs/tls.key

log:
  zap:
    level: warn
    format: json
```

### 3.2 环境选择

```bash
# 通过环境变量
export APP_ENV=production
# Bootstrap 加载 config.production.yaml

# 或通过命令行
./my-service --config config.production.yaml
```

## 四、配置层级合并

```yaml
# base.yaml
server:
  http:
    addr: ":8080"
    timeout: 30s
    cors:
      enabled: true
      origins: ["*"]

# override.yaml
server:
  http:
    timeout: 10s          # 覆盖
    cors:
      origins:            # 覆盖（数组整体替换）
        - "https://app.com"
        - "https://admin.com"

# 合并结果：
# server.http.addr = ":8080"     ← 继承
# server.http.timeout = "10s"    ← 覆盖
# server.http.cors.enabled = true ← 继承
# server.http.cors.origins = [...] ← 覆盖
```

## 五、动态配置

### 5.1 监听配置变更

```go
app := bootstrap.New("config.yaml")

// 监听特定配置项
app.OnConfigChange("cache.redis.addr", func(newVal string) {
    fmt.Println("Redis addr changed:", newVal)
    // 重新连接 Redis
})

app.Run()
```

### 5.2 配置中心集成

```yaml
# 从 Nacos 加载动态配置
config:
  sources:
    - type: file
      path: ./config.yaml           # 静态配置
    - type: nacos
      addr: localhost:8848
      data_id: my-service.yaml       # 动态配置（可热更新）
      namespace: production
      group: DEFAULT_GROUP
```

## 六、程序内访问配置

```go
// 获取配置值
val := bootstrap.Config().GetString("server.http.addr")
timeout := bootstrap.Config().GetDuration("server.http.timeout")
port := bootstrap.Config().GetInt("server.http.port")
enabled := bootstrap.Config().GetBool("server.http.cors.enabled")
list := bootstrap.Config().GetStringSlice("server.http.cors.origins")

// 绑定到结构体
var dbCfg DatabaseConfig
bootstrap.Config().UnmarshalKey("database.default", &dbCfg)
```

## 七、配置验证

Bootstrap 支持配置启动时验证：

```go
type Config struct {
    Name    string `yaml:"name" validate:"required"`
    Server  ServerConfig `yaml:"server" validate:"required"`
    Database DatabaseConfig `yaml:"database" validate:"required"`
}

func main() {
    app := bootstrap.New("config.yaml", bootstrap.WithValidate[Config]())
    app.Run()
}
```

配置缺失或格式错误时，启动阶段直接报错，避免运行时问题。

## 八、敏感信息管理

| 方式 | 安全级别 | 说明 |
|------|---------|------|
| `.env` 文件 | 中 | 加入 .gitignore |
| 环境变量 | 高 | K8s Secret / Docker Secrets |
| Vault | 最高 | HashiCorp Vault 动态注入 |
| 配置中心加密 | 高 | Nacos/Apollo 加密配置 |

```yaml
# 不要在配置文件中硬编码密码！
# 错误：
dsn: "user:password123@tcp(localhost:3306)/db"

# 正确：
dsn: "${DB_DSN}"
```

## 相关文档

- [Bootstrap 介绍](./bootstrap-intro.md)
- [Bootstrap SPI 机制](./bootstrap-spi.md)
- [插件配置系统](./plugins-config.md)
- [核心框架介绍](./core-intro.md)
