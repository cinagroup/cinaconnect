# @cinacoin/i18n

Internationalization package for Cinacoin wallet.

## Installation

```bash
npm install @cinacoin/i18n
```

## Usage

```ts
import { createI18n, useI18n } from '@cinacoin/i18n';

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: { welcome: 'Welcome' },
    zh: { welcome: '欢迎' },
  },
});

// Translate a message
const text = i18n.t('welcome');

// Use with hooks
const { t, locale, setLocale } = useI18n();
```

## License

MIT
