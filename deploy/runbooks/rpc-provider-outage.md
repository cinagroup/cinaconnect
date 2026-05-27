# Runbook: RPC Provider Outage

**Severity:** P1  
**Alert:** HighRPCErrorRate, CriticalRPCErrorRate  
**SLA Impact:** RPC availability < 99.9%

---

## Symptoms

- RPC error rate > 50%
- All provider health checks failing
- Client transactions failing
- High failover event rate

---

## Diagnosis

### Step 1: Check Provider Status Pages

- Alchemy: https://status.alchemy.com
- Infura: https://status.infura.io
- QuickNode: https://status.quicknode.com
- Ankr: https://status.ankr.com

### Step 2: Check Local Node Health

```bash
# Test Erigon node directly
curl -s -X POST http://erigon-ethereum:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq
```

### Step 3: Check Network Connectivity

```bash
# Test external provider reachability
curl -I https://eth-mainnet.g.alchemy.com/v2/demo
curl -I https://mainnet.infura.io/v3/demo
```

### Step 4: Check RPC Proxy Logs

```bash
kubectl logs -l app=rpc-proxy -n cinacoin --tail=200 | grep -i error
```

---

## Remediation

### Step 1: Enable Emergency Public Nodes

Update RPC proxy config to include fallback public nodes:

```bash
kubectl edit configmap rpc-proxy-config -n cinacoin
# Add public node endpoints to providers list
```

### Step 2: Scale Local Nodes

```bash
# Increase Erigon replicas for more capacity
kubectl scale statefulset erigon-ethereum -n cinacoin --replicas=3
```

### Step 3: Route Traffic to Healthy Providers

```bash
# Update provider priority in RPC proxy
kubectl exec -it deploy/rpc-proxy -n cinacoin -- curl -X POST http://localhost:8545/admin/update-providers \
  -H "Content-Type: application/json" \
  -d '{"providers": [{"name": "alchemy", "weight": 80}, {"name": "local", "weight": 20}]}'
```

### Step 4: Contact Provider Support

If outage is confirmed on provider side, open support ticket and track ETA.

---

## Escalation

- **10 min unresolved:** Notify on-call engineer
- **20 min unresolved:** Page SRE team
- **1 hr unresolved:** Consider degrading gracefully (read-only mode for non-critical paths)

---

## Post-Incident

1. Review provider SLA credits
2. Update provider weight configuration
3. Add affected provider to incident log
4. Evaluate if additional provider redundancy is needed
