# Go-To-Market (GTM) Checklist

> A structured checklist for launching Cinacoin — from pre-launch preparation to post-launch optimization.

---

## Phase 1: Pre-Launch

### Infrastructure Readiness

| Item | Description | Status |
|------|-------------|--------|
| `projectId` configured | Unique project ID registered in Cinacoin dashboard | ☐ |
| Metadata set | App name, description, URL, and icons configured in `CinacoinProvider` | ☐ |
| Relay server deployed | Self-hosted relay running in production (or public relay verified) | ☐ |
| RPC endpoints configured | Primary + fallback RPC providers set up | ☐ |
| Domains verified | dApp domain registered with Cinacoin Verify API | ☐ |
| SSL/TLS certificates | Valid certificates for all domains (relay, dApp, APIs) | ☐ |

### Security Review

| Item | Description | Status |
|------|-------------|--------|
| CSP headers | Content Security Policy configured and tested | ☐ |
| wss:// enforcement | All WebSocket connections use TLS | ☐ |
| Session encryption | ChaCha20-Poly1305 end-to-end encryption verified | ☐ |
| SIWE nonce protection | Replay attack protection implemented (unique nonces) | ☐ |
| Rate limiting | Auth and API endpoints rate-limited | ☐ |
| Secret management | No secrets in code; using env vars or secret manager | ☐ |
| Dependency audit | `npm audit` or `pnpm audit` — no critical vulnerabilities | ☐ |
| API key rotation | All API keys have rotation schedule documented | ☐ |
| XSS protection | Auto-escaping verified; no `dangerouslySetInnerHTML` without sanitization | ☐ |
| CSRF protection | State-changing endpoints require CSRF tokens | ☐ |
| Input validation | All user inputs validated (addresses, amounts, URLs) | ☐ |
| Private key hygiene | No private keys in code, storage, logs, or error reports | ☐ |
| Phishing prevention | Domain registered with Cinacoin Verify API | ☐ |
| HTTPS everywhere | No mixed content; HSTS enabled | ☐ |
| SRI hashes | External CDN scripts include Subresource Integrity | ☐ |
| Error message safety | Errors don't leak internal state or stack traces | ☐ |
| Incident response plan | Documented response procedure for security events | ☐ |
| Secret scanning | CI/CD pipeline includes gitleaks or similar | ☐ |
| CORS configuration | Only known origins allowed | ☐ |
| TLS version | TLS 1.3 enforced on all endpoints | ☐ |

### Testing

| Item | Description | Status |
|------|-------------|--------|
| E2E tests passing | All Playwright/Maestro E2E tests pass | ☐ |
| Wallet compatibility | Tested across MetaMask, Rabby, WalletConnect, Coinbase Wallet | ☐ |
| Chain coverage | Tested on all target chains (mainnet + testnets) | ☐ |
| Mobile deep links | iOS Universal Links + Android App Links verified | ☐ |
| Social login | Google, email, and other providers tested end-to-end | ☐ |
| Error handling | All error paths display user-friendly messages | ☐ |
| Performance budget | Initial JS bundle < 500KB (gzipped) for Cinacoin portion | ☐ |
| Accessibility | Connect modal passes WCAG 2.1 AA | ☐ |

### Developer Experience

| Item | Description | Status |
|------|-------------|--------|
| Documentation complete | Quick start, API reference, guides published | ☐ |
| Code examples | Working examples for React, Next.js, vanilla JS | ☐ |
| Migration guide | Guide for migrating from Reown/WalletConnect | ☐ |
| SDK published | All packages published to npm/registry | ☐ |
| Version pinning | `package.json` uses specific versions (not `*`) | ☐ |
| TypeScript support | All packages ship with `.d.ts` type declarations | ☐ |

---

## Phase 2: Launch

### Analytics & Monitoring

| Item | Description | Status |
|------|-------------|--------|
| Analytics enabled | Cinacoin analytics tracking connection events | ☐ |
| Error tracking | Sentry/Datadog configured for error capture | ☐ |
| Uptime monitoring | Relay server and dApp monitored (UptimeRobot, Pingdom) | ☐ |
| Alerting configured | PagerDuty/Slack alerts for critical failures | ☐ |
| Dashboard live | Grafana/monitoring dashboard showing real-time metrics | ☐ |
| Log aggregation | Centralized logging (ELK, Datadog, CloudWatch) | ☐ |

### Launch Metrics to Track

| Metric | Target | Tool |
|--------|--------|------|
| Connection success rate | > 95% | Cinacoin analytics |
| Average connection time | < 3 seconds | Custom timing |
| Error rate | < 2% | Sentry |
| Active sessions | Monitor trend | Cinacoin analytics |
| Bounce rate at connect modal | < 30% | Google Analytics |
| Page load time (LCP) | < 2.5 seconds | Web Vitals |

### Launch Checklist

