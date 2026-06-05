# Lua 脚本扩展实战教程

GoWind Admin 内置 Lua 脚本引擎，允许在不修改核心代码、不重启服务的前提下动态扩展业务逻辑。本教程深入讲解 Lua 引擎的使用方法和实战场景。

## 一、Lua 引擎架构

### 1.1 核心组件

```
pkg/lua/
├── engine.go          # Lua 引擎核心（初始化、执行、沙箱）
├── context.go         # Lua 上下文管理（注入 Go 对象）
├── loader.go          # 脚本加载器（自动扫描、热重载）
├── script.go          # 脚本定义（元数据、依赖）
├── hook/              # 钩子机制（事件触发点）
└── api/               # 内置 API 模块
    ├── cache.go       # Redis 缓存操作
    ├── crypto.go      # AES-GCM 加密解密
    ├── eventbus.go    # 事件发布订阅
    ├── hook.go        # 钩子注册与触发
    ├── logger.go      # 日志记录
    ├── oss.go         # MinIO 对象存储
    ├── task.go        # Asynq 任务投递
    └── util.go        # 工具函数
```

### 1.2 生命周期

1. **初始化**：服务启动时创建 Lua State，注册内置 API
2. **加载脚本**：从指定目录扫描 `.lua` 文件并编译
3. **执行**：根据钩子或手动调用触发脚本执行
4. **回收**：请求结束后清理临时对象

### 1.3 沙箱机制

Lua 引擎运行在沙箱环境中：
- 限制文件系统访问
- 限制网络请求
- 限制系统调用
- 超时保护（防止死循环）

## 二、内置 API 模块详解

### 2.1 Logger API

日志记录是最基础的 API：

```lua
-- 日志级别
logger.debug("调试信息")
logger.info("普通信息")
logger.warn("警告信息")
logger.error("错误信息")

-- 格式化输出
logger.info("用户 %s 登录，IP: %s", username, ip)
```

### 2.2 Cache API

Redis 缓存操作：

```lua
-- 设置缓存（默认 TTL 3600 秒）
cache.set("user:1001:name", "张三")

-- 设置缓存（自定义 TTL）
cache.set("user:1001:name", "张三", 7200)

-- 获取缓存
local name = cache.get("user:1001:name")

-- 删除缓存
cache.delete("user:1001:name")

-- 检查键是否存在
if cache.exists("user:1001:name") then
    logger.info("缓存存在")
end
```

**典型场景**：缓存用户信息、字典数据、配置项等热点数据。

### 2.3 Crypto API

AES-GCM 加密解密：

```lua
-- 加密
local encrypted = crypto.encrypt("敏感数据")

-- 解密
local decrypted = crypto.decrypt(encrypted)

-- Base64 编码
local encoded = crypto.base64_encode("原始数据")

-- Base64 解码
local decoded = crypto.base64_decode(encoded)
```

**典型场景**：加密手机号、身份证号、银行卡号等敏感信息。

### 2.4 EventBus API

事件发布订阅：

```lua
-- 订阅事件
eventbus.subscribe("user.created", function(event)
    local user_id = event.user_id
    logger.info("新用户创建: %d", user_id)
    
    -- 发送欢迎邮件
    send_welcome_email(user_id)
end)

-- 发布事件
eventbus.publish("user.created", {
    user_id = 123,
    username = "john"
})

-- 取消订阅
eventbus.unsubscribe("user.created")
```

**典型场景**：用户注册后发送邮件、订单支付后更新库存、数据变更后刷新缓存。

### 2.5 Task API

异步任务投递（基于 Asynq）：

```lua
-- 投递立即执行的任务
task.enqueue("send_email", {
    to = "user@example.com",
    subject = "欢迎",
    body = "欢迎使用 GoWind Admin"
})

-- 投递定时任务（10 分钟后执行）
task.enqueue_in("cleanup_temp_files", 600, {
    directory = "/tmp/uploads"
})

-- 投递周期性任务（每天凌晨 2 点执行）
task.enqueue_periodic("daily_report", "0 2 * * *", {
    report_type = "sales"
})
```

