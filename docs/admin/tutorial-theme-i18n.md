# 前端主题定制与国际化教程

GoWind Admin 提供三套前端实现（Vue Vben、Vue Element、React），三套前端均支持完整的主题定制和多语言国际化能力。本教程分别讲解三套前端的主题系统和国际化机制。

## 一、三套前端主题与国际化概览

### 1.1 技术栈对比

| 特性         | Vue Vben 版                | Vue Element 版                | React 版                    |
|------------|---------------------------|------------------------------|----------------------------|
| **UI 框架**  | Ant Design Vue            | Element Plus                 | Ant Design V6              |
| **主题引擎**   | Vben Admin Preferences    | CSS Variables + 自定义引擎        | Ant Design Theme + Zustand |
| **暗黑模式**   | `light` / `dark` / `auto` | `light` / `dark` / `auto`    | `light` / `dark` / `auto`  |
| **内置主题**   | Vben Admin 内置             | 15+ 内置预设色                    | 15+ 内置预设色                  |
| **CSS 方案** | Tailwind CSS + UnoCSS     | UnoCSS                       | Tailwind CSS               |
| **i18n 库** | vue-i18n（@vben/locales）   | vue-i18n                     | i18next + react-i18next    |
| **支持语言**   | zh-CN / en-US             | zh-CN / en-US                | zh-CN / en-US              |
| **语言包格式**  | JSON（按语言分目录）              | JSON（按语言分目录）                 | JSON（按命名空间分模块）             |
| **状态管理**   | Pinia                     | Vue Reactive                 | Zustand                    |
| **项目路径**   | `frontend/admin/vue-vben` | `frontend/admin/vue-element` | `frontend/admin/react`     |

### 1.2 共同设计理念

三套前端共享以下设计理念：

- **CSS Variables 驱动**：通过 CSS 变量实现运行时动态主题切换
- **Preferences 偏好系统**：统一管理主题、布局、语言等偏好设置
- **localStorage 持久化**：用户偏好自动保存到本地存储
- **系统主题跟随**：支持 `auto` 模式自动跟随操作系统暗黑模式

---

## 二、Vue Vben 版 — 主题定制

### 2.1 主题架构

Vue Vben 版基于 Vben Admin 框架的主题系统，核心位于 `packages/@core/` 共享包中：

```
packages/@core/
├── base/shared/src/color.ts     # 主题颜色工具
└── preferences/                  # 偏好设置系统

apps/admin/src/
├── preferences.ts                # 主题偏好覆盖配置
└── locales/                      # 国际化配置
```

### 2.2 修改主色调

在 `apps/admin/src/preferences.ts` 中覆盖主题配置：

```typescript
import { defineOverridesPreferences } from '@vben/preferences';

export const overridesPreferences = defineOverridesPreferences({
  theme: {
    colorPrimary: '#722ed1',  // 紫色主题
  },
});
```

### 2.3 完整主题配置

```typescript
export const overridesPreferences = defineOverridesPreferences({
  theme: {
    // 主色
    colorPrimary: '#722ed1',

    // 主题模式：light | dark | auto
    mode: 'light',

    // 圆角大小
    borderRadius: 6,

    // 是否开启紧凑模式
    compact: false,
  },

  // 布局配置
  layout: {
    // 导航模式：horizontal（顶部）| vertical（左侧）
    mode: 'vertical',
    tabbar: true,
    breadcrumb: true,
  },
});
```

### 2.4 运行时切换主题

```vue
<script setup>
import { useThemeStore } from '@vben/stores';

const themeStore = useThemeStore();

// 切换主色
function changePrimaryColor(color) {
  themeStore.updatePreferences({
    theme: { colorPrimary: color },
  });
}

// 切换暗黑模式
function toggleDarkMode() {
  themeStore.updatePreferences({
    theme: {
      mode: themeStore.isDark ? 'light' : 'dark',
    },
  });
}
</script>

<template>
  <div>
    <Button @click="changePrimaryColor('#1890ff')">蓝色主题</Button>
    <Button @click="changePrimaryColor('#722ed1')">紫色主题</Button>
    <Button @click="toggleDarkMode">切换暗黑模式</Button>
  </div>
</template>
```

