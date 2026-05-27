# @cinacoin/android-kotlin

Android SDK TypeScript types for Cinacoin — Kotlin interop interfaces.

## Installation

```bash
npm install @cinacoin/android-kotlin
```

## Usage

```ts
import { CinacoinAndroid } from '@cinacoin/android-kotlin';

const android = new CinacoinAndroid();
await android.init({ projectId: 'YOUR_PROJECT_ID' });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `CinacoinAndroid` | class | Android SDK bridge |
| `AndroidWalletConfig` | type | Android wallet configuration |
| `AndroidConnectionResult` | type | Connection result |
