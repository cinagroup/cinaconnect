# Troubleshooting Guide

> Common issues and solutions for CinaConnect development, deployment, and production.

---

## 🔗 Connection Issues

### QR Code Not Scanning

**Symptoms**: Wallet app fails to scan the QR code or connection times out after scanning.

**Possible causes and solutions**:

1. **QR code format invalid**
   - Verify the URI follows the WalletConnect v2 format: `wc:<topic>@<version>?relay-protocol=irn&relay-data=<data>`
   - Check the relay URL is accessible: `curl wss://relay.yourdomain.com/v1`

2. **Relay Server unreachable**
   ```bash
   # Test WebSocket connectivity
   wscat -c wss://relay.yourdomain.com/v1
   ```
   - If connection fails, check:
     - Relay Server is running: `kubectl get pods -n cinaconnect | grep relay`
     - Ingress/LoadBalancer is properly configured
     - SSL certificate is valid
     - Firewall rules allow WebSocket (port 443)

3. **Wallet doesn't support the relay protocol**
   - CinaConnect uses the Iridium relay protocol, compatible with WalletConnect v2
   - Check wallet's supported relay protocols in their documentation

4. **QR code expired**
   - QR codes have a TTL (default: 300 seconds)
   - Increase TTL in relay config if needed

### Deep Links Failing (Mobile)

**Symptoms**: Tapping a wallet link doesn't open the wallet app or returns to the dApp without connecting.

**Solutions**:

1. **URL scheme not registered**
   - Verify the wallet's URL scheme in your redirect config:
   ```typescript
   // React Native
   <CinaConnectProvider config={{
     // ...
     redirect: {
       native: 'myapp://',      // Your app's URL scheme
       universal: 'https://myapp.com',  // Universal link
     }
   }}>
   ```

2. **Universal Links not configured**
   - Ensure `apple-app-site-association` is served from your domain
   - Ensure `assetlinks.json` is served for Android
   - Test with: `curl https://yourdomain.com/.well-known/apple-app-site-association`

3. **Intent filter missing (Android)**
   ```xml
   <!-- AndroidManifest.xml -->
   <intent-filter android:autoVerify="true">
     <action android:name="android.intent.action.VIEW" />
     <category android:name="android.intent.category.DEFAULT" />
     <category android:name="android.intent.category.BROWSABLE" />
     <data android:scheme="https" android:host="myapp.com" />
   </intent-filter>
   ```

4. **Deep link not handled in app**
   ```typescript
   // React Native - ensure handleDeepLink is called
   useEffect(() => {
     const handleUrl = (url: string) => {
       handleDeepLink(url)
     }
     Linking.addEventListener('url', ({ url }) => handleUrl(url))
     Linking.getInitialURL().then((url) => {
       if (url) handleUrl(url)
     })
     return () => Linking.removeEventListener('url', handleUrl)
   }, [handleDeepLink])
   ```

### Connection Drops After Inactivity

**Symptoms**: Wallet connects fine but disconnects after a few minutes.

**Solutions**:

1. **WebSocket keepalive not configured**
   ```typescript
   const transport = new RelayTransport({
     url: 'wss://relay.yourdomain.com/v1',
     reconnectInterval: 5000,
     pingInterval: 30000,       // Send ping every 30s
   })
   ```

2. **Reverse proxy timeout too short**
   - Nginx: `proxy_read_timeout 86400s;`
   - HAProxy: `timeout tunnel 3600000ms`

3. **Mobile OS suspends background WebSocket**
   - Use Push Notifications to wake the app when a message arrives
   - Implement Push Server (see Phase 4 docs)

---

## 🔐 Authentication Issues

### SIWE (Sign-In with Ethereum) Failing

**Symptoms**: User signs the message but authentication fails.

**Solutions**:

1. **Domain mismatch**
   - The `domain` field in the SIWE message must match the requesting origin
   - Server must validate: `parsedMessage.domain === request.headers.origin`

2. **Nonce reuse (replay attack protection)**
   - Each SIWE message must use a unique nonce
   - Server should track used nonces:
   ```typescript
   // Store nonce in Redis with TTL
   await redis.setex(`siwe:nonce:${nonce}`, 3600, 'used')

   // Verify before processing
   const exists = await redis.get(`siwe:nonce:${nonce}`)
   if (exists) throw new Error('Nonce already used')
   ```

3. **Message expired**
   - Check `expirationTime` in the SIWE message
   - Default TTL is 1 hour; adjust if needed:
   ```typescript
   const siweMessage = generateMessage({
     // ...
     expirationTime: new Date(Date.now() + 3600000).toISOString(),
   })
   ```

4. **Signature verification fails**
   - Verify the address matches the signer:
   ```typescript
   const result = await verifyMessage(message, signature)
   console.log(result.address)  // Should match expected address
   ```

5. **Chain ID mismatch**
   - Ensure the message was signed on the expected chain
   - Check `chainId` in the SIWE message

### Session Expiry

