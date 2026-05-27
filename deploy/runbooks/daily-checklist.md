# Daily Ops Checklist — Cinacoin

---

## Morning Check (09:00 UTC)

### [ ] Grafana Dashboard Review
- [ ] Check all alert panels on Relay dashboard
- [ ] Check all alert panels on RPC Proxy dashboard
- [ ] Review cost dashboard for budget anomalies

### [ ] Relay Health
- [ ] Active connections within normal range (< 80K per region)
- [ ] P99 latency < 500ms
- [ ] No pod restarts in last 24h
- [ ] NATS JetStream consumer lag < 10K

### [ ] RPC Proxy Health
- [ ] Error rate < 1%
- [ ] Cache hit rate > 80%
- [ ] No provider failover events
- [ ] All provider health checks passing

### [ ] Blockchain Nodes
- [ ] All Erigon nodes in sync (block height matches explorer)
- [ ] P2P peer count > 20
- [ ] Node disk usage < 85%
- [ ] No OOMKill events

### [ ] Infrastructure
- [ ] Disk usage across all PVCs < 80%
- [ ] Node CPU/memory utilization healthy
- [ ] Certificate expiry > 30 days

### [ ] Cost
- [ ] Review daily RPC provider spend
- [ ] Check for unexpected cost spikes

### [ ] Logs
- [ ] Search for ERROR-level logs in last 24h
```bash
# In Loki/Grafana Explore
{namespace="cinacoin"} |= "ERROR"
```

---

## Notes

- Log any anomalies in the team incident log
- Update runbooks if new patterns observed
- Flag recurring issues for weekly review
