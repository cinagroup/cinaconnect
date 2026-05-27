# Pricing Plans

Cinacoin offers flexible pricing tiers designed for every stage of your project — from solo developers building their first dApp to enterprises running mission-critical infrastructure at global scale.

---

## Overview

| Feature | Free | Pro ($99/mo) | Enterprise (Custom) |
|---|---|---|---|
| Monthly Active Users (MAU) | Unlimited | Unlimited | Unlimited |
| Relay Type | Self-hosted relay | Managed relay | Dedicated relay |
| Support | Community | Priority | Dedicated account manager |
| License | Open-source (MIT) | Commercial | Custom agreement |
| Supported Chains | 3 chains | 10 chains | Unlimited |
| Analytics Dashboard | — | ✅ Full dashboard | ✅ Full + custom dashboards |
| Custom Domains | — | ✅ | ✅ |
| SLA | — | 99.9% uptime | 99.99% uptime |
| On-Premise Deployment | — | — | ✅ |
| Custom Integrations | — | — | ✅ |
| API Rate Limits | Standard | Elevated | Negotiated |

---

## Free Tier

**Price:** $0 — forever free

The Free Tier gives you everything you need to build, test, and launch. No credit card required, no hidden limits on users.

### What's Included

- **Unlimited Monthly Active Users** — Scale your user base without worrying about per-user pricing.
- **Self-Hosted Relay** — Run your own relay node using our open-source infrastructure. Full configuration control.
- **Community Support** — Access our Discord, GitHub Discussions, and community forums.
- **Open-Source License (MIT)** — Use Cinacoin in any project, commercial or personal.
- **3 Supported Chains** — Connect users on EVM (e.g., Ethereum, Polygon), Solana, and Bitcoin.
- **Core SIWX Authentication** — Sign-In with Cross-chain across all supported chains.

### Best For

- Solo developers and hobbyists
- Open-source projects
- Prototyping and MVPs
- Community-driven dApps

### Getting Started

```bash
npm install @cinacoin/core @cinacoin/siwx
```

No signup, no API keys, no limits. Just install and go.

---

## Pro Tier

**Price:** $99/month (billed annually: $990/year)

The Pro Tier adds managed infrastructure, observability, and premium support for production applications.

### What's Included

- **Everything in Free**, plus:
- **Managed Relay** — No infrastructure to maintain. We run highly available relay nodes across multiple regions.
- **Analytics Dashboard** — Real-time metrics on authentication events, chain usage, user growth, and error rates.
- **Priority Support** — Get responses within 4 hours during business hours. Slack channel access.
- **Custom Domains** — Use your own domain for authentication flows (e.g., `auth.yourapp.com`).
- **10 Supported Chains** — Add up to 10 chains from our supported list:
  - EVM: Ethereum, Polygon, Arbitrum, Optimism, Base, BSC, Avalanche, zkSync, Scroll, Linea
  - Solana: Mainnet, Devnet
  - Bitcoin: Mainnet, Testnet
  - TON: Mainnet, Testnet
  - Tron: Mainnet, Shasta
- **Elevated API Rate Limits** — 10× the standard rate limits.

### Best For

- Production dApps with active user bases
- Small to medium teams
- Projects requiring SLA guarantees
- Teams without dedicated DevOps

### Adding a New Chain

```typescript
import { OnuxApp } from '@cinacoin/core';

const app = new OnuxApp({
  projectId: 'your-project-id',
  chains: [
    'eip155:1',        // Ethereum
    'eip155:137',      // Polygon
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    'bip122:000000000019d6689c085ae165831e93',
    'ton:mainnet',
    // ... up to 10 chains
  ],
});
```

---

## Enterprise Tier

**Price:** Custom — based on your requirements

The Enterprise Tier is for organizations that need dedicated infrastructure, custom integrations, and white-glove support.

### What's Included