### 2.5 暗黑模式适配

自定义暗黑模式样式，在 `apps/admin/src/styles/` 中定义：

```css
html.dark {
  --bg-color: #141414;
  --bg-color-secondary: #1f1f1f;
  --text-color: rgba(255, 255, 255, 0.85);
  --border-color: #303030;
}

html.dark .custom-card {
  background: linear-gradient(145deg, #1f1f1f, #2a2a2a);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
```

---

## 三、Vue Element 版 — 主题定制

### 3.1 主题架构

Vue Element 版拥有完全自研的主题引擎，核心位于 `src/core/preferences/` 和 `src/utils/theme.ts`：

```
src/core/preferences/
├── config/
│   ├── constants.ts          # 内置主题预设（15+ 种预设色）
│   └── default.ts            # 默认偏好配置
├── types/
│   └── theme.ts              # 主题类型定义
├── update-css-variables.ts   # CSS 变量更新引擎
├── preferences.ts            # 偏好管理器
└── use-preferences.ts        # 偏好组合式函数

src/utils/
├── color.ts                  # 颜色转换工具（Hex/RGB/HSL）
└── theme.ts                  # 主题工具函数
```

### 3.2 内置主题预设

Vue Element 版提供 15+ 种内置主题预设色：

| 预设名        | 说明    | 预设名          | 说明   |
|------------|-------|--------------|------|
| `default`  | 默认蓝色  | `deep-blue`  | 深蓝色  |
| `green`    | 绿色    | `deep-green` | 深绿色  |
| `red`      | 红色    | `rose`       | 玫红色  |
| `orange`   | 橙色    | `yellow`     | 黄色   |
| `pink`     | 粉色    | `violet`     | 紫罗兰色 |
| `sky-blue` | 天蓝色   | `gray`       | 灰色   |
| `slate`    | 石板灰色  | `stone`      | 石灰色  |
| `neutral`  | 中性色   | `zinc`       | 锌色   |
| `custom`   | 自定义主题 |              |      |

### 3.3 修改默认主题

在 `src/core/preferences/config/default.ts` 中修改：

```typescript
const defaultPreferences: Preferences = {
  // ... 其他配置
  theme: {
    builtinType: "default",          // 内置主题类型
    colorPrimary: "hsl(220 100% 55%)",   // 主色（支持 HSL）
    colorSuccess: "hsl(145 100% 35%)",   // 成功色
    colorWarning: "hsl(32 100% 50%)",    // 警告色
    colorDestructive: "hsl(0 91% 60%)",  // 危险色
    mode: "dark",                          // light | dark | auto
    radius: "0.5",                         // 圆角（rem）
    semiDarkSidebar: false,                // 半暗侧边栏
    semiDarkHeader: false,                 // 半暗顶栏
  },
};
```

### 3.4 CSS 变量更新机制

Vue Element 版的主题引擎通过 `update-css-variables.ts` 实现运行时动态主题切换：

```typescript
// 主题更新流程
// 1. preferences 变更 → handleUpdates() 检测到 theme 变化
// 2. 调用 updateCSSVariables() 生成 CSS 变量
// 3. 生成两套变量：
//    - Element Plus 变量：--el-color-primary, --el-color-primary-light-1 等
//    - 自定义变量：--primary-500, --success-500 等（Tailwind 风格）
// 4. 同时更新 vxe-table 暗色主题

// 关键函数
import { generateColorVariables, generatorColorVariables } from "@/utils/theme";

// 生成 Element Plus 颜色变量
const epVariables = generateColorVariables({
  colorPrimary: "#4080FF",
  colorSuccess: "#52c41a",
  colorWarning: "#faad14",
  colorDestructive: "#ff4d4f",
  mode: "light",
});
// 输出: { "--el-color-primary": "#4080FF", "--el-color-primary-light-1": "...", ... }

// 生成自定义 Tailwind 风格变量
const customVariables = generatorColorVariables([
  { color: "#4080FF", name: "primary" },
  { color: "#52c41a", name: "green", alias: "success" },
]);
// 输出: { "--primary-500": "#4080FF", "--primary-50": "...", ... "--primary-950": "..." }
```

### 3.5 运行时切换主题

