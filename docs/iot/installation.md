# GoWind IoT 安装部署指南

本指南面向 GoWind IoT 的交付工程师与运维人员，覆盖从环境准备、单机部署、集群部署到信创适配的完整流程。

> GoWind IoT 为闭源商业产品，部署前请确认已通过商务渠道获取有效的商业授权与部署包。如未获取，请联系微信 `yang_lin_bo` 或邮箱 `yanglinbo@gmail.com`。

## 一、部署前评估

### 1. 资源规划问卷

在启动部署前，请先与客户确认以下问题，以便合理规划硬件资源：

| 评估项 | 说明 | 影响 |
|---|---|---|
| 设备规模 | 接入设备的总数量、峰值并发数 | 决定接入网关节点数 |
| 消息频率 | 单设备平均上报频率、峰值频率 | 决定计算与存储资源 |
| 数据保留周期 | 时序数据的保留时长（3 个月 / 1 年 / 永久） | 决定时序数据库存储容量 |
| 协议类型 | 涉及哪些设备协议（MQTT / Modbus / OPC UA 等） | 决定协议网关配置 |
| 高可用要求 | 是否需要多副本、故障切换 | 决定集群拓扑 |
| 部署环境 | 公有云 / 私有云 / 物理机 / 国产化环境 | 决定基础镜像与适配方案 |

### 2. 容量规划参考

| 设备规模 | 接入节点 | 计算节点 | 时序库节点 | 总资源建议 |
|---|---|---|---|---|
| 1 万设备 | 1 | 1 | 1（单机） | 8C 16G × 1 |
| 10 万设备 | 2 | 2 | 3（集群） | 16C 32G × 7 |
| 100 万设备 | 4 | 4 | 5+（集群） | 32C 64G × 13+ |

> 以上为参考值，实际配置需要结合消息频率与数据保留周期综合评估。

## 二、环境准备

### 1. 系统要求

**操作系统**

- CentOS 7.6+ / RHEL 8+ / Ubuntu 20.04+ / Debian 10+
- 麒麟 V10 / 统信 UOS / openEuler（信创环境）
- 支持 x86_64 与 ARM64（鲲鹏 920 / 飞腾 / 国产 ARM CPU）

**基础软件**

| 组件 | 版本要求 | 说明 |
|---|---|---|
| Docker | 20.10+ | 容器化运行环境 |
| Docker Compose | 2.0+ | 单机编排 |
| Kubernetes | 1.20+ | 集群编排（可选） |
| MySQL | 8.0+ | 关系数据存储 |
| PostgreSQL | 12+ | 关系数据存储（可选 MySQL） |
| Redis | 6.0+ | 缓存与会话 |
| 时序数据库 | 见下表 | 任选其一 |

**时序数据库支持矩阵**

| 时序数据库 | 推荐版本 | 适用场景 |
|---|---|---|
| TDengine | 3.x | 国产化首选，高写入吞吐 |
| InfluxDB | 2.x | 通用场景，生态完善 |
| TimescaleDB | 2.x | 复用 PostgreSQL 运维能力 |
| ClickHouse | 23.x | 海量数据分析，列式存储 |
| Apache IoTDB | 1.x | 工业物联网场景优化 |
| DolphinDB | 2.x | 金融/能源场景，内置分析能力 |

### 2. 网络规划

| 端口 | 协议 | 用途 |
|---|---|---|
| 443 | HTTPS | 管理控制台 |
| 1883 | MQTT | 设备接入（非加密） |
| 8883 | MQTTS | 设备接入（TLS） |
| 5683 | CoAP | 设备接入（UDP） |
| 502 | Modbus TCP | 工业设备接入 |
| 4840 | OPC UA | 工业设备接入 |
| 9092 | Kafka | 内部消息总线（可选） |
| 3306 / 5432 | MySQL / PG | 数据库 |
| 6379 | Redis | 缓存 |

> 生产环境建议通过负载均衡器（Nginx / HAProxy / F5）统一入口，并开启 TLS 加密。

## 三、单机部署（Docker Compose）

适用于 PoC 验证、小规模场景（1 万设备以内）。

### 1. 解压部署包

```bash
tar -xzf gowind-iot-<version>.tar.gz
cd gowind-iot
```

