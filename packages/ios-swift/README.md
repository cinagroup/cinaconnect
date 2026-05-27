# @cinacoin/ios-swift

iOS SDK TypeScript types for Cinacoin — Swift interop interfaces.

## Installation

```bash
npm install @cinacoin/ios-swift
```

## Usage

```ts
import { CinacoinIOS } from '@cinacoin/ios-swift';

const ios = new CinacoinIOS();
await ios.init({ projectId: 'YOUR_PROJECT_ID' });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `CinacoinIOS` | class | iOS SDK bridge |
| `IOSWalletConfig` | type | iOS wallet configuration |
| `IOSConnectionResult` | type | Connection result |
