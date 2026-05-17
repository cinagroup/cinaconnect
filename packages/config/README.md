# @cinaconnect/config

Remote feature flags, headless mode, and virtual testnets for @cinaconnect.

## Installation

```bash
npm install @cinaconnect/config
```

## Usage

```ts
import { FeatureGate } from '@cinaconnect/config';

const gate = new FeatureGate();
const enabled = await gate.isEnabled('new-ui');
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `FeatureGate` | class | Feature flag gate keeper |
| `FeatureGateProps` | type | Gate properties type |
