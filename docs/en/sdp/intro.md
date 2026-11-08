# GoWind SDP (Zero-Trust Gateway)

GoWind SDP is the "**security moat**" of the GoWind ecosystem: a **Software Defined Perimeter** for private deployments. It solves the real-world needs of field staff reaching internal systems (IM / ERP) and IoT devices connecting remotely — cloud servers, on-prem server rooms, employee devices, and edge IoT gateways join an encrypted virtual overlay network in one step. **Services stay invisible by default; access is granted per identity and per context.**

::: tip Version note
Core capabilities — overlay networking, SPA stealth, NAT traversal, micro-segmentation, dynamic admission, certificate revocation, plus **session recording & replay, JIT temporary access, and a clientless web-application entry** — are fully implemented and verified by end-to-end test runs. The product is in **rapid iteration**; the multi-platform clients keep improving.
:::

## Four Real Scenarios: How GoWind SDP Works

**Scenario one: a salesperson needs ERP on the road.** The old options were a VPN (ports exposed to the public internet, scanned daily) or asking IT to look things up. Now she opens the client and a **Single Packet Authorization** knock goes out silently — the gateway exposes no ports at all, and only a valid knock opens a connection. At login the system evaluates her location, device fingerprint, and time of day; low risk means she is straight into ERP. All she notices is that "the network feels fast".

**Scenario two: a contractor needs three days of access.** Instead of a long-lived account, the contractor submits a **JIT temporary-access request** from his client; after the manager approves, his access is **time-boxed** and automatically revoked after 72 hours. Every connection during that window lands in the audit ledger, and the account disables itself at expiry.

**Scenario three: the auditor wants "replayable SSH sessions".** A compliance review demands that all operations be traceable. GoWind SDP's **session recording** captures every SSH / RDP session end to end: recordings are archived to object storage automatically, and auditors search by time, **replay** the session online, or download the archive — watching ops activity like security-camera footage.

**Scenario four: a factory IoT gateway deep inside carrier-grade NAT.** The edge gateway has no public IP and the carrier uses symmetric NAT. GoWind SDP handles **NAT traversal** automatically: P2P direct when holes can be punched, gateway relay or a standalone TURN relay otherwise — the link stays alive even on high-latency cellular. SPA stealth on the gateway side means scanners see nothing.

## Highlights

- **Visual overlay networking**: a virtual network = address plan + members (gateways / cloud / office egress / terminals / IoT) + policies; virtual IPs are assigned automatically and WireGuard configs are pushed over MQTT signaling
- **Fast NAT traversal**: STUN NAT detection with P2P direct connections for cone NATs (WG endpoint hot-swap, no engine restart); three-level fallback — gateway relay (RELAY) → clustered TURN — keeps high-latency cellular links alive
- **SPA network stealth**: gateways expose no ports by default; the WireGuard data port filters on Single Packet Authorization — handshakes that fail the encrypted knock (anti-replay + time window) are silently dropped
- **Dynamic contextual admission**: beyond passwords — location, device fingerprint, time, and terminal posture feed a live risk score resolving to ALLOW / DENY / STEP_UP_MFA, with **continuous re-evaluation** while a session is open
- **Micro-segmentation**: integrated with GoWind Admin RBAC; policies compile into gateway-side ACL rules with layer-7 drill-down — TLS SNI / HTTP Host / Path matching; a sales laptop reaches ERP and GitLab but never the IoT segment
- **Clientless web-application entry**: publish internal web apps by domain and reach them from a plain browser — SNI/Host routed reverse proxy, with an optional shared access passphrase guarding the entrance
- **Gateway high availability**: if the primary gateway goes down, traffic fails over to the standby automatically — no single point of failure for access
- **JIT temporary access**: request → approval → time-boxed unfreeze → automatic expiry; privileges never linger
- **Session recording**: every SSH / RDP ops session recorded end to end, auto-archived, replayed online or downloaded — bastion-grade auditing
- **Device compliance checks**: firewall, stale patches, antivirus/EDR, disk encryption, and OS end-of-service checks feed admission decisions, and non-compliant devices are downgraded; **UEBA** adds risk scoring for anomalous behavior and temporary blacklisting of aggregated SPA failures
- **Remote kill switch**: one click revokes a lost device's certificate — cascaded revoke + session eviction + admission denial cut off all internal access immediately
- **National crypto alongside international suites**: SM-series access points deploy in parallel, SIEM export plugs into your existing security operations, and LDAP/OIDC integrates with enterprise directories

## Feature Overview

### 1. Overlay Networking

| Feature | Description |
|---|---|
| Virtual networks | Address plan (CIDR), membership, DNS / MTU / Keepalive per network |
| Segmentation | Functional segments — office, ERP, database, IoT device zones |
| Gateway roles | Cloud gateways, office egress, and edge IoT gateways with optional relay forwarding |
| Config import/export | One-click network config transfer for batch delivery |
| Full-tunnel mode | Cloud-pushed full-tunnel / per-segment split-tunnel, with DNS delivered alongside the tunnel |
| Dual access modes | Local-proxy mode / virtual-NIC full-tunnel mode, switched from a unified cloud console |
| Gateway high availability | Automatic failover to a standby gateway keeps tunnel access alive |
| Bulk operations | Enable/disable/delete/move members in batches — large rollouts made easy |
| WireGuard data plane | User-space engine — no drivers, no admin rights |

### 2. Zero-Trust Admission

