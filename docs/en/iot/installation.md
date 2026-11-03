# GoWind IoT Installation and Deployment Guide

This guide is written for delivery engineers and operations staff of GoWind IoT, covering the complete process from environment preparation and single-node deployment to cluster deployment and Xinchuang adaptation.

> GoWind IoT is a closed-source commercial product. Before deploying, please confirm you have obtained a valid commercial license and the deployment package through commercial channels. If not, contact WeChat `yang_lin_bo` or email <yanglinbo@gmail.com>.

## 1. Pre-Deployment Assessment

### 1. Resource Planning Questionnaire

Before starting deployment, confirm the following questions with the customer so hardware resources can be planned properly:

| Assessment item | Description | Impact |
|---|---|---|
| Device scale | Total number of connected devices, peak concurrency | Determines the number of access gateway nodes |
| Message frequency | Average and peak reporting frequency per device | Determines compute and storage resources |
| Data retention period | Retention duration of time-series data (3 months / 1 year / forever) | Determines time-series database storage capacity |
| Protocol types | Which device protocols are involved (MQTT / Modbus / OPC UA, etc.) | Determines protocol gateway configuration |
| High-availability requirements | Whether multiple replicas and failover are needed | Determines cluster topology |
| Deployment environment | Public cloud / private cloud / bare metal / domestic Chinese (Xinchuang) environment | Determines base images and the adaptation plan |

### 2. Capacity Planning Reference

| Device scale | Access nodes | Compute nodes | Time-series DB nodes | Total resource suggestion |
|---|---|---|---|---|
| 10,000 devices | 1 | 1 | 1 (single node) | 8C 16G × 1 |
| 100,000 devices | 2 | 2 | 3 (cluster) | 16C 32G × 7 |
| 1,000,000 devices | 4 | 4 | 5+ (cluster) | 32C 64G × 13+ |

> These are reference values; actual sizing must be assessed jointly with message frequency and data retention period.

## 2. Environment Preparation

### 1. System Requirements

**Operating systems**

- CentOS 7.6+ / RHEL 8+ / Ubuntu 20.04+ / Debian 10+
- Kylin V10 / UnionTech UOS / openEuler (Xinchuang environments)
- x86_64 and ARM64 supported (Kunpeng 920 / Phytium / domestic ARM CPUs)

**Base software**

| Component | Version requirement | Notes |
|---|---|---|
| Docker | 20.10+ | Container runtime |
| Docker Compose | 2.0+ | Single-node orchestration |
| Kubernetes | 1.20+ | Cluster orchestration (optional) |
| MySQL | 8.0+ | Relational data storage |
| PostgreSQL | 12+ | Relational data storage (alternative to MySQL) |
| Redis | 6.0+ | Cache and sessions |
| Time-series database | See table below | Choose one |

**Time-series database support matrix**

| Time-series database | Recommended version | Suitable scenarios |
|---|---|---|
| TDengine | 3.x | First choice for domestic Chinese environments; high write throughput |
| InfluxDB | 2.x | General purpose; mature ecosystem |
| TimescaleDB | 2.x | Reuses PostgreSQL operational practices |
| ClickHouse | 23.x | Massive data analytics; columnar storage |
| Apache IoTDB | 1.x | Optimized for industrial IoT scenarios |
| DolphinDB | 2.x | Finance / energy scenarios with built-in analytics |

### 2. Network Planning

| Port | Protocol | Purpose |
|---|---|---|
| 443 | HTTPS | Management console |
| 1883 | MQTT | Device access (unencrypted) |
| 8883 | MQTTS | Device access (TLS) |
| 5683 | CoAP | Device access (UDP) |
| 502 | Modbus TCP | Industrial device access |
| 4840 | OPC UA | Industrial device access |
| 9092 | Kafka | Internal message bus (optional) |
| 3306 / 5432 | MySQL / PG | Databases |
| 6379 | Redis | Cache |

> In production, route entry traffic through a load balancer (Nginx / HAProxy / F5) and enable TLS encryption.

## 3. Single-Node Deployment (Docker Compose)

Suitable for PoC validation and small-scale scenarios (up to 10,000 devices).

### 1. Extract the Deployment Package

```bash
tar -xzf gowind-iot-<version>.tar.gz
cd gowind-iot
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
vim .env
```

Key configuration items:

```dotenv
# ===== License =====
LICENSE_FILE=/data/license/gowind-iot.lic

# ===== Database =====
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

# ===== Time-series database =====
TSDB_TYPE=tdengine           # tdengine / influxdb / timescaledb / clickhouse / iotdb
TSDB_HOST=tdengine
TSDB_PORT=6030
TSDB_USER=root
TSDB_PASSWORD=taosdata
TSDB_DATABASE=gowind_iot

# ===== MQTT access =====
MQTT_PORT=1883
MQTT_TLS_PORT=8883

# ===== Alert notifications (GoWind IM / DingTalk / WeCom integration) =====
IM_NOTIFY_WEBHOOK=https://im.your-domain.com/api/webhook
DINGTALK_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=xxx
```

