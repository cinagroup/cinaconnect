# @cinacoin/design-tokens

Design tokens for Cinacoin white-label UI toolkit.

## Installation

```bash
npm install @cinacoin/design-tokens
```

## Usage

```ts
import { tokens, cssVariables } from '@cinacoin/design-tokens';

const primaryColor = tokens.colors.primary;
document.documentElement.style.cssText = cssVariables;
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `tokens` | object | Design token catalog |
| `cssVariables` | string | CSS variables string |
| `ThemeTokenMap` | type | Token map type |
| `TokensCatalog` | type | Catalog type |
| `ThemeGroup` | type | Theme group type |
