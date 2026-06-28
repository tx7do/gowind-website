# Web SDK 接入指南

GoWind UBA 的 Web 数据采集 SDK（`@go-wind-uba/uba-sdk`），用于浏览器 / Node 环境，把用户行为与风险事件上报到 Collector 服务。

> 适用：网页端埋点。游戏 / Unity / Godot 客户端请用 [C# SDK](./sdk-csharp.md)。
> 源码：`frontend/sdk/web/uba/`。

---

## 一、能力概览

- **应用级鉴权**：appId + appSecret 放请求体，无需 token。
- **批量上报**：本地缓冲，定时 / 定量自动 flush。
- **高层 API**：`track` / `trackRisk` / `identify` / `setSuperProperties` / `flush`。
- **自动补全**：设备 / 会话 / 时间 / 平台信息。
- **重试与降级**：指数退避，401 不重试，溢出丢弃以限制内存。
- **卸载兜底**：`pagehide` / `beforeunload` 用 `sendBeacon` 兜底。

---

## 二、安装与构建

```bash
cd frontend/sdk/web/uba
npm install      # 安装 typescript
npm run build    # 构建 dist/
```

---

## 三、初始化与上报

```ts
import { UbaClient } from '@go-wind-uba/uba-sdk';

// 初始化（单例，appId/appSecret 在管理后台「应用管理」创建应用后获得）
const uba = UbaClient.init({
  appId: 'your_app_id',
  appSecret: 'your_app_secret',
  endpoint: 'http://localhost:5700', // collector 服务地址
});

// 设置公共属性（后续每条事件自动携带）
uba.setSuperProperties({ platform: 'web', version: '1.0.0' });

// 行为事件（最常用）
uba.track('click', { button: 'buy' }, {
  objectType: 'button',
  objectId: 'btn_buy',
});

// 风险事件
uba.trackRisk('abnormal_click', {
  riskType: 'device_anomaly',
  riskLevel: 'HIGH',
  riskScore: 85,
  description: '短时间内频繁点击，疑似机器操作',
});

// 登录绑定用户（后续事件自动带 userId）
uba.identify(1001);

// 关键转化节点，立即上报
uba.track('purchase', { orderId: 'ORD-001' });
await uba.flush();
```

---

## 四、配置选项

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `appId` | （必填） | 应用唯一标识 |
| `appSecret` | （必填） | 应用密钥（鉴权用） |
| `endpoint` | （必填） | collector 服务地址，如 `http://localhost:5700` |
| `path` | `/uba/v1/report` | 上报路径 |
| `batchSize` | `20` | 缓冲达到该数量触发 flush |
| `flushInterval` | `5000` | 定时 flush 间隔（毫秒） |
| `maxRetries` | `3` | 失败最大重试次数 |
| `timeout` | `8000` | 单次请求超时（**必须 < 服务端 10s**） |
| `retryBaseDelay` | `1000` | 指数退避基础间隔（毫秒） |
| `enableBeacon` | `true` | 页面卸载时用 sendBeacon 兜底 |
| `debug` | `false` | 开启调试日志 |

---

## 五、API 一览（`UbaClient`）

| 方法 | 说明 |
|------|------|
| `UbaClient.init(config): UbaClient` | 单例初始化（后续调用会销毁并重建旧实例） |
| `track(eventName, properties?, options?)` | 上报行为事件（`trackBehavior` 的别名） |
| `trackBehavior(eventName, properties?, options?)` | 显式上报行为事件 |
| `trackRisk(eventName, risk, options?)` | 上报风险事件（`riskType` / `riskLevel` / `riskScore` / `description`） |
| `identify(userId)` | 绑定登录用户，后续事件自动带 `userId` |
| `resetUser()` | 清除绑定的用户 |
| `setSuperProperties(props)` | 设置公共属性（后续每条事件自动携带） |
| `clearSuperProperties()` | 清除公共属性 |
| `flush()` | 手动批量发送（关键事件后建议调用） |

---

## 六、自动采集字段

SDK 自动补全（无需业务设置）：

| 字段 | 来源 |
|------|------|
| `eventId` | uuid 自动生成，唯一 |
| `eventTime` | RFC3339，自动补全 |
| `deviceId` | localStorage 持久化，同设备稳定 |
| `sessionId` | sessionStorage（标签关闭失效） |
| `platform` | UA 探测：`web` / `ios` / `android` / `mini_program` / `node` |
| `clientInfo.userAgent` | `navigator.userAgent` |
| `properties.pageUrl` | 当前页面 URL |

---

## 七、上报协议契约

对接 collector 统一接口 `POST /uba/v1/report`。

### 鉴权

- `appId` + `appSecret` 放**请求体**（非 Header），无 Authorization token。
- 鉴权失败返回 `401`，SDK **不重试**（避免无限刷错误请求）。

### 请求体结构

```jsonc
{
  "appId": "your_app_id",
  "appSecret": "your_app_secret",
  "clientInfo": { "userAgent": "...", "referer": "..." },
  "events": [
    {
      "eventId": "uuid",
      "eventName": "click",
      "eventTime": "RFC3339",
      "deviceId": "...",
      "sessionId": "...",
      "platform": "web",
      "userId": 1001,
      "properties": { "button": "buy" },
      "behavior": { "objectType": "button", "objectId": "btn_buy" }
    }
  ]
}
```

### 响应约定

- HTTP `200` 也可能含**部分失败**：响应体 `failedCount > 0` 或 `errorsByType` 非空时，SDK 记录 warn。
- 错误码：`400` 校验失败、`401` 鉴权失败（不重试）、`500` 服务端错误（重试）。
- 字段命名一律 **camelCase**（与后端 proto 契约对齐）。`tenantId` 不上报，服务端按 appId 权威覆盖。

> 完整事件字段全集见 [后端 API 契约 · 上报服务](./backend-api.md)。

---

## 八、联调与排错

```bash
# 启动本地 collector（默认监听 5700）
cd backend
go run ./app/collector/service/cmd/server/ -c ./app/collector/service/configs
```

1. `cd frontend/sdk/web/uba && npm run build` 生成 `dist/`。
2. 修改 `test.html` 里的 `appId` / `appSecret` / `endpoint`。
3. 浏览器打开，点击按钮触发上报，观察 Network 面板与 Console。

### 常见问题

| 现象 | 排查方向 |
|------|---------|
| 上报返回 401 | appId/appSecret 错误，或应用状态非 `ON`；检查管理后台「应用管理」 |
| 事件未入库但无报错 | 检查响应体 `failedCount`，可能字段校验部分失败；开启 SDK `debug` 查看日志 |
| 数据查不到 | 当前 Kafka 消费未实现，数据停留在 Kafka——见 [系统架构 · Kafka 现状](./architecture.md) |
| 页面跳转丢失事件 | 确认 `enableBeacon: true`（默认开启），卸载时用 sendBeacon 兜底 |

---

## 九、进阶用法

### 公共属性（super properties）

适合放 appVersion / channel / 渠道号等每条事件都需要的字段：

```ts
uba.setSuperProperties({ appVersion: '1.2.0', channel: 'appstore' });
uba.clearSuperProperties();
```

### 计时事件（手动测时长）

```ts
const t0 = Date.now();
// ... 用户操作 ...
uba.track('level_play', { level: '1-1' }, { durationMs: Date.now() - t0 });
```

### 批量与节流调优

| 场景 | 建议配置 |
|------|---------|
| 高频事件（页内点击） | `batchSize` 调大（如 50），`flushInterval` 调长，减少请求频次 |
| 低频关键事件（支付） | 上报后立即 `flush()`，不等缓冲 |
| 弱网环境 | 调大 `maxRetries` 与 `retryBaseDelay`，但注意 `timeout < 10000` |

---

## 十、相关文档

- [产品介绍](./intro.md)
- [C# SDK 接入](./sdk-csharp.md)
- [后端 API 契约 · 上报服务](./backend-api.md)
- [系统架构](./architecture.md)
