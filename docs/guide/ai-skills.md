# AI Skills Integration Guide

> Use Cinacoin's AI-assisted development tools to accelerate your workflow with Claude, Cursor, GitHub Copilot, and more.

---

## Overview

Cinacoin provides a CLI-based AI skills system that integrates with your favorite AI coding assistant. The skills system generates project scaffolding, code snippets, and best-practice patterns tailored to your stack.

```
┌─────────────────────────────────────────────────┐
│                    Your Editor                    │
│  Claude  │  Cursor  │  Copilot  │  Codeium       │
└───────────────┬─────────────────────────────────┘
                │  prompts + context
┌───────────────▼─────────────────────────────────┐
│           @cinacoin/cli skills                │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ connect  │ │  auth    │ │  payment         │  │
│  │ scaffold │ │ scaffold │ │  scaffold        │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ chain    │ │  smart   │ │  mobile          │  │
│  │ adapter  │ │ account  │ │  deep link       │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## Installation

```bash
# Install the Cinacoin CLI globally
npm install -g @cinacoin/cli

# Or run without installing
npx @cinacoin/cli skills add
```

Verify installation:

```bash
cinacoin --version
cinacoin skills list
```

---

## CLI Commands

### List Available Skills

```bash
cinacoin skills list
```

Output:

```
Available AI Skills:
  connect          Wallet connection patterns (React, Next.js, Vue)
  auth             SIWE, SIWX, social login authentication flows
  payment          Swap, on-ramp, pay integration patterns
  chain            Multi-chain configuration and switching
  smart-account    ERC-4337 account abstraction setup
  mobile           React Native / Flutter deep link and wallet patterns
  ui               Connect modal customization and theming
  deploy           Infrastructure deployment templates
```

### Add a Skill to Your Project

```bash
# Add a specific skill
cinacoin skills add connect

# Add multiple skills
cinacoin skills add connect auth payment

# Add all skills
cinacoin skills add --all

# Add with a specific target directory
cinacoin skills add connect --output ./src/cinacoin
```

### Update Skills

```bash
cinacoin skills update
```

---

## AI Editor Integration

### Cursor

1. **Add Cinacoin context rules:**

```bash
cinacoin skills add --format cursor
```

This creates `.cursor/rules/cinacoin.mdc` with project-aware context.

2. **Configure Cursor to recognize Cinacoin patterns:**

```jsonc
// .cursor/settings.json
{
  "cinacoin": {
    "projectId": "your-project-id",
    "relayUrl": "wss://relay.cinacoin.com/v1",
    "chains": ["mainnet", "polygon", "arbitrum"]
  }
}
```

3. **Use in Cursor chat:**

```
@cinacoin How do I set up wallet connection with React?
```

Cursor will use the skills context to generate accurate, project-specific code.

### GitHub Copilot

```bash
cinacoin skills add --format copilot
```

This creates `.github/copilot-instructions.md` with Cinacoin-specific instructions.

**Example content generated:**

```markdown
# Cinacoin Instructions

This project uses Cinacoin (@cinacoin/react) for Web3 wallet connections.

## Key Patterns

### Wallet Connection
- Use `useOnux()` hook from `@cinacoin/react`
- Wrap app in `OnuxProvider` with projectId, relayUrl, and chains
- Handle connect/disconnect events with useEffect cleanup

### Multi-Chain
- Import chains from `@cinacoin/chains`
- Use `useOnuxNetwork()` for chain switching
- Always include optional chains in session proposal

### Error Handling
- Catch WC_1xxx errors for connection issues
- Use retryWithBackoff for transient failures
- Show user-friendly messages for all error codes
```

### Claude (claude.ai / Claude Desktop)

```bash
cinacoin skills add --format claude
```

Generates `CLAUDE.md` in your project root with Cinacoin context.

### VS Code + Custom Prompts

Create a reusable prompt template:

```bash
cinacoin skills add --format vscode
```

Generates `.vscode/cinacoin-prompts.md` you can reference in Copilot Chat.

---

## Code Snippets by Pattern

### Wallet Connection (React)

**Prompt for AI:** *"Generate a wallet connection component with Cinacoin"*

```tsx
import { OnuxProvider, useOnux, useOnuxAccount } from '@cinacoin/react'
import { mainnet, polygon, arbitrum } from '@cinacoin/chains'

