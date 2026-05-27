# Cinacoin — Disaster Recovery Plan

## Executive Summary

This document outlines the disaster recovery (DR) strategy for Cinacoin, a white-label on-chain UX toolkit. The plan covers recovery objectives, procedures, and communication protocols for various disaster scenarios.

## Recovery Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| **RTO** (Recovery Time Objective) | 4 hours | Maximum acceptable downtime |
| **RPO** (Recovery Point Objective) | 1 hour | Maximum acceptable data loss |
| **MTTR** (Mean Time to Recovery) | 2 hours | Average expected recovery time |

## Disaster Scenarios

### Scenario 1: Single Zone Failure

**Impact:** One availability zone becomes unavailable.

**Automatic Recovery:**
- Kubernetes auto-schedules pods to remaining zones
- Load balancer redistributes traffic
- NATS JetStream continues with remaining replicas

**Manual Actions:** None required.

**Verification:**
```bash
kubectl get nodes -l topology.kubernetes.io/zone
kubectl get pods -n production -o wide
```

### Scenario 2: Region Failure

**Impact:** Entire AWS region becomes unavailable.

**Recovery Strategy:** Failover to secondary region.

**Procedure:**
1. **Detect outage** — Monitoring alerts + health check failures
2. **Activate DR** — Update DNS records to point to secondary region
3. **Restore data** — Restore latest PostgreSQL and Redis backups from S3
4. **Deploy services** — Helm deploy to secondary region
5. **Verify** — Run health checks and smoke tests
6. **Monitor** — Watch error rates and latency for 1 hour

**Estimated RTO:** 4 hours

**DNS Failover:**
```bash
# Update Route 53 failover record
aws route53 change-resource-record-sets \
  --hosted-zone-id ZONE_ID \
  --change-batch file://dns-failover.json
```

### Scenario 3: Data Corruption

**Impact:** Data stores corrupted or accidentally deleted.

**Recovery Strategy:** Point-in-time restore from backups.

**Procedure:**
1. **Isolate affected services** — Scale down to prevent further writes
2. **Identify corruption point** — Review logs to find when corruption started
3. **Restore from backup** — Use the backup runbook (see `deploy/backup/runbook.md`)
4. **Verify data integrity** — Run data consistency checks
5. **Resume services** — Scale back up

**Estimated RTO:** 2 hours

### Scenario 4: Security Breach

**Impact:** Unauthorized access to systems or data.

**Response:**
1. **Contain** — Isolate affected systems, revoke compromised credentials
2. **Assess** — Determine scope of breach, identify affected data
3. **Remediate** — Patch vulnerabilities, rotate all secrets
4. **Restore** — Rebuild from known-good state
5. **Notify** — Follow incident response procedures

**Secret Rotation Checklist:**
- [ ] API keys (Alchemy, Infura, Ankr)
- [ ] Database passwords
- [ ] Redis passwords
- [ ] JWT signing keys
- [ ] Bundler wallet private keys
- [ ] Push notification credentials (APNs, FCM)
- [ ] TLS certificates

### Scenario 5: Blockchain Node Failure

**Impact:** RPC proxy cannot connect to blockchain nodes.

**Recovery Strategy:** Fallback to external RPC providers.

**Procedure:**
1. **Detect node failure** — Health checks fail on node endpoints
2. **Switch providers** — Update RPC proxy configuration to use fallback providers
3. **Re-sync nodes** — Start node re-sync in background
4. **Monitor** — Watch for increased latency during fallback

**Fallback Providers:**
```yaml
# providers.yaml fallback configuration
fallback:
  - name: alchemy
    url: https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}
    priority: 1
  - name: infura
    url: https://mainnet.infura.io/v3/${INFURA_KEY}
    priority: 2
  - name: ankr
    url: https://rpc.ankr.com/eth/${ANKR_KEY}
    priority: 3
```

## Infrastructure Inventory

### Critical Services (P0)

