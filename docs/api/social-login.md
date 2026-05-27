# Social Login API

> `@cinacoin/social-login` — OAuth2 和邮箱/手机认证的 Web3 社交登录。

## Installation

```bash
npm install @cinacoin/social-login
```

## OAuth Providers

```typescript
import {
  loginWithGoogle,
  loginWithApple,
  loginWithGitHub,
  loginWithTwitter,
  loginWithEmail,
} from '@cinacoin/social-login'

// Google
const googleResult = await loginWithGoogle({
  clientId: 'your-client-id',
  redirectUri: 'https://mydapp.com/auth/google/callback',
  scopes: ['openid', 'email', 'profile'],
})

// Apple
const appleResult = await loginWithApple({
  clientId: 'your-client-id',
  redirectUri: 'https://mydapp.com/auth/apple/callback',
})

// GitHub
const githubResult = await loginWithGitHub({
  clientId: 'your-client-id',
  redirectUri: 'https://mydapp.com/auth/github/callback',
})

// Twitter
const twitterResult = await loginWithTwitter({
  clientId: 'your-client-id',
  redirectUri: 'https://mydapp.com/auth/twitter/callback',
})

// Email
const emailResult = await loginWithEmail({
  email: 'user@example.com',
})
```

## Magic Links

```typescript
import { MagicLinkManager } from '@cinacoin/social-login'

const magicLink = new MagicLinkManager({
  jwtSecret: 'your-secret',
  senderEmail: 'noreply@mydapp.com',
})

// Send magic link
const sendResult = await magicLink.send({ email: 'user@example.com' })

// Verify magic link token
const verifyResult = await magicLink.verify({ token: '...' })
```

## Phone OTP

```typescript
import { sendPhoneOTP, verifyPhoneOTP, loginWithPhoneOTP } from '@cinacoin/social-login'

// Send OTP
await sendPhoneOTP({
  phone: '+1234567890',
  provider: 'twilio', // or 'vonage', 'aws-sns'
})

// Verify OTP
const result = await verifyPhoneOTP({
  phone: '+1234567890',
  code: '123456',
})

// Login with OTP
const loginResult = await loginWithPhoneOTP({ phone: '+1234567890', code: '123456' })
```

## SMS Providers

```typescript
import { TwilioProvider, VonageProvider, AwsSnsProvider } from '@cinacoin/social-login'

// Twilio
const twilio = new TwilioProvider({
  accountSid: 'AC...',
  authToken: 'your-token',
  from: '+1234567890',
})

// Vonage
const vonage = new VonageProvider({
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  from: 'MyApp',
})

// AWS SNS
const sns = new AwsSnsProvider({
  region: 'us-east-1',
  accessKeyId: '...',
  secretAccessKey: '...',
})
```

## Wallet Derivation

```typescript
import { deriveSeedFromIdentity, deriveAddressFromEmail, deriveAddressFromProvider } from '@cinacoin/social-login'

// Derive wallet from email
const seed = deriveSeedFromIdentity('user@example.com')
const address = deriveAddressFromEmail('user@example.com')

// Derive wallet from OAuth provider
const providerAddress = deriveAddressFromProvider('google', profile.sub)
```

## Session Management

```typescript
import { SessionManager } from '@cinacoin/social-login'

const sessionManager = new SessionManager({
  secret: 'your-secret',
  ttl: 86400, // 24 hours
})

const session = await sessionManager.create({ userId: 'user-123' })
const isValid = await sessionManager.validate(session.token)
```

## Error Handling

```typescript
try {
  const result = await loginWithGoogle({ clientId: '...', redirectUri: '...' })
} catch (err) {
  if (err.code === 'AUTH_FAILED') { /* user cancelled */ }
  if (err.code === 'INVALID_TOKEN') { /* token expired or invalid */ }
}
```

## See Also

- [Passkey Auth](./passkey-auth.md)
- [Embedded Wallet](./embedded-wallet.md)
- [SIWE](./siwe.md)
- [SIWX](./siwx.md)
