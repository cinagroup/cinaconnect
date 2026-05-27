# @cinacoin/config

Remote feature flags, headless mode, and virtual testnets for @cinacoin.

## Installation

```bash
npm install @cinacoin/config
```

## Usage

```ts
import { FeatureGate } from '@cinacoin/config';

const gate = new FeatureGate();
const enabled = await gate.isEnabled('new-ui');
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `FeatureGate` | class | Feature flag gate keeper |
| `FeatureGateProps` | type | Gate properties type |