- **Everything in Pro**, plus:
- **Dedicated Relay** — Your own relay instance, isolated from other tenants. Deployed in your choice of region.
- **99.99% SLA** — Guaranteed uptime with financial credits if we miss it.
- **On-Premise Deployment** — Run Cinacoin entirely within your own infrastructure — air-gapped networks included.
- **Custom Integrations** — We'll build adapters for your proprietary chains, wallets, or identity systems.
- **Unlimited Chains** — No cap on the number of chains you can support.
- **Custom Dashboards** — Analytics tailored to your KPIs, with custom alerts and reporting.
- **Dedicated Account Manager** — Single point of contact for all technical and business needs.
- **Negotiated Rate Limits** — Scale to your traffic patterns.
- **SOC 2 / ISO 27001 Compliance Reports** — Available for your security reviews.

### Best For

- Large organizations and enterprises
- Financial institutions and DeFi protocols
- Government and regulated industries
- Projects requiring on-premise or air-gapped deployments

### Getting Started

Contact us at [enterprise@cinacoin.com](mailto:enterprise@cinacoin.com) or fill out our [Enterprise Inquiry Form](#).

---

## Usage-Based Add-Ons

Need more than your plan includes? Add-ons let you scale incrementally.

| Add-On | Price | Description |
|---|---|---|
| Extra Chain | $19/mo per chain | Add chains beyond your plan's limit (Pro max: 20 with add-ons) |
| Extra RPC Calls | $0.001 per 1,000 calls | For bursts above your plan's allocation |
| Premium Support | $299/mo | 24/7 support with 1-hour response time, phone support |
| Custom Branding | $49/mo | White-label the connect UI with your logo and colors |
| Advanced Analytics | $99/mo | Export raw event data, custom date ranges, cohort analysis |
| SSO / SAML Integration | $199/mo | Enterprise SSO for your team to access the dashboard |

---

## Migration Between Tiers

### Upgrading

**Free → Pro**

1. Create a Cinacoin Dashboard account at [dashboard.cinacoin.com](#).
2. Navigate to **Settings → Billing**.
3. Select the **Pro** plan and enter your payment details.
4. Your managed relay is provisioned automatically within 5 minutes.
5. Update your `projectId` in the app configuration.

```typescript
// Before (Free — self-hosted)
const app = new OnuxApp({
  relayUrl: 'ws://localhost:8080',
});

// After (Pro — managed relay)
const app = new OnuxApp({
  projectId: 'your-project-id', // from dashboard
});
```

**Pro → Enterprise**

1. Contact your account manager or email enterprise@cinacoin.com.
2. We'll schedule a technical requirements call.
3. A custom proposal is delivered within 3 business days.
4. Migration is handled by our infrastructure team with zero downtime.

### Downgrading

**Pro → Free**

1. Cancel your Pro subscription from the dashboard.
2. Your plan remains active until the end of the billing period.
3. After the period ends:
   - Analytics data is retained for 30 days (export before downgrade).
   - Your app falls back to self-hosted relay mode.
   - Custom domains are released.

**Enterprise → Pro**

- Requires 30-day notice.
- Dedicated relay is decommissioned; data migration assistance is provided.
- Custom integrations remain usable under the Pro tier's chain limits.

### Data Retention

| Action | Analytics Data | Session Data | Configuration |
|---|---|---|---|
| Free → Pro | Preserved | Preserved | Migrated |
| Pro → Free | Retained 30 days | Preserved | Migrated |
| Pro → Enterprise | Preserved | Preserved | Migrated |
| Enterprise → Pro | Retained 90 days | Preserved | Migrated |
| Cancellation (all tiers) | Retained 90 days | Retained 30 days | Retained 1 year |

---

## FAQ

### Can I switch plans mid-billing cycle?

Yes. Upgrades take effect immediately (prorated charge). Downgrades take effect at the end of the current billing cycle.

### Do I need a credit card for the Free Tier?

No. The Free Tier requires no payment information.

### What happens if I exceed my plan's limits?

Your service continues running. You'll receive a notification and can add usage-based add-ons or upgrade your plan. We never shut down your app mid-usage.

### Can I get a refund?

Pro Tier subscriptions are eligible for a full refund within the first 14 days. Enterprise agreements follow the terms of your custom contract.

### Is there a trial for the Enterprise Tier?

Yes. We offer a 30-day proof-of-concept deployment with dedicated relay and support. Contact us to get started.

### Do you offer discounts for open-source projects?

Yes. Verified open-source projects with active communities may qualify for Pro Tier features at no cost. Apply through our [Open-Source Program](#).
