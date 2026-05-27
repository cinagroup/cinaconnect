# Runbook: Memory Leak Investigation

**Severity:** P2  
**Alert:** NodeHighMemoryUsage, RelayPodCrash (OOMKill)  
**SLA Impact:** Potential service degradation or crash

---

## Symptoms

- Pod memory usage持续增长
- OOMKill events in pod events
- Grafana memory graphs showing upward trend
- Performance degradation before crash

---

## Diagnosis

### Step 1: Check Pod Events for OOMKill

```bash
kubectl get events -n cinacoin --field-selector reason=OOMKilling
kubectl describe pod -l app=relay-server -n cinacoin | grep -A5 "Last State"
```

### Step 2: Check Memory Usage Trend

In Grafana:
- Navigate to: Relay Metrics > Pod Memory Usage
- Set time range to 24h or 7d
- Look for continuous upward slope without GC recovery

### Step 3: Collect Heap Profile (Rust/Relay)

```bash
# Get the pod name
POD=$(kubectl get pods -n cinacoin -l app=relay-server -o jsonpath='{.items[0].metadata.name}')

# Collect heap profile via debug endpoint
kubectl exec -it $POD -n cinacoin -- curl http://localhost:9090/debug/pprof/heap > heap.prof

# Analyze with go tool pprof (or equivalent for Rust)
go tool pprof -top heap.prof
```

### Step 4: Check Go Memory Stats (RPC Proxy)

```bash
POD=$(kubectl get pods -n cinacoin -l app=rpc-proxy -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $POD -n cinacoin -- curl http://localhost:9090/debug/pprof/heap > rpc-heap.prof
```

### Step 5: Check System Memory

```bash
kubectl top pods -n cinacoin
kubectl top nodes
```

---

## Remediation

### Immediate:

```bash
# Restart affected pods
kubectl rollout restart deployment relay-server -n cinacoin
kubectl rollout restart deployment rpc-proxy -n cinacoin
```

### Short-term:

1. Increase memory limits temporarily:
```bash
kubectl patch deployment relay-server -n cinacoin -p '{"spec":{"template":{"spec":{"containers":[{"name":"relay","resources":{"limits":{"memory":"3Gi"}}}]}}}}'
```

2. Reduce connection limits if under load:
```bash
# Adjust max connections in relay config
```

### Long-term:

1. Analyze heap profiles to identify leak source
2. Fix code and deploy new version
3. Set up memory usage alerting with trend analysis

---

## Escalation

- **30 min unresolved:** Notify development team
- **1 hr unresolved:** Consider rolling back to last stable version
- **Recurring issue:** Create bug ticket with heap profiles attached

---

## Post-Incident

1. Save heap profiles for analysis
2. Correlate with recent code changes
3. Add memory regression tests
4. Consider implementing memory limits with graceful degradation
