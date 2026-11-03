# Lua Script Extension Tutorial

GoWind Admin has a built-in Lua script engine that allows dynamically extending business logic without modifying core code or restarting the service. This tutorial explains the Lua engine in depth, including its usage and practical scenarios.

## 1. Lua Engine Architecture

### 1.1 Core Components

```
pkg/lua/
├── engine.go          # Lua engine core (initialization, execution, sandbox)
├── context.go         # Lua context management (injecting Go objects)
├── loader.go          # Script loader (automatic scanning, hot reload)
├── script.go          # Script definition (metadata, dependencies)
├── hook/              # Hook mechanism (event trigger points)
└── api/               # Built-in API modules
    ├── cache.go       # Redis cache operations
    ├── crypto.go      # AES-GCM encryption and decryption
    ├── eventbus.go    # Event publish/subscribe
    ├── hook.go        # Hook registration and triggering
    ├── logger.go      # Logging
    ├── oss.go         # MinIO object storage
    ├── task.go        # Asynq task delivery
    └── util.go        # Utility functions
```

### 1.2 Lifecycle

1. **Initialization**: create the Lua State and register the built-in APIs when the service starts
2. **Load scripts**: scan the specified directory for `.lua` files and compile them
3. **Execution**: scripts are triggered by hooks or manual invocation
4. **Recycling**: temporary objects are cleaned up after the request ends

### 1.3 Sandbox Mechanism

The Lua engine runs in a sandboxed environment:
- File system access is restricted
- Network requests are restricted
- System calls are restricted
- Timeout protection (to prevent infinite loops)

## 2. Built-in API Modules in Detail

### 2.1 Logger API

Logging is the most fundamental API:

```lua
-- Log levels
logger.debug("调试信息")
logger.info("普通信息")
logger.warn("警告信息")
logger.error("错误信息")

-- Formatted output
logger.info("用户 %s 登录，IP: %s", username, ip)
```

### 2.2 Cache API

Redis cache operations:

```lua
-- Set a cache entry (default TTL: 3600 seconds)
cache.set("user:1001:name", "张三")

-- Set a cache entry (custom TTL)
cache.set("user:1001:name", "张三", 7200)

-- Get a cache entry
local name = cache.get("user:1001:name")

-- Delete a cache entry
cache.delete("user:1001:name")

-- Check whether a key exists
if cache.exists("user:1001:name") then
    logger.info("缓存存在")
end
```

**Typical scenarios**: caching hot data such as user information, dictionary data, and configuration items.

### 2.3 Crypto API

AES-GCM encryption and decryption:

```lua
-- Encrypt
local encrypted = crypto.encrypt("敏感数据")

-- Decrypt
local decrypted = crypto.decrypt(encrypted)

-- Base64 encoding
local encoded = crypto.base64_encode("原始数据")

-- Base64 decoding
local decoded = crypto.base64_decode(encoded)
```

**Typical scenarios**: encrypting sensitive information such as phone numbers, ID card numbers, and bank card numbers.

### 2.4 EventBus API

Event publish/subscribe:

```lua
-- Subscribe to an event
eventbus.subscribe("user.created", function(event)
    local user_id = event.user_id
    logger.info("新用户创建: %d", user_id)
    
    -- Send a welcome email
    send_welcome_email(user_id)
end)

-- Publish an event
eventbus.publish("user.created", {
    user_id = 123,
    username = "john"
})

-- Unsubscribe
eventbus.unsubscribe("user.created")
```

**Typical scenarios**: sending emails after user registration, updating inventory after order payment, and refreshing caches after data changes.

### 2.5 Task API

Asynchronous task delivery (based on Asynq):

```lua
-- Enqueue a task for immediate execution
task.enqueue("send_email", {
    to = "user@example.com",
    subject = "欢迎",
    body = "欢迎使用 GoWind Admin"
})

-- Enqueue a scheduled task (executes after 10 minutes)
task.enqueue_in("cleanup_temp_files", 600, {
    directory = "/tmp/uploads"
})

-- Enqueue a periodic task (executes at 2 AM every day)
task.enqueue_periodic("daily_report", "0 2 * * *", {
    report_type = "sales"
})
```

**Typical scenarios**: time-consuming operations such as email delivery, SMS notifications, data export, and report generation.

### 2.6 OSS API

MinIO object storage operations:

