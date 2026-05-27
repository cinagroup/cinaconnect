# @cinacoin/i18n-react

Localization provider for Cinacoin with multi-language support.

## Installation

```bash
npm install @cinacoin/i18n-react
```

## Usage

```ts
import { I18nProvider, useTranslation } from '@cinacoin/i18n-react';

function App() {
  return (
    <I18nProvider locale="en">
      <YourApp />
    </I18nProvider>
  );
}

function YourApp() {
  const { t } = useTranslation();
  return <p>{t('welcome.message')}</p>;
}
```

## License

MIT
