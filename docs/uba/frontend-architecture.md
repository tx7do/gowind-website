# UBA 前端架构

GoWind UBA 前端采用 Vue 3 + TypeScript + Ant Design Vue + Vben Admin 技术栈，基于 Monorepo 架构组织代码。

## 一、技术栈

| 技术 | 说明 |
|------|------|
| [Vue 3](https://vuejs.org/) + TypeScript | 渐进式前端框架 |
| [Ant Design Vue](https://antdv.com/) | 企业级 UI 组件库 |
| [Vben Admin](https://doc.vben.pro/) | 后台管理框架（Monorepo） |
| Vue Query (TanStack Query) | 数据获取与缓存 |
| [ECharts](https://echarts.apache.org/) | 数据可视化图表库 |
| Vite + Turbo | 快速热更新 + 增量构建 |

## 二、项目结构

```
frontend/
├── admin/                        # 管理后台前端
│   ├── apps/                     # 应用入口
│   │   ├── web-antd/             # Ant Design Vue 应用
│   │   │   ├── src/
│   │   │   │   ├── api/          # API 客户端
│   │   │   │   ├── views/        # 页面组件
│   │   │   │   ├── router/       # 路由配置
│   │   │   │   └── store/        # 状态管理
│   │   │   └── ...
│   │   └── ...
│   ├── packages/                 # 共享包
│   │   ├── types/                # 类型定义
│   │   ├── utils/                # 工具函数
│   │   ├── stores/               # 共享 Store
│   │   └── ...
│   └── ...
├── sdk/                          # 数据采集 SDK
│   └── web/
│       ├── report_sdk.js         # Web SDK（原生 JS）
│       ├── test.html             # 测试页面
│       └── README.md
└── ...
```

## 三、管理后台架构

### 3.1 页面路由

```
views/
├── dashboard/                    # 仪表板
├── analytics/                    # 数据分析
│   ├── event/                    # 事件分析
│   ├── funnel/                   # 漏斗分析
│   ├── session/                  # 会话分析
│   ├── path/                     # 路径分析
│   ├── retention/                # 留存分析
│   └── user/                     # 用户分析
├── risk/                         # 风控管理
│   ├── rules/                    # 风控规则
│   ├── events/                   # 风险事件
│   └── webhooks/                 # Webhook 配置
├── application/                  # 应用管理
├── tag/                          # 标签管理
│   ├── definition/               # 标签定义
│   └── user-tag/                 # 用户标签
├── system/                       # 系统管理
│   ├── user/                     # 用户管理
│   ├── role/                     # 角色管理
│   ├── permission/               # 权限管理
│   ├── tenant/                   # 租户管理
│   └── ...
└── profile/                      # 个人中心
```

### 3.2 API 调用层

```typescript
// api/client.ts
import { ApplicationServiceClient } from '@/api/generated';

export const apiClient = {
  applicationService: new ApplicationServiceClient(),
  riskRuleService: new RiskRuleServiceClient(),
  eventService: new BehaviorEventServiceClient(),
  // ... 其他 Service
};
```

### 3.3 数据可视化

使用 ECharts 构建分析图表：

```vue
<!-- views/analytics/event/TrendChart.vue -->
<script setup lang="ts">
import { use } from 'echarts/core';
import { LineChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const props = defineProps<{ data: EventTrendData }>();

const chartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: props.data.series.map(s => s.name) },
  xAxis: { type: 'category', data: props.data.dates },
  yAxis: { type: 'value' },
  series: props.data.series.map(s => ({
    name: s.name,
    type: s.type,
    data: s.values,
  })),
}));
</script>

<template>
  <VChart :option="chartOption" autoresize />
</template>
```

### 3.4 SSE 实时推送

```typescript
// composables/useSSE.ts
export function useSSE() {
  const eventSource = new EventSource('http://localhost:9701/events');

  onMounted(() => {
    eventSource.addEventListener('risk_alert', (event) => {
      const data = JSON.parse(event.data);
      notification.warning({
        message: '风险告警',
        description: `检测到高风险事件: ${data.eventName}`,
      });
    });

    eventSource.addEventListener('message', (event) => {
      // 处理站内信
    });
  });

  onUnmounted(() => {
    eventSource.close();
  });
}
```

## 四、Web SDK 架构

### 4.1 SDK 文件

```
sdk/web/
├── report_sdk.js     # 完整 SDK（原生 JS，无依赖）
├── test.html         # 测试页面
└── README.md
```

### 4.2 SDK 功能

| 功能 | API | 说明 |
|------|-----|------|
| 事件追踪 | `track(name, properties)` | 发送自定义事件 |
| 用户属性 | `userSet(props)` | 设置用户属性（覆盖） |
| 用户属性 | `userSetOnce(props)` | 设置用户属性（仅一次） |
| 用户属性 | `userAdd(key, value)` | 递增用户属性 |
| 超级属性 | `setSuperProperties(props)` | 全局附加属性 |
| 身份管理 | `identify(distinctId)` | 设置匿名 ID |
| 身份管理 | `login(accountId)` | 登录关联 |
| 身份管理 | `logout()` | 登出解绑 |

### 4.3 SDK 初始化

```javascript
import { EventReport } from './report_sdk.js';

const uba = new EventReport({
  serverUrl: 'http://localhost:9800',
  appId: 'your_app_id',
  debugMode: 0,  // 0=正常, 1=测试存储, 2=测试不存储
});
```

详见 [Web SDK 集成实战](./tutorial-sdk-integration.md)。

## 五、状态管理

使用 Pinia 管理全局状态：

```typescript
// stores/app.ts
export const useAppStore = defineStore('app', () => {
  const currentApplication = ref<Application | null>(null);
  const applications = ref<Application[]>([]);

  async function loadApplications() {
    const { items } = await apiClient.applicationService.List({});
    applications.value = items;
    if (items.length > 0 && !currentApplication.value) {
      currentApplication.value = items[0];
    }
  }

  return { currentApplication, applications, loadApplications };
});
```

## 六、权限控制

### 6.1 路由级权限

```typescript
// router/guard.ts
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login');
  } else if (to.meta.permissions) {
    const hasPermission = checkPermissions(to.meta.permissions, userStore.permissions);
    if (!hasPermission) {
      next('/403');
    } else {
      next();
    }
  } else {
    next();
  }
});
```

### 6.2 按钮级权限

```vue
<a-button v-access:code="'risk:event:handle'">处理风险事件</a-button>
```

## 相关文档

- [UBA 前端模块总览](./frontend-modules.md)
- [Web SDK 集成实战](./tutorial-sdk-integration.md)
- [事件分析实战](./tutorial-event-analysis.md)
- [UBA 后端架构总览](./backend-architecture.md)
