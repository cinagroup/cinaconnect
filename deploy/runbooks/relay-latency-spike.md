# Runbook: Relay Latency Spike

**Severity:** P1  
**Alert:** HighRelayLatency, CriticalRelayLatency  
**SLA Impact:** Relay P99 latency > 500ms violates SLO

---

## Symptoms

- Relay P99 latency > 500ms sustained for 5+ minutes
- WebSocket connection timeout increase
- Client disconnections spike
- Message delivery delays reported by users

---

## Diagnosis

### Step 1: Check NATS Cluster Status

```bash
kubectl get pods -n cinacoin -l app=nats
kubectl logs -l app=nats -n cinacoin --tail=100
```

### Step 2: Check Redis Connection

```bash
kubectl exec -it deploy/relay-server -n cinacoin -- redis-cli -h redis-cluster ping
```

### Step 3: Check Pod Resource Usage

```bash
kubectl top pods -n cinacoin -l app=relay-server
```

Check for:
- CPU saturation (> 80% sustained)
- Memory approaching limits (OOMKill risk)

### Step 4: Check NATS JetStream Metrics

```bash
kubectl port-forward svc/nats-cluster 8222:8222 -n cinacoin &
curl http://localhost:8222/varz | jq '.jetstream'
```

### Step 5: Check Region-Specific Issues

```bash
# Compare latency across regions
curl -s http://grafana/api/v1/query?query=histogram_quantile\(0.99,sum\(rate\(relay_message_duration_seconds_bucket\[5m\]\)\)\+by+\(le,region\)\) | jq
```

---

## Remediation

### If NATS is abnormal:

```bash
kubectl rollout restart statefulset nats-cluster -n cinacoin
```

### If Redis is abnormal:

```bash
kubectl rollout restart statefulset redis-cluster -n cinacoin
```

### If CPU is saturated:

```bash
# Scale up temporarily
kubectl scale deployment relay-server -n cinacoin --replicas=6
```

### If issue persists:

```bash
# Rolling restart all Relay pods
kubectl rollout restart deployment relay-server -n cinacoin
```

---

## Escalation

- **15 min unresolved:** Notify on-call engineer via PagerDuty
- **30 min unresolved:** Page SRE team lead
- **1 hr unresolved:** Incident commander activation

---

## Post-Incident

1. Collect heap profiles: `curl http://<pod-ip>:9090/debug/pprof/heap -o heap.prof`
2. Review NATS logs for backpressure indicators
3. Check for upstream provider degradation
4. Update runbook with findings