**Symptoms**: User is connected but session expires unexpectedly.

**Solutions**:

1. **Session TTL too short**
   ```typescript
   const sessionManager = new SessionManager({
     storage: localStorage,
     ttl: 30 * 24 * 60 * 60 * 1000,  // 30 days
   })
   ```

2. **Session not persisted**
   - Ensure `storage` is configured (localStorage for web, AsyncStorage for React Native)
   - Check browser privacy settings aren't blocking storage

3. **Relay session expired**
   - Relay sessions have a separate TTL
   - Implement session refresh logic:
   ```typescript
   cinaconnect.on('sessionExpired', async () => {
     await cinaconnect.reconnect()
   })
   ```

---

## 🏗️ Build Issues

### TypeScript Errors

#### `Cannot find module '@cinaconnect/core'`

**Solution**: Ensure the package is built and linked correctly.

```bash
# Build all packages
pnpm install
pnpm build

# Or for a specific package
cd packages/core-sdk
pnpm build
```

#### `Property 'X' does not exist on type 'Y'`

**Solution**: Check your `@cinaconnect` package version. Newer APIs may require updating:

```bash
# Check installed version
npm ls @cinaconnect/core

# Update to latest
npm update @cinaconnect/core
```

#### Type mismatch with viem/ethers

**Solution**: CinaConnect uses `viem` internally. If you're using `ethers`, convert types:

```typescript
import { getAddress } from 'viem'

// ethers Address → viem Address
const viemAddress = getAddress(ethersAddress) as `0x${string}`
```

### Missing Dependencies

**Symptoms**: Build fails with `Module not found` errors.

**Solution**: Install all required peer dependencies.

```bash
# Core SDK
npm install @cinaconnect/core viem

# React integration
npm install @cinaconnect/react react react-dom

# React Native
npm install @cinaconnect/react-native react-native

# SIWE
npm install @cinaconnect/siwe

# Swap SDK
npm install @cinaconnect/swap-sdk viem

# On-Ramp SDK
npm install @cinaconnect/onramp-sdk

# Session Keys
npm install @cinaconnect/session-keys viem
```

### Monorepo Build Errors

```bash
# Clean and rebuild everything
pnpm clean
pnpm install
pnpm build

# Or use Turbo for parallel build
pnpm turbo run build
```

---

## 🚀 Deployment Issues

### Helm Installation Failing

**Symptoms**: `helm install` fails with various errors.

**Solutions**:

1. **Namespace doesn't exist**
   ```bash
   kubectl create namespace cinaconnect
   # Or use --create-namespace
   helm install cinaconnect ./deploy/helm/cinaconnect \
     --namespace cinaconnect --create-namespace
   ```

2. **Missing values**
   - Check required values in `values.yaml`:
   ```bash
   helm lint ./deploy/helm/cinaconnect
   helm template ./deploy/helm/cinaconnect \
     --values ./deploy/helm/cinaconnect/values.yaml
   ```

3. **Resource quotas exceeded**
   ```bash
   kubectl describe quota -n cinaconnect
   # Adjust resource requests in values.yaml
   ```

### Pods Not Starting

**Symptoms**: Pods stuck in `Pending` or `CrashLoopBackOff`.

**Diagnose**:

```bash
# Check pod status
kubectl get pods -n cinaconnect

# Check events
kubectl describe pod <pod-name> -n cinaconnect

# Check logs
kubectl logs <pod-name> -n cinaconnect

# Check previous pod logs (for crash loops)
kubectl logs <pod-name> -n cinaconnect --previous
```

**Common causes**:

| Pod Status | Likely Cause | Fix |
|-----------|-------------|-----|
| `Pending` | Insufficient resources | Scale cluster or reduce requests |
| `Pending` | PVC not bound | Check StorageClass |
| `CrashLoopBackOff` | Config error | Check logs, fix config |
| `CrashLoopBackOff` | Missing env vars | Check Secret/ConfigMap |
| `ImagePullBackOff` | Image not found | Check image name/tag |
| `ErrImagePull` | Auth issue | Check imagePullSecrets |

### Relay Server Won't Start

```bash
# Check relay-specific logs
kubectl logs -l app=relay -n cinaconnect --tail=100

# Common issues:
# 1. NATS not reachable
kubectl get pods -l app=nats -n cinaconnect

# 2. Invalid config
# Check ConfigMap
kubectl get configmap relay-config -n cinaconnect -o yaml

# 3. Port conflict
kubectl get svc -n cinaconnect
```

---

## ⚡ Performance Issues

### Slow Connection Time

**Symptoms**: Wallet connection takes >5 seconds.

**Solutions**:

1. **High latency to Relay Server**
   ```bash
   # Measure latency
   curl -o /dev/null -w '%{time_total}\n' https://relay.yourdomain.com/health
   ```
   - Deploy Relay Server closer to users (multi-region)
   - Use CDN for static assets

