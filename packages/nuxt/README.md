# @cinaconnect/nuxt

Nuxt 3 module for CinaConnect wallet connection.

## Installation

```bash
npm install @cinaconnect/nuxt
```

## Usage

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@cinaconnect/nuxt'],
  cinaConnect: {
    projectId: 'YOUR_PROJECT_ID',
  },
});
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `defineCinaConnectConfig` | function | Config helper |
| `useCinaConnect` | composable | Nuxt composable for wallet |
| `CinaConnectOptions` | type | Module options type |
