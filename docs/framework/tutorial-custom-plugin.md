# 自定义插件开发教程

本教程教你从零开发一个 go-wind 插件，并注册到 Bootstrap SPI 中。

## 目标

开发一个 IP 黑名单中间件插件，功能：
- 从 YAML 配置读取 IP 列表
- 拦截黑名单 IP 的请求
- 支持 CIDR 网段

## 第一步：创建插件目录

```bash
mkdir -p plugins/middleware/ip_blocklist
cd plugins/middleware/ip_blocklist
```

## 第二步：定义选项

```go
// plugins/middleware/ip_blocklist/option.go
package ip_blocklist

type Option func(*Config)

type Config struct {
    IPList    []string `yaml:"ip_list"`
    CIDRList  []string `yaml:"cidr_list"`
    StatusCode int     `yaml:"status_code"`
    Message   string   `yaml:"message"`
    SkipPaths []string `yaml:"skip_paths"`
}

func WithIPList(ips []string) Option {
    return func(c *Config) { c.IPList = ips }
}

func WithCIDRList(cidrs []string) Option {
    return func(c *Config) { c.CIDRList = cidrs }
}

func WithStatusCode(code int) Option {
    return func(c *Config) { c.StatusCode = code }
}

func WithMessage(msg string) Option {
    return func(c *Config) { c.Message = msg }
}

func WithSkipPaths(paths []string) Option {
    return func(c *Config) { c.SkipPaths = paths }
}
```

## 第三步：实现中间件

```go
// plugins/middleware/ip_blocklist/middleware.go
package ip_blocklist

import (
    "net"
    "net/http"
    "strings"
)

type Middleware struct {
    config       *Config
    ipSet        map[string]bool
    cidrNetworks []*net.IPNet
}

func New(opts ...Option) *Middleware {
    cfg := &Config{
        StatusCode: http.StatusForbidden,
        Message:    "Access denied",
    }
    for _, opt := range opts {
        opt(cfg)
    }

    m := &Middleware{config: cfg}

    // 构建 IP 集合
    m.ipSet = make(map[string]bool, len(cfg.IPList))
    for _, ip := range cfg.IPList {
        m.ipSet[strings.TrimSpace(ip)] = true
    }

    // 解析 CIDR
    for _, cidr := range cfg.CIDRList {
        if _, network, err := net.ParseCIDR(cidr); err == nil {
            m.cidrNetworks = append(m.cidrNetworks, network)
        }
    }

    return m
}

func (m *Middleware) Handler(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 跳过特定路径
        for _, path := range m.config.SkipPaths {
            if r.URL.Path == path {
                next.ServeHTTP(w, r)
                return
            }
        }

        clientIP := extractIP(r)

        // 检查精确匹配
        if m.ipSet[clientIP] {
            w.WriteHeader(m.config.StatusCode)
            w.Write([]byte(m.config.Message))
            return
        }

        // 检查 CIDR 网段
        ip := net.ParseIP(clientIP)
        for _, network := range m.cidrNetworks {
            if network.Contains(ip) {
                w.WriteHeader(m.config.StatusCode)
                w.Write([]byte(m.config.Message))
                return
            }
        }

        next.ServeHTTP(w, r)
    })
}

func extractIP(r *http.Request) string {
    // 优先从 X-Forwarded-For 提取
    if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
        if idx := strings.Index(xff, ","); idx > 0 {
            return strings.TrimSpace(xff[:idx])
        }
        return strings.TrimSpace(xff)
    }
    if xri := r.Header.Get("X-Real-IP"); xri != "" {
        return xri
    }
    // 从 RemoteAddr 提取
    host, _, err := net.SplitHostPort(r.RemoteAddr)
    if err != nil {
        return r.RemoteAddr
    }
    return host
}
```

## 第四步：注册到 Bootstrap