```lua
-- Upload a file
local url = oss.upload_file("bucket-name", "file.pdf", file_content)

-- Download a file
local content = oss.download_file("bucket-name", "file.pdf")

-- Generate a presigned URL (valid for 1 hour)
local presigned_url = oss.get_presigned_url("bucket-name", "file.pdf", 3600)

-- Delete a file
oss.delete_file("bucket-name", "file.pdf")

-- List files
local files = oss.list_files("bucket-name", "uploads/")
```

**Typical scenarios**: file upload/download, image processing, backup and archiving.

### 2.7 Hook API

Hook registration and triggering:

```lua
-- Register a hook
hook.register("on_user_created", function(user_id)
    logger.info("用户 %d 创建成功", user_id)
    
    -- Initialize the user's default settings
    cache.set("user:" .. user_id .. ":settings", "{}", 86400)
end)

-- Trigger a hook manually
hook.trigger("on_user_created", 123)

-- Unregister a hook
hook.unregister("on_user_created")
```

**Built-in hook list**:
- `on_user_created` - after a user is created
- `on_user_updated` - after a user is updated
- `on_user_deleted` - after a user is deleted
- `on_login_success` - after a successful login
- `on_login_failed` - after a failed login
- `on_order_paid` - after an order is paid
- `on_server_start` - when the server starts

### 2.8 Util API

General utility functions:

```lua
-- JSON serialization
local json_str = util.to_json({name = "张三", age = 25})

-- JSON deserialization
local obj = util.from_json(json_str)

-- UUID generation
local uuid = util.uuid()

-- Timestamp
local timestamp = util.timestamp()

-- String slicing
local sub = util.substr("Hello World", 1, 5)  -- "Hello"

-- Array length
local len = util.len({1, 2, 3})  -- 3
```

## 3. Practical Scenarios

### 3.1 Scenario 1: Automatically Send a Welcome Email After User Registration

**Requirement**: automatically send a welcome email and initialize the user's default settings after a user registers successfully.

**Implementation**:

```lua
-- scripts/on_user_registered.lua

-- Subscribe to the user created event
eventbus.subscribe("user.created", function(event)
    local user_id = event.user_id
    local email = event.email
    
    logger.info("处理新用户注册: user_id=%d, email=%s", user_id, email)
    
    -- 1. Send the welcome email (async task)
    task.enqueue("send_welcome_email", {
        user_id = user_id,
        email = email
    })
    
    -- 2. Initialize the user's default settings
    local default_settings = {
        theme = "light",
        language = "zh-CN",
        notifications = true
    }
    cache.set("user:" .. user_id .. ":settings", util.to_json(default_settings), 86400)
    
    -- 3. Record the registration source (if any)
    if event.source then
        logger.info("用户注册来源: %s", event.source)
    end
end)

logger.info("用户注册处理脚本已加载")
```

**Deployment**: put the script in the `backend/pkg/lua/scripts/` directory; it is loaded automatically when the service starts.

---

### 3.2 Scenario 2: Encrypted Storage of Sensitive Data

**Requirement**: sensitive fields such as user phone numbers and ID card numbers need to be stored encrypted.

**Implementation**:

```lua
-- scripts/crypto_helper.lua

-- Provide encryption utility functions
local M = {}

-- Encrypt a phone number
function M.encrypt_phone(phone)
    return crypto.encrypt(phone)
end

-- Decrypt a phone number
function M.decrypt_phone(encrypted_phone)
    return crypto.decrypt(encrypted_phone)
end

-- Masked display (keep the first 3 and last 4 digits)
function M.mask_phone(phone)
    if #phone < 7 then
        return "***"
    end
    return phone:sub(1, 3) .. "****" .. phone:sub(-4)
end

return M
```

**Usage**: reference it from other scripts:

```lua
local crypto_helper = require("crypto_helper")

local encrypted = crypto_helper.encrypt_phone("13800138000")
logger.info("加密后的手机号: %s", encrypted)

local masked = crypto_helper.mask_phone("13800138000")
logger.info("脱敏后的手机号: %s", masked)  -- 输出: 138****8000
```

---

### 3.3 Scenario 3: Update Inventory After Order Payment

**Requirement**: after an order is paid successfully, deduct the inventory automatically and raise an alert if the stock is insufficient.

**Implementation**:

```lua
-- scripts/on_order_paid.lua

eventbus.subscribe("order.paid", function(event)
    local order_id = event.order_id
    local items = event.items  -- [{product_id, quantity}]
    
    logger.info("处理订单支付: order_id=%d", order_id)
    
    for _, item in ipairs(items) do
        local product_id = item.product_id
        local quantity = item.quantity
        
        -- 1. Get the current stock
        local stock_key = "product:" .. product_id .. ":stock"
        local current_stock = tonumber(cache.get(stock_key)) or 0
        
        logger.info("商品 %d 当前库存: %d", product_id, current_stock)
        
        -- 2. Deduct the stock
        local new_stock = current_stock - quantity
        if new_stock < 0 then
            logger.error("商品 %d 库存不足！当前: %d, 需求: %d", 
                product_id, current_stock, quantity)
            
            -- Trigger a stock alert
            task.enqueue("send_stock_alert", {
                product_id = product_id,
                current_stock = current_stock,
                required = quantity
            })
        else
            cache.set(stock_key, tostring(new_stock), 86400)
            logger.info("商品 %d 库存更新: %d -> %d", 
                product_id, current_stock, new_stock)
        end
    end
end)

logger.info("订单支付处理脚本已加载")
```

---

### 3.4 Scenario 4: Login Failure Rate Limiting

**Requirement**: if a user fails to log in more than 5 times, lock the account for 30 minutes.

**Implementation**:

```lua
-- scripts/login_security.lua

eventbus.subscribe("login.failed", function(event)
    local username = event.username
    local ip = event.ip
    
    -- 1. Record the failure count
    local fail_key = "login:fail:" .. username
    local fail_count = tonumber(cache.get(fail_key)) or 0
    fail_count = fail_count + 1
    
    cache.set(fail_key, tostring(fail_count), 1800)  -- Expires in 30 minutes
    
    logger.warn("用户 %s 登录失败，累计次数: %d, IP: %s", 
        username, fail_count, ip)
    
    -- 2. Threshold reached, lock the account
    if fail_count >= 5 then
        local lock_key = "login:lock:" .. username
        cache.set(lock_key, "locked", 1800)  -- Locked for 30 minutes
        
        logger.error("用户 %s 因多次登录失败被锁定 30 分钟", username)
        
        -- Send a security alert
        task.enqueue("send_security_alert", {
            username = username,
            reason = "multiple_login_failures",
            fail_count = fail_count,
            ip = ip
        })
    end
end)

eventbus.subscribe("login.success", function(event)
    local username = event.username
    
    -- Login succeeded; clear the failure counter
    cache.delete("login:fail:" .. username)
end)

logger.info("登录安全脚本已加载")
```

---

### 3.5 Scenario 5: Scheduled Cleanup of Temporary Files

**Requirement**: clean up expired temporary uploaded files at 3 AM every day.

**Implementation**:

```lua
-- scripts/cleanup_temp_files.lua

-- Register the periodic task
task.enqueue_periodic("cleanup_temp_files", "0 3 * * *", {})

-- Task handler
hook.register("on_task_cleanup_temp_files", function(params)
    logger.info("开始清理临时文件...")
    
    local bucket = "temp-uploads"
    local files = oss.list_files(bucket, "")
    
    local now = util.timestamp()
    local expired_count = 0
    
    for _, file in ipairs(files) do
        -- Assume the file name contains a timestamp: upload_1234567890.pdf
        local timestamp = extract_timestamp(file.name)
        if timestamp and (now - timestamp) > 86400 then  -- Older than 24 hours
            oss.delete_file(bucket, file.name)
            expired_count = expired_count + 1
        end
    end
    
    logger.info("临时文件清理完成，删除 %d 个过期文件", expired_count)
end)

-- Helper: extract the timestamp from the file name
function extract_timestamp(filename)
    local ts = filename:match("upload_(%d+)")
    return ts and tonumber(ts) or nil
end

logger.info("临时文件清理脚本已加载")
```

## 4. Custom Lua API Modules

In addition to the built-in APIs, you can also develop custom Lua API modules.

### 4.1 Create the Go-Side API

Create `myapi.go` under the `pkg/lua/api/` directory:

```go
package api

import (
	"github.com/yuin/gopher-lua"
)

// RegisterMyAPI registers the custom API
func RegisterMyAPI(L *lua.LState, myService MyServiceInterface, logger log.Logger) {
	mod := L.RegisterModule("myapi", map[string]lua.LGFunction{
		"get_user_info": getUserInfo,
		"update_status": updateStatus,
	})
	L.Push(mod)
}

func getUserInfo(L *lua.LState) int {
	userID := L.CheckInt(1)
	
	// Call the Go service
	userInfo, err := myService.GetUserInfo(userID)
	if err != nil {
		L.RaiseError("get user info failed: %v", err)
		return 0
	}
	
	// Return a Lua table
	tab := L.NewTable()
	tab.RawSetString("id", lua.LNumber(userInfo.ID))
	tab.RawSetString("name", lua.LString(userInfo.Name))
	tab.RawSetString("email", lua.LString(userInfo.Email))
	
	L.Push(tab)
	return 1
}

func updateStatus(L *lua.LState) int {
	userID := L.CheckInt(1)
	status := L.CheckString(2)
	
	err := myService.UpdateStatus(userID, status)
	if err != nil {
		L.RaiseError("update status failed: %v", err)
		return 0
	}
	
	L.Push(lua.LTrue)
	return 1
}
```

### 4.2 Register with the Engine

Add the following in the `registerAPIs` method of `pkg/lua/engine.go`:

```go
func (e *Engine) registerAPIs(L *lua.LState) {
	// Built-in APIs
	api.RegisterCache(L, e.redisClient)
	api.RegisterCrypto(L, e.encryptor)
	api.RegisterEventBus(L, e.eventBus)
	// ...
	
	// Custom API
	api.RegisterMyAPI(L, e.myService, e.logger)
}
```

### 4.3 Using It in Lua Scripts

```lua
-- Call the custom API
local user = myapi.get_user_info(123)
logger.info("用户信息: %s, %s", user.name, user.email)

myapi.update_status(123, "active")
```

## 5. Debugging Tips

### 5.1 Log-Based Debugging

Use `logger` extensively in Lua scripts to output debugging information:

```lua
logger.debug("变量值: %v", some_variable)
logger.info("进入函数: %s", function_name)
logger.error("错误详情: %s", error_message)
```

### 5.2 Error Handling

Use `pcall` to catch runtime errors:

```lua
local success, result = pcall(function()
    -- Code that may fail
    return risky_operation()
end)

if not success then
    logger.error("执行失败: %s", result)
end
```

### 5.3 Performance Profiling

Measure how long key operations take:

```lua
local start_time = util.timestamp()

-- Run the time-consuming operation
do_something()

local elapsed = util.timestamp() - start_time
logger.info("操作耗时: %d ms", elapsed)
```

### 5.4 Hot Reload

Lua scripts can be reloaded without restarting the service, using either of the following methods:

```shell
# Method 1: call the management API
curl -X POST http://localhost:7788/admin/v1/lua/reload

# Method 2: send a signal
kill -USR1 <pid>
```

## 6. Best Practices

### 6.1 Script Organization

- Split files by functional domain: `user_scripts.lua`, `order_scripts.lua`
- Avoid overly large single scripts (recommended: < 500 lines)
- Extract common functions into modules referenced via `require`

### 6.2 Performance Optimization

- Avoid I/O operations inside loops
- Cache frequently read data
- Prefer async tasks over synchronous blocking operations

### 6.3 Security Notes

- Never trust external input; validate parameters carefully
- Record audit logs for sensitive operations
- Limit script execution time and memory usage

### 6.4 Version Management

- Keep Lua scripts under Git version control
- Add version number comments for major changes
- Keep historical versions for rollback

## 7. Common Issues

### Q1: The Lua script does not take effect?

Check:
1. Whether the script is in the correct directory (`pkg/lua/scripts/`)
2. Whether the script has syntax errors (check the startup logs)
3. Whether the hook name is correct

### Q2: How do I view the loaded scripts?

Visit the management API:

```shell
curl http://localhost:7788/admin/v1/lua/scripts
```

### Q3: Can Lua scripts access the database?

Direct database access is not recommended. Operate indirectly through APIs provided by the Go layer to keep the layering clean.

### Q4: What if a script execution times out?

Adjust the timeout configuration in `engine.go`:

```go
engine.SetContextTimeout(5 * time.Second)  // Default: 5 seconds
```

## 8. Related Documentation

- [Backend Extension Development](/en/admin/backend-extension.md)
- [Event Bus and Decoupled Architecture](/en/admin/tutorial-eventbus-architecture.md)
- [Task Scheduling and Asynchronous Processing](/en/admin/tutorial-task-scheduling.md)
