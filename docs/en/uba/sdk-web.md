# Web SDK Integration Guide

GoWind UBA's Web data collection SDK (`@go-wind-uba/uba-sdk`) is for browser / Node environments, reporting user behavior and risk events to the Collector service.

> Applies to: event tracking on web pages. For game / Unity / Godot clients, use the [C# SDK](./sdk-csharp.md).
> Source code: `frontend/sdk/web/uba/`.

---

## 1. Capability Overview

- **Application-level authentication**: appId + appSecret in the request body, no token needed.
- **Batch reporting**: local buffering, automatic flush by timer / count.
- **High-level API**: `track` / `trackRisk` / `identify` / `setSuperProperties` / `flush`.
- **Auto completion**: device / session / time / platform information.
- **Retry and degradation**: exponential backoff, no retry on 401, overflow dropped to limit memory.
- **Unload fallback**: `pagehide` / `beforeunload` fall back to `sendBeacon`.

---

## 2. Installation & Build

```bash
cd frontend/sdk/web/uba
npm install      # install typescript
npm run build    # build dist/
```

---

## 3. Initialization & Reporting

```ts
import { UbaClient } from '@go-wind-uba/uba-sdk';

// Initialize (singleton; appId/appSecret are obtained after creating an app in the admin console's "App Management")
const uba = UbaClient.init({
  appId: 'your_app_id',
  appSecret: 'your_app_secret',
  endpoint: 'http://localhost:5700', // collector service address
});

// Set super properties (every subsequent event carries them automatically)
uba.setSuperProperties({ platform: 'web', version: '1.0.0' });

// Behavior event (most common)
uba.track('click', { button: 'buy' }, {
  objectType: 'button',
  objectId: 'btn_buy',
});

// Risk event
uba.trackRisk('abnormal_click', {
  riskType: 'device_anomaly',
  riskLevel: 'HIGH',
  riskScore: 85,
  description: '短时间内频繁点击，疑似机器操作',
});

// Bind the logged-in user (subsequent events automatically carry userId)
uba.identify(1001);

// Key conversion point, report immediately
uba.track('purchase', { orderId: 'ORD-001' });
await uba.flush();
```

---

## 4. Configuration Options

| Parameter | Default | Description |
|------|--------|------|
| `appId` | (required) | Unique app identifier |
| `appSecret` | (required) | App secret (for authentication) |
| `endpoint` | (required) | Collector service address, e.g. `http://localhost:5700` |
| `path` | `/uba/v1/report` | Reporting path |
| `batchSize` | `20` | Flush is triggered when the buffer reaches this count |
| `flushInterval` | `5000` | Timed flush interval (milliseconds) |
| `maxRetries` | `3` | Maximum retries on failure |
| `timeout` | `8000` | Per-request timeout (**must be < the server's 10s**) |
| `retryBaseDelay` | `1000` | Base interval for exponential backoff (milliseconds) |
| `enableBeacon` | `true` | Fall back to sendBeacon when the page unloads |
| `autoTrack` | `true` | Whether to enable auto collection (**currently only click is auto-collected**; see the "Auto Collection" section) |
| `debug` | `false` | Enable debug logging |

---

## 5. API Overview (`UbaClient`)

| Method | Description |
|------|------|
| `UbaClient.init(config): UbaClient` | Singleton initialization (subsequent calls destroy and rebuild the old instance) |
| `track(eventName, properties?, options?)` | Report a behavior event (alias of `trackBehavior`) |
| `trackBehavior(eventName, properties?, options?)` | Explicitly report a behavior event |
| `trackRisk(eventName, risk, options?)` | Report a risk event (`riskType` / `riskLevel` / `riskScore` / `description`) |
| `identify(userId)` | Bind the logged-in user; subsequent events automatically carry `userId` |
| `resetUser()` | Clear the bound user |
| `setSuperProperties(props)` | Set super properties (every subsequent event carries them automatically) |
| `clearSuperProperties()` | Clear super properties |
| `flush()` | Manually send in batch (recommended after key events) |
| `enableAutoTrack(enabled?)` | Runtime switch for auto collection (click only by default) |
| `pendingCount()` | Returns the number of pending events in the current buffer |
| `destroy()` | Destroy the instance, releasing timers and listeners |
| `UbaClient.getInstance()` | Get the initialized singleton |

---

## 6. Auto-Completed Fields & Auto Collection

### SDK auto-completed fields (carried by every event)

| Field | Source |
|------|------|
| `eventId` | uuid, auto-generated, unique |
| `eventTime` | RFC3339, auto-completed |
| `deviceId` | Persisted in localStorage, stable per device |
| `sessionId` | sessionStorage (invalidated when the tab closes) |
| `platform` | UA detection: `web` / `ios` / `android` / `mini_program` / `node` |
| `clientInfo.userAgent` | `navigator.userAgent` |

### Auto-collected events (autotrack)

With `autoTrack` enabled (default `true`), the SDK listens for **click** during the document capture phase and automatically reports a behavior event named `click`, filling in heatmap fields:

| Field | Description |
|------|------|
| `clickX` / `clickY` | Click viewport coordinates |
| `elementXpath` | Element XPath |
| `pageUrl` | Current page URL |
| `viewportWidth` | Viewport width |

> ⚠️ **Currently autotrack only collects click**; there is no PV / pageView auto collection and no route listening. For page view event tracking, call `track('page_view', ...)` yourself.

---

## 7. Reporting Protocol Contract

Integrates with the collector's unified interface `POST /uba/v1/report`.

### Authentication

- `appId` + `appSecret` go in the **request body** (not headers); no Authorization token.
- Authentication failure returns `401`, and the SDK **does not retry** (to avoid endlessly spamming failed requests).

### Request Body Structure

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

### Response Conventions

- HTTP `200` may still contain **partial failures**: when the response body has `failedCount > 0` or a non-empty `errorsByType`, the SDK logs a warning.
- Error codes: `400` validation failure, `401` authentication failure (no retry), `500` server error (retry).
- Field naming is always **camelCase** (aligned with the backend proto contract). `tenantId` is not reported; the server authoritatively overrides it based on appId.

> For the complete set of event fields, see [Backend API Contract · Report Service](./backend-api.md).

---

## 8. Integration & Troubleshooting

```bash
# Start the local collector (listens on 5700 by default)
cd backend
go run ./app/collector/service/cmd/server/ -c ./app/collector/service/configs
```

1. `cd frontend/sdk/web/uba && npm run build` to generate `dist/`.
2. Modify `appId` / `appSecret` / `endpoint` in `test.html`.
3. Open it in the browser, click buttons to trigger reporting, and watch the Network panel and Console.

### Common Issues

| Symptom | Troubleshooting direction |
|------|---------|
| Reporting returns 401 | Wrong appId/appSecret, or the app's status is not `ON`; check "App Management" in the admin console |
| Events not ingested but no error | Check the response body's `failedCount`; field validation may have partially failed; enable the SDK's `debug` to view logs |
| Data cannot be queried | After confirming the report returns 200, check whether the OLAP engine's Kafka consumption job is loading data — see [System Architecture · Kafka Consumption Mechanism](./architecture.md) |
| Events lost on page navigation | Confirm `enableBeacon: true` (enabled by default), falling back to sendBeacon on unload |

---

## 9. Advanced Usage

### Super properties

Suitable for fields needed by every event, such as appVersion / channel / channel ID:

```ts
uba.setSuperProperties({ appVersion: '1.2.0', channel: 'appstore' });
uba.clearSuperProperties();
```

### Timed events (manually measuring durations)

```ts
const t0 = Date.now();
// ... user actions ...
uba.track('level_play', { level: '1-1' }, { durationMs: Date.now() - t0 });
```

### Batching & throttling tuning

| Scenario | Suggested configuration |
|------|---------|
| High-frequency events (in-page clicks) | Increase `batchSize` (e.g. 50), lengthen `flushInterval`, reducing request frequency |
| Low-frequency key events (payment) | Call `flush()` immediately after reporting, without waiting for the buffer |
| Weak network | Increase `maxRetries` and `retryBaseDelay`, but mind `timeout < 10000` |

---

## 10. Related Documentation

- [Product Introduction](./intro.md)
- [C# SDK Integration](./sdk-csharp.md)
- [Backend API Contract · Report Service](./backend-api.md)
- [System Architecture](./architecture.md)
