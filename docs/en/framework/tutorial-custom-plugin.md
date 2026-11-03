# Custom Plugin Development Tutorial

This tutorial teaches you how to develop a go-wind plugin from scratch and register it with the Bootstrap SPI.

## Goal

Develop an IP blocklist middleware plugin with the following features:
- Read the IP list from YAML configuration
- Intercept requests from blocklisted IPs
- Support CIDR ranges

## Step 1: Create the Plugin Directory

```bash
mkdir -p plugins/middleware/ip_blocklist
cd plugins/middleware/ip_blocklist
```

## Step 2: Define Options

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

## Step 3: Implement the Middleware

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

    // Build the IP set
    m.ipSet = make(map[string]bool, len(cfg.IPList))
    for _, ip := range cfg.IPList {
        m.ipSet[strings.TrimSpace(ip)] = true
    }

    // Parse CIDRs
    for _, cidr := range cfg.CIDRList {
        if _, network, err := net.ParseCIDR(cidr); err == nil {
            m.cidrNetworks = append(m.cidrNetworks, network)
        }
    }

    return m
}

func (m *Middleware) Handler(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Skip specific paths
        for _, path := range m.config.SkipPaths {
            if r.URL.Path == path {
                next.ServeHTTP(w, r)
                return
            }
        }

        clientIP := extractIP(r)

        // Check exact matches
        if m.ipSet[clientIP] {
            w.WriteHeader(m.config.StatusCode)
            w.Write([]byte(m.config.Message))
            return
        }

        // Check CIDR ranges
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
    // Prefer extracting from X-Forwarded-For
    if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
        if idx := strings.Index(xff, ","); idx > 0 {
            return strings.TrimSpace(xff[:idx])
        }
        return strings.TrimSpace(xff)
    }
    if xri := r.Header.Get("X-Real-IP"); xri != "" {
        return xri
    }
    // Extract from RemoteAddr
    host, _, err := net.SplitHostPort(r.RemoteAddr)
    if err != nil {
        return r.RemoteAddr
    }
    return host
}
```

## Step 4: Register with the Bootstrap

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

        // Map from the YAML map to Config
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

## Step 5: Configure YAML

```yaml
# configs/config.yaml
server:
  http:
    addr: ":8080"
    middleware:
      - recovery
      - cors
      - ip_blocklist         # Use the custom middleware
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

## Step 6: Use It

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

## Step 7: Test

```bash
# Normal request
curl http://localhost:8080/api/users
# 200 OK

# Blocklisted IP (simulated)
curl -H "X-Forwarded-For: 192.168.1.100" http://localhost:8080/api/users
# 403 Forbidden: Your IP has been blocked

# Blocklisted CIDR range
curl -H "X-Forwarded-For: 10.10.0.5" http://localhost:8080/api/users
# 403 Forbidden: Your IP has been blocked

# Health check is not restricted
curl -H "X-Forwarded-For: 192.168.1.100" http://localhost:8080/health
# 200 OK
```

## Extension: A Dynamic Blocklist

Load a dynamic blocklist from Redis:

```go
type DynamicMiddleware struct {
    config *Config
    cache  cache.Cache
    ttl    time.Duration
}

func (m *DynamicMiddleware) Handler(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        clientIP := extractIP(r)

        // Check in Redis
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
// Dynamically block an IP
func BlockIP(ctx context.Context, cache cache.Cache, ip string, duration time.Duration) error {
    return cache.Set(ctx, "blocklist:"+ip, []byte("1"), duration)
}
```

## Complete Directory Structure

```
plugins/middleware/ip_blocklist/
├── option.go          # Options and configuration
├── middleware.go      # Middleware implementation
├── register.go        # SPI registration
└── register_test.go   # Tests
```

## Development Checklist

| Check | Description |
|--------|------|
| Implement `Option` functional options | ✓ With* family of functions |
| Implement `New(opts ...Option)` | ✓ Factory function |
| Register with the Bootstrap SPI | ✓ Call Register inside `init()` |
| Support YAML configuration | ✓ `RegisterWithConfig` |
| Write tests | ✓ At least covering the core logic |
| Write documentation | ✓ README or doc comments |

## Related Documentation

- [The Plugin Registration Mechanism](./plugins-registry.md)
- [The Bootstrap SPI Mechanism](./bootstrap-spi.md)
- [Declarative Middleware Orchestration](./bootstrap-middleware.md)
- [Quick Start Tutorial](./tutorial-quick-start.md)