### 2. 配置环境变量

```bash
cp .env.example .env
vim .env
```

关键配置项：

```dotenv
# ===== 授权 =====
LICENSE_FILE=/data/license/gowind-iot.lic

# ===== 数据库 =====
DB_TYPE=mysql
DB_HOST=mysql
DB_PORT=3306
DB_USER=gowind
DB_PASSWORD=<your-password>
DB_NAME=gowind_iot

# ===== Redis =====
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<your-password>

# ===== 时序数据库 =====
TSDB_TYPE=tdengine           # tdengine / influxdb / timescaledb / clickhouse / iotdb
TSDB_HOST=tdengine
TSDB_PORT=6030
TSDB_USER=root
TSDB_PASSWORD=taosdata
TSDB_DATABASE=gowind_iot

# ===== MQTT 接入 =====
MQTT_PORT=1883
MQTT_TLS_PORT=8883

# ===== 告警通知（对接 GoWind IM / 钉钉 / 企微） =====
IM_NOTIFY_WEBHOOK=https://im.your-domain.com/api/webhook
DINGTALK_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=xxx
```

### 3. 启动服务

```bash
# 初始化数据库（首次部署）
docker-compose run --rm iot-init

# 启动全部服务
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f iot-gateway
docker-compose logs -f iot-rule-engine
```

### 4. 验证部署

```bash
# 健康检查
curl -k https://localhost/api/health
# 预期输出：{"status":"ok","version":"x.y.z"}

# 管理控制台
# 浏览器访问 https://localhost
# 默认账号：admin / admin（首次登录强制修改）
```

### 5. 快速验证设备接入

使用 MQTT 客户端（如 mosquitto_pub）模拟设备上报：

```bash
# 模拟设备上线 + 上报遥测数据
mosquitto_pub -h localhost -p 1883 \
  -u "device001" -P "<device-token>" \
  -t "/devices/device001/telemetry" \
  -m '{"temperature":25.6,"humidity":60.2}'

# 在管理控制台「设备管理 → 设备列表」中应能看到 device001 已上线
# 在「数据查询」中应能看到上报的温度与湿度数据
```

## 四、集群部署（Kubernetes）

适用于生产环境、大规模设备接入（10 万 + 设备）场景。

### 1. 前置条件

- 已有 K8s 集群（1.20+），kubectl 可正常访问
- 已部署 StorageClass，可提供持久化卷
- 已部署 Ingress Controller（Nginx Ingress 或 Traefik）
- 已部署或可对接 MySQL、Redis、时序数据库、Kafka/NATS

### 2. 准备命名空间与配置

```bash
kubectl create namespace gowind-iot

# 创建授权 Secret
kubectl create secret generic iot-license \
  --from-file=gowind-iot.lic=/path/to/license.lic \
  -n gowind-iot

# 创建数据库密码 Secret
kubectl create secret generic iot-secrets \
  --from-literal=DB_PASSWORD='<db-password>' \
  --from-literal=REDIS_PASSWORD='<redis-password>' \
  --from-literal=TSDB_PASSWORD='<tsdb-password>' \
  -n gowind-iot
```

### 3. 编写 values.yaml

```yaml
image:
  registry: registry.your-domain.com/gowind
  tag: "x.y.z"

ingress:
  enabled: true
  host: iot.your-domain.com
  tls: true

# 接入网关副本数（横向扩容核心）
gateway:
  replicas: 4
  resources:
    requests:
      cpu: 2
      memory: 4Gi
    limits:
      cpu: 4
      memory: 8Gi

# 规则引擎副本数
ruleEngine:
  replicas: 2
  resources:
    requests:
      cpu: 1
      memory: 2Gi

# 时序数据库（对接外部集群，不自建）
tsdb:
  external: true
  type: tdengine
  host: tdengine-cluster.gowind-iot.svc.cluster.local
  port: 6030

# MQTT 接入通过 LB 暴露
mqtt:
  type: LoadBalancer
  port: 1883
  tlsPort: 8883
```

### 4. 部署 Helm Chart

```bash
helm install gowind-iot ./charts/gowind-iot \
  -f values.yaml \
  -n gowind-iot

# 等待所有 Pod 就绪
kubectl get pods -n gowind-iot -w

# 查看 Ingress 入口
kubectl get ingress -n gowind-iot
```