2. **DNS resolution slow**
   - Use `preconnect` in HTML:
   ```html
   <link rel="preconnect" href="https://relay.yourdomain.com">
   <link rel="dns-prefetch" href="https://relay.yourdomain.com">
   ```

3. **Too many wallet connectors**
   - Limit the number of wallets shown in ConnectModal
   - Use `recommendedWallets` to prioritize

### High Latency on Swap Quotes

**Symptoms**: `getBestQuote()` takes >3 seconds.

**Solutions**:

1. **Slow DEX providers**
   - The quoter has a default 5s timeout per provider
   - Remove slow providers:
   ```typescript
   quoter.removeExecutor('SlowProvider')
   ```

2. **Network latency to DEX APIs**
   - Cache token lists and price data
   - Use regional API endpoints

3. **Increase parallelism**
   - Quotes are fetched in parallel via `Promise.allSettled`
   - Ensure your Node.js event loop isn't blocked

### RPC Proxy High Latency

**Symptoms**: `eth_call` or `eth_getBalance` takes >1 second.

**Solutions**:

1. **Cache not working**
   - Check Redis connectivity:
   ```bash
   kubectl exec -it <redis-pod> -n cinaconnect -- redis-cli ping
   ```

2. **Provider routing suboptimal**
   - Check provider health scores in the RPC Proxy config
   - Adjust weights in `providers.yaml`

3. **Too many concurrent requests**
   - Scale RPC Proxy horizontally:
   ```bash
   helm upgrade cinaconnect ./deploy/helm/cinaconnect \
     --set rpcProxy.replicas=5
   ```

---

## 📋 Error Code Reference

### Client-Side Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `CONN_001` | No connectors available | No wallets installed or configured | Install wallet extension or add more connectors |
| `CONN_002` | Connection rejected by user | User cancelled in wallet | Retry connection |
| `CONN_003` | Connection timeout | Network issue or relay down | Check relay connectivity |
| `CONN_004` | Session expired | Session TTL exceeded | Reconnect or refresh session |
| `CONN_005` | Chain not supported | Requested chain not configured | Add chain to config |
| `CONN_006` | Invalid relay URL | Relay URL malformed | Verify WebSocket URL format |
| `AUTH_001` | SIWE signature invalid | Wrong message or tampered | Regenerate message |
| `AUTH_002` | SIWE nonce used | Replay attack protection | Generate new nonce |
| `AUTH_003` | SIWE message expired | Past expirationTime | Regenerate message |
| `AUTH_004` | Domain mismatch | Phishing protection | Fix domain config |

### Build Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `BUILD_001` | Missing peer dependency | viem/react not installed | Install required peer deps |
| `BUILD_002` | Type mismatch | Version incompatibility | Align package versions |
| `BUILD_003` | Module not found | Package not built | Run `pnpm build` |
| `BUILD_004` | Duplicate React | Multiple React copies | Dedupe: `pnpm dedupe` |

### Deployment Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `DEPLOY_001` | Helm install failed | Invalid values | Run `helm lint` |
| `DEPLOY_002` | Pod CrashLoopBackOff | Config error | Check pod logs |
| `DEPLOY_003` | PVC not bound | No StorageClass | Create StorageClass |
| `DEPLOY_004` | ImagePullBackOff | Invalid image | Check image name/tag |
| `DEPLOY_005` | OOMKilled | Insufficient memory | Increase memory limit |
| `DEPLOY_006` | NATS connection failed | NATS not running | Check NATS pods |
| `DEPLOY_007` | Redis connection failed | Redis not running | Check Redis pods |
| `DEPLOY_008` | Ingress not ready | Ingress controller missing | Install ingress controller |

### Swap SDK Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `SWAP_001` | No valid quotes | All providers failed | Check provider APIs |
| `SWAP_002` | Quote expired | TTL exceeded before execution | Request new quote |
| `SWAP_003` | Execution disabled | `setExecutionEnabled(false)` | Enable execution |
| `SWAP_004` | Price impact too high | Large trade / low liquidity | Reduce trade size or accept higher slippage |
| `SWAP_005` | Insufficient balance | Not enough tokens | Check token balance |

### On-Ramp Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| `ONRAMP_001` | No providers available | Region not supported | Check region support |
| `ONRAMP_002` | Amount below minimum | Below provider min | Increase amount |
| `ONRAMP_003` | Amount above maximum | Above provider max | Decrease amount |
| `ONRAMP_004` | KYC required | User region needs KYC | Guide user through KYC |
| `ONRAMP_005` | Widget failed to load | Network issue | Check connectivity |

---

## 📞 Getting Help

If you're still stuck after checking this guide:

1. **Check the logs** — Most issues leave traces in logs
2. **Search GitHub Issues** — Someone may have reported the same problem
3. **Enable debug mode** — Set `debug: true` in your config for verbose logging
4. **Community** — Join the CinaConnect community channels for help

```typescript
// Enable debug logging
const cinaconnect = new CinaConnect({
  // ...
  debug: true,  // Verbose console output
})
```