function App() {
  return (
    <OnuxProvider
      projectId={import.meta.env.VITE_PROJECT_ID}
      relayUrl="wss://relay.cinacoin.com/v1"
      chains={[mainnet, polygon, arbitrum]}
      metadata={{
        name: 'My App',
        description: 'A Web3 application',
        url: 'https://myapp.com',
        icons: ['https://myapp.com/icon.png'],
      }}
    >
      <Main />
    </OnuxProvider>
  )
}

function Main() {
  const { open, isConnected } = useOnux()
  const { address, status } = useOnuxAccount()

  if (isConnected) {
    return (
      <div>
        <p>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
        <p>Status: {status}</p>
      </div>
    )
  }

  return <button onClick={() => open()}>Connect Wallet</button>
}
```

### SIWE Authentication

**Prompt for AI:** *"Generate a SIWE authentication flow with Cinacoin"*

```tsx
import { useSIWE } from '@cinacoin/siwe'
import { useOnuxAccount } from '@cinacoin/react'

function SignIn() {
  const { address } = useOnuxAccount()
  const { signIn, signOut, user, isAuthenticated } = useSIWE()

  const handleSignIn = async () => {
    try {
      await signIn('mydapp.com', {
        statement: 'Sign in to MyDapp to access your account.',
        nonce: crypto.randomUUID(),
        expirationTime: new Date(Date.now() + 3600000).toISOString(),
      })
    } catch (error) {
      console.error('SIWE failed:', error)
    }
  }

  if (isAuthenticated) {
    return (
      <div>
        <p>✅ Authenticated as {user?.address}</p>
        <button onClick={signOut}>Sign Out</button>
      </div>
    )
  }

  return (
    <div>
      <p>Connect your wallet and sign a message to authenticate</p>
      <button onClick={handleSignIn} disabled={!address}>
        {address ? 'Sign In with Ethereum' : 'Connect Wallet First'}
      </button>
    </div>
  )
}
```

### Swap Integration

**Prompt for AI:** *"Generate a token swap component with Cinacoin SwapSDK"*

```tsx
import { useState } from 'react'
import { SwapSDK } from '@cinacoin/swap-sdk'
import { useOnuxAccount } from '@cinacoin/react'

const swapSDK = new SwapSDK({ chainId: 1 })

function SwapWidget() {
  const { address } = useOnuxAccount()
  const [fromToken, setFromToken] = useState('USDC')
  const [toToken, setToToken] = useState('ETH')
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(false)

  const getQuote = async () => {
    setLoading(true)
    try {
      const q = await swapSDK.getBestQuote({
        fromToken,
        toToken,
        amount: BigInt(amount) * 10n ** 6n, // USDC has 6 decimals
        slippage: 0.5,
      })
      setQuote(q)
    } catch (error) {
      console.error('Failed to get quote:', error)
    } finally {
      setLoading(false)
    }
  }

  const executeSwap = async () => {
    if (!quote || !address) return
    try {
      const txHash = await swapSDK.execute(quote)
      console.log('Swap executed:', txHash)
    } catch (error) {
      console.error('Swap failed:', error)
    }
  }

  return (
    <div>
      <input
        type="text"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
      />
      <select value={fromToken} onChange={(e) => setFromToken(e.target.value)}>
        <option value="USDC">USDC</option>
        <option value="ETH">ETH</option>
      </select>
      <span>→</span>
      <select value={toToken} onChange={(e) => setToToken(e.target.value)}>
        <option value="ETH">ETH</option>
        <option value="USDC">USDC</option>
      </select>
      <button onClick={getQuote} disabled={!amount || loading}>
        {loading ? 'Getting quote...' : 'Get Quote'}
      </button>
      {quote && (
        <div>
          <p>Rate: 1 {fromToken} = {quote.rate} {toToken}</p>
          <p>Via: {quote.provider}</p>
          <button onClick={executeSwap}>Swap</button>
        </div>
      )}
    </div>
  )
}
```

### Multi-Chain Setup

**Prompt for AI:** *"Generate a multi-chain configuration with Cinacoin"*

```typescript
import { mainnet, polygon, arbitrum, base, optimism, bsc } from '@cinacoin/chains'
import { defineChain } from '@cinacoin/chains'

