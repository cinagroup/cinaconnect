# Weekly Ops Checklist — Cinacoin

---

## Monday Review

### [ ] Alert Rule Audit
- [ ] Review all triggered alerts from the past week
- [ ] Remove stale/noisy alert rules
- [ ] Add new rules if gaps identified
- [ ] Verify alert routing (Slack + PagerDuty delivery)

### [ ] Error Rate Analysis
- [ ] Review RPC error rate trends (7-day)
- [ ] Identify top error methods
- [ ] Check if any errors correlate with specific providers

### [ ] RPC Provider Quota Review
- [ ] Check Alchemy/Infura/AnkR usage dashboards
- [ ] Verify within free tier or paid quota
- [ ] Project end-of-month usage
- [ ] Plan quota increases if needed

### [ ] Certificate Check
- [ ] TLS certificate expiry > 30 days
- [ ] Check all ingress TLS: relay, RPC, Grafana
```bash
kubectl get certificates -n cinacoin
```

### [ ] Backup Verification
- [ ] Verify NATS JetStream backup completed
- [ ] Verify Redis AOF backup intact
- [ ] Verify Erigon snapshot backup (if scheduled)
- [ ] Test restore procedure (monthly)

### [ ] Security Review
- [ ] Check for new CVEs in dependencies
```bash
cargo audit       # relay-server
govulncheck       # rpc-proxy
trivy image       # docker images
```
- [ ] Review pod security policies
- [ ] Check for unauthorized access attempts in logs
- [ ] Rotate secrets if > 90 days old

### [ ] Performance Review
- [ ] Compare current week metrics vs. previous week
- [ ] Identify any performance regressions
- [ ] Review HPA scaling events (were they appropriate?)

---

## Notes

- Update team wiki with findings
- Schedule monthly tasks if due
- Plan any maintenance windows
