# C# SDK 接入指南（Unity / Godot / .NET）

GoWind UBA 的 C# 数据采集 SDK，用于 Unity（原生 + WebGL）、Godot 4（.NET）与 .NET 控制台/服务，把用户行为与风险事件上报到 Collector 服务。

> 适用：游戏 / 客户端埋点。网页端请用 [Web SDK](./sdk-web.md)。
> 源码：`sdk/csharp/`。

---

## 一、能力概览

- **零 NuGet 依赖核心库**（`Uba.Core`，.NET Standard 2.0，手写 camelCase JSON 序列化器）。
- **应用级鉴权**：appId + appSecret 放请求体，无需 token。
- **批量上报 + 重试降级**，与 Web SDK 行为一致。
- **高层 API**：`Track` / `TrackRisk` / `Identify` / `SetSuperProperties` / `FlushAsync`。
- **可插拔 Transport / ContextProvider**：支持自建网关、签名、自定义设备标识。

---

## 二、结构

```
sdk/csharp/src/
├── Uba.Core/          # .NET Standard 2.0 核心库（零依赖）
│   ├── Client.cs      # UbaClient + 高层 API + IContextProvider
│   ├── Batcher.cs     # 批量缓冲
│   ├── Transport.cs   # IHttpTransport + HttpClientTransport（默认）
│   ├── Config.cs      # UbaConfig + TrackOptions
│   ├── Types.cs / Json.cs / Utils.cs
├── Uba.Unity/         # Unity 适配（引用 UnityEngine）
│   ├── UnityWebRequestTransport.cs   # WebGL 必须用
│   ├── UnityContextProvider.cs       # SystemInfo 设备/平台探测
│   └── UbaUnityBehaviour.cs          # MonoBehaviour 便捷组件
```

---

## 三、平台与 Transport 矩阵

| 环境 | Transport | 说明 |
|------|-----------|------|
| Unity 原生（iOS/Android/PC） | `UnityWebRequestTransport`（推荐）或 `HttpClientTransport` | 两者均可 |
| **Unity WebGL** | **`UnityWebRequestTransport`（必须）** | `HttpClient` 在 WebGL 会抛异常 |
| Godot 4 桌面/移动 | `HttpClientTransport`（默认） | 直接可用 |
| .NET 控制台/服务 | `HttpClientTransport`（默认） | 直接可用 |

> ⚠️ **Unity WebGL 必须用 `UnityWebRequestTransport`**：HttpClient 在 WebGL 平台不可用，会抛异常。

---

## 四、构建

```bash
cd sdk/csharp/src/Uba.Core
dotnet build -c Release
# 产物：bin/Release/netstandard2.0/Uba.Core.dll
```

> `Uba.Unity` 需在 Unity 内编译，或通过 `UnityAssemblies` 环境变量指向 Unity 的 `Managed/UnityEngine.dll`。

---

## 五、Unity 使用

### 方式 A：便捷组件（推荐）

1. 把 `Uba.Core.dll` 拷入 Unity 的 `Assets/Plugins/`。
2. 把 `Uba.Unity/*.cs` 拷入 `Assets/Scripts/Uba/`。
3. 场景中创建空 GameObject，挂载 `UbaUnityBehaviour`，配置 endpoint / appId / appSecret。
4. 调用：

```csharp
using Uba.Unity;

UbaUnityBehaviour.Track("level_finish", new() { ["level"] = "1-1" },
    new TrackOptions { Score = 100, DurationMs = 45000 });

UbaUnityBehaviour.Identify(1001);
UbaUnityBehaviour.Track("purchase", new() { ["orderId"] = "ORD-001" },
    new TrackOptions { Amount = "99.90", Quantity = 1 });
```

### 方式 B：手动初始化

```csharp
using Uba;
using Uba.Unity;

var client = new UbaClient(
    new UbaConfig {
        AppId = "your_app_id",
        AppSecret = "your_app_secret",
        Endpoint = "http://localhost:5700",
    },
    new UnityWebRequestTransport(monoBehaviour),   // 注意：ctor 需要 MonoBehaviour（协程）
    new UnityContextProvider()
);
```

---

## 六、Godot 4 使用

```csharp
using Uba;

var client = new UbaClient(new UbaConfig {
    AppId = "your_app_id",
    AppSecret = "your_app_secret",
    Endpoint = "http://localhost:5700",
});
// 默认用 HttpClientTransport + DefaultContextProvider

client.Track("scene_load", new() { ["scene"] = "Main" });
```

