# C# SDK Integration Guide (Unity / Godot / .NET)

GoWind UBA's C# data collection SDK is for Unity (native + WebGL), Godot 4 (.NET), and .NET consoles/services, reporting user behavior and risk events to the Collector service.

> Applies to: event tracking in games / clients. For web pages, use the [Web SDK](./sdk-web.md).
> Source code: `sdk/csharp/`.

---

## 1. Capability Overview

- **Zero-NuGet-dependency core library** (`Uba.Core`, .NET Standard 2.0, hand-written camelCase JSON serializer).
- **Application-level authentication**: appId + appSecret in the request body, no token needed.
- **Batch reporting + retry degradation**, consistent with the Web SDK's behavior.
- **High-level API**: `Track` / `TrackRisk` / `Identify` / `SetSuperProperties` / `FlushAsync`.
- **Pluggable Transport / ContextProvider**: supports self-built gateways, signing, and custom device identifiers.

---

## 2. Structure

```
sdk/csharp/src/
├── Uba.Core/          # .NET Standard 2.0 core library (zero dependencies)
│   ├── Client.cs      # UbaClient + high-level API + IContextProvider
│   ├── Batcher.cs     # batch buffering
│   ├── Transport.cs   # IHttpTransport + HttpClientTransport (default)
│   ├── Config.cs      # UbaConfig + TrackOptions
│   ├── Types.cs / Json.cs / Utils.cs
├── Uba.Unity/         # Unity adapter (references UnityEngine)
│   ├── UnityWebRequestTransport.cs   # required for WebGL
│   ├── UnityContextProvider.cs       # SystemInfo device/platform detection
│   └── UbaUnityBehaviour.cs          # convenience MonoBehaviour component
```

---

## 3. Platform & Transport Matrix

| Environment | Transport | Notes |
|------|-----------|------|
| Unity native (iOS/Android/PC) | `UnityWebRequestTransport` (recommended) or `HttpClientTransport` | Both work |
| **Unity WebGL** | **`UnityWebRequestTransport` (required)** | `HttpClient` throws on WebGL |
| Godot 4 desktop/mobile | `HttpClientTransport` (default) | Works out of the box |
| .NET console/service | `HttpClientTransport` (default) | Works out of the box |

> ⚠️ **Unity WebGL must use `UnityWebRequestTransport`**: HttpClient is unavailable on the WebGL platform and throws.

---

## 4. Building

```bash
cd sdk/csharp/src/Uba.Core
dotnet build -c Release
# artifact: bin/Release/netstandard2.0/Uba.Core.dll
```

> `Uba.Unity` needs to be compiled inside Unity, or built by pointing the `UnityAssemblies` environment variable at Unity's `Managed/UnityEngine.dll`.

---

## 5. Using in Unity

### Option A: convenience component (recommended)

1. Copy `Uba.Core.dll` into Unity's `Assets/Plugins/`.
2. Copy `Uba.Unity/*.cs` into `Assets/Scripts/Uba/`.
3. Create an empty GameObject in the scene, attach `UbaUnityBehaviour`, and configure endpoint / appId / appSecret.
4. Call:

```csharp
using Uba.Unity;

UbaUnityBehaviour.Track("level_finish", new() { ["level"] = "1-1" },
    new TrackOptions { Score = 100, DurationMs = 45000 });

UbaUnityBehaviour.Identify(1001);
UbaUnityBehaviour.Track("purchase", new() { ["orderId"] = "ORD-001" },
    new TrackOptions { Amount = "99.90", Quantity = 1 });
```

### Option B: manual initialization

```csharp
using Uba;
using Uba.Unity;

var client = new UbaClient(
    new UbaConfig {
        AppId = "your_app_id",
        AppSecret = "your_app_secret",
        Endpoint = "http://localhost:5700",
    },
    new UnityWebRequestTransport(monoBehaviour),   // note: the ctor needs a MonoBehaviour (coroutines)
    new UnityContextProvider()
);
```

---

## 6. Using in Godot 4

```csharp
using Uba;

var client = new UbaClient(new UbaConfig {
    AppId = "your_app_id",
    AppSecret = "your_app_secret",
    Endpoint = "http://localhost:5700",
});
// Uses HttpClientTransport + DefaultContextProvider by default

client.Track("scene_load", new() { ["scene"] = "Main" });
```

---

## 7. API Overview (`UbaClient`)

| Method | Description |
|------|------|
| `Track(eventName, properties, options)` | Report a behavior event (equivalent to `TrackBehavior`) |
| `TrackBehavior(...)` | Explicitly report a behavior event |
| `TrackRisk(eventName, riskEvent, options)` | Report a risk event |
| `Identify(userId)` | Bind the user; subsequent events automatically carry userId |
| `SetSuperProperties(dict)` | Set super properties |
| `await FlushAsync()` | Manual flush (guarantees the last batch is not lost) |
| `PendingCount` | Current queue length (property) |

