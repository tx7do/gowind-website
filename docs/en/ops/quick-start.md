# GoWind Ops Quick Start

This guide walks you through running GoWind Ops locally: understanding the three architecture roles, starting the dependencies and platform services, onboarding your first node, and then completing the three most common ops actions in turn — "manage a project → run a script → build and distribute".

## 1. Architecture Roles

| Role | Form | Responsibilities |
|------|------|------|
| Core | Server side (internal gRPC) | Core business logic and data layer; signs command envelopes with HMAC-SHA256 |
| Admin BFF / Front BFF | Server side (:18600 / :18700) | HTTP API gateways serving the admin frontend |
| Agent | Edge proxy (no UI) | Deployed on managed nodes; connects to EMQX over outbound-only MQTT, executes commands, and returns receipts |

> Signaling between the platform and the Agent travels only through EMQX (MQTT TLS 8883). The Agent requires no inbound ports on the managed node.

## 2. Environment Preparation

GoWind Ops provides a `docker-compose.libs.yaml` containing only the dependency services:

- PostgreSQL (or MySQL)
- Redis
- EMQX (MQTT broker)
- MinIO (object storage)
- etcd
- Jaeger (tracing)

```bash
git clone https://github.com/tx7do/go-wind-ops.git
cd go-wind-ops
```

## 3. Start the Platform

Choose either of the two options:

**Option A: containerize only the dependencies, run the applications locally (recommended for development and debugging)**

```bash
# 1. Start the dependency services
docker compose -f docker-compose.libs.yaml up -d

# 2. Run core / admin BFF / front BFF locally (Go 1.26+)
#    Start each application service in turn, or debug-run them in your IDE
```

**Option B: full-stack Compose**

```bash
docker compose up -d
```

After startup, log in to the admin frontend with the default account `admin / admin`.

::: tip
Captcha login can be skipped in development. In production, be sure to enable the captcha and configure MFA.
:::

## 4. Onboard the First Node

1. In the admin frontend's "Node Management", complete TOFU (Trust On First Use) admission for a new machine (trust by machine fingerprint on first connection)
2. Install the Agent (edge proxy, no UI) on the target machine
3. The Agent connects to EMQX over outbound-only MQTT (TLS 8883) and appears in the node list once online
4. In the node details, confirm that the online status is normal and that CPU / memory / disk trends start reporting with every 30s heartbeat

> The Agent supports remote upgrades: once the platform sends an upgrade command, it replaces itself and restarts in relay — no need to log into the node.

## 5. Manage a Project

A project = node + directory + start/stop commands:

1. Go to "Project Management", create a project, and bind the node just onboarded
2. Fill in the application directory and the start / stop commands
3. Operate the application with the project start/stop buttons — the whole process is recorded in the change timeline
4. Enable "project liveness" monitoring for the project: abnormal process exits alert automatically, and recovery is flagged RECOVERY automatically

## 6. Run a Script

1. Go to "Script Management" and create a script (versioned management, with timeout auto-kill of the process tree)
2. Select multiple nodes and dispatch it as a batch command matrix
3. Tail the output live over WebSocket on the run page
4. After execution, verify receipts, exit codes, durations, and request_id in the "Command Ledger" (full auditing, idempotent deduplication)

## 7. Build and Distribute Once

The complete BUILD-SCRIPT-DISTRIBUTION three-stage pipeline:

1. **BUILD**: bind a Git source repository (stored AES-encrypted) and trigger a build; build logs tail live and artifacts go to object storage automatically (retention policies supported)
2. **SCRIPT**: orchestrate script steps as needed (e.g., stop services, backup, migration)
3. **DISTRIBUTION**: distribute the artifact zip to target nodes — hardened against Zip Slip attacks, with batched gray release and Docker image tag injection

You can also set up an environment promotion pipeline in the "Release Console": the same artifact is promoted stage by stage across environments (e.g., test → staging → production), advancing in batches.

::: tip
Both the build and distribution pipelines can be triggered via OpenAPI (API Key authentication) or Git Webhooks (GitHub / GitLab / Gitea), fitting seamlessly into your existing CI.
:::

## 8. Security Recommendations

Before production deployment, complete the following security configuration:

**1. Secret environment variables**

The platform depends on a set of secret environment variables; in production it **refuses to start if any are missing**:

| Environment variable | Purpose |
|----------|------|
| `CORE_RPC_SECRET` | RPC authentication between services |
| `MQTT_AUTH_WEBHOOK_SECRET` | Authentication for the EMQX broker authentication callback |
| `COMMAND_SIGN_KEY` | HMAC-SHA256 signing key for command envelopes |

> These are representative items from the checklist; verify every secret against the repository deployment documentation item by item.

**2. TLS**

- EMQX uses port TLS 8883 to encrypt the signaling channel
- Between the admin frontend and the BFFs, enable HTTPS uniformly through a reverse proxy

**3. Account security**

- Change the default `admin / admin` account immediately
- Enable MFA (TOTP + backup codes) and integrate OIDC SSO as needed
- Enable operation approvals and maintenance windows; sensitive operations require a ticket first
- The six categories of audit logs are based on a hash chain + ECDSA signatures; verify integrity periodically with the verification tool

For more platform capabilities, return to the [GoWind Ops Product Overview](/en/ops/intro.md).
