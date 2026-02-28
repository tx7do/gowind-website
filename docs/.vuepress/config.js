import {defaultTheme} from '@vuepress/theme-default'
import {defineUserConfig} from 'vuepress'
import {viteBundler} from '@vuepress/bundler-vite'

import {markdownMathPlugin} from '@vuepress/plugin-markdown-math'
import {googleAnalyticsPlugin} from '@vuepress/plugin-google-analytics'
import {searchPlugin} from "@vuepress/plugin-search";
import {componentsPlugin} from "vuepress-plugin-components";
import {searchConsolePlugin} from "vuepress-plugin-china-search-console";


export default defineUserConfig({
    lang: 'en-US',

    title: 'GoWind 开源生态',
    description: '一站式 GoWind 系列开源项目文档与使用指南',

    theme: defaultTheme({
        logo: '/logo.png',

        // 导航栏链接
        navbar: [
            {text: '首页', link: '/'},
            {text: 'GoWind Admin', link: '/admin/intro.md'},
            {text: 'GoWind CMS', link: '/cms/intro.md'},
            {text: 'GoWind IM', link: '/im/intro.md'},
            {text: 'GoWind UBA', link: '/uba/intro.md'},
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
            // GoWind Admin 侧边栏
            '/admin/': [
                {
                    text: 'GoWind Admin',
                    children: [
                        '/admin/intro.md',
                        '/admin/installation.md',
                    ],
                },
            ],
            // GoWind CMS 侧边栏
            '/cms/': [
                {
                    text: 'GoWind CMS',
                    children: [
                        '/cms/intro.md',
                        '/cms/installation.md',
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
            // GoWind UBA 侧边栏
            '/uba/': [
                {
                    text: 'GoWind UBA',
                    children: [
                        '/uba/intro.md',
                        '/uba/installation.md',
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
        markdownMathPlugin({
            // 选项
        }),
        googleAnalyticsPlugin({
            id: 'G-133XLX9P1R',
        }),
        componentsPlugin({
            // 插件选项
        }),
        searchConsolePlugin({
            // options ...
        }),
    ],

    bundler: viteBundler(),
})