### 5. 配置设备接入负载均衡

接入网关通过 `LoadBalancer` 类型 Service 暴露，云厂商 LB 会自动分配入口 IP。对于裸金属集群，建议使用 MetalLB 或外部硬件 LB。

```bash
kubectl get svc -n gowind-iot iot-gateway-mqtt
# 记下 EXTERNAL-IP，将设备的 MQTT Broker 地址指向此 IP
```

## 五、信创（国产化）部署

GoWind IoT 通过 Go 语言静态编译，天然适配国产化环境。

### 1. 国产 CPU 适配

| CPU 架构 | 支持情况 |
|---|---|
| 鲲鹏 920 (ARM64) | 完整支持，提供原生 ARM64 镜像 |
| 飞腾 2000+/2500 (ARM64) | 完整支持 |
| 龙芯 3A5000/3C5000 (LoongArch) | 完整支持，提供 LoongArch 镜像 |
| 海光 (x86_64) | 完整支持 |
| 兆芯 (x86_64) | 完整支持 |

### 2. 国产操作系统适配

| 操作系统 | 版本 |
|---|---|
| 麒麟 KylinOS | V10 SP1/SP2/SP3 |
| 统信 UOS | V20 / V25 |
| openEuler | 22.03 LTS+ |
| 中科方德 | NFSChina 4.0+ |

### 3. 信创部署注意事项

- **数据库适配**：信创场景推荐 TDengine + 达梦数据库 / 人大金仓的组合，满足自主可控要求
- **容器运行时**：部分国产 OS 默认提供 podman / buildah，可根据需要替换 Docker
- **镜像仓库**：建议使用 Harbor 或国产镜像仓库解决方案，避免对 Docker Hub 的依赖
- **时钟同步**：所有节点必须开启 NTP 时钟同步，避免设备数据时序错乱

## 六、配置详解

### 1. 时序数据库切换

GoWind IoT 通过 `TSDB_TYPE` 环境变量声明式切换时序数据库，业务层无需改动：

```dotenv
# TDengine
TSDB_TYPE=tdengine
TSDB_HOST=tdengine
TSDB_PORT=6030

# InfluxDB
TSDB_TYPE=influxdb
TSDB_HOST=influxdb
TSDB_PORT=8086
TSDB_TOKEN=<influxdb-token>
TSDB_ORG=gowind
TSDB_BUCKET=iot

# TimescaleDB
TSDB_TYPE=timescaledb
TSDB_HOST=timescaledb
TSDB_PORT=5432
TSDB_USER=gowind
TSDB_PASSWORD=<password>
TSDB_DATABASE=gowind_iot

# ClickHouse
TSDB_TYPE=clickhouse
TSDB_HOST=clickhouse
TSDB_PORT=8123
TSDB_USER=default
TSDB_PASSWORD=<password>
TSDB_DATABASE=gowind_iot
```

### 2. 自定义协议接入

对于私有 TCP/UDP 协议，通过在 `protocols/` 目录下放置协议描述文件即可接入：

```yaml
# protocols/my-protocol.yaml
name: my-private-protocol
transport: tcp
port: 9000

codec:
  type: lua           # 使用 Lua 编解码
  script: codecs/my_protocol.lua

deviceMapping:
  serialNumber:
    offset: 4
    length: 16
    encoding: ascii

upstream:
  telemetry:
    topic: /devices/{deviceId}/telemetry
    fields:
      temperature: int16 @ offset 20, scale 0.1
      pressure: uint16 @ offset 22, scale 0.01
```

### 3. 告警通知渠道配置

```yaml
# config/alert-channels.yaml
channels:
  - name: gowind-im
    type: webhook
    url: https://im.your-domain.com/api/webhook/iot-alert
    headers:
      Authorization: Bearer <token>

  - name: dingtalk
    type: dingtalk
    webhook: https://oapi.dingtalk.com/robot/send?access_token=xxx
    secret: SECxxx

  - name: email
    type: smtp
    host: smtp.your-domain.com
    port: 465
    from: iot-alert@your-domain.com
    password: <smtp-password>

rules:
  - when: severity in [critical, major]
    then: [gowind-im, dingtalk, email]
  - when: severity == minor
    then: [gowind-im]
```