| Item | Description | Status |
|------|-------------|--------|
| Soft launch | Deploy to staging; test with internal team | ☐ |
| Canary release | Roll out to 10% of users first | ☐ |
| Rollout plan | Gradual increase: 10% → 25% → 50% → 100% | ☐ |
| Rollback plan | Can revert to previous version in < 5 minutes | ☐ |
| Support team briefed | Customer support knows Cinacoin features | ☐ |
| Social media ready | Announcements prepared for launch day | ☐ |
| Blog post published | Technical blog post about the migration/build | ☐ |
| Changelog updated | Version changelog with all changes | ☐ |

### Post-Launch Day 1

| Item | Description | Status |
|------|-------------|--------|
| Monitor error dashboard | Watch Sentry for new errors | ☐ |
| Check analytics | Verify connection rates and funnel | ☐ |
| Review user feedback | Check support tickets, social media | ☐ |
| Verify relay stability | Check relay server logs and metrics | ☐ |
| Test critical paths | Manually test connect → swap → auth flows | ☐ |

---

## Phase 3: Post-Launch

### User Feedback Loop

| Item | Description | Status |
|------|-------------|--------|
| Feedback mechanism | In-app feedback form or widget | ☐ |
| Issue triage process | GitHub issues categorized and prioritized | ☐ |
| Community channels | Discord/Telegram/Forum active and monitored | ☐ |
| NPS survey | Net Promoter Score survey for early users | ☐ |
| User interviews | Schedule 5-10 user interviews in first 2 weeks | ☐ |

### Performance Optimization

| Item | Description | Status |
|------|-------------|--------|
| Bundle analysis | Run `vite-bundle-visualizer` and optimize | ☐ |
| Lazy loading | Connect modal loaded on-demand, not at startup | ☐ |
| Code splitting | Cinacoin packages in separate chunk | ☐ |
| Caching strategy | Token lists, chain configs cached with proper TTL | ☐ |
| CDN configured | Static assets served from CDN | ☐ |
| WebSocket optimization | Ping/keepalive tuned; reconnect logic verified | ☐ |

### A/B Testing

| Test | Hypothesis | Metric |
|------|-----------|--------|
| Connect modal position | Moving connect button to header increases CTR | Click-through rate |
| Wallet ordering | Recommended wallets first improves conversion | Connection success rate |
| Theme (dark vs light) | Dark theme increases session duration | Time in app |
| SIWE vs social login | Social login has higher completion rate | Auth completion rate |
| Gas sponsorship messaging | Showing "gas-free" badge increases transactions | Transaction volume |

**Implement A/B testing:**

```typescript
import { Cinacoin } from '@cinacoin/core'

// Pass experiment config
const cinacoin = new Cinacoin({
  projectId: 'your-project-id',
  relayUrl: 'wss://relay.cinacoin.com/v1',
  chains: [mainnet],
  experiments: {
    walletOrder: 'recommended-first', // vs 'alphabetical'
    theme: 'dark', // vs 'light'
    authFlow: 'social-first', // vs 'wallet-first'
  },
})

// Track experiment results
cinacoin.on('connect', (session) => {
  analytics.track('experiment_connect', {
    experiment: 'walletOrder',
    variant: 'recommended-first',
    wallet: session.wallet.name,
  })
})
```

### Continuous Improvement

| Item | Cadence | Owner |
|------|---------|-------|
| Error rate review | Daily | Engineering |
| Performance audit | Weekly | Engineering |
| User feedback review | Weekly | Product |
| Security scan | Monthly | Security |
| Dependency updates | Monthly | Engineering |
| Feature roadmap review | Bi-weekly | Product + Engineering |
| Infrastructure cost review | Monthly | DevOps |

### Scaling Checklist

| Item | Trigger | Action |
|------|---------|--------|
| Relay server scaling | > 70% CPU or connection queue > 1000 | Add relay replicas |
| RPC provider scaling | > 90% error rate or latency > 2s | Add fallback providers |
| CDN expansion | > 200ms TTFB in a region | Add edge location |
| Database scaling | > 80% storage or slow queries | Scale Redis/DB cluster |
| Session storage growth | localStorage > 4MB | Implement cleanup policy |

---

## Quick Reference: Launch Command Sequence

```bash
# 1. Pre-launch checks
pnpm audit          # Check dependencies
pnpm test           # Run test suite
pnpm build          # Build all packages
helm lint ./deploy/helm/cinacoin  # Validate Helm chart

# 2. Deploy infrastructure
kubectl apply -f deploy/k8s/namespace.yaml
helm upgrade cinacoin ./deploy/helm/cinacoin \
  --namespace cinacoin \
  --values ./deploy/helm/cinacoin/values-production.yaml

# 3. Verify deployment
kubectl get pods -n cinacoin
kubectl get svc -n cinacoin
curl https://relay.cinacoin.com/v1/health

# 4. Deploy dApp
npm run build && npm run deploy

# 5. Post-deploy verification
npx playwright test --project=chromium
curl https://mydapp.com/api/health
```

---

*Go-To-Market Checklist — Cinacoin Documentation*