```vue
<script setup>
import { usePreferences } from "@/core/preferences";

const { preferences, updatePreferences } = usePreferences();

// 切换内置主题
function changeBuiltinTheme(type) {
  updatePreferences({ theme: { builtinType: type } });
}

// 切换暗黑模式
function toggleDarkMode() {
  const currentMode = preferences.theme.mode;
  const isDark = currentMode === "dark" ||
    (currentMode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  updatePreferences({ theme: { mode: isDark ? "light" : "dark" } });
}

// 自定义主色
function changePrimaryColor(color) {
  updatePreferences({
    theme: { builtinType: "custom", colorPrimary: color },
  });
}
</script>

<template>
  <div>
    <el-button @click="changeBuiltinTheme('default')">默认蓝</el-button>
    <el-button @click="changeBuiltinTheme('violet')">紫色</el-button>
    <el-button @click="changePrimaryColor('#eb2f96')">自定义粉</el-button>
    <el-button @click="toggleDarkMode">切换暗黑模式</el-button>
  </div>
</template>
```

### 3.6 暗黑模式切换原理

```typescript
// src/utils/theme.ts
export function toggleDarkMode(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  // vxe-table 暗色主题同步
  VxeUI.setTheme(isDark ? "dark" : "light");
}
```

### 3.7 半暗模式

Vue Element 版支持半暗侧边栏和半暗顶栏（仅在浅色模式下生效）：

```typescript
updatePreferences({
  theme: {
    mode: "light",
    semiDarkSidebar: true,   // 侧边栏深色背景
    semiDarkHeader: false,    // 顶栏保持浅色
  },
});
```

---

## 四、React 版 — 主题定制

### 4.1 主题架构

React 版基于 Ant Design V6 的主题系统，核心位于 `src/core/preferences/`：

```
src/core/preferences/
├── config/
│   ├── constants.ts          # 内置主题预设（与 Vue Element 版一致）
│   └── default.ts            # 默认偏好配置
├── hooks/
│   ├── useThemeConfig.ts     # Ant Design ThemeConfig 生成
│   ├── usePreferences.ts     # 偏好 Hook
│   └── useLocale.ts          # 语言切换 Hook
├── store/
│   └── index.ts              # Zustand 偏好状态管理
└── types/
    └── theme.ts              # 主题类型定义
```

### 4.2 Ant Design ThemeConfig

React 版通过 `useThemeConfig` Hook 将偏好配置转换为 Ant Design 的 `ThemeConfig`：

```typescript
// src/core/preferences/hooks/useThemeConfig.ts
import { theme as antdTheme, type ThemeConfig } from 'antd';
import { usePreferencesStore } from '../store';

export const useThemeConfig = (): ThemeConfig => {
    const { theme, app } = usePreferencesStore((state) => state.preferences);

    // 响应式跟踪系统暗色模式
    const [systemIsDark, useState] = useState(
        () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    );

    // 计算有效主题
    const effectiveIsDark = useMemo(() => {
        if (theme.mode === 'dark') return true;
        if (theme.mode === 'light') return false;
        if (theme.mode === 'auto') return systemIsDark;
        return false;
    }, [theme.mode, systemIsDark]);

    return useMemo((): ThemeConfig => {
        const algorithms = [];
        if (effectiveIsDark) algorithms.push(antdTheme.darkAlgorithm);
        if (app.compact) algorithms.push(antdTheme.compactAlgorithm);

        return {
            algorithm: algorithms.length > 0 ? algorithms : antdTheme.defaultAlgorithm,
            token: {
                colorPrimary: theme.colorPrimary,
                colorSuccess: theme.colorSuccess,
                colorWarning: theme.colorWarning,
                colorError: theme.colorDestructive,
                borderRadius: Number.parseInt(theme.radius) || 6,
            },
        };
    }, [effectiveIsDark, theme, app]);
};
```

### 4.3 在应用中应用主题

```tsx
// App.tsx 中使用
import { ConfigProvider, App as AntdApp } from 'antd';
import { useThemeConfig } from '@/core/preferences';

function App() {
    const themeConfig = useThemeConfig();

    return (
        <ConfigProvider theme={themeConfig}>
            <AntdApp>
                {/* 应用内容 */}
            </AntdApp>
        </ConfigProvider>
    );
}
```

