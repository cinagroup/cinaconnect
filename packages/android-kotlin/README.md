# @cinaconnect/android-kotlin

Android SDK TypeScript types for CinaConnect — Kotlin interop interfaces.

## Installation

```bash
npm install @cinaconnect/android-kotlin
```

## Usage

```ts
import { CinaConnectAndroid } from '@cinaconnect/android-kotlin';

const android = new CinaConnectAndroid();
await android.init({ projectId: 'YOUR_PROJECT_ID' });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `CinaConnectAndroid` | class | Android SDK bridge |
| `AndroidWalletConfig` | type | Android wallet configuration |
| `AndroidConnectionResult` | type | Connection result |
