# 矩阵象限分析

矩阵象限分析（Matrix）以双轴（使用人数 UV × 使用频次）把功能/事件分到四个象限，识别核心、明星、小众、边缘功能。对应后端 `AnalyticsService.Matrix`。

---

## 一、它能回答什么问题

- 哪些功能是"核心"（人多、用得频）？哪些是"边缘"（人少、用得少）？
- 有没有"明星功能"（用得少但人均极高，潜力股）？
- 功能矩阵分布，指导产品资源投入优先级。

---

## 二、四象限定义

以 X 轴（使用人数 UV）和 Y 轴（使用频次）的阈值（中位数/均值）划分：

| 象限 | 标识 | 特征 |
|------|------|------|
| 核心 | `core` | 人数多 + 频次高 |
| 明星 | `star` | 人数少 + 频次高（小众但高频，潜力） |
| 小众 | `niche` | 人数少 + 频次低 |
| 边缘 | `edge` | 人数多 + 频次低（覆盖广但用得浅） |

---

## 三、后端接口

### gRPC：`AnalyticsService.Matrix`

| 字段 | 类型 | 说明 |
|------|------|------|
| `time_range` | `TimeRange` | 分析时间范围 |
| `dimension` | string（可选） | 分析维度，默认 `event_name` |
| `app_id` | uint32（可选） | 按应用过滤 |
| `split` | string（可选） | 象限阈值类型：`median`（默认）/ `avg` |

响应 `MatrixResponse`：`points[]`（`MatrixPoint` 含 `label` 维度值 / `x` 使用人数 / `y` 使用频次 / `quadrant` 象限）、`x_threshold`、`y_threshold`、`dimension`。

### HTTP（admin 转发）

```http
POST /admin/v1/analytics/matrix
Content-Type: application/json

{
  "timeRange": { "startMs": 1718169600000, "endMs": 1718774399000 },
  "dimension": "event_name",
  "split": "median"
}
```

---

## 四、结果解读

每个 `MatrixPoint` 是散点图上的一个点（一个事件/功能）：

- `x` = 去重使用人数（覆盖广度）。
- `y` = 总使用次数（使用深度）。
- `quadrant` = 该点落入的象限。

`x_threshold` / `y_threshold` 是划分象限的阈值（按 `split` 选 median 或 avg）。前端渲染为四象限散点图。

---

## 五、典型场景

### 功能优先级评估

把各功能（`dimension=event_name`）投入矩阵：

- **核心区**：持续维护，是产品基本盘。
- **明星区**：人数少但高频，可能是深度用户刚需，有放大潜力，值得推广。
- **边缘区**：覆盖广但用得浅，优化体验或考虑精简。
- **小众区**：评估是否值得维护成本。

### 内容/栏目评估

`dimension` 换成内容类维度，看哪些栏目是核心/明星。

---

## 六、注意事项

- **双轴口径**：`x` 是去重 UV，`y` 是总次数；高 `y` 低 `x` 表示少数人重度使用。
- **阈值选择**：`median` 抗极值（推荐），`avg` 受头部功能拉高影响。两种划分结果可能不同，按需选择。
- **维度限制**：`dimension` 通常是 `event_name` 或白名单维度。
- **空数据**：需事件已落库（见 [上手指南 · 数据落库现状](./analyst-getting-started.md)）。

---

## 七、相关文档

- [维度分组聚合](./analyst-group-by.md)
- [分布分析](./analyst-distribution.md)
- [数据分析师上手指南](./analyst-getting-started.md)
- [后端 API 契约](./backend-api.md)