// Pre-configured production chains
const productionChains = [mainnet, polygon, arbitrum, base]

// Add a custom chain
const customChain = defineChain({
  id: 84532, // Base Sepolia
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    public: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
})

const allChains = [...productionChains, customChain]

// Environment-based chain selection
const chains = process.env.NODE_ENV === 'production'
  ? productionChains
  : [...productionChains, customChain]
```

### Social Login

**Prompt for AI:** *"Generate a social login flow with Cinacoin"*

```tsx
import { useState } from 'react'
import { SocialLogin } from '@cinacoin/social-login'

const socialLogin = new SocialLogin({
  apiKey: import.meta.env.VITE_MAGIC_API_KEY,
  network: 'mainnet',
})

function SocialAuth() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)

  const handleLogin = async (provider: string) => {
    setLoading(true)
    try {
      const result = await socialLogin.login(provider as any)
      setUser(result)
      console.log('Logged in:', result.email, result.walletAddress)
    } catch (error: any) {
      if (error.message?.includes('popup')) {
        alert('Please allow popups for this site')
      } else {
        console.error('Login failed:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async () => {
    const email = prompt('Enter your email:')
    if (!email) return

    setLoading(true)
    try {
      const result = await socialLogin.loginWithEmail(email)
      setUser(result)
    } catch (error) {
      console.error('Email login failed:', error)
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return (
      <div>
        <p>Welcome, {user.email}</p>
        <p>Wallet: {user.walletAddress}</p>
        <button onClick={() => socialLogin.logout()}>Logout</button>
      </div>
    )
  }

  return (
    <div>
      <h3>Sign In</h3>
      <button onClick={() => handleLogin('google')} disabled={loading}>
        Google
      </button>
      <button onClick={() => handleLogin('github')} disabled={loading}>
        GitHub
      </button>
      <button onClick={() => handleLogin('discord')} disabled={loading}>
        Discord
      </button>
      <button onClick={handleEmailLogin} disabled={loading}>
        Email
      </button>
    </div>
  )
}
```

---

## Custom Skill Creation

Create your own AI skill for project-specific patterns:

```bash
# Create a new skill
cinacoin skills create my-skill

# This generates:
# .cinacoin/skills/my-skill/SKILL.md
# .cinacoin/skills/my-skill/templates/
```

**Example SKILL.md:**

```markdown
# My Project Skill

## Context
This project uses Cinacoin with Next.js App Router and Wagmi.

## Patterns
- Always use 'use client' for Cinacoin components
- Wrap providers in root layout
- Use viem for chain interactions
- Error codes: see docs/guide/error-codes.md

## Anti-patterns
- Never use window.ethereum directly
- Never skip useEffect cleanup for event listeners
- Never hardcode chain IDs
```

---

## Troubleshooting AI Skills

### Skill not found

```bash
# Update skills first
cinacoin skills update

# Check available skills
cinacoin skills list
```

### Generated code doesn't compile

1. Check your `@cinacoin` package versions match the skill's target version
2. Verify peer dependencies are installed
3. Run `cinacoin skills add <name> --force` to regenerate

### AI doesn't recognize Cinacoin imports

Ensure the skill context file is in your project root:

```bash
# Regenerate context for your editor
cinacoin skills add --format cursor    # for Cursor
cinacoin skills add --format copilot   # for GitHub Copilot
cinacoin skills add --format claude    # for Claude
```

---

*AI Skills Integration Guide — Cinacoin Documentation*