### 4.4 运行时切换主题

```tsx
import { usePreferencesStore } from '@/core/preferences/store';

function ThemeSwitcher() {
    const updatePreferences = usePreferencesStore((state) => state.updatePreferences);
    const preferences = usePreferencesStore((state) => state.preferences);

    const changePrimaryColor = (color: string) => {
        updatePreferences({
            theme: { colorPrimary: color },
        });
    };

    const toggleDarkMode = () => {
        const isDark = preferences.theme.mode === 'dark';
        updatePreferences({
            theme: { mode: isDark ? 'light' : 'dark' },
        });
    };

    return (
        <div>
            <Button onClick={() => changePrimaryColor('#1890ff')}>蓝色</Button>
            <Button onClick={() => changePrimaryColor('#722ed1')}>紫色</Button>
            <Button onClick={toggleDarkMode}>切换暗黑模式</Button>
        </div>
    );
}
```

### 4.5 默认偏好配置

React 版的默认配置与 Vue Element 版结构一致：

```typescript
// src/core/preferences/config/default.ts
const defaultPreferences: Preferences = {
    // ...
    theme: {
        builtinType: "default",
        colorPrimary: "hsl(212 100% 45%)",     // 主色
        colorSuccess: "hsl(144 57% 58%)",       // 成功色
        colorWarning: "hsl(42 84% 61%)",        // 警告色
        colorDestructive: "hsl(348 100% 61%)",  // 危险色
        mode: "dark",
        radius: "0.5",
        semiDarkHeader: false,
        semiDarkSidebar: false,
    },
};
```

---

## 五、Vue Vben 版 — 国际化

### 5.1 语言包结构

Vue Vben 版的语言包位于 `apps/admin/src/locales/`，采用 JSON 格式按语言分目录：

```
locales/
├── langs/
│   ├── en-US/
│   │   ├── enum.json       # 枚举翻译
│   │   ├── menu.json       # 菜单翻译
│   │   ├── page.json       # 页面翻译
│   │   └── ui.json         # UI 翻译
│   └── zh-CN/
│       ├── enum.json
│       ├── menu.json
│       ├── page.json
│       └── ui.json
└── index.ts                 # 语言配置入口
```

### 5.2 语言配置入口

`locales/index.ts` 负责加载应用语言包和第三方组件库语言包：

```typescript
import { $t, setupI18n as coreSetup, loadLocalesMapFromDir } from '@vben/locales';
import { preferences } from '@vben/preferences';
import antdDefaultLocale from 'ant-design-vue/es/locale/zh_CN';
import dayjs from 'dayjs';

const modules = import.meta.glob('./langs/**/*.json');
const localesMap = loadLocalesMapFromDir(
  /\.\/langs\/([^/]+)\/(.*)\.json$/,
  modules,
);

async function loadMessages(lang) {
  const [appLocaleMessages] = await Promise.all([
    localesMap[lang]?.(),
    loadThirdPartyMessage(lang),  // 加载 Ant Design Vue 和 dayjs 的语言包
  ]);
  return appLocaleMessages?.default;
}

async function setupI18n(app, options = {}) {
  await coreSetup(app, {
    defaultLocale: preferences.app.locale,
    loadMessages,
    missingWarn: !import.meta.env.PROD,
    ...options,
  });
}
```

### 5.3 在组件中使用

```vue
<script setup>
import { useI18n } from '@vben/locales';
const { t } = useI18n();
</script>

<template>
  <h1>{{ t('page.user.title') }}</h1>
  <Button>{{ t('common.save') }}</Button>
</template>
```

### 5.4 动态切换语言

```typescript
import { usePreferences } from '@vben/preferences';

const { updatePreferences } = usePreferences();

// 切换到英文
updatePreferences({ app: { locale: 'en-US' } });

// 切换到中文
updatePreferences({ app: { locale: 'zh-CN' } });
```

---

## 六、Vue Element 版 — 国际化

### 6.1 语言包结构

Vue Element 版的语言包位于 `src/locales/`，同样采用 JSON 格式，但翻译文件更加细分：

