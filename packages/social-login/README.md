# @cinacoin/social-login

Social login for Cinacoin — Google, Apple, GitHub OAuth wallet creation.

## Installation

```bash
npm install @cinacoin/social-login
```

## Usage

```ts
import { SocialLogin } from '@cinacoin/social-login';

const login = new SocialLogin({ clientId: 'YOUR_CLIENT_ID' });
const wallet = await login.connect('google');
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `SocialLogin` | class | Main social login handler |
| `GoogleProvider` | class | Google OAuth provider |
| `AppleProvider` | class | Apple OAuth provider |
| `GitHubProvider` | class | GitHub OAuth provider |
| `SocialLoginConfig` | type | Configuration type |
| `SocialProvider` | type | Provider enum |
| `SocialLoginResult` | type | Login result type |
