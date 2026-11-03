import {defaultTheme} from '@vuepress/theme-default'
import {defineUserConfig} from 'vuepress'
import {viteBundler} from '@vuepress/bundler-vite'

import {markdownMathPlugin} from '@vuepress/plugin-markdown-math'
import {googleAnalyticsPlugin} from '@vuepress/plugin-google-analytics'
import {searchPlugin} from "@vuepress/plugin-search";
import {componentsPlugin} from "vuepress-plugin-components";
import {searchConsolePlugin} from "vuepress-plugin-china-search-console";
import {markdownChartPlugin} from "@vuepress/plugin-markdown-chart";

import sidebarZh from './sidebar-zh.js'
import sidebarEn from './sidebar-en.js'

// 中文导航栏
const navbarZh = [
    {text: '首页', link: '/'},
    {text: '框架', link: '/framework/intro.md'},
    {text: 'GoWind Toolkit', link: '/toolkit/intro.md'},
    {
        text: '产品矩阵',
        children: [
            {text: 'GoWind Admin（后台管理）', link: '/admin/intro.md'},
            {text: 'GoWind CMS（内容管理）', link: '/cms/intro.md'},
            {text: 'GoWind IM（即时通讯）', link: '/im/intro.md'},
            {text: 'GoWind UBA（行为分析）', link: '/uba/intro.md'},
            {text: 'GoWind IoT（物联网）', link: '/iot/intro.md'},
            {text: 'GoWind Shop（电商）', link: '/shop/intro.md'},
            {text: 'GoWind Edu（AI 教育）', link: '/edu/intro.md'},
            {text: 'GoWind OA（协同办公）', link: '/oa/intro.md'},
            {text: 'GoWind ERP（采购库存财务）', link: '/erp/intro.md'},
            {text: 'GoWind WMS（仓储管理）', link: '/wms/intro.md'},
            {text: 'GoWind Kanban（协作看板）', link: '/kanban/intro.md'},
            {text: 'GoWind Ledger（家庭记账）', link: '/ledger/intro.md'},
            {text: 'GoWind ShortPlay（短剧社区）', link: '/shortplay/intro.md'},
            {text: 'GoWind Ops（运维平台）', link: '/ops/intro.md'},
            {text: 'GoWind Quant（量化研究）', link: '/quant/intro.md'},
            {text: 'RushWind（Rust 生态）', link: '/rushwind/intro.md'},
        ],
    },
]

// 英文导航栏
const navbarEn = [
    {text: 'Home', link: '/en/'},
    {text: 'Framework', link: '/en/framework/intro.md'},
    {text: 'GoWind Toolkit', link: '/en/toolkit/intro.md'},
    {
        text: 'Products',
        children: [
            {text: 'GoWind Admin (Admin Platform)', link: '/en/admin/intro.md'},
            {text: 'GoWind CMS (Content Management)', link: '/en/cms/intro.md'},
            {text: 'GoWind IM (Instant Messaging)', link: '/en/im/intro.md'},
            {text: 'GoWind UBA (Behavior Analytics)', link: '/en/uba/intro.md'},
            {text: 'GoWind IoT (IoT Platform)', link: '/en/iot/intro.md'},
            {text: 'GoWind Shop (E-commerce)', link: '/en/shop/intro.md'},
            {text: 'GoWind Edu (AI Education)', link: '/en/edu/intro.md'},
            {text: 'GoWind OA (Office Collaboration)', link: '/en/oa/intro.md'},
            {text: 'GoWind ERP (Procure-to-Pay)', link: '/en/erp/intro.md'},
            {text: 'GoWind WMS (Warehousing)', link: '/en/wms/intro.md'},
            {text: 'GoWind Kanban (Kanban Boards)', link: '/en/kanban/intro.md'},
            {text: 'GoWind Ledger (Personal Finance)', link: '/en/ledger/intro.md'},
            {text: 'GoWind ShortPlay (Short Drama)', link: '/en/shortplay/intro.md'},
            {text: 'GoWind Ops (Operations Platform)', link: '/en/ops/intro.md'},
            {text: 'GoWind Quant (Quant Research)', link: '/en/quant/intro.md'},
            {text: 'RushWind (Rust Ecosystem)', link: '/en/rushwind/intro.md'},
        ],
    },
]

export default defineUserConfig({
    locales: {
        '/': {
            lang: 'zh-CN',
            title: 'GoWind 开源生态',
            description: 'GoWind：AI 时代的企业级全栈研发引擎 —— 用更轻量、更符合 AI 生成的 Go 现代架构，重构你的核心业务',
        },
        '/en/': {
            lang: 'en-US',
            title: 'GoWind Open Ecosystem',
            description: 'GoWind: the enterprise full-stack R&D engine for the AI era — rebuild your core business with a lighter, modern Go architecture that AI generates naturally',
        },
    },

    theme: defaultTheme({
        logo: '/logo.png',

        locales: {
            '/': {
                selectLanguageName: '简体中文',
                navbar: navbarZh,
                sidebar: sidebarZh,
            },
            '/en/': {
                selectLanguageName: 'English',
                navbar: navbarEn,
                sidebar: sidebarEn,
            },
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
                    placeholder: '搜索',
                },
                '/en/': {
                    placeholder: 'Search',
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