```
locales/
├── en-US/
│   ├── app.json                      # 应用级翻译
│   ├── common.json                   # 通用翻译
│   ├── core.json                     # 核心功能翻译
│   ├── enum.json                     # 枚举翻译
│   ├── preferences.json              # 偏好设置翻译
│   ├── routes.json                   # 路由翻译
│   ├── validation.json               # 表单验证翻译
│   └── pages/                        # 页面级翻译
│       ├── user.json
│       ├── role.json
│       ├── menu.json
│       ├── tenant.json
│       └── ...（每个业务模块一个文件）
└── zh-CN/
    ├── app.json
    ├── common.json
    └── pages/
        └── ...
```

### 6.2 i18n 配置

Vue Element 版使用 vue-i18n 库，配置位于 `src/core/i18n/setup.ts`：

```typescript
import { createI18n } from "vue-i18n";

const i18n = createI18n({
  globalInjection: true,
  legacy: false,
  locale: "",
  messages: {},
});

// 从 src/locales/ 加载翻译文件
const modules = import.meta.glob("../../locales/**/*.json");
const localesMap = loadLocalesMapFromDir(/..\/locales\/([^/]+)\/(.*)\.json$/, modules);

async function setupI18n(app, options = {}) {
  const { defaultLocale = "zh-CN" } = options;
  app.use(i18n);
  await loadLocaleMessages(defaultLocale);
}

// 运行时加载语言包
async function loadLocaleMessages(lang) {
  const message = await localesMap[lang]?.();
  if (message?.default) {
    i18n.global.setLocaleMessage(lang, message.default);
  }
  setI18nLanguage(lang);
}
```

### 6.3 在组件中使用

```vue
<script setup>
import { $t } from "@/core/i18n";
</script>

<template>
  <h1>{{ $t('pages.user.title') }}</h1>
  <el-button>{{ $t('common.save') }}</el-button>
</template>
```

### 6.4 动态切换语言

```typescript
import { usePreferences } from "@/core/preferences";

const { updatePreferences } = usePreferences();

// 切换语言（自动触发 loadLocaleMessages）
updatePreferences({ app: { locale: "en-US" } });
```

语言切换时的自动处理流程（在 `PreferenceManager.handleUpdates()` 中）：

```typescript
// 当 locale 字段变化时，自动加载新语言包
if (Reflect.has(appUpdates, "locale") && appUpdates.locale) {
  loadLocaleMessages(appUpdates.locale);
}
```

### 6.5 翻译路由标题

```typescript
import { translateRouteTitle } from "@/core/i18n";

// 用于面包屑、侧边栏、标签页等场景
const title = translateRouteTitle("routes.dashboard.title");
// 如果翻译存在则返回翻译文本，否则返回原文
```

---

## 七、React 版 — 国际化

### 7.1 语言包结构

React 版使用 i18next + react-i18next，语言包位于 `src/locales/`，采用命名空间分模块：

```
locales/
├── index.ts                    # 语言资源导出
├── zh-CN/
│   ├── index.ts                # 中文资源汇总
│   ├── _core/                  # 核心翻译
│   │   ├── common.json
│   │   ├── auth.json
│   │   ├── editor.json
│   │   └── routes.json
│   └── _modules/               # 业务模块翻译
│       ├── user.json
│       ├── role.json
│       ├── menu.json
│       └── ...
└── en-US/
    ├── index.ts
    ├── _core/
    └── _modules/
```

### 7.2 i18n 配置

React 版的 i18n 初始化位于 `src/core/i18n/config/i18n.ts`：

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources, allNamespaces, type SupportedLocale } from '@/locales';

export const initI18n = async (initialLang: SupportedLocale) => {
  await i18n.use(initReactI18next).init({
    lng: initialLang,
    resources,           // 核心 + 扩展模块全部预加载
    fallbackLng: 'zh-CN',
    supportedLngs: ['zh-CN', 'en-US'],
    defaultNS: 'common',
    ns: allNamespaces,   // 声明所有命名空间
    missingKeyHandler: import.meta.env.DEV
      ? (lngs, ns, key) => {
          console.warn(`[i18n] Missing: "${key}" in "${ns}" for "${lngs[0]}"`);
        }
      : undefined,
  });

  return i18n;
};
```

语言资源导出（`src/locales/index.ts`）：

```typescript
import { zhCN, type ZhCNResources, allNamespaces as zhCNNamespaces } from './zh-CN';
import { enUS, type EnUSResources } from './en-US';

