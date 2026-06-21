# 模板渲染与验证插件

go-wind-plugins 提供模板渲染和数据验证插件，用于邮件模板、API 参数校验等场景。

## 一、模板渲染

### 1.1 适配器列表

| 适配器 | 导入路径 | 特点 |
|--------|---------|------|
| Go Template | `plugins/template/gotemplate` | 标准库 text/html template |
| Handlebars | `plugins/template/handlebars` | 灵活的逻辑模板 |
| Jet | `plugins/template/jet` | 高性能、继承支持 |

### 1.2 使用方式

```go
import templatePlugin "github.com/tx7do/go-wind-plugins/template/gotemplate"

renderer := templatePlugin.New(
    templatePlugin.WithRoot("./templates"),
    templatePlugin.WithSuffix(".html"),
    templatePlugin.WithFuncMap(template.FuncMap{
        "formatTime": formatTime,
        "currency":   formatCurrency,
    }),
)

// 渲染模板
output, _ := renderer.Render("email/welcome", map[string]interface{}{
    "UserName": "Alice",
    "VerifyURL": "https://app.example.com/verify?token=abc",
})
```

### 1.3 模板继承（Jet）

```go
import jetPlugin "github.com/tx7do/go-wind-plugins/template/jet"

renderer := jetPlugin.New(
    jetPlugin.WithRoot("./views"),
    jetPlugin.WithDevelopmentMode(true),     // 热重载
)
```

```jet
// views/layout.jet
{{block content()}}{{end}}

// views/page.jet
{{extends "layout.jet"}}
{{block content()}}
  <h1>{{.Title}}</h1>
  <p>{{.Content}}</p>
{{end}}
```

## 二、数据验证

### 2.1 适配器

```go
import validatorPlugin "github.com/tx7do/go-wind-plugins/validator"
```

### 2.2 结构体验证

```go
type CreateUserRequest struct {
    Username string `json:"username" validate:"required,min=3,max=32"`
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required,min=8,max=128"`
    Age      int    `json:"age" validate:"gte=18,lte=120"`
    Phone    string `json:"phone" validate:"required,e164"`
}

func handleCreateUser(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    json.NewDecoder(r.Body).Decode(&req)

    if err := validatorPlugin.Validate(req); err != nil {
        // 返回验证错误
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // 验证通过，处理业务逻辑
}
```

### 2.3 验证规则

| Tag | 说明 | 示例 |
|-----|------|------|
| `required` | 必填 | `validate:"required"` |
| `min` / `max` | 最小/最大长度 | `validate:"min=3,max=32"` |
| `len` | 固定长度 | `validate:"len=11"` |
| `gte` / `lte` | 数值范围 | `validate:"gte=18,lte=120"` |
| `email` | 邮箱格式 | `validate:"email"` |
| `url` | URL 格式 | `validate:"url"` |
| `uuid` | UUID 格式 | `validate:"uuid"` |
| `e164` | 手机号 | `validate:"e164"` |
| `oneof` | 枚举值 | `validate:"oneof=red green blue"` |
| `unique` | 唯一性 | `validate:"unique"` |
| `datetime` | 日期时间 | `validate:"datetime=2006-01-02"` |
| `ip` | IP 地址 | `validate:"ip"` |
| `uuid4` | UUID v4 | `validate:"uuid4"` |

### 2.4 自定义验证

```go
// 注册自定义验证器
validatorPlugin.RegisterValidation("strong_password", func(fl validator.FieldLevel) bool {
    password := fl.Field().String()
    hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
    hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
    hasDigit := regexp.MustCompile(`\d`).MatchString(password)
    hasSpecial := regexp.MustCompile(`[!@#$%^&*]`).MatchString(password)
    return hasUpper && hasLower && hasDigit && hasSpecial
})

type RegisterRequest struct {
    Password string `json:"password" validate:"required,strong_password"`
}
```

### 2.5 中文错误消息

```go
validatorPlugin.RegisterTranslations("zh", map[string]string{
    "required":       "{0}为必填项",
    "min":            "{0}长度不能少于{1}个字符",
    "max":            "{0}长度不能超过{1}个字符",
    "email":          "{0}格式不正确",
    "gte":            "{0}必须大于或等于{1}",
    "lte":            "{0}必须小于或等于{1}",
    "oneof":          "{0}必须是{1}中的一个",
    "strong_password": "密码必须包含大小写字母、数字和特殊字符",
})
```

### 2.6 YAML 配置

```yaml
validator:
  locale: zh           # zh | en
  custom_rules:
    - name: phone_cn
      regex: "^1[3-9]\\d{9}$"
      message: "手机号格式不正确"
```

## 三、国际化（i18n）

```go
import i18nPlugin "github.com/tx7do/go-wind-plugins/i18n"

translator := i18nPlugin.New(
    i18nPlugin.WithLocaleDir("./locales"),
    i18nPlugin.WithDefaultLocale("zh-CN"),
)

// 翻译
msg := translator.T("welcome", map[string]interface{}{
    "name": "Alice",
})
// "欢迎，Alice！"
```

```yaml
# locales/zh-CN.yaml
welcome: "欢迎，{name}！"
errors:
  not_found: "资源不存在"
  unauthorized: "未授权"
```

## 相关文档

- [插件配置系统](./plugins-config.md)
- [插件总览](./plugins-intro.md)
