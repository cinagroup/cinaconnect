# Runbook: Blockchain Node Desync

**Severity:** P2  
**Alert:** NodeSyncLagging, NodeBlockHeightStalled  
**SLA Impact:** Node availability may degrade

---

## Symptoms

- `node_sync_status == 0`
- Block height > 100 blocks behind chain tip
- Node peer count dropping
- Increased RPC latency from local node

---

## Diagnosis

### Step 1: Check P2P Connections

```bash
curl -s -X POST http://erigon-ethereum:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' | jq
```

### Step 2: Check Node Logs

```bash
kubectl logs statefulset/erigon-ethereum -n cinacoin --tail=500 | grep -iE "sync|import|error"
```

### Step 3: Check Disk I/O

```bash
kubectl exec -it erigon-ethereum-0 -n cinacoin -- iostat -x 5 3
```

Look for:
- `%util` > 90% on data volume
- `await` > 100ms

### Step 4: Check Memory Usage

```bash
kubectl top pods -n cinacoin -l app=erigon-ethereum
free -h  # if accessible
```

### Step 5: Compare Block Height with Chain Explorer

```bash
# Get node's current block
NODE_BLOCK=$(curl -s -X POST http://erigon-ethereum:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq -r '.result')

# Convert hex to decimal
echo "Node block: $((16#${NODE_BLOCK#0x}))"
```

---

## Remediation

### If P2P connections are low:

```bash
# Increase max_peers in Erigon config
kubectl edit statefulset erigon-ethereum -n cinacoin
# Add: --p2p.maxpeers=200
kubectl rollout restart statefulset erigon-ethereum -n cinacoin
```

### If disk I/O is bottlenecked:

1. Migrate to NVMe SSD storage class
2. Consider increasing `batchsize` parameter

### If node cannot recover:

```bash
# Option A: Restart (may resume sync)
kubectl rollout restart statefulset erigon-ethereum -n cinacoin

# Option B: Restore from snapshot (faster recovery)
# 1. Stop the node
kubectl scale statefulset erigon-ethereum -n cinacoin --replicas=0

# 2. Download latest snapshot to PVC
# (Use official Erigon snapshots)

# 3. Restart
kubectl scale statefulset erigon-ethereum -n cinacoin --replicas=2
```

---

## Escalation

- **30 min unresolved:** Notify SRE team
- **2 hr unresolved:** Consider increasing external provider traffic share

---

## Post-Incident

1. Document root cause (network, disk, peer issue)
2. Update monitoring thresholds if needed
3. Review snapshot strategy for faster recovery
4. Consider adding read replicas for redundancy