**典型场景**：邮件发送、短信通知、数据导出、报表生成等耗时操作。

### 2.6 OSS API

MinIO 对象存储操作：

```lua
-- 上传文件
local url = oss.upload_file("bucket-name", "file.pdf", file_content)

-- 下载文件
local content = oss.download_file("bucket-name", "file.pdf")

-- 生成预签名 URL（有效期 1 小时）
local presigned_url = oss.get_presigned_url("bucket-name", "file.pdf", 3600)

-- 删除文件
oss.delete_file("bucket-name", "file.pdf")

-- 列举文件
local files = oss.list_files("bucket-name", "uploads/")
```

**典型场景**：文件上传下载、图片处理、备份归档。

### 2.7 Hook API

钩子注册与触发：

```lua
-- 注册钩子
hook.register("on_user_created", function(user_id)
    logger.info("用户 %d 创建成功", user_id)
    
    -- 初始化用户默认设置
    cache.set("user:" .. user_id .. ":settings", "{}", 86400)
end)

-- 手动触发钩子
hook.trigger("on_user_created", 123)

-- 注销钩子
hook.unregister("on_user_created")
```

**内置钩子列表**：
- `on_user_created` - 用户创建后
- `on_user_updated` - 用户更新后
- `on_user_deleted` - 用户删除后
- `on_login_success` - 登录成功后
- `on_login_failed` - 登录失败后
- `on_order_paid` - 订单支付后
- `on_server_start` - 服务启动时

### 2.8 Util API

通用工具函数：

```lua
-- JSON 序列化
local json_str = util.to_json({name = "张三", age = 25})

-- JSON 反序列化
local obj = util.from_json(json_str)

-- UUID 生成
local uuid = util.uuid()

-- 时间戳
local timestamp = util.timestamp()

-- 字符串截取
local sub = util.substr("Hello World", 1, 5)  -- "Hello"

-- 数组长度
local len = util.len({1, 2, 3})  -- 3
```

## 三、实战场景

### 3.1 场景一：用户注册后自动发送欢迎邮件

**需求**：用户注册成功后，自动发送欢迎邮件，并初始化用户默认设置。

**实现**：

```lua
-- scripts/on_user_registered.lua

-- 订阅用户创建事件
eventbus.subscribe("user.created", function(event)
    local user_id = event.user_id
    local email = event.email
    
    logger.info("处理新用户注册: user_id=%d, email=%s", user_id, email)
    
    -- 1. 发送欢迎邮件（异步任务）
    task.enqueue("send_welcome_email", {
        user_id = user_id,
        email = email
    })
    
    -- 2. 初始化用户默认设置
    local default_settings = {
        theme = "light",
        language = "zh-CN",
        notifications = true
    }
    cache.set("user:" .. user_id .. ":settings", util.to_json(default_settings), 86400)
    
    -- 3. 记录注册来源（如果有）
    if event.source then
        logger.info("用户注册来源: %s", event.source)
    end
end)

logger.info("用户注册处理脚本已加载")
```

**部署**：将脚本放到 `backend/pkg/lua/scripts/` 目录，服务启动时自动加载。

---

### 3.2 场景二：敏感数据加密存储

**需求**：用户手机号、身份证号等敏感字段需要加密存储。

**实现**：

```lua
-- scripts/crypto_helper.lua

-- 提供加密工具函数
local M = {}

-- 加密手机号
function M.encrypt_phone(phone)
    return crypto.encrypt(phone)
end

-- 解密手机号
function M.decrypt_phone(encrypted_phone)
    return crypto.decrypt(encrypted_phone)
end

-- 脱敏显示（保留前 3 位和后 4 位）
function M.mask_phone(phone)
    if #phone < 7 then
        return "***"
    end
    return phone:sub(1, 3) .. "****" .. phone:sub(-4)
end

return M
```

**使用**：在其他脚本中引用：

