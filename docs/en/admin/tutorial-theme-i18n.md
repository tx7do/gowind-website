# Frontend Theming and Internationalization

GoWind Admin provides three frontend implementations (Vue Vben, Vue Element, and React). All three support full theme customization and multi-language internationalization. This tutorial explains the theme system and internationalization mechanism of each frontend.

## 1. Theming and i18n Overview of the Three Frontends

### 1.1 Technology Stack Comparison

| Feature | Vue Vben version | Vue Element version | React version |
|------------|---------------------------|------------------------------|----------------------------|
| **UI framework** | Ant Design Vue | Element Plus | Ant Design V6 |
| **Theme engine** | Vben Admin Preferences | CSS Variables + custom engine | Ant Design Theme + Zustand |
| **Dark mode** | `light` / `dark` / `auto` | `light` / `dark` / `auto` | `light` / `dark` / `auto` |
| **Built-in themes** | Built into Vben Admin | 15+ built-in preset colors | 15+ built-in preset colors |
| **CSS solution** | Tailwind CSS + UnoCSS | UnoCSS | Tailwind CSS |
| **i18n library** | vue-i18n (@vben/locales) | vue-i18n | i18next + react-i18next |
| **Supported languages** | zh-CN / en-US | zh-CN / en-US | zh-CN / en-US |
| **Language pack format** | JSON (directories per language) | JSON (directories per language) | JSON (modules per namespace) |
| **State management** | Pinia | Vue Reactive | Zustand |
| **Project path** | `frontend/admin/vue-vben` | `frontend/admin/vue-element` | `frontend/admin/react` |

### 1.2 Shared Design Philosophy

The three frontends share the following design philosophy:

- **CSS Variables driven**: runtime dynamic theme switching through CSS variables
- **Preferences system**: unified management of theme, layout, language, and other preferences
- **localStorage persistence**: user preferences are saved to local storage automatically
- **System theme following**: the `auto` mode follows the operating system's dark mode automatically

---

## 2. Vue Vben Version — Theme Customization

### 2.1 Theme Architecture

The Vue Vben version is based on the theme system of the Vben Admin framework, with the core located in the `packages/@core/` shared package:

```
packages/@core/
├── base/shared/src/color.ts     # Theme color utilities
└── preferences/                  # Preferences system

apps/admin/src/
├── preferences.ts                # Theme preference overrides
└── locales/                      # Internationalization configuration
```

### 2.2 Changing the Primary Color

Override the theme configuration in `apps/admin/src/preferences.ts`:

```typescript
import { defineOverridesPreferences } from '@vben/preferences';

export const overridesPreferences = defineOverridesPreferences({
  theme: {
    colorPrimary: '#722ed1',  // 紫色主题
  },
});
```

### 2.3 Full Theme Configuration

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

### 2.4 Switching Themes at Runtime

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

### 2.5 Dark Mode Adaptation

Define custom dark mode styles in `apps/admin/src/styles/`:

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

## 3. Vue Element Version — Theme Customization

### 3.1 Theme Architecture

The Vue Element version has a fully in-house theme engine, with the core located in `src/core/preferences/` and `src/utils/theme.ts`:

```
src/core/preferences/
├── config/
│   ├── constants.ts          # Built-in theme presets (15+ preset colors)
│   └── default.ts            # Default preferences
├── types/
│   └── theme.ts              # Theme type definitions
├── update-css-variables.ts   # CSS variable update engine
├── preferences.ts            # Preference manager
└── use-preferences.ts        # Preferences composable

src/utils/
├── color.ts                  # Color conversion utilities (Hex/RGB/HSL)
└── theme.ts                  # Theme utility functions
```

### 3.2 Built-in Theme Presets

The Vue Element version provides 15+ built-in theme preset colors:

| Preset | Description | Preset | Description |
|------------|-------|--------------|------|
| `default` | Default blue | `deep-blue` | Deep blue |
| `green` | Green | `deep-green` | Deep green |
| `red` | Red | `rose` | Rose |
| `orange` | Orange | `yellow` | Yellow |
| `pink` | Pink | `violet` | Violet |
| `sky-blue` | Sky blue | `gray` | Gray |
| `slate` | Slate | `stone` | Stone |
| `neutral` | Neutral | `zinc` | Zinc |
| `custom` | Custom theme | | |

### 3.3 Changing the Default Theme

Modify it in `src/core/preferences/config/default.ts`:

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

### 3.4 The CSS Variable Update Mechanism

The theme engine of the Vue Element version achieves runtime dynamic theme switching through `update-css-variables.ts`:

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

### 3.5 Switching Themes at Runtime

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

### 3.6 How Dark Mode Switching Works

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

### 3.7 Semi-Dark Mode

The Vue Element version supports a semi-dark sidebar and a semi-dark header (effective only in light mode):

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

## 4. React Version — Theme Customization

### 4.1 Theme Architecture

The React version is based on the Ant Design V6 theme system, with the core located in `src/core/preferences/`:

```
src/core/preferences/
├── config/
│   ├── constants.ts          # Built-in theme presets (same as the Vue Element version)
│   └── default.ts            # Default preferences
├── hooks/
│   ├── useThemeConfig.ts     # Ant Design ThemeConfig generation
│   ├── usePreferences.ts     # Preferences hook
│   └── useLocale.ts          # Language switching hook
├── store/
│   └── index.ts              # Zustand preferences state management
└── types/
    └── theme.ts              # Theme type definitions
```

### 4.2 Ant Design ThemeConfig

The React version converts preference configuration into the Ant Design `ThemeConfig` through the `useThemeConfig` hook:

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

### 4.3 Applying the Theme in the Application

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

### 4.4 Switching Themes at Runtime

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

### 4.5 Default Preferences

The default configuration of the React version has the same structure as the Vue Element version:

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

## 5. Vue Vben Version — Internationalization

### 5.1 Language Pack Structure

The language packs of the Vue Vben version are located in `apps/admin/src/locales/`, in JSON format organized into directories per language:

```
locales/
├── langs/
│   ├── en-US/
│   │   ├── enum.json       # Enum translations
│   │   ├── menu.json       # Menu translations
│   │   ├── page.json       # Page translations
│   │   └── ui.json         # UI translations
│   └── zh-CN/
│       ├── enum.json
│       ├── menu.json
│       ├── page.json
│       └── ui.json
└── index.ts                 # Language configuration entry
```

### 5.2 The Language Configuration Entry

`locales/index.ts` loads the application language packs and the third-party component library language packs:

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

### 5.3 Using It in Components

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

### 5.4 Switching Languages Dynamically

```typescript
import { usePreferences } from '@vben/preferences';

const { updatePreferences } = usePreferences();

// 切换到英文
updatePreferences({ app: { locale: 'en-US' } });

// 切换到中文
updatePreferences({ app: { locale: 'zh-CN' } });
```

---

## 6. Vue Element Version — Internationalization

### 6.1 Language Pack Structure

The language packs of the Vue Element version are located in `src/locales/`, also in JSON format, but with more fine-grained translation files:

```
locales/
├── en-US/
│   ├── app.json                      # Application-level translations
│   ├── common.json                   # Common translations
│   ├── core.json                     # Core feature translations
│   ├── enum.json                     # Enum translations
│   ├── preferences.json              # Preferences translations
│   ├── routes.json                   # Route translations
│   ├── validation.json               # Form validation translations
│   └── pages/                        # Page-level translations
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

### 6.2 i18n Configuration

The Vue Element version uses the vue-i18n library; the configuration is in `src/core/i18n/setup.ts`:

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

### 6.3 Using It in Components

```vue
<script setup>
import { $t } from "@/core/i18n";
</script>

<template>
  <h1>{{ $t('pages.user.title') }}</h1>
  <el-button>{{ $t('common.save') }}</el-button>
</template>
```

### 6.4 Switching Languages Dynamically

```typescript
import { usePreferences } from "@/core/preferences";

const { updatePreferences } = usePreferences();

// 切换语言（自动触发 loadLocaleMessages）
updatePreferences({ app: { locale: "en-US" } });
```

The automatic handling flow when switching languages (in `PreferenceManager.handleUpdates()`):

```typescript
// 当 locale 字段变化时，自动加载新语言包
if (Reflect.has(appUpdates, "locale") && appUpdates.locale) {
  loadLocaleMessages(appUpdates.locale);
}
```

### 6.5 Translating Route Titles

```typescript
import { translateRouteTitle } from "@/core/i18n";

// 用于面包屑、侧边栏、标签页等场景
const title = translateRouteTitle("routes.dashboard.title");
// 如果翻译存在则返回翻译文本，否则返回原文
```

---

## 7. React Version — Internationalization

### 7.1 Language Pack Structure

The React version uses i18next + react-i18next; the language packs are located in `src/locales/`, organized into modules by namespace:

```
locales/
├── index.ts                    # Language resource exports
├── zh-CN/
│   ├── index.ts                # Chinese resource aggregation
│   ├── _core/                  # Core translations
│   │   ├── common.json
│   │   ├── auth.json
│   │   ├── editor.json
│   │   └── routes.json
│   └── _modules/               # Business module translations
│       ├── user.json
│       ├── role.json
│       ├── menu.json
│       └── ...
└── en-US/
    ├── index.ts
    ├── _core/
    └── _modules/