### 3. Start Services

```bash
# Initialize the database (first deployment)
docker-compose run --rm iot-init

# Start all services
docker-compose up -d

# Check running status
docker-compose ps

# View logs
docker-compose logs -f iot-gateway
docker-compose logs -f iot-rule-engine
```

### 4. Verify the Deployment

```bash
# Health check
curl -k https://localhost/api/health
# Expected output: {"status":"ok","version":"x.y.z"}

# Management console
# Visit https://localhost in your browser
# Default account: admin / admin (password change forced on first login)
```

### 5. Quick Device Access Verification

Use an MQTT client (such as mosquitto_pub) to simulate device reporting:

```bash
# Simulate a device coming online + reporting telemetry
mosquitto_pub -h localhost -p 1883 \
  -u "device001" -P "<device-token>" \
  -t "/devices/device001/telemetry" \
  -m '{"temperature":25.6,"humidity":60.2}'

# device001 should now appear online in the console under
# "Device Management → Device List", and the reported temperature
# and humidity should be visible under "Data Query".
```

## 4. Cluster Deployment (Kubernetes)

Suitable for production environments with large-scale device access (100,000+ devices).

### 1. Prerequisites

- A K8s cluster (1.20+) accessible via kubectl
- A StorageClass deployed that can provide persistent volumes
- An Ingress Controller deployed (Nginx Ingress or Traefik)
- MySQL, Redis, a time-series database, and Kafka/NATS deployed or reachable

### 2. Prepare the Namespace and Configuration

```bash
kubectl create namespace gowind-iot

# Create the license Secret
kubectl create secret generic iot-license \
  --from-file=gowind-iot.lic=/path/to/license.lic \
  -n gowind-iot

# Create the database password Secret
kubectl create secret generic iot-secrets \
  --from-literal=DB_PASSWORD='<db-password>' \
  --from-literal=REDIS_PASSWORD='<redis-password>' \
  --from-literal=TSDB_PASSWORD='<tsdb-password>' \
  -n gowind-iot
```

### 3. Write values.yaml

```yaml
image:
  registry: registry.your-domain.com/gowind
  tag: "x.y.z"

ingress:
  enabled: true
  host: iot.your-domain.com
  tls: true

# Access gateway replica count (the key to horizontal scaling)
gateway:
  replicas: 4
  resources:
    requests:
      cpu: 2
      memory: 4Gi
    limits:
      cpu: 4
      memory: 8Gi

# Rule engine replica count
ruleEngine:
  replicas: 2
  resources:
    requests:
      cpu: 1
      memory: 2Gi

# Time-series database (connect to an external cluster; not self-hosted here)
tsdb:
  external: true
  type: tdengine
  host: tdengine-cluster.gowind-iot.svc.cluster.local
  port: 6030

# MQTT access exposed via a load balancer
mqtt:
  type: LoadBalancer
  port: 1883
  tlsPort: 8883
```

### 4. Deploy the Helm Chart

```bash
helm install gowind-iot ./charts/gowind-iot \
  -f values.yaml \
  -n gowind-iot

# Wait for all Pods to become ready
kubectl get pods -n gowind-iot -w

# Check the Ingress entry point
kubectl get ingress -n gowind-iot
```

### 5. Configure Device Access Load Balancing

Access gateways are exposed through a `LoadBalancer` Service; cloud-provider LBs assign the ingress IP automatically. For bare-metal clusters, MetalLB or an external hardware LB is recommended.

```bash
kubectl get svc -n gowind-iot iot-gateway-mqtt
# Note the EXTERNAL-IP and point the devices' MQTT broker address to it
```

## 5. Xinchuang (Domestic IT) Deployment

GoWind IoT is statically compiled with Go, which makes it naturally suited to domestic Chinese environments.

### 1. Domestic CPU Compatibility

| CPU architecture | Support |
|---|---|
| Kunpeng 920 (ARM64) | Fully supported, with native ARM64 images |
| Phytium 2000+/2500 (ARM64) | Fully supported |
| Loongson 3A5000/3C5000 (LoongArch) | Fully supported, with LoongArch images |
| Hygon (x86_64) | Fully supported |
| Zhaoxin (x86_64) | Fully supported |

### 2. Domestic Operating System Compatibility

| Operating system | Versions |
|---|---|
| KylinOS | V10 SP1/SP2/SP3 |
| UnionTech UOS | V20 / V25 |
| openEuler | 22.03 LTS+ |
| NFSChina | NFSChina 4.0+ |

### 3. Notes on Xinchuang Deployment