```lua
local crypto_helper = require("crypto_helper")

local encrypted = crypto_helper.encrypt_phone("13800138000")
logger.info("加密后的手机号: %s", encrypted)

local masked = crypto_helper.mask_phone("13800138000")
logger.info("脱敏后的手机号: %s", masked)  -- 输出: 138****8000
```

---

### 3.3 场景三：订单支付后更新库存

**需求**：订单支付成功后，自动扣减库存，如果库存不足则触发告警。

**实现**：

```lua
-- scripts/on_order_paid.lua

eventbus.subscribe("order.paid", function(event)
    local order_id = event.order_id
    local items = event.items  -- [{product_id, quantity}]
    
    logger.info("处理订单支付: order_id=%d", order_id)
    
    for _, item in ipairs(items) do
        local product_id = item.product_id
        local quantity = item.quantity
        
        -- 1. 获取当前库存
        local stock_key = "product:" .. product_id .. ":stock"
        local current_stock = tonumber(cache.get(stock_key)) or 0
        
        logger.info("商品 %d 当前库存: %d", product_id, current_stock)
        
        -- 2. 扣减库存
        local new_stock = current_stock - quantity
        if new_stock < 0 then
            logger.error("商品 %d 库存不足！当前: %d, 需求: %d", 
                product_id, current_stock, quantity)
            
            -- 触发库存告警
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

### 3.4 场景四：登录失败次数限制

**需求**：用户登录失败超过 5 次，锁定账号 30 分钟。

**实现**：

```lua
-- scripts/login_security.lua

eventbus.subscribe("login.failed", function(event)
    local username = event.username
    local ip = event.ip
    
    -- 1. 记录失败次数
    local fail_key = "login:fail:" .. username
    local fail_count = tonumber(cache.get(fail_key)) or 0
    fail_count = fail_count + 1
    
    cache.set(fail_key, tostring(fail_count), 1800)  -- 30 分钟过期
    
    logger.warn("用户 %s 登录失败，累计次数: %d, IP: %s", 
        username, fail_count, ip)
    
    -- 2. 达到阈值，锁定账号
    if fail_count >= 5 then
        local lock_key = "login:lock:" .. username
        cache.set(lock_key, "locked", 1800)  -- 锁定 30 分钟
        
        logger.error("用户 %s 因多次登录失败被锁定 30 分钟", username)
        
        -- 发送安全告警
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
    
    -- 登录成功，清除失败计数
    cache.delete("login:fail:" .. username)
end)

logger.info("登录安全脚本已加载")
```

---

### 3.5 场景五：定时清理临时文件

**需求**：每天凌晨 3 点清理过期的临时上传文件。

**实现**：

```lua
-- scripts/cleanup_temp_files.lua

-- 注册周期性任务
task.enqueue_periodic("cleanup_temp_files", "0 3 * * *", {})

-- 任务处理器
hook.register("on_task_cleanup_temp_files", function(params)
    logger.info("开始清理临时文件...")
    
    local bucket = "temp-uploads"
    local files = oss.list_files(bucket, "")
    
    local now = util.timestamp()
    local expired_count = 0
    
    for _, file in ipairs(files) do
        -- 假设文件名包含时间戳：upload_1234567890.pdf
        local timestamp = extract_timestamp(file.name)
        if timestamp and (now - timestamp) > 86400 then  -- 超过 24 小时
            oss.delete_file(bucket, file.name)
            expired_count = expired_count + 1
        end
    end
    
    logger.info("临时文件清理完成，删除 %d 个过期文件", expired_count)
end)

-- 辅助函数：从文件名提取时间戳
function extract_timestamp(filename)
    local ts = filename:match("upload_(%d+)")
    return ts and tonumber(ts) or nil
end

logger.info("临时文件清理脚本已加载")
```

## 四、自定义 Lua API 模块

除了内置 API，还可以开发自定义 Lua API 模块。

### 4.1 创建 Go 端 API

在 `pkg/lua/api/` 目录下创建 `myapi.go`：

```go
package api

import (
	"github.com/yuin/gopher-lua"
)

