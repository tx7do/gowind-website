# OLAP 查询手册

本手册是数据分析师与二开的 SQL 查询参考，覆盖 UBA 的双引擎（Doris / ClickHouse）方言差异、白名单维度、指标表达式、防注入设计，以及事实表的常用查询。

---

## 一、双引擎与库表

- 默认引擎 **Apache Doris**（`UseClickHouse = false`），可切 **ClickHouse**（见 [配置详解](./deploy-config.md)）。
- 分析数据在 `gw_uba` 库。核心表：`events_fact`、`sessions_fact`、`risk_events`、`path_features`、`users_dim`、`objects_dim`、`id_mapping`、`user_tags`。
- 字段定义见 `sql/{doris,clickhouse}/1_base_tables.sql` 与 [上手指南 · 表与字段地图](./analyst-getting-started.md)。

---

## 二、方言差异对照

两种引擎共用同一份业务模型，但 SQL 函数有差异：

| 操作 | Doris | ClickHouse |
|------|-------|------------|
| 按天 | `DATE_FORMAT(t, '%Y-%m-%d')` | `toDate(t)` |
| 按小时 | `DATE_FORMAT(t, '%Y-%m-%d %H:00')` | `toStartOfHour(t)` |
| 当前日期 | `CURDATE()` | `today()` |
| 日期加减 | `DATE_SUB(CURDATE(), INTERVAL 7 DAY)` | `today() - INTERVAL 7 DAY` |
| 日期差（天） | `DATEDIFF(d1, d2)` | `dateDiff('day', d2, d1)` |
| 计数 | `count()` | `count()` |
| 去重计数 | `count(DISTINCT user_id)` | `count(DISTINCT user_id)` / `uniqExact(user_id)` |
| 字符串转数字 | `CAST(amount AS DOUBLE)` | `toFloat64OrZero(toString(amount))` |
| 查询执行 API | `r.db.SelectContext(ctx, &rows, sql, args...)` | `r.db.Select(ctx, &rows, sql, args...)` |
| 漏斗窗口 | 按步骤独立统计 | 原生 `windowFunnel(seconds)(...)` |

> 后端 repo 层在 `internal/data/{doris,clickhouse}/` 各实现一份镜像，SQL 按方言调整。

---

## 三、白名单维度与指标表达式

`GroupBy` 分析的 `dimension` 走**白名单**，metric 走 switch，防止 SQL 注入：

### 允许的维度（白名单）

```
platform, channel, country, app_version, event_name, event_category, os, network
```

> 不在白名单的维度会被拒绝（`allowedDimension` 校验）。

### 指标表达式（`metricExpr`）

| metric | 表达式 |
|--------|--------|
| `COUNT`（默认） | `count()` |
| `UNIQUE_USER` | `count(DISTINCT user_id)` |
| `SUM_AMOUNT` | `sum(toFloat64OrZero(toString(amount)))` |

### 防注入设计

- 维度：白名单 map 校验，非法值拒绝。
- metric：switch 分支，非法值报错。
- 数值参数：`%d` 强转后拼接。
- 只有这些受控片段会拼进 SQL，业务参数不会直接进字符串。

---

## 四、常用查询示例

### 1. 维度分组（GroupBy 等价）

按渠道的事件量 Top 10：

```sql
-- Doris
SELECT channel, count() AS cnt
FROM events_fact
WHERE event_time >= :start AND event_time <= :end
GROUP BY channel
ORDER BY cnt DESC
LIMIT 10;
```

按平台去重用户数：

```sql
SELECT platform, count(DISTINCT user_id) AS users
FROM events_fact
WHERE event_time >= :start AND event_time <= :end
GROUP BY platform
ORDER BY users DESC;
```

### 2. 活跃用户（DAU/WAU/MAU）

```sql
-- 当天 DAU
SELECT DATE(event_time) AS day, count(DISTINCT user_id) AS dau
FROM events_fact
WHERE event_time >= :start AND event_time <= :end
GROUP BY day
ORDER BY day;
```

> 💡 **自行计算 WAU/MAU**：后端 `ActiveUsers` 的**日级** wau/mau 已基于 HLL 滚动窗口输出真值；仅 HOUR 粒度因无小时级状态退化为等于 DAU。如果你想在 Superset 里按自定义口径（如非整 7/30 天窗口）自己算，可参考：

