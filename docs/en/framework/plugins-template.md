# Template Rendering and Validation Plugins

::: warning Family Status Note (defer to the repository)
The go-wind-plugins repository **no longer contains a `template/` plugin family** — template rendering (gotemplate / handlebars / jet), data validation (`validator`), and internationalization (`i18n`) have no corresponding module directories in the current repository state, and their whereabouts are not officially documented. This article is retained from historical documentation; **defer to the actual repository state**.
:::

go-wind-plugins provides template rendering and data validation plugins for scenarios such as email templates and API parameter validation.

## 1. Template Rendering

### 1.1 Adapter List

| Adapter | Import Path | Highlights |
|---------|------------|------------|
| Go Template | `plugins/template/gotemplate` | Standard library text/html template |
| Handlebars | `plugins/template/handlebars` | Flexible logic-less templates |
| Jet | `plugins/template/jet` | High performance, inheritance support |

### 1.2 Usage

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

// Render a template
output, _ := renderer.Render("email/welcome", map[string]interface{}{
    "UserName": "Alice",
    "VerifyURL": "https://app.example.com/verify?token=abc",
})
```

### 1.3 Template Inheritance (Jet)

```go
import jetPlugin "github.com/tx7do/go-wind-plugins/template/jet"

renderer := jetPlugin.New(
    jetPlugin.WithRoot("./views"),
    jetPlugin.WithDevelopmentMode(true),     // hot reload
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

## 2. Data Validation

### 2.1 Adapter

```go
import validatorPlugin "github.com/tx7do/go-wind-plugins/validator"
```

### 2.2 Struct Validation

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
        // return the validation error
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // validation passed, proceed with business logic
}
```

### 2.3 Validation Rules

| Tag | Description | Example |
|-----|-------------|---------|
| `required` | Required | `validate:"required"` |
| `min` / `max` | Minimum/maximum length | `validate:"min=3,max=32"` |
| `len` | Exact length | `validate:"len=11"` |
| `gte` / `lte` | Numeric range | `validate:"gte=18,lte=120"` |
| `email` | Email format | `validate:"email"` |
| `url` | URL format | `validate:"url"` |
| `uuid` | UUID format | `validate:"uuid"` |
| `e164` | Phone number | `validate:"e164"` |
| `oneof` | Enumerated values | `validate:"oneof=red green blue"` |
| `unique` | Uniqueness | `validate:"unique"` |
| `datetime` | Date/time | `validate:"datetime=2006-01-02"` |
| `ip` | IP address | `validate:"ip"` |
| `uuid4` | UUID v4 | `validate:"uuid4"` |

### 2.4 Custom Validation

```go
// Register a custom validator
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

### 2.5 Localized Error Messages

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

### 2.6 YAML Configuration

```yaml
validator:
  locale: zh           # zh | en
  custom_rules:
    - name: phone_cn
      regex: "^1[3-9]\\d{9}$"
      message: "手机号格式不正确"
```

## 3. Internationalization (i18n)

```go
import i18nPlugin "github.com/tx7do/go-wind-plugins/i18n"

translator := i18nPlugin.New(
    i18nPlugin.WithLocaleDir("./locales"),
    i18nPlugin.WithDefaultLocale("zh-CN"),
)

// Translate
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

## Related Documents

- [Plugin Configuration System](./plugins-config.md)
- [Plugin Overview](./plugins-intro.md)