// RegisterMyAPI 注册自定义 API
func RegisterMyAPI(L *lua.LState, myService MyServiceInterface, logger log.Logger) {
	mod := L.RegisterModule("myapi", map[string]lua.LGFunction{
		"get_user_info": getUserInfo,
		"update_status": updateStatus,
	})
	L.Push(mod)
}

func getUserInfo(L *lua.LState) int {
	userID := L.CheckInt(1)
	
	// 调用 Go 服务
	userInfo, err := myService.GetUserInfo(userID)
	if err != nil {
		L.RaiseError("get user info failed: %v", err)
		return 0
	}
	
	// 返回 Lua 表
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

### 4.2 注册到引擎

在 `pkg/lua/engine.go` 的 `registerAPIs` 方法中添加：

```go
func (e *Engine) registerAPIs(L *lua.LState) {
	// 内置 API
	api.RegisterCache(L, e.redisClient)
	api.RegisterCrypto(L, e.encryptor)
	api.RegisterEventBus(L, e.eventBus)
	// ...
	
	// 自定义 API
	api.RegisterMyAPI(L, e.myService, e.logger)
}
```

### 4.3 Lua 脚本中使用

```lua
-- 调用自定义 API
local user = myapi.get_user_info(123)
logger.info("用户信息: %s, %s", user.name, user.email)

myapi.update_status(123, "active")
```

## 五、调试技巧

### 5.1 日志调试

在 Lua 脚本中大量使用 `logger` 输出调试信息：

```lua
logger.debug("变量值: %v", some_variable)
logger.info("进入函数: %s", function_name)
logger.error("错误详情: %s", error_message)
```

### 5.2 错误处理

使用 `pcall` 捕获运行时错误：

```lua
local success, result = pcall(function()
    -- 可能出错的代码
    return risky_operation()
end)

if not success then
    logger.error("执行失败: %s", result)
end
```

### 5.3 性能分析

记录关键操作的耗时：

```lua
local start_time = util.timestamp()

-- 执行耗时操作
do_something()

local elapsed = util.timestamp() - start_time
logger.info("操作耗时: %d ms", elapsed)
```

### 5.4 热重载

修改 Lua 脚本后无需重启服务，通过以下方式重新加载：

```shell
# 方式 1：调用管理接口
curl -X POST http://localhost:7788/admin/v1/lua/reload

# 方式 2：发送信号
kill -USR1 <pid>
```

## 六、最佳实践

### 6.1 脚本组织

- 按功能域分文件：`user_scripts.lua`、`order_scripts.lua`
- 避免单个脚本过大（建议 < 500 行）
- 公共函数抽取为模块，通过 `require` 引用

### 6.2 性能优化

- 避免在循环中进行 I/O 操作
- 缓存频繁读取的数据
- 异步任务代替同步阻塞操作

### 6.3 安全注意

- 不要信任外部输入，做好参数校验
- 敏感操作记录审计日志
- 限制脚本执行时间和内存使用

### 6.4 版本管理

- Lua 脚本纳入 Git 版本控制
- 重大变更添加版本号注释
- 保留历史版本以便回滚

## 七、常见问题

### Q1: Lua 脚本不生效？

检查：
1. 脚本是否放在正确的目录（`pkg/lua/scripts/`）
2. 脚本是否有语法错误（查看启动日志）
3. 钩子名称是否正确

### Q2: 如何查看已加载的脚本？

访问管理接口：

```shell
curl http://localhost:7788/admin/v1/lua/scripts
```

### Q3: Lua 脚本能否访问数据库？

不建议直接访问数据库，应通过 Go 层提供的 API 间接操作，保持分层清晰。

### Q4: 脚本执行超时怎么办？

调整 `engine.go` 中的超时配置：

```go
engine.SetContextTimeout(5 * time.Second)  // 默认 5 秒
```

## 八、相关文档

- [后端扩展开发](./backend-extension.md)
- [事件总线与解耦架构](./tutorial-eventbus-architecture.md)
- [任务调度与异步处理](./tutorial-task-scheduling.md)
