# Monthly Ops Checklist — Cinacoin

---

## SLA Report

### [ ] SLA Report Generation
- [ ] Calculate monthly availability: `(total_time - downtime) / total_time * 100%`
- [ ] Relay P99 latency report
- [ ] RPC availability report
- [ ] Document any SLA breaches and root causes
- [ ] Share report with stakeholders

### [ ] Capacity Planning Review
- [ ] Analyze 30-day growth trends for:
  - [ ] WebSocket connections
  - [ ] RPC request volume
  - [ ] Storage consumption (Erigon data growth ~50GB/day)
  - [ ] Memory usage trends
- [ ] Project resource needs for next 30/60/90 days
- [ ] Plan scaling events or hardware upgrades

### [ ] Cost Optimization Analysis
- [ ] Review monthly cloud bill
- [ ] Compare actual spend vs. budget
- [ ] Identify optimization opportunities:
  - [ ] Spot instance utilization
  - [ ] Reserved instance opportunities
  - [ ] Unused resources to decommission
  - [ ] Storage tiering (hot vs. cold data)
- [ ] Calculate ROI vs. Reown commercial licensing

### [ ] Disaster Recovery Drill
- [ ] Test failover to secondary region
- [ ] Verify NATS cluster recovery procedure
- [ ] Test Erigon node restoration from snapshot
- [ ] Verify Redis AOF recovery
- [ ] Document recovery times vs. RTO/RPO targets

### [ ] Security Updates
- [ ] Apply security patches to all base images
- [ ] Update Rust toolchain and dependencies
- [ ] Update Go version and dependencies
- [ ] Review and rotate API keys/secrets (> 90 days old)
- [ ] Schedule penetration test if due (quarterly)

### [ ] Dependency Review
- [ ] Review upstream dependency changelogs
- [ ] Plan major version upgrades
- [ ] Check for deprecated API usage

### [ ] Documentation
- [ ] Update runbooks with lessons learned
- [ ] Update architecture diagrams if changed
- [ ] Review and update this checklist
- [ ] Archive monthly reports

---

## Monthly KPI Targets

| Metric | Target | Current |
|--------|--------|---------|
| Availability | 99.95% | _fill_ |
| Relay P99 | < 500ms | _fill_ |
| RPC Availability | 99.9% | _fill_ |
| RPC P95 | < 2s | _fill_ |
| Monthly Cost | < $7,000 | _fill_ |
| Cache Hit Rate | > 80% | _fill_ |