- **Database adaptation**: for Xinchuang scenarios, the recommended combination is TDengine + DM Database / KingbaseES, meeting autonomous-controllability requirements
- **Container runtime**: some domestic OSes ship podman / buildah by default, which can replace Docker as needed
- **Image registry**: use Harbor or a domestic registry solution to avoid dependence on Docker Hub
- **Clock sync**: NTP time synchronization must be enabled on all nodes to prevent disordered device data sequences

## 6. Configuration Reference

### 1. Switching the Time-Series Database

GoWind IoT switches time-series databases declaratively via the `TSDB_TYPE` environment variable, with no business-layer changes:

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

### 2. Custom Protocol Access

For private TCP/UDP protocols, place a protocol description file under the `protocols/` directory:

```yaml
# protocols/my-protocol.yaml
name: my-private-protocol
transport: tcp
port: 9000

codec:
  type: lua           # Lua-based codec
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

### 3. Alert Notification Channel Configuration

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

## 7. Operations and Monitoring

### 1. Health Checks

```bash
# Overall platform health
curl -k https://iot.your-domain.com/api/health

# Per-component status
curl -k https://iot.your-domain.com/api/health/components
```

### 2. Metrics Exposure

GoWind IoT exposes monitoring metrics in Prometheus format:

```
http://<host>:9090/metrics
```

Core metrics:

| Metric | Description |
|---|---|
| `iot_connected_devices` | Currently connected devices |
| `iot_messages_received_total` | Cumulative messages received |
| `iot_messages_per_second` | Message processing QPS |
| `iot_rule_engine_triggered_total` | Rule engine trigger count |
| `iot_ota_tasks_running` | OTA tasks in progress |
| `iot_alerts_active` | Active alert count |

### 3. Recommended Monitoring Dashboards

- Build monitoring dashboards with Prometheus + Grafana
- GoWind IoT ships a Grafana Dashboard JSON template — import and use
- Watch: device connection count, message processing latency, rule engine latency, time-series DB write latency, and disk usage

### 4. Log Management

```bash
# Docker Compose
docker-compose logs -f --tail=200 iot-gateway

# Kubernetes
kubectl logs -f -n gowind-iot -l app=iot-gateway --tail=200
```

In production, integrate ELK / Loki or a domestic log platform for unified collection and analysis.

## 8. Upgrade and Backup

### 1. Platform Upgrade

```bash
# 1. Back up the current configuration
cp -r gowind-iot/ gowind-iot-backup-$(date +%Y%m%d)/

# 2. Pull the new deployment package
tar -xzf gowind-iot-<new-version>.tar.gz

# 3. Run the database migration
docker-compose run --rm iot-migrate

# 4. Rolling restart
docker-compose up -d
```

For Kubernetes, update via Helm:

```bash
helm upgrade gowind-iot ./charts/gowind-iot \
  -f values.yaml \
  -n gowind-iot
```

### 2. Data Backup

**Relational database**

```bash
mysqldump -h <host> -u gowind -p gowind_iot > gowind_iot_$(date +%Y%m%d).sql
```

**Time-series database (TDengine example)**

```bash
taosdump -h tdengine -u root -p taosdata \
  -D gowind_iot \
  -o /backup/tdengine_$(date +%Y%m%d)
```

Combine with a scheduled job (cron) for daily automatic backups, and periodically verify that backups can be restored.

## 9. Troubleshooting Common Deployment Issues

### Q: The management console is unreachable after startup

1. Check whether containers are running properly: `docker-compose ps`
2. Check whether port 443 is occupied: `netstat -tlnp | grep 443`
3. Check that the license path is correct: inspect `LICENSE_FILE` in `.env`
4. Check the gateway logs: `docker-compose logs iot-gateway`

### Q: Devices cannot connect to the MQTT broker

1. Confirm the device uses the correct access address and port
2. Confirm the device certificate / token is correct (see "Device Details → Authentication Info" in the console)
3. Check that the firewall allows ports 1883 / 8883
4. Look for authentication failure records in the access gateway logs

### Q: Time-series database writes fail

1. Confirm the time-series database instance is reachable: `telnet <tsdb-host> <port>`
2. Confirm the account has write permission
3. Confirm the `TSDB_TYPE` setting matches the actual database
4. Check the data ingestion service logs: `docker-compose logs iot-data-service`

### Q: The rule engine does not trigger

1. In the console under "Rule Engine → Rule List", confirm the rule is published (not in draft)
2. Check that the rule's trigger conditions match the actual data
3. Look for errors in the rule engine logs: `docker-compose logs iot-rule-engine`
4. Confirm data-source messages have entered the message bus successfully

## 10. Getting Help

- **Deployment package and licensing**: WeChat `yang_lin_bo` (note: Company-Name-IoT deployment)
- **Technical support email**: <yanglinbo@gmail.com>
- **Product introduction**: [GoWind IoT Product Introduction](/en/iot/intro.md)
- **GoWind framework documentation**: [Framework Overview](/en/framework/intro.md)
