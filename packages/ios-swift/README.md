# @cinaconnect/ios-swift

iOS SDK TypeScript types for CinaConnect — Swift interop interfaces.

## Installation

```bash
npm install @cinaconnect/ios-swift
```

## Usage

```ts
import { CinaConnectIOS } from '@cinaconnect/ios-swift';

const ios = new CinaConnectIOS();
await ios.init({ projectId: 'YOUR_PROJECT_ID' });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `CinaConnectIOS` | class | iOS SDK bridge |
| `IOSWalletConfig` | type | iOS wallet configuration |
| `IOSConnectionResult` | type | Connection result |
