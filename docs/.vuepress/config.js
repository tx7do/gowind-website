import {defaultTheme} from '@vuepress/theme-default'
import {defineUserConfig} from 'vuepress'
import {viteBundler} from '@vuepress/bundler-vite'

import {markdownMathPlugin} from '@vuepress/plugin-markdown-math'
import {googleAnalyticsPlugin} from '@vuepress/plugin-google-analytics'
import {searchPlugin} from "@vuepress/plugin-search";
import {componentsPlugin} from "vuepress-plugin-components";
import {searchConsolePlugin} from "vuepress-plugin-china-search-console";
import {markdownChartPlugin} from "@vuepress/plugin-markdown-chart";


export default defineUserConfig({
    lang: 'en-US',

    title: 'GoWind 开源生态',
    description: '一站式 GoWind 系列开源项目文档与使用指南',

    theme: defaultTheme({
        logo: '/logo.png',

        // 导航栏链接
        navbar: [
            {text: '首页', link: '/'},
            {text: '框架', link: '/framework/intro.md'},
            {text: 'GoWind Admin', link: '/admin/intro.md'},
            {text: 'GoWind CMS', link: '/cms/intro.md'},
            {text: 'GoWind IM', link: '/im/intro.md'},
            {text: 'GoWind UBA', link: '/uba/intro.md'},
            {text: 'GoWind IoT', link: '/iot/intro.md'},
            {text: 'GoWind Toolkit', link: '/toolkit/intro.md'},
            {text: 'GoWind Quant', link: '/quant/intro.md'},
        ],

        // 侧边栏配置（分项目独立侧边栏）
        sidebar: {
            // 通用指南侧边栏
            '/guide/': [
                {
                    text: '通用指南',
                    children: [
                        '/guide/getting-started.md',
                        '/guide/contribution.md',
                        '/guide/faq.md',
                    ],
                },
            ],
            // 框架层侧边栏
            '/framework/': [
                {
                    text: '介绍',
                    children: [
                        '/framework/intro.md',
                        '/framework/architecture.md',
                    ],
                },
                {
                    text: 'go-wind 核心',
                    children: [
                        '/framework/core-intro.md',
                        '/framework/core-lifecycle.md',
                        '/framework/core-context.md',
                        '/framework/core-transport.md',
                        '/framework/core-logging.md',
                    ],
                },
                {
                    text: 'go-wind-plugins 插件',
                    children: [
                        '/framework/plugins-intro.md',
                        '/framework/plugins-config.md',
                        '/framework/plugins-registry.md',
                        '/framework/plugins-log.md',
                        '/framework/plugins-transport.md',
                        '/framework/plugins-broker.md',
                        '/framework/plugins-encoding.md',
                        '/framework/plugins-security.md',
                        '/framework/plugins-tracer.md',
                        '/framework/plugins-cache.md',
                        '/framework/plugins-oss.md',
                        '/framework/plugins-ratelimit.md',
                        '/framework/plugins-metrics.md',
                        '/framework/plugins-ai.md',
                        '/framework/plugins-workflow.md',
                        '/framework/plugins-database.md',
                        '/framework/plugins-gateway.md',
                        '/framework/plugins-compress.md',
                        '/framework/plugins-template.md',
                    ],
                },
                {
                    text: 'go-wind-bootstrap 启动器',
                    children: [
                        '/framework/bootstrap-intro.md',
                        '/framework/bootstrap-config.md',
                        '/framework/bootstrap-spi.md',
                        '/framework/bootstrap-middleware.md',
                        '/framework/bootstrap-cli.md',
                        '/framework/bootstrap-examples.md',
                    ],
                },
                {
                    text: '教程',
                    children: [
                        '/framework/tutorial-quick-start.md',
                        '/framework/tutorial-custom-plugin.md',
                        '/framework/tutorial-multi-transport.md',
                        '/framework/tutorial-migration.md',
                    ],
                },
            ],
            // GoWind Admin 侧边栏
            '/admin/': [
                {
                    text: '介绍',
                    children: [
                        '/admin/intro.md',
                        '/admin/installation.md',
                    ],
                },
                {
                    text: '后端文档',
                    children: [
                        '/admin/backend-architecture.md',
                        '/admin/backend-modules.md',
                        '/admin/backend-api.md',
                        '/admin/backend-config-deploy.md',
                        '/admin/backend-extension.md',
                    ],
                },
                {
                    text: '前端文档',
                    children: [
                        '/admin/frontend-architecture.md',
                        '/admin/frontend-modules.md',
                    ],
                },
                {
                    text: '二开教程',
                    children: [
                        '/admin/backend-tutorial-new-module.md',
                        '/admin/frontend-tutorial-new-page.md',
                        '/admin/tutorial-fullstack-integration.md',
                    ],
                },
                {
                    text: '高级教程',
                    children: [
                        '/admin/tutorial-lua-extension.md',
                        '/admin/tutorial-permission-system.md',
                        '/admin/tutorial-multi-tenancy.md',
                        '/admin/tutorial-task-scheduling.md',
                        '/admin/tutorial-file-storage.md',
                        '/admin/tutorial-eventbus-architecture.md',
                        '/admin/tutorial-theme-i18n.md',
                        '/admin/tutorial-performance-monitoring.md',
                        '/admin/tutorial-sse-push.md',
                        '/admin/tutorial-login-security.md',
                        '/admin/tutorial-crypto-toolkit.md',
                    ],
                },
            ],
            // GoWind CMS 侧边栏
            '/cms/': [
                {
                    text: '介绍',
                    children: [
                        '/cms/intro.md',
                        '/cms/installation.md',
                    ],
                },
                {
                    text: '后端文档',
                    children: [
                        '/cms/backend-architecture.md',
                        '/cms/backend-modules.md',
                        '/cms/backend-api.md',
                        '/cms/backend-config-deploy.md',
                        '/cms/backend-extension.md',
                    ],
                },
                {
                    text: '前端文档',
                    children: [
                        '/cms/frontend-architecture.md',
                        '/cms/frontend-modules.md',
                    ],
                },
                {
                    text: '入门教程',
                    children: [
                        '/cms/tutorial-new-content.md',
                        '/cms/tutorial-codegen.md',
                    ],
                },
                {
                    text: '核心教程',
                    children: [
                        '/cms/tutorial-content-i18n.md',
                        '/cms/tutorial-content-workflow.md',
                        '/cms/tutorial-section-editor.md',
                        '/cms/tutorial-headless-api.md',
                        '/cms/tutorial-frontend-app.md',
                    ],
                },
                {
                    text: '进阶教程',
                    children: [
                        '/cms/tutorial-multi-site.md',
                        '/cms/tutorial-media-asset.md',
                        '/cms/tutorial-comment-system.md',
                        '/cms/tutorial-eventbus-architecture.md',
                        '/cms/tutorial-lua-extension.md',
                    ],
                },
                {
                    text: '高阶教程',
                    children: [
                        '/cms/tutorial-permission-system.md',
                        '/cms/tutorial-login-security.md',
                        '/cms/tutorial-crypto-toolkit.md',
                        '/cms/tutorial-search.md',
                        '/cms/tutorial-task-scheduling.md',
                        '/cms/tutorial-sse-push.md',
                        '/cms/tutorial-performance-monitoring.md',
                        '/cms/tutorial-dict-system.md',
                    ],
                },
                {
                    text: '综合教程',
                    children: [
                        '/cms/tutorial-fullstack-integration.md',
                        '/cms/tutorial-deploy.md',
                    ],
                },
            ],
            // GoWind IM 侧边栏
            '/im/': [
                {
                    text: 'GoWind IM',
                    children: [
                        '/im/intro.md',
                        '/im/installation.md',
                    ],
                },
            ],
            // GoWind UBA 侧边栏（按角色分栏）
            '/uba/': [
                {
                    text: '介绍',
                    children: [
                        '/uba/intro.md',
                    ],
                },
                {
                    text: '架构参考',
                    children: [
                        '/uba/architecture.md',
                        '/uba/backend-modules.md',
                        '/uba/backend-api.md',
                        '/uba/frontend-architecture.md',
                    ],
                },
                {
                    text: '开发者指南（二开）',
                    children: [
                        '/uba/installation.md',
                        '/uba/tutorial-codegen.md',
                        '/uba/tutorial-new-service.md',
                        '/uba/tutorial-new-entity.md',
                        '/uba/tutorial-new-page.md',
                    ],
                },
                {
                    text: '运维指南',
                    children: [
                        '/uba/deploy-docker.md',
                        '/uba/deploy-config.md',
                        '/uba/deploy-pm2.md',
                        '/uba/deploy-superset.md',
                    ],
                },
                {
                    text: '数据分析师指南',
                    children: [
                        '/uba/analyst-getting-started.md',
                        {
                            text: '基础聚合',
                            children: [
                                '/uba/analyst-event-trend.md',
                                '/uba/analyst-active-users.md',
                                '/uba/analyst-group-by.md',
                            ],
                        },
                        {
                            text: '转化与路径',
                            children: [
                                '/uba/analyst-funnel.md',
                                '/uba/analyst-retention.md',
                                '/uba/analyst-path-sankey.md',
                                '/uba/analyst-behavior-sequence.md',
                            ],
                        },
                        {
                            text: '用户深度',
                            children: [
                                '/uba/analyst-attribution.md',
                                '/uba/analyst-distribution.md',
                                '/uba/analyst-segmentation.md',
                                '/uba/analyst-click.md',
                                '/uba/analyst-interval.md',
                            ],
                        },
                        {
                            text: '生命周期',
                            children: [
                                '/uba/analyst-lifecycle.md',
                                '/uba/analyst-churn.md',
                                '/uba/analyst-new-vs-old.md',
                                '/uba/analyst-matrix.md',
                            ],
                        },
                        {
                            text: '营收与价值',
                            children: [
                                '/uba/analyst-revenue.md',
                                '/uba/analyst-whale-tier.md',
                                '/uba/analyst-ltv.md',
                            ],
                        },
                        {
                            text: '会话与异常',
                            children: [
                                '/uba/analyst-session-analysis.md',
                                '/uba/analyst-anomaly.md',
                            ],
                        },
                        {
                            text: '游戏专属',
                            children: [
                                '/uba/analyst-level-analysis.md',
                                '/uba/analyst-server-retention.md',
                                '/uba/analyst-online-stats.md',
                                '/uba/analyst-economy.md',
                            ],
                        },
                        '/uba/analyst-olap-cookbook.md',
                    ],
                },
                {
                    text: 'SDK 接入',
                    children: [
                        '/uba/sdk-web.md',
                        '/uba/sdk-csharp.md',
                    ],
                },
                {
                    text: '附录',
                    children: [
                        '/uba/appendix.md',
                    ],
                },
            ],
            // GoWind Toolkit 侧边栏
            '/toolkit/': [
                {
                    text: 'GoWind Toolkit',
                    children: [
                        '/toolkit/intro.md',
                    ],
                },
                {
                    text: '代码生成',
                    children: [
                        '/toolkit/backend-code-generation.md',
                        '/toolkit/frontend-code-generation.md',
                    ],
                },
            ],
            // GoWind IoT 侧边栏
            '/iot/': [
                {
                    text: 'GoWind IoT',
                    children: [
                        '/iot/intro.md',
                        '/iot/installation.md',
                    ],
                },
            ],
            // GoWind Quant 侧边栏（研究项目 · 非卖品）
            '/quant/': [
                {
                    text: 'GoWind Quant（非卖品）',
                    children: [
                        '/quant/intro.md',
                        '/quant/strategies.md',
                        '/quant/architecture.md',
                    ],
                },
            ],
        },

        // 仓库地址（右上角 GitHub 图标链接）
        repo: 'https://github.com/tx7do',
        repoLabel: 'GitHub',

        // 页面底部信息
        footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © 2026-present GoWind Team',
        },
    }),

    // 插件配置（可选，增强功能）
    plugins: [
        // copyCodePlugin({
        //     // options
        // }),
        searchPlugin({
            locales: {
                '/': {
                    placeholder: 'Search',
                },
                '/zh/': {
                    placeholder: '搜索',
                },
            },
        }),
        // markdownMathPlugin({
        //     // 选项
        // }),
        googleAnalyticsPlugin({
            id: 'G-133XLX9P1R',
        }),
        // componentsPlugin({
        //     // 插件选项
        // }),
        // searchConsolePlugin({
        //     // options ...
        // }),
        markdownChartPlugin({
            mermaid: true,
        }),
    ],

    bundler: viteBundler(),
})