```

### 7.2 i18n Configuration

The i18n initialization of the React version is in `src/core/i18n/config/i18n.ts`:

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

Language resource exports (`src/locales/index.ts`):

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

### 7.3 Using It in Components

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

### 7.4 Switching Languages Dynamically

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

### 7.5 Type-Safe Translations

The React version provides type-safe translation functions:

```typescript
// src/locales/index.ts 中的类型定义
export type CoreTFunction = <N extends CoreNamespace>(
    namespace: N,
    key: CoreKey<N>,
    params?: Record<string, any>
) => string;
```

---

## 8. Adding a New Language in Practice

Using Japanese (ja-JP) as an example, here is how to do it in each of the three frontends.

### 8.1 Vue Vben Version

1. Create the language file directory `apps/admin/src/locales/langs/ja-JP/` and add the JSON translation files:

```json
// ja-JP/page.json
{
  "user": {
    "title": "ユーザー管理",
    "create": "ユーザー作成"
  }
}
```

2. Register the third-party component library language packs (modify `locales/index.ts`):

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

### 8.2 Vue Element Version

1. Create the language file directory `src/locales/ja-JP/`, copy all the JSON files under `zh-CN/`, and translate them.
2. Since the language packs are scanned automatically via `import.meta.glob`, no extra registration is needed.

### 8.3 React Version

1. Create the language file directory `src/locales/ja-JP/`, copy the directory structure and JSON files under `zh-CN/`, and translate them.
2. Update `src/locales/index.ts`:

    ```typescript
    import { jaJP } from './ja-JP';
    
    export const resources = {
        'zh-CN': zhCN,
        'en-US': enUS,
        'ja-JP': jaJP,       // new
    } as const;
    
    export const supportedLocales = ['zh-CN', 'en-US', 'ja-JP'] as const;
    ```

3. Update `supportedLngs` in the i18n configuration.

---

## 9. Date and Time Localization

All three frontends use dayjs to handle dates and times; the dayjs locale must be set as well:

### 9.1 Vue Vben Version

Already handled automatically in `locales/index.ts`:

```typescript
async function loadDayjsLocale(lang) {
  switch (lang) {
    case 'en-US': locale = await import('dayjs/locale/en'); break;
    case 'zh-CN': locale = await import('dayjs/locale/zh-cn'); break;
  }
  if (locale) dayjs.locale(locale);
}
```

### 9.2 Vue Element Version / React Version

Load it manually when switching languages:

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

## 10. Practical Scenarios

### 10.1 Enterprise Branding (Applies to All Three)

**Requirement**: customize the system to an enterprise brand style (blue theme + enterprise logo).

**Vue Vben version**:

```typescript
// preferences.ts
export const overridesPreferences = defineOverridesPreferences({
  theme: { colorPrimary: '#0056b3', borderRadius: 4 },
  logo: { image: '/enterprise-logo.png', title: '企业管理平台' },
});
```

**Vue Element version**:

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

**React version**:

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

### 10.2 Per-Tenant Theme Isolation (Applies to All Three)

Load the theme color dynamically according to the tenant ID:

```typescript
async function loadTenantTheme(tenantId, updatePreferences) {
  const themeConfig = await fetch(`/api/tenant/${tenantId}/theme`);
  updatePreferences({
    theme: { colorPrimary: themeConfig.primaryColor },
  });
}
```

### 10.3 Holiday Theme Switching

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

## 11. Performance Optimization

### 11.1 Theme Switching Optimization

Use CSS variables to avoid re-rendering components:

```css
:root { --color-primary: #1890ff; }
.ant-btn-primary { background: var(--color-primary); }
```

When switching, only the CSS variable values are updated — no need to rebuild the component tree.

### 11.2 Lazy-Loading Language Packs

**Vue Vben / Vue Element versions**: on-demand loading via `import.meta.glob`:

```typescript
const modules = import.meta.glob('./langs/**/*.json');
// 只有切换到对应语言时才加载该语言包
```

**React version**: all language packs are preloaded (suitable when there are few languages):

```typescript
resources: {
  'zh-CN': zhCN,  // 预加载
  'en-US': enUS,  // 预加载
}
```

### 11.3 Preference Persistence

All three frontends save preferences to localStorage:

```typescript
// 保存
localStorage.setItem('preferences', JSON.stringify(preferences));

// 恢复
const cached = localStorage.getItem('preferences');
if (cached) preferences = JSON.parse(cached);
```

---

## 12. Common Issues

### Q1: Styles do not take effect after switching themes?

Check:
1. Whether the CSS variables are defined correctly (browser DevTools → Computed → search the variable name)
2. Whether a higher-priority style overrides it
3. Clear the browser cache and retry

### Q2: Custom colors do not take effect in the Vue Element version?

Make sure `builtinType` is set to `"custom"`; otherwise the built-in theme preset overrides the custom color:

```typescript
updatePreferences({
  theme: { builtinType: "custom", colorPrimary: "#ff0000" },
});
```

### Q3: Dark mode does not take effect in the React version?

Make sure the `theme` prop of `ConfigProvider` uses the return value of `useThemeConfig()`, and that `algorithm` includes `darkAlgorithm`.

### Q4: Some text is untranslated after switching languages?

Check whether the translation files contain the corresponding key. In the development environment, all versions print a warning to the console for missing keys.

### Q5: How do I adapt the theme for mobile?

Use responsive breakpoints:

```css
@media (max-width: 768px) {
  :root {
    --el-border-radius-base: 4px;
    --sidebar-width: 200px;
  }
}
```

---

## 13. Related Documentation

- [Frontend Architecture Overview](/en/admin/frontend-architecture.md)
- [Frontend Core Features in Detail](/en/admin/frontend-modules.md)
- [Backend Configuration and Deployment](/en/admin/backend-config-deploy.md)