| Feature | Description |
|---|---|
| Single Packet Authorization | Ports stay hidden; only valid knocks open the WireGuard handshake |
| Anti-replay + time window | Signed knocks with validity windows; replays rejected and logged |
| Contextual scoring | Location, device fingerprint, time, and terminal posture scored in real time |
| Continuous re-evaluation | Mid-session risk changes take effect immediately — no "log in once, trusted forever" |
| Graded disposition | ALLOW / DENY / STEP_UP_MFA enforced per policy |
| MFA & SSO | TOTP second-step verification; enterprise SSO with LDAP/AD directory accounts auto-provisioned |
| Policy simulation | Simulate a login context before rollout and preview which policies would hit and how |
| UEBA | Risk scoring on anomalous behavior, aggregated SPA-failure blacklisting, endpoint lock-down |
| Full audit trail | Every evaluation recorded and traceable |

### 3. Micro-Segmentation & Policies

| Feature | Description |
|---|---|
| ACL compilation | Policies compile into gateway-side source-IP targeted rules automatically |
| Layer-7 matching | TLS SNI / HTTP Host / Path inspection (first-packet sniffing; unparseable traffic falls back to L4 — no false kills) |
| Subject labels | GoWind Admin RBAC integration — authorize by role or member type |
| Priority ordering | Deny rules evaluated before allow rules |
| ACL preview | Compiled result preview — what you see is what the gateway enforces |

### 4. Clientless Web-Application Entry

| Feature | Description |
|---|---|
| App publishing | Internal web apps published by external domain, with start/stop and protocol control |
| Browser access | Employees reach published apps from any browser — nothing to install |
| Routed reverse proxy | SNI / Host routed reverse proxy for fine-grained, app-level exposure |
| Access passphrase | Optional shared passphrase — without it, published apps stay unreachable |

### 5. JIT Temporary Access

| Feature | Description |
|---|---|
| Self-service requests | Temporary needs submitted from the client with scope and duration |
| Approval loop | Manager approval time-boxes the unfreeze, fully audited |
| Automatic expiry | Access revokes itself at expiry — privileges never linger |
| Session ledger | Every connection during the window lands in the audit trail |

### 6. Session Recording & Replay

| Feature | Description |
|---|---|
| Full capture | SSH / RDP ops sessions recorded screen by screen |
| Auto-archiving | Recordings uploaded to object storage automatically |
| Online replay | Auditors search by time and replay sessions like security footage |
| Downloadable archives | Sessions downloadable for compliance and internal-audit retention |
| Recording privacy boundary | Recordings live only on the gateway and object storage; the management plane keeps metadata only — minimal-knowledge auditing |

### 7. Certificates & Device Lifecycle

| Feature | Description |
|---|---|
| Device certificates | TOFU onboarding with certificate issuance and unique fingerprints |
| Compliance checks | Firewall, stale patches, antivirus/EDR, disk encryption, and OS end-of-service checks feed admission decisions |
| Automatic rotation | Device certificates and knock keys rotate automatically at expiry — keys never linger |
| One-click revocation | Cascaded revoke: session eviction + admission denial + forced disconnect |
| State tracking | Valid / expired / revoked / rotated states with revocation reasons |

### 8. Observability & Audit

| Feature | Description |
|---|---|
| Topology dashboard | Live node graph (online / fault / offline) with P2P / RELAY / TURN link modes |
| Traffic & latency | Tunnel traffic, average latency, and P2P success rate with history |
| SPA knock audit | Every knock recorded — unknown members, replay attacks, expired knocks at a glance |
| SIEM export | Security events shipped to your existing SIEM/SOC platform |
| Security events | Admission denials and anomalous access in one ledger with CSV export |

## Screenshots

### Overview & Networking

| SDP Overview | Virtual Networks |
| :---: | :---: |
| ![SDP Overview](/assets/images/sdp/dashboard.png) | ![Virtual Networks](/assets/images/sdp/networks.png) |

### Topology & Policies

| Connection Topology | Micro-Segmentation |
| :---: | :---: |
| ![Connection Topology](/assets/images/sdp/topology.png) | ![Micro-Segmentation](/assets/images/sdp/access-policies.png) |

### Certificates & Audit

| Device Certificates | Security Events |
| :---: | :---: |
| ![Device Certificates](/assets/images/sdp/certificates.png) | ![Security Events](/assets/images/sdp/security-events.png) |

## Use Cases

- **Field & remote staff**: sales and field engineers reach internal ERP / IM / GitLab securely — straight from the browser, clientless; a lost laptop is revoked in one click
- **Multi-branch collaboration**: HQ, branches, and cloud resources join one encrypted overlay with zero public exposure; primary/standby gateway failover keeps branch offices connected through single-point failures
- **Ops auditing & compliance**: SSH/RDP session replay, JIT temporary access, and full audit trails align directly with Bastion-host-grade and compliance requirements
- **Remote IoT access**: edge gateways phone home through SPA stealth with relay fallback — no on-site public-network configuration
- **Sovereign & self-hosted security**: national-crypto access points, fully private deployment — data never leaves the enterprise boundary

## Delivery & Deployment

GoWind SDP ships as a private deployment and shares the same stack as the GoWind family: the control plane integrates with GoWind Admin RBAC, the client embeds the GoWind IM app, and it combines with IM / ERP / Ops into a complete zero-trust remote-access solution. Delivery includes a one-click install script and production container-orchestration templates; national-crypto access points (knock encryption, storage encryption, password hashing) can be enabled per compliance requirements. Deployment documentation is provided with delivery — contact us below for trials and deployment services.

::: tip Contact
Reach us on WeChat at `yang_lin_bo` (note **SDP - Company - Name**),
or by email at <yanglinbo@gmail.com>
for product trials, private deployment, and custom development.
:::
