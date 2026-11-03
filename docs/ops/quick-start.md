# GoWind Ops 快速开始

本指南带你在本地跑起 GoWind Ops：理解三个架构角色、启动依赖与平台服务、接入第一台节点，然后依次完成"管项目 → 跑脚本 → 构建分发"三个最常用的运维动作。

## 一、架构角色

| 角色 | 形态 | 职责 |
|------|------|------|
| Core | 服务端（内部 gRPC） | 核心业务逻辑与数据层，指令信封 HMAC-SHA256 签名 |
| Admin BFF / Front BFF | 服务端（:18600 / :18700） | HTTP API 网关，对接管理前端 |
| Agent | 边缘代理（无 UI） | 部署在被管节点，纯出站 MQTT 连接 EMQX，执行指令并回传回执 |

> 平台与 Agent 之间只经 EMQX（MQTT TLS 8883）传递信令。Agent 无需在被管节点上开任何入站端口。

## 二、环境准备

GoWind Ops 提供仅含依赖服务的 `docker-compose.libs.yaml`，包含：

- PostgreSQL（或 MySQL）
- Redis
- EMQX（MQTT Broker）
- MinIO（对象存储）
- etcd
- Jaeger（链路追踪）

```bash
git clone https://github.com/tx7do/go-wind-ops.git
cd go-wind-ops
```

## 三、启动平台

两种方式任选其一：

**方式 A：仅依赖容器化，应用本地跑（推荐开发调试）**

```bash
# 1. 启动依赖服务
docker compose -f docker-compose.libs.yaml up -d

# 2. 本地运行 core / admin BFF / front BFF（Go 1.26+）
#    依次启动各应用服务，或在 IDE 中调试运行
```

**方式 B：全栈 Compose**

```bash
docker compose up -d
```

启动后使用默认账号 `admin / admin` 登录管理前端。

::: tip
开发环境可跳过验证码登录。生产环境务必开启验证码并配置 MFA。
:::

## 四、接入第一台节点

1. 在管理前端「节点管理」中完成一台新机器的 TOFU 准入（首次接入按机器指纹信任）
2. 在目标机器上安装 Agent（边缘代理，无 UI）
3. Agent 以纯出站 MQTT 连接 EMQX（TLS 8883），上线后即出现在节点列表
4. 在节点详情中确认：在线状态正常，CPU / 内存 / 磁盘趋势开始按 30s 心跳上报

> Agent 支持远程升级：平台下发升级指令后自替换并接力重启，无需登录节点操作。

## 五、管一个项目

项目 = 节点 + 目录 + 启停命令：

1. 进入「项目管理」，新建项目，绑定刚接入的节点
2. 填写应用所在目录与启动 / 停止命令
3. 通过项目启停按钮操作应用，全过程记入变更时间线
4. 为项目开启「项目存活」监控，进程异常退出自动告警，恢复后自动标记 RECOVERY

## 六、跑一个脚本

1. 进入「脚本管理」，新建脚本（版本化管理，支持超时自动杀进程树）
2. 选择多台节点，以批量命令矩阵方式下发执行
3. 在运行页通过 WebSocket 实时 tail 输出
4. 执行结束后在「指令台账」中核对回执、退出码、时长与 request_id（全量审计、幂等防重）

## 七、构建分发一次

完整的 BUILD-SCRIPT-DISTRIBUTION 三段流水线：

1. **BUILD**：绑定 Git 源仓库（AES 加密存储），触发构建；构建日志实时 tail，产物自动入对象存储（支持保留策略）
2. **SCRIPT**：按需编排脚本步骤（如停服、备份、迁移）
3. **DISTRIBUTION**：产物 zip 分发到目标节点——防 slip 攻击、支持分批灰度、DOCKER 镜像 tag 注入

也可以在「发布台」中配置环境晋升流水线：同一产物按阶段逐环境晋升（如测试 → 预发 → 生产），分批推进。

::: tip
构建与分发流水线均可通过 OpenAPI（API Key 鉴权）或 Git Webhook（GitHub / GitLab / Gitea）触发，可无缝嵌入现有 CI。
:::

## 八、安全建议

生产部署前，请完成以下安全配置：

**1. 密钥环境变量**

平台依赖一组密钥环境变量，生产环境**缺密钥将拒绝启动**：

| 环境变量 | 用途 |
|----------|------|
| `CORE_RPC_SECRET` | 服务间 RPC 鉴权 |
| `MQTT_AUTH_WEBHOOK_SECRET` | EMQX broker 认证回调鉴权 |
| `COMMAND_SIGN_KEY` | 指令信封 HMAC-SHA256 签名密钥 |

> 以上为清单中的代表项，请按仓库部署文档逐项核对全部密钥。

**2. TLS**

- EMQX 使用 TLS 8883 端口，为信令通道加密
- 管理前端与 BFF 之间建议经反向代理统一启用 HTTPS

**3. 账号安全**

- 立即修改默认账号 `admin / admin`
- 开启 MFA（TOTP + 备份码），按需接入 OIDC SSO
- 开启操作审批与维护窗口，敏感操作先建单
- 六类审计日志基于哈希链 + ECDSA 签名，定期用核验工具校验完整性

更多平台能力说明，请返回 [GoWind Ops 产品介绍](./intro.md)。
