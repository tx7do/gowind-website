# 点击热力图

点击热力图（Click）按页面网格分桶聚合点击坐标，回答"页面上哪里被点得最多"。对应后端 `AnalyticsService.Click`。

---

## 一、它能回答什么问题

- 首页的点击热区在哪？用户主要点哪个按钮？
- 某个按钮的点击量在页面总点击中的占比？
- 有没有大量误点（如点击了不可交互的区域）？

---

## 二、数据来源

热力图依赖 Web SDK 的 **autotrack 自动采集**——开启 `autoTrack` 后，SDK 自动监听 click 并填充热力图字段：

| 字段 | 说明 |
|------|------|
| `clickX` / `clickY` | 点击视口坐标 |
| `elementXpath` | 元素 XPath |
| `pageUrl` | 当前页面 URL |
| `viewportWidth` | 视口宽度 |

> ⚠️ **Web SDK 自动采集仅 click**（无 PV）。详见 [Web SDK 接入指南](./sdk-web.md)。C# SDK 无 autotrack。

---

## 三、后端接口

### gRPC：`AnalyticsService.Click`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `page_url` | string | **页面 URL**（必填，按页面分组热力图） |
| `grid_size` | uint32（可选） | 网格大小（像素），默认 20 |
| `app_id` | uint32（可选） | 按应用过滤 |

响应 `ClickResponse`：`points[]`（`ClickHeatPoint` 含 `x` / `y` / `count` / `intensity` 归一化热度）、`top_elements[]`（`ClickElementBucket` 含 `element_xpath` / `count` / `percentage`）、`total_clicks`、`grid_size`。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/click
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "pageUrl": "https://example.com/home",
  "gridSize": 20
}
```

---

## 四、结果解读

- **`points`（热力网格）**：把页面按 `grid_size`（默认 20px）切成网格，每个网格的点击次数 `count` 和归一化热度 `intensity`（0-1，相对最大点击数）。前端渲染成热力图。
- **`top_elements`（元素 TOP）**：按 `element_xpath` 聚合的点击 TOP，直观看"哪个元素被点最多"及占比。
- **`grid_size` 调节**：网格越小越精细但点越多；默认 20px 平衡精度与性能。

---

## 五、典型场景

### 首页布局优化

查首页的 `points`，看热区是否落在核心 CTA 上；若热区落在非交互区域，可能是误点或视觉误导。

### 按钮点击占比

看 `top_elements`，确认主按钮（如"立即购买"）的点击占比，评估其引导力。

### A/B 测试对比

对 A/B 两个版本页面分别查 Click，对比热区分布与主按钮点击量。

---

## 六、注意事项

- **必须有 `pageUrl`**：热力图按页面分组，必须指定要分析的页面 URL。
- **依赖视口坐标**：`clickX/clickY` 是上报时的视口坐标，不同分辨率/响应式布局下坐标含义不同；跨设备汇总热力图可能失真，建议按 `viewportWidth` 分组看。
- **需开启 autotrack**：若未在 Web SDK 开启 `autoTrack`，没有 click 事件，热力图为空。
- **C# 不适用**：热力图是 Web 专属，游戏/客户端无此模型。

---

## 七、相关文档

- [Web SDK 接入指南](./sdk-web.md)
- [维度分组聚合](./analyst-group-by.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