### `UbaConfig`

| Field | Description |
|------|------|
| `AppId` / `AppSecret` | App credentials (required) |
| `Endpoint` | Collector address, e.g. `http://localhost:5700` |

> Timeout defaults to 8 seconds (must be < the server's 10 seconds).

### `TrackOptions` (game dimension fields)

The third argument of `Track`/`TrackBehavior`; besides the existing business metric fields (`Amount`/`Quantity`/`Score`/`DurationMs` etc.), **two new game-specific dimensions** were added to support game models such as merged-server retention / level analysis:

| Field | Type | Description | JSON tag |
|------|------|------|---------|
| `ServerId` | `string?` | Game server ID | `serverId` |
| `Level` | `uint?` | Player level | `level` |

Once set, the SDK writes them into both the top-level `ReportEvent` and the `behavior` payload (C# properties are PascalCase, serialized to camelCase JSON; `level` is serialized as an integer). Example:

```csharp
// A player on server 5, currently level 32, finishes a level
client.Track("level_finish",
    new() { ["chapter"] = "1-1" },
    new TrackOptions { ServerId = "5", Level = 32, Score = 100, DurationMs = 45000 });
```

> These two fields land in the `server_id` (VARCHAR) and `level` (SMALLINT) columns of the `events_fact` table, and are used directly by game analysis models such as `ServerRetention` / `LevelAnalysis`.

---

## 8. Auto-Completed Fields (vary by platform)

The SDK auto-completes (no business setup needed); **the C# side has no autotrack automatic event tracking** (unlike the Web SDK, where only Web has click auto-collection), so all events must be explicitly `Track`ed:

| Field | Unity | Godot |
|------|-------|-------|
| `eventId` | GUID | GUID |
| `eventTime` | UTC RFC3339 | UTC RFC3339 |
| `deviceId` | Persisted in PlayerPrefs | **Process-scoped** (changes on restart) |
| `sessionId` | Process-scoped GUID | Process-scoped GUID |
| `platform` | Compile-macro detection (UNITY_IOS etc.) | Fixed `dotnet` |
| `clientInfo.userAgent` | Unity version + OS | .NET runtime info |

> ⚠️ **Godot's deviceId is process-scoped**: it changes after restart. If a stable device identifier is needed, persist it yourself (e.g. in a config file) and inject it via `SetSuperProperties` or a custom `IContextProvider`.
> ⚠️ **C# unload fallback**: only the Web SDK has sendBeacon; on the C# side, call `FlushAsync()` in `OnApplicationQuit` / `OnDestroy` to guarantee the last batch is not lost.

---

## 9. Reporting Protocol Contract

Integrates with the collector's unified interface `POST /uba/v1/report`, exactly like the Web SDK:

- appId + appSecret go in the **request body** (not headers); no retry on 401.
- Field naming is always **camelCase** (aligned with the backend proto contract).
- `tenantId` is not reported; the server authoritatively overrides it based on appId.
- Required: `eventId` / `eventName` / `eventTime` + one oneof payload (behavior / risk).

> For the complete set of event fields, see [Backend API Contract · Report Service](./backend-api.md).

---

## 10. Advanced: Custom Transport / ContextProvider

The core library abstracts via `IHttpTransport` and `IContextProvider`, allowing custom implementations to be injected:

```csharp
// Custom transport (e.g. via the game gateway, with signing, or through a local relay)
public class MyTransport : IHttpTransport {
    public Task<HttpResponse> SendAsync(string url, string body, CancellationToken ct) {
        // add signature headers, route through your own gateway, etc.
    }
}

// Custom context (injecting a business-side deviceId/channel)
public class MyContext : IContextProvider {
    public DeviceContext Get() => new() {
        DeviceId = MyGame.GetPersistentDeviceId(),
        Platform = "android",
    };
}

var client = new UbaClient(config, new MyTransport(), new MyContext());
```

---

## 11. Integration & Troubleshooting

```bash
# Start the local collector (listens on 5700 by default)
cd backend
go run ./app/collector/service/cmd/server/ -c ./app/collector/service/configs
```

| Symptom | Troubleshooting direction |
|------|---------|
| Reporting returns 401 | Wrong appId/appSecret, or the app's status is not `ON` |
| Unity WebGL reporting fails | Confirm `UnityWebRequestTransport` is used instead of the default HttpClient |
| Godot deviceId is unstable | See section 8; persist it yourself |
| Data cannot be queried | After confirming the report returns 200, check whether the OLAP engine's Kafka consumption job is loading data — see [System Architecture · Kafka Consumption Mechanism](./architecture.md) |
| The last batch of events is lost | Confirm `await FlushAsync()` was called on exit |

---

## 12. Related Documentation

- [Product Introduction](./intro.md)
- [Web SDK Integration](./sdk-web.md)
- [Backend API Contract · Report Service](./backend-api.md)
- [System Architecture](./architecture.md)