const allNamespaces = zhCNNamespaces;

export const resources = {
    'zh-CN': zhCN,
    'en-US': enUS,
} as const;

export const supportedLocales = ['zh-CN', 'en-US'] as const;
export type SupportedLocale = typeof supportedLocales[number];
```

### 7.3 在组件中使用

```tsx
import { useI18n } from '@/core/i18n/hooks';

function UserPage() {
    const { t } = useI18n('user');  // 指定命名空间

    return (
        <div>
            <h1>{t('title')}</h1>
            <Button>{t('common:save')}</Button>
        </div>
    );
}
```

### 7.4 动态切换语言

```tsx
import { useI18n } from '@/core/i18n/hooks';

function LanguageSwitcher() {
    const { i18n, changeLocale } = useI18n();

    const switchToCN = async () => {
        await changeLocale('zh-CN');
    };

    const switchToEN = async () => {
        await changeLocale('en-US');
    };

    return (
        <Select
            value={i18n.language}
            onChange={(val) => changeLocale(val)}
            options={[
                { label: '简体中文', value: 'zh-CN' },
                { label: 'English', value: 'en-US' },
            ]}
        />
    );
}
```

### 7.5 类型安全翻译

React 版提供了类型安全的翻译函数：

```typescript
// src/locales/index.ts 中的类型定义
export type CoreTFunction = <N extends CoreNamespace>(
    namespace: N,
    key: CoreKey<N>,
    params?: Record<string, any>
) => string;
```

---

## 八、添加新语言实战

以添加日语（ja-JP）为例，分别介绍三套前端的做法。

### 8.1 Vue Vben 版

1. 创建语言文件目录 `apps/admin/src/locales/langs/ja-JP/`，添加 JSON 翻译文件：

```json
// ja-JP/page.json
{
  "user": {
    "title": "ユーザー管理",
    "create": "ユーザー作成"
  }
}
```

2. 注册第三方组件库语言包（修改 `locales/index.ts`）：

```typescript
async function loadAntdLocale(lang) {
  switch (lang) {
    case 'ja-JP': {
      antdLocale.value = await import('ant-design-vue/es/locale/ja_JP');
      break;
    }
    // ... 其他语言
  }
}
```

### 8.2 Vue Element 版

1. 创建语言文件目录 `src/locales/ja-JP/`，复制 `zh-CN/` 下的所有 JSON 文件并翻译。
2. 由于语言包通过 `import.meta.glob` 自动扫描，无需额外注册。

### 8.3 React 版

1. 创建语言文件目录 `src/locales/ja-JP/`，复制 `zh-CN/` 下的目录结构和 JSON 文件并翻译。
2. 更新 `src/locales/index.ts`：

    ```typescript
    import { jaJP } from './ja-JP';
    
    export const resources = {
        'zh-CN': zhCN,
        'en-US': enUS,
        'ja-JP': jaJP,       // 新增
    } as const;
    
    export const supportedLocales = ['zh-CN', 'en-US', 'ja-JP'] as const;
    ```

3. 更新 i18n 配置中的 `supportedLngs`。

---

## 九、日期时间本地化

三套前端均使用 dayjs 处理日期时间，需要同步设置 dayjs 语言：

### 9.1 Vue Vben 版

已在 `locales/index.ts` 中自动处理：

```typescript
async function loadDayjsLocale(lang) {
  switch (lang) {
    case 'en-US': locale = await import('dayjs/locale/en'); break;
    case 'zh-CN': locale = await import('dayjs/locale/zh-cn'); break;
  }
  if (locale) dayjs.locale(locale);
}
```

### 9.2 Vue Element 版 / React 版

在语言切换时手动加载：

```typescript
import dayjs from 'dayjs';

