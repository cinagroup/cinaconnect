# @cinacoin/core-ui

Web Components core for Cinacoin — built with Lit.

## Installation

```bash
npm install @cinacoin/core-ui
```

## Usage

```ts
import { t, setLocale, I18nMixin } from '@cinacoin/core-ui';

await initI18n('en');
const greeting = t('connect.wallet');
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `t` | function | Translation function |
| `setLocale` | function | Set active locale |
| `getLocale` | function | Get current locale |
| `getAvailableLocales` | function | List available locales |
| `registerLocale` | function | Register a locale |
| `registerLocales` | function | Register multiple locales |
| `lazyLocale` | function | Lazy locale loader |
| `registerAllLocales` | function | Register all built-in locales |
| `initI18n` | function | Initialize i18n system |
| `detectBrowserLocale` | function | Detect browser locale |
| `I18nMixin` | mixin | LitElement i18n mixin |
| `TranslationMessages` | type | Message map type |
