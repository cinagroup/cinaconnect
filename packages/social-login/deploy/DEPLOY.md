# Social Login Server Deployment Guide

## Overview

The `@cinacoin/social-login` package provides OAuth2 and email/phone-based
authentication with deterministic HD wallet derivation for Google, Apple, X
(Twitter), GitHub, Discord, Facebook, email, and Phone OTP.

## Architecture

```
Client → Auth URL → Provider (Google/Apple/Twitter/GitHub)
       ← Code redirect ←
Client → Server (/auth/callback) → Token Verification → Wallet Derivation
       ← JWT + wallet address ←
```

## Token Verification

Each provider has real server-side token verification:

| Provider | Method | Endpoint |
|---|---|---|
| Google | ID token JWT + tokeninfo API | `oauth2.googleapis.com/tokeninfo` |
| Apple | ID token JWT signature via JWKS | `appleid.apple.com/auth/keys` |
| Twitter | Access token via API v2 /me | `api.twitter.com/2/users/me` |
| GitHub | Access token via REST /user | `api.github.com/user` |

All verification is performed by `TokenVerifier` in `src/token-verifier.ts`.

## Environment Setup

1. Copy `deploy/.env.example` to `.env`
2. Create OAuth2 apps at each provider:
   - **Google**: [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
   - **Apple**: [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list)
   - **Twitter**: [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
   - **GitHub**: [GitHub Settings → Developer Settings → OAuth Apps](https://github.com/settings/developers)
3. Download Apple's private key (`.p8`) and save to `secrets/apple/AuthKey.p8`
4. Fill in all values in `.env`

## Deployment (Node.js Server)

```bash
# Build
cd packages/social-login
npm run build

# Start server
NODE_ENV=production node -e "
  const { TokenVerifier } = require('./dist/token-verifier.js');
  console.log('Social Login package loaded');
  console.log('TokenVerifier supports: google, apple, twitter, github');
"
```

## Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY dist/ dist/
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
```

## Health Check

```bash
curl -f http://localhost:3000/health || exit 1
```

## Security Notes

- Always verify tokens server-side before deriving wallets
- Apple client_secret must be rotated (max 6 months validity)
- Twitter PKCE code_verifier must be stored server-side during the flow
- Google ID tokens expire after ~1 hour; use refresh tokens for long sessions