async function setDayjsLocale(locale) {
  const localeMap = {
    'zh-CN': 'zh-cn',
    'en-US': 'en',
  };
  dayjs.locale(localeMap[locale] || 'en');
}
```

---

## 十、实战场景

### 10.1 企业品牌定制（三套通用思路）

**需求**：将系统定制为企业品牌风格（蓝色主题 + 企业 Logo）。

**Vue Vben 版**：

```typescript
// preferences.ts
export const overridesPreferences = defineOverridesPreferences({
  theme: { colorPrimary: '#0056b3', borderRadius: 4 },
  logo: { image: '/enterprise-logo.png', title: '企业管理平台' },
});
```

**Vue Element 版**：

```typescript
// src/core/preferences/config/default.ts
const defaultPreferences = {
  theme: {
    builtinType: "custom",
    colorPrimary: "#0056b3",
    mode: "light",
    radius: "0.25",
  },
  logo: { source: "/enterprise-logo.png" },
  app: { name: "企业管理平台" },
};
```

**React 版**：

```typescript
// src/core/preferences/config/default.ts
const defaultPreferences = {
  theme: {
    builtinType: "custom",
    colorPrimary: "#0056b3",
    mode: "light",
    radius: "0.25",
  },
  logo: { source: "/enterprise-logo.png" },
  app: { name: "企业管理平台" },
};
```

### 10.2 多租户主题隔离（三套通用思路）

根据租户 ID 动态加载主题色：

```typescript
async function loadTenantTheme(tenantId, updatePreferences) {
  const themeConfig = await fetch(`/api/tenant/${tenantId}/theme`);
  updatePreferences({
    theme: { colorPrimary: themeConfig.primaryColor },
  });
}
```

### 10.3 节日主题切换

```typescript
function isSpringFestival() {
  const month = new Date().getMonth() + 1;
  const day = new Date().getDate();
  return (month === 1 && day >= 20) || (month === 2 && day <= 20);
}

if (isSpringFestival()) {
  updatePreferences({ theme: { colorPrimary: '#f5222d' } });
}
```

---

## 十一、性能优化

### 11.1 主题切换优化

使用 CSS 变量避免组件重新渲染：

```css
:root { --color-primary: #1890ff; }
.ant-btn-primary { background: var(--color-primary); }
```

切换时只更新 CSS 变量值，无需重建组件树。

### 11.2 懒加载语言包

**Vue Vben / Vue Element 版**：使用 `import.meta.glob` 实现按需加载：

```typescript
const modules = import.meta.glob('./langs/**/*.json');
// 只有切换到对应语言时才加载该语言包
```

**React 版**：预加载所有语言包（适合语言数量少的场景）：

```typescript
resources: {
  'zh-CN': zhCN,  // 预加载
  'en-US': enUS,  // 预加载
}
```

### 11.3 偏好持久化

三套前端均将偏好保存到 localStorage：

```typescript
// 保存
localStorage.setItem('preferences', JSON.stringify(preferences));

// 恢复
const cached = localStorage.getItem('preferences');
if (cached) preferences = JSON.parse(cached);
```

---

## 十二、常见问题

### Q1: 主题切换后样式不生效？

检查：
1. CSS 变量是否正确定义（浏览器 DevTools → Computed → 搜索变量名）
2. 是否有更高优先级的样式覆盖
3. 清除浏览器缓存后重试

### Q2: Vue Element 版自定义颜色不生效？

确保 `builtinType` 设置为 `"custom"`，否则内置主题预设会覆盖自定义颜色：

```typescript
updatePreferences({
  theme: { builtinType: "custom", colorPrimary: "#ff0000" },
});
```

### Q3: React 版暗黑模式不生效？

确保 `ConfigProvider` 的 `theme` 属性使用了 `useThemeConfig()` 的返回值，且 `algorithm` 包含 `darkAlgorithm`。

### Q4: 语言切换后部分文本未翻译？

检查翻译文件中是否有对应的 key。各版本开发环境均会在控制台输出缺失 key 警告。

### Q5: 如何适配移动端主题？

使用响应式断点：

```css
@media (max-width: 768px) {
  :root {
    --el-border-radius-base: 4px;
    --sidebar-width: 200px;
  }
}
```

---

## 十三、相关文档

- [前端架构总览](./frontend-architecture.md)
- [前端核心功能详解](./frontend-modules.md)
- [后端配置与部署](./backend-config-deploy.md)