```go
// plugins/middleware/ip_blocklist/register.go
package ip_blocklist

import (
    "net/http"
    "github.com/tx7do/go-wind-bootstrap/middleware"
)

func init() {
    middleware.RegisterWithConfig("ip_blocklist", func(raw map[string]interface{}) func(http.Handler) http.Handler {
        cfg := &Config{
            StatusCode: http.StatusForbidden,
            Message:    "Access denied",
        }

        // 从 YAML map 映射到 Config
        if v, ok := raw["ip_list"]; ok {
            for _, ip := range v.([]interface{}) {
                cfg.IPList = append(cfg.IPList, ip.(string))
            }
        }
        if v, ok := raw["cidr_list"]; ok {
            for _, cidr := range v.([]interface{}) {
                cfg.CIDRList = append(cfg.CIDRList, cidr.(string))
            }
        }
        if v, ok := raw["status_code"]; ok {
            cfg.StatusCode = int(v.(int))
        }
        if v, ok := raw["message"]; ok {
            cfg.Message = v.(string)
        }
        if v, ok := raw["skip_paths"]; ok {
            for _, p := range v.([]interface{}) {
                cfg.SkipPaths = append(cfg.SkipPaths, p.(string))
            }
        }

        m := New(
            WithIPList(cfg.IPList),
            WithCIDRList(cfg.CIDRList),
            WithStatusCode(cfg.StatusCode),
            WithMessage(cfg.Message),
            WithSkipPaths(cfg.SkipPaths),
        )

        return m.Handler
    })
}
```

## 第五步：配置 YAML

```yaml
# configs/config.yaml
server:
  http:
    addr: ":8080"
    middleware:
      - recovery
      - cors
      - ip_blocklist         # 使用自定义中间件
      - logger

middleware:
  ip_blocklist:
    ip_list:
      - "192.168.1.100"
      - "10.0.0.50"
    cidr_list:
      - "10.10.0.0/24"
      - "172.16.0.0/16"
    status_code: 403
    message: "Your IP has been blocked"
    skip_paths:
      - /health
      - /metrics
```

## 第六步：使用

```go
// cmd/server/main.go
package main

import (
    _ "github.com/tx7do/go-wind-plugins/transport/http"
    _ "github.com/tx7do/go-wind-plugins/log/zap"

    "github.com/tx7do/go-wind-bootstrap"
    _ "my-service/plugins/middleware/ip_blocklist"   // blank import
)

func main() {
    app := bootstrap.New("configs/config.yaml")
    app.Run()
}
```

## 第七步：测试

```bash
# 正常请求
curl http://localhost:8080/api/users
# 200 OK

# 黑名单 IP（模拟）
curl -H "X-Forwarded-For: 192.168.1.100" http://localhost:8080/api/users
# 403 Forbidden: Your IP has been blocked

# 黑名单网段
curl -H "X-Forwarded-For: 10.10.0.5" http://localhost:8080/api/users
# 403 Forbidden: Your IP has been blocked

# 健康检查不受限制
curl -H "X-Forwarded-For: 192.168.1.100" http://localhost:8080/health
# 200 OK
```

## 扩展：动态黑名单

从 Redis 加载动态黑名单：

```go
type DynamicMiddleware struct {
    config *Config
    cache  cache.Cache
    ttl    time.Duration
}

func (m *DynamicMiddleware) Handler(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        clientIP := extractIP(r)

        // 从 Redis 检查
        blocked, _ := m.cache.Exists(r.Context(), "blocklist:"+clientIP)
        if blocked {
            w.WriteHeader(http.StatusForbidden)
            w.Write([]byte("Your IP has been temporarily blocked"))
            return
        }

        next.ServeHTTP(w, r)
    })
}
```

```go
// 动态封禁 IP
func BlockIP(ctx context.Context, cache cache.Cache, ip string, duration time.Duration) error {
    return cache.Set(ctx, "blocklist:"+ip, []byte("1"), duration)
}
```

## 完整目录结构

```
plugins/middleware/ip_blocklist/
├── option.go          # 选项和配置
├── middleware.go      # 中间件实现
├── register.go        # SPI 注册
└── register_test.go   # 测试
```

## 开发清单

| 检查项 | 说明 |
|--------|------|
| 实现 `Option` 函数式选项 | ✓ With* 系列函数 |
| 实现 `New(opts ...Option)` | ✓ 工厂函数 |
| 注册到 Bootstrap SPI | ✓ `init()` 中调用 Register |
| 支持 YAML 配置 | ✓ `RegisterWithConfig` |
| 编写测试 | ✓ 至少覆盖核心逻辑 |
| 编写文档 | ✓ README 或文档注释 |

## 相关文档

- [插件注册机制](./plugins-registry.md)
- [Bootstrap SPI 机制](./bootstrap-spi.md)
- [声明式中间件编排](./bootstrap-middleware.md)
- [快速入门教程](./tutorial-quick-start.md)