## 七、运维与监控

### 1. 健康检查

```bash
# 平台整体健康
curl -k https://iot.your-domain.com/api/health

# 各组件状态
curl -k https://iot.your-domain.com/api/health/components
```

### 2. 指标暴露

GoWind IoT 暴露 Prometheus 格式的监控指标：

```
http://<host>:9090/metrics
```

核心指标：

| 指标 | 说明 |
|---|---|
| `iot_connected_devices` | 当前在线设备数 |
| `iot_messages_received_total` | 累计接收消息数 |
| `iot_messages_per_second` | 消息处理 QPS |
| `iot_rule_engine_triggered_total` | 规则引擎触发次数 |
| `iot_ota_tasks_running` | 进行中的 OTA 任务数 |
| `iot_alerts_active` | 活跃告警数 |

### 3. 推荐监控大盘

- 通过 Prometheus + Grafana 构建监控大盘
- GoWind IoT 提供 Grafana Dashboard JSON 模板，导入即可使用
- 建议关注：设备连接数、消息处理延迟、规则引擎延迟、时序数据库写入延迟、磁盘使用率

### 4. 日志管理

```bash
# Docker Compose 场景
docker-compose logs -f --tail=200 iot-gateway

# K8s 场景
kubectl logs -f -n gowind-iot -l app=iot-gateway --tail=200
```

生产环境建议接入 ELK / Loki / 国产日志方案统一收集与分析。

## 八、升级与备份

### 1. 平台升级

```bash
# 1. 备份当前版本配置
cp -r gowind-iot/ gowind-iot-backup-$(date +%Y%m%d)/

# 2. 拉取新版本部署包
tar -xzf gowind-iot-<new-version>.tar.gz

# 3. 执行数据库迁移
docker-compose run --rm iot-migrate

# 4. 滚动重启
docker-compose up -d
```

K8s 场景下通过 Helm 滚动更新：

```bash
helm upgrade gowind-iot ./charts/gowind-iot \
  -f values.yaml \
  -n gowind-iot
```

### 2. 数据备份

**关系数据库**

```bash
mysqldump -h <host> -u gowind -p gowind_iot > gowind_iot_$(date +%Y%m%d).sql
```

**时序数据库（以 TDengine 为例）**

```bash
taosdump -h tdengine -u root -p taosdata \
  -D gowind_iot \
  -o /backup/tdengine_$(date +%Y%m%d)
```

建议结合定时任务（cron）实现每日自动备份，并定期验证备份可恢复性。

## 九、常见部署问题排查

### Q: 启动后管理控制台无法访问

1. 检查容器是否正常运行：`docker-compose ps`
2. 检查 443 端口是否被占用：`netstat -tlnp | grep 443`
3. 检查授权证书路径是否正确：查看 `.env` 中 `LICENSE_FILE`
4. 查看网关日志：`docker-compose logs iot-gateway`

### Q: 设备无法连接到 MQTT Broker

1. 确认设备使用正确的接入地址与端口
2. 确认设备证书 / Token 正确（在控制台「设备详情 → 认证信息」查看）
3. 检查防火墙是否放行 1883 / 8883 端口
4. 查看接入网关日志中是否有认证失败记录

### Q: 时序数据库写入失败

1. 确认时序数据库实例可达：`telnet <tsdb-host> <port>`
2. 确认账号有写入权限
3. 确认 `TSDB_TYPE` 配置与实际数据库一致
4. 查看数据采集服务日志：`docker-compose logs iot-data-service`

### Q: 规则引擎不触发

1. 在控制台「规则引擎 → 规则列表」确认规则已发布（非草稿态）
2. 检查规则的触发条件是否匹配实际数据
3. 查看规则引擎日志中是否有错误：`docker-compose logs iot-rule-engine`
4. 确认数据源消息已成功进入消息总线

## 十、获取帮助

- **部署包获取与授权**：微信 `yang_lin_bo`（备注：公司-姓名-IoT 部署）
- **技术支持邮箱**：`yanglinbo@gmail.com`
- **产品介绍文档**：[GoWind IoT 产品介绍](/iot/intro.md)
- **GoWind 框架文档**：[框架总览](/framework/intro.md)
