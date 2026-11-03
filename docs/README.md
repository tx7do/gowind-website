---
home: true
heroImage: /logo.png
heroText: GoWind
tagline: AI 时代的企业级全栈研发引擎 —— 用更轻量、更符合 AI 生成的 Go 现代架构，重构你的核心业务。
actions:
  - text: 快速开始 →
    link: /guide/getting-started.md
    type: primary
  - text: 框架文档
    link: /framework/intro.md
    type: secondary
  - text: 在线体验
    link: https://react.admin.gowind.cloud
    type: secondary
features:
  - title: 为 AI 生成而生
    details: 核心不到 500 行、零注解魔法、零样板代码：AI 生成的即是最终运行的代码，业务模块一次生成、即写即用
  - title: 轻量而现代的架构
    details: 无 JVM、无样板代码。纯 Go 静态编译为单个二进制文件，启动快、内存占用低，部署只需一次拷贝，把资源还给业务本身
  - title: 积木式微服务框架
    details: go-wind + plugins + bootstrap 三层积木，157 个独立模块、130+ 插件覆盖 20+ 领域，一份 YAML 声明即可装配生产级微服务，零代码启动
  - title: 全栈产品矩阵
    details: 后台管理、内容、通信、分析、物联、电商、教育、短剧、运维、办公、ERP、WMS、看板、记账——一套技术栈覆盖企业数字化全场景
  - title: 企业级 · 信创友好
    details: 多租户隔离、细粒度权限、安全审计内建；全栈无国外运行时依赖，原生适配鲲鹏/龙芯与麒麟/统信 UOS，满足政企自主可控要求
  - title: 开源自由 · 商业友好
    details: OA/ERP/WMS/Kanban/Ledger/ShortPlay/Ops/Admin/CMS/UBA/Shop 等开源仓库自由使用；IM/IoT/Edu 提供闭源商用版，覆盖企业级付费需求
footer: MIT Licensed | Copyright © 2026-present GoWind Team
---

## 为什么是 GoWind？

**AI 能写代码，但不该把算力浪费在样板代码上。**

传统企业级框架为大规模团队与复杂生态而设计，换来了成熟的生态，也带来了厚重的抽象与大量的样板代码。AI 在这样的底座上生成代码，意味着更长的上下文、更多的调试成本——你请来了一位 AI 架构师，却让它把一半的时间花在与框架搏斗上。

GoWind 给出的答案，是一条更符合 AI 时代的路：

- **语法即逻辑**：Go 语法精简、显式依赖、风格统一，AI 生成什么，运行的便是什么，没有隐藏的动态代理与字节码增强
- **架构即配置**：核心不到 500 行，130+ 插件按需组合，一份 YAML 声明完成服务装配——AI 只需描述业务，架构交给 GoWind
- **全栈即一套**：后台管理、内容管理、即时通讯、行为分析、物联网共用一套 Go 技术栈，AI 学一次，处处生成

## 一套技术栈，重构你的业务

| 产品 | 定位 | 核心能力 |
| --- | --- | --- |
| [GoWind 框架](/framework/intro.md) | 微服务底座 | go-wind + plugins + bootstrap + flow 积木式架构，YAML 声明式装配，零代码启动 |
| [RushWind（Rust 生态）](/rushwind/intro.md) | Rust 实现 | 同一理念的 Rust 复刻：积木核心、CLI 工具链、企业后台与 Headless CMS，100% safe code，QUIC/WebTransport |
| [GoWind Admin](/admin/intro.md) | 后台管理 | 多租户隔离、细粒度权限、数据可视化、API 管理，开箱即用 |
| [GoWind CMS](/cms/intro.md) | 内容管理 | 富文本编辑、发布审核流程、多端适配，覆盖政企/企业内容运营全场景 |
| [GoWind IM](/im/intro.md) | 即时通讯 | 私聊/群聊、消息推送、在线状态检测；商用版含安全审计、离线消息等高阶能力 |
| [GoWind UBA](/uba/intro.md) | 行为分析 | 全埋点采集、25+ 分析模型、用户画像与增长闭环，ClickHouse/Doris 双引擎 |
| [GoWind IoT](/iot/intro.md) | 物联网 | MQTT/OPC-UA/Modbus 设备接入、视频监控、规则引擎、51 组件数据大屏 |
| [GoWind Shop](/shop/intro.md) | 电商 | 出海多语言多币种商城、秒杀拼团促销引擎、AI 导购、微信/支付宝支付 |
| [GoWind Edu](/edu/intro.md) | AI 教育（闭源） | AI 题库、在线做题、错题本、SM-2 自适应复习、AI 家教，学习闭环全覆盖 |
| [GoWind ShortPlay](/shortplay/intro.md) | 短剧社区 | 沉浸式上下滑 Feed、弹幕私信、审核闭环、创作者数据，开源 MVP 开箱即用 |
| [GoWind Ops](/ops/intro.md) | 运维平台 | 多节点管控、Web 终端、脚本批量执行、构建分发、监控告警与云成本管理 |
| [GoWind Quant](/quant/intro.md) | 量化研究 | 行情数据、智能选股、策略回测、模拟交易与 AI 助手，全流程研究工作台 |
| [风行 OA](/oa/intro.md) | 协同办公 | 工作流审批、考勤打卡、请假报销，管理后台 + Flutter 移动端 |
| [GoWind ERP](/erp/intro.md) | 企业资源计划 | 采购、库存、财务闭环，单据驱动单据，免实施半天上手 |
| [GoWind WMS](/wms/intro.md) | 仓储管理 | 多货主隔离、ASN 入库、波次出库、FEFO 批次效期，Flutter PDA 扫码 |
| [风行 Kanban](/kanban/intro.md) | 协作看板 | 实时多端同步、离线优先，Flutter 一套代码六端编译 |
| [风行 Ledger](/ledger/intro.md) | 家庭记账 | 收支流水、多币种、预算预警、家庭成员共享 |

## 适用场景

- **转型中的企业**：以 AI 辅助研发 + GoWind 底座，把存量 Java/Spring 系统逐步重构为轻量现代架构
- **政企/国企**：信创合规的后台管理、内容发布、内部通信系统
- **中小企业**：快速搭建官网、商城、客户管理、数据分析平台
- **开发者**：基于 Go 快速构建企业级应用，无需从零搭建基础框架

## 产品体验与支持

- 生态主页：<https://www.gowind.cloud>
- GitHub 组织：<https://github.com/tx7do>
- 问题反馈（Issues）：<https://github.com/tx7do/go-wind-admin/issues>

**Admin（已开放体验）**

- 三端演示：<https://react.admin.gowind.cloud> ｜ <https://ele.admin.gowind.cloud> ｜ <https://vben.admin.gowind.cloud>
- API 文档（Swagger）：<https://api.demo.admin.gowind.cloud/docs/>
- 演示账号：`admin` / `Abcd@1234`

**CMS（已开放体验）**

- 管理后端前端演示：<https://admin.cms.gowind.cloud>
- 管理后端 API 文档（Swagger）：<https://api.admin.cms.gowind.cloud/docs/>
- 管理后端演示账号：`admin` / `admin`

**Shop（已开放体验）**

- 店铺前台：<https://shop.gowind.cloud>
- 管理后台：<https://admin.shop.gowind.cloud>

**商务与技术联系**

- 微信：`yang_lin_bo`（添加请备注：公司-姓名-需求）
- 邮箱：<yanglinbo@gmail.com>