```sql
-- 近 7 天活跃（WAU，滚动窗口）
SELECT count(DISTINCT user_id) AS wau
FROM events_fact
WHERE event_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY);
```

### 3. 漏斗（ClickHouse windowFunnel）

```sql
WITH steps AS (
    SELECT user_id,
        windowFunnel(1800)(event_ts,
            event_name='view_product',
            event_name='add_to_cart',
            event_name='payment_success') AS reached
    FROM events_fact
    WHERE event_ts BETWEEN :start_ms AND :end_ms
    GROUP BY user_id
)
SELECT reached, count() FROM steps GROUP BY reached ORDER BY reached;
```

### 4. 留存（cohort 矩阵）

```sql
WITH cohorts AS (
    SELECT user_id, DATE(event_time) AS cohort_date
    FROM events_fact
    WHERE event_name='register' AND event_time BETWEEN :start AND :end
    GROUP BY user_id, cohort_date
)
SELECT c.cohort_date,
       DATEDIFF(DATE(e.event_time), c.cohort_date) AS offset_days,
       count(DISTINCT c.user_id) AS retained
FROM cohorts c
JOIN events_fact e ON e.user_id = c.user_id
WHERE DATEDIFF(DATE(e.event_time), c.cohort_date) BETWEEN 0 AND 7
GROUP BY c.cohort_date, offset_days;
```

### 5. 会话分析（sessions_fact）

跳出率、平均会话时长：

```sql
SELECT DATE(start_time) AS day,
       count() AS sessions,
       sum(is_bounce) / count() AS bounce_rate,
       avg(duration_ms) AS avg_duration_ms
FROM sessions_fact
WHERE start_time >= :start AND start_time <= :end
GROUP BY day
ORDER BY day;
```

### 6. 用户路径（path_features）

转化路径 Top：

```sql
SELECT array_join(first_3_events, ' → ') AS path_prefix,
       count() AS cnt,
       sum(is_converted) AS converted
FROM path_features
WHERE event_date >= :start AND event_date <= :end
GROUP BY path_prefix
ORDER BY cnt DESC
LIMIT 20;
```

### 7. 风险事件（risk_events）

风险类型分布与趋势：

```sql
SELECT DATE(occur_time) AS day, risk_type, risk_level, count() AS cnt
FROM risk_events
WHERE occur_time >= :start AND occur_time <= :end
GROUP BY day, risk_type, risk_level
ORDER BY day, cnt DESC;
```

### 8. 用户画像（users_dim）

地域/VIP 分布：

```sql
SELECT country, vip_level, count() AS users
FROM users_dim
GROUP BY country, vip_level
ORDER BY users DESC;
```

---

## 五、查询自定义属性（properties / metrics map）

业务自定义属性存在 `properties`（map\<string,string\>）和 `metrics`（map\<string,double\>）里：

```sql
-- Doris：取 map 值（按需替换为引擎对应函数）
SELECT element_at(properties, 'page') AS page, count() AS cnt
FROM events_fact
WHERE event_name = 'page_view'
GROUP BY page
ORDER BY cnt DESC;
```

```sql
-- ClickHouse
SELECT properties['page'] AS page, count() AS cnt
FROM events_fact
WHERE event_name = 'page_view'
GROUP BY page
ORDER BY cnt DESC;
```

> map 字段的访问语法因引擎而异，查询前请确认。

---

## 六、性能建议

- **务必带时间过滤**：事实表按 `event_date` / `event_time` 分区，不带时间会全表扫描。
- **用分区键过滤**：优先用 `event_date`（日期分区）而非 `event_time` 函数。
- **去重计数大基 数时**：ClickHouse 可用 `uniq`（近似）替代 `uniqExact` 提速，精度换性能。
- **TTL**：`events_fact` 默认 TTL 180 天、`sessions_fact` 90 天、`risk_events` 180 天——历史数据会自动清理，做长期趋势分析注意时间跨度。

---

## 七、相关文档

- [数据分析师上手指南](./analyst-getting-started.md)
- [事件趋势分析](./analyst-event-trend.md)
- [漏斗分析](./analyst-funnel.md)
- [留存分析](./analyst-retention.md)
- [后端 API 契约](./backend-api.md)
- [Superset 部署](./deploy-superset.md)
