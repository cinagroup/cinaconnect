# @cinacoin/nuxt

Nuxt 3 module for Cinacoin wallet connection.

## Installation

```bash
npm install @cinacoin/nuxt
```

## Usage

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@cinacoin/nuxt'],
  cinaConnect: {
    projectId: 'YOUR_PROJECT_ID',
  },
});
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `defineCinacoinConfig` | function | Config helper |
| `useCinacoin` | composable | Nuxt composable for wallet |
| `CinacoinOptions` | type | Module options type |