---

## 七、API 一览（`UbaClient`）

| 方法 | 说明 |
|------|------|
| `Track(eventName, properties, options)` | 上报行为事件（`TrackBehavior` 等价） |
| `TrackBehavior(...)` | 显式上报行为事件 |
| `TrackRisk(eventName, riskEvent, options)` | 上报风险事件 |
| `Identify(userId)` | 绑定用户，后续事件自动带 userId |
| `SetSuperProperties(dict)` | 设置公共属性 |
| `await FlushAsync()` | 手动 flush（保证最后一批不丢） |
| `PendingCount` | 当前队列长度（属性） |

### `UbaConfig`

| 字段 | 说明 |
|------|------|
| `AppId` / `AppSecret` | 应用凭据（必填） |
| `Endpoint` | collector 地址，如 `http://localhost:5700` |

> Timeout 默认 8 秒（必须 < 服务端 10 秒）。

---

## 八、自动采集字段（因平台而异）

| 字段 | Unity | Godot |
|------|-------|-------|
| `eventId` | GUID | GUID |
| `eventTime` | UTC RFC3339 | UTC RFC3339 |
| `deviceId` | PlayerPrefs 持久化 | **进程级**（重启变化） |
| `sessionId` | 进程级 GUID | 进程级 GUID |
| `platform` | 编译宏探测（UNITY_IOS 等） | 固定 `dotnet` |
| `clientInfo.userAgent` | Unity 版本 + 操作系统 | .NET 运行时信息 |

> ⚠️ **Godot 的 deviceId 进程级**：重启后变化。若需稳定设备标识，建议自行持久化（如存配置文件）后通过 `SetSuperProperties` 或自定义 `IContextProvider` 注入。
> ⚠️ **C# 端卸载兜底**：仅 Web SDK 有 sendBeacon；C# 端需在 `OnApplicationQuit` / `OnDestroy` 调用 `FlushAsync()` 保证最后一批不丢。

---

## 九、上报协议契约

对接 collector 统一接口 `POST /uba/v1/report`，与 Web SDK 完全一致：

- appId + appSecret 放**请求体**（非 Header），401 不重试。
- 字段一律 **camelCase**（与后端 proto 契约对齐）。
- `tenantId` 不上报，服务端按 appId 权威覆盖。
- 必填：`eventId` / `eventName` / `eventTime` + 一个 oneof payload（behavior / risk）。

> 完整事件字段全集见 [后端 API 契约 · 上报服务](./backend-api.md)。

---

## 十、进阶：自定义 Transport / ContextProvider

核心库通过 `IHttpTransport` 与 `IContextProvider` 抽象，可注入自定义实现：

```csharp
// 自定义 transport（如走游戏网关、加签名、走本地中转）
public class MyTransport : IHttpTransport {
    public Task<HttpResponse> SendAsync(string url, string body, CancellationToken ct) {
        // 加签名头、走自建网关等
    }
}

// 自定义 context（注入业务侧 deviceId/渠道）
public class MyContext : IContextProvider {
    public DeviceContext Get() => new() {
        DeviceId = MyGame.GetPersistentDeviceId(),
        Platform = "android",
    };
}

var client = new UbaClient(config, new MyTransport(), new MyContext());
```

---

## 十一、联调与排错

```bash
# 启动本地 collector（默认监听 5700）
cd backend
go run ./app/collector/service/cmd/server/ -c ./app/collector/service/configs
```

| 现象 | 排查方向 |
|------|---------|
| 上报返回 401 | appId/appSecret 错误，或应用状态非 `ON` |
| Unity WebGL 上报失败 | 确认使用 `UnityWebRequestTransport` 而非默认 HttpClient |
| Godot deviceId 不稳定 | 见第八节，自行持久化 |
| 数据查不到 | 当前 Kafka 消费未实现，数据停留在 Kafka——见 [系统架构 · Kafka 现状](./architecture.md) |
| 最后一批事件丢失 | 确认退出时调用了 `await FlushAsync()` |

---

## 十二、相关文档

- [产品介绍](./intro.md)
- [Web SDK 接入](./sdk-web.md)
- [后端 API 契约 · 上报服务](./backend-api.md)
- [系统架构](./architecture.md)