| Service | Purpose | Dependencies | Backup |
|---------|---------|-------------|--------|
| Relay Server | WebSocket relay to clients | NATS, Redis | Stateless |
| RPC Proxy | Blockchain RPC routing | Redis, Blockchain nodes | Stateless |
| Keys Server | Key management | PostgreSQL | Daily pg_dump |
| Bundler | ERC-4337 bundling | RPC Proxy | Stateless |

### Support Services (P1)

| Service | Purpose | Dependencies | Backup |
|---------|---------|-------------|--------|
| Push Server | Push notifications | NATS, Redis | Stateless |
| NATS JetStream | Message broker | File store | File store backup |
| Redis | Caching/sessions | Persistence | Daily RDB |
| Prometheus | Metrics | Storage | Stateless |
| Grafana | Dashboards | PostgreSQL (meta) | Stateless |

### Blockchain Nodes (P2)

| Node | Client | Data Size | Recovery Time |
|------|--------|-----------|---------------|
| Ethereum Mainnet | Erigon | 2TB | 24-48 hours (re-sync) |
| Polygon | Erigon | 2TB | 24-48 hours (re-sync) |

## DR Infrastructure

### Secondary Region Setup

- **Region:** us-west-2 (primary: us-east-1)
- **Cluster:** EKS on-demand (primary: mixed spot + on-demand)
- **Storage:** S3 cross-region replication (already configured)
- **DNS:** Route 53 health-checked failover records
- **Monitoring:** Prometheus + Grafana in secondary region

### Minimum Viable Deployment

In a disaster scenario, deploy only critical services:

```bash
# Minimal production deployment
helm upgrade --install cinacoin ./deploy/helm/cinacoin \
  --namespace production \
  --set global.environment=production \
  --set blockchainNodes.ethereum.enabled=false \
  --set blockchainNodes.polygon.enabled=false \
  --set relay.replicaCount=2 \
  --set rpcProxy.replicaCount=2 \
  --set keysServer.replicaCount=1 \
  --set pushServer.replicaCount=1 \
  --set bundler.replicaCount=1 \
  --wait --timeout 15m
```

## Communication Plan

### During Incident

1. **0-5 min** — Auto-alerts fire, on-call engineer acknowledges
2. **5-15 min** — Initial assessment, status page updated
3. **15-30 min** — Incident bridge established, stakeholders notified
4. **30+ min** — Regular updates every 30 minutes
5. **Resolution** — Post-incident review scheduled within 48 hours

### Status Page Updates

| Stage | Message |
|-------|---------|
| Detecting | "Investigating service degradation" |
| Confirmed | "Service outage identified, working on recovery" |
| Recovering | "Services being restored, partial availability" |
| Resolved | "All services restored, monitoring for stability" |

### Notification Channels

- **Internal:** Slack #cinacoin-incidents, PagerDuty
- **External:** Status page, Twitter (if extended outage)
- **Enterprise:** Direct email/SMS to affected customers

## Testing & Validation

### Quarterly DR Drill

1. Simulate region failure in staging
2. Execute failover procedure
3. Measure actual RTO and RPO
4. Document findings and update plan

### Post-Drill Checklist

- [ ] RTO within 4-hour target
- [ ] RPO within 1-hour target
- [ ] All critical services restored
- [ ] Data integrity verified
- [ ] DNS failover working
- [ ] Monitoring operational
- [ ] Communication plan tested
- [ ] Documentation updated

## Appendices

### A. Emergency Runbook Quick Reference

```
# Check cluster health
kubectl get nodes; kubectl get pods -A --field-selector=status.phase!=Running

# Check backup status
kubectl get jobs -n cinacoin -l component=backup

# Emergency scale-down
kubectl scale deployment <name> --replicas=0 -n production

# Emergency restart
kubectl rollout restart deployment <name> -n production

# Check logs
kubectl logs -f deployment/<name> -n production --tail=100

# Exec into pod
kubectl exec -it deployment/<name> -n production -- bash
```

### B. Required IAM Permissions

- S3 read/write for backup bucket
- Route 53 update for DNS failover
- EKS cluster management
- RDS snapshot/restore
- Secrets Manager access

### C. Contact Directory

Maintained in: `deploy/contacts.yaml` (not committed to repo)
