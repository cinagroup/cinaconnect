/**
 * @cinacoin/i18n
 *
 * Internationalization and localization for CinaCoin.
 * Lightweight i18n with React integration.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type TranslationMessages = Record<string, string>;

export interface TranslationDictionary {
  [locale: string]: TranslationMessages;
}

export interface I18nConfig {
  defaultLocale: string;
  supportedLocales: string[];
  messages: TranslationDictionary;
}

// ─── Built-in translations ───────────────────────────────────────────────────

export const defaultMessages: TranslationDictionary = {
  en: {
    'wallet.connect': 'Connect Wallet',
    'wallet.disconnect': 'Disconnect',
    'wallet.balance': 'Balance',
    'wallet.send': 'Send',
    'wallet.receive': 'Receive',
    'wallet.buy': 'Buy',
    'wallet.swap': 'Swap',
    'wallet.recovery': 'Recovery',
    'auth.login': 'Login',
    'auth.signup': 'Sign Up',
    'auth.logout': 'Logout',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'nav.home': 'Home',
    'nav.swap': 'Swap',
    'nav.send': 'Send',
    'nav.receive': 'Receive',
    'nav.buy': 'Buy',
    'nav.multichain': 'Multi-Chain',
    'nav.auth': 'Auth',
  },
  zh: {
    'wallet.connect': '连接钱包',
    'wallet.disconnect': '断开连接',
    'wallet.balance': '余额',
    'wallet.send': '发送',
    'wallet.receive': '接收',
    'wallet.buy': '购买',
    'wallet.swap': '兑换',
    'wallet.recovery': '恢复',
    'auth.login': '登录',
    'auth.signup': '注册',
    'auth.logout': '登出',
    'auth.email': '邮箱',
    'auth.password': '密码',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.confirm': '确认',
    'common.cancel': '取消',
    'common.close': '关闭',
    'nav.home': '首页',
    'nav.swap': '兑换',
    'nav.send': '发送',
    'nav.receive': '接收',
    'nav.buy': '购买',
    'nav.multichain': '多链',
    'nav.auth': '认证',
  },
  ja: {
    'wallet.connect': 'ウォレット接続',
    'wallet.disconnect': '切断',
    'wallet.balance': '残高',
    'wallet.send': '送信',
    'wallet.receive': '受信',
    'wallet.buy': '購入',
    'wallet.swap': 'スワップ',
    'wallet.recovery': '復元',
    'auth.login': 'ログイン',
    'auth.signup': 'サインアップ',
    'auth.logout': 'ログアウト',
    'auth.email': 'メール',
    'auth.password': 'パスワード',
    'common.loading': '読み込み中...',
    'common.error': 'エラー',
    'common.confirm': '確認',
    'common.cancel': 'キャンセル',
    'common.close': '閉じる',
    'nav.home': 'ホーム',
    'nav.swap': 'スワップ',
    'nav.send': '送信',
    'nav.receive': '受信',
    'nav.buy': '購入',
    'nav.multichain': 'マルチチェーン',
    'nav.auth': '認証',
  },
};

// ─── I18n Instance ───────────────────────────────────────────────────────────

export class I18n {
  private locale: string;
  private messages: TranslationMessages;

  constructor(config: I18nConfig) {
    this.locale = config.defaultLocale;
    this.messages = config.messages[config.defaultLocale] || {};
  }

  setLocale(locale: string, messages?: TranslationDictionary) {
    this.locale = locale;
    if (messages && messages[locale]) {
      this.messages = messages[locale];
    }
  }

  t(key: string, params?: Record<string, string>): string {
    let message = this.messages[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        message = message.replace(`{${k}}`, v);
      });
    }
    return message;
  }

  getLocale(): string {
    return this.locale;
  }
}

// ─── React Integration ───────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useCallback } from 'react';

interface I18nContextValue {
  locale: string;
  t: (key: string, params?: Record<string, string>) => string;
  setLocale: (locale: string) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  t: (key) => key,
  setLocale: () => {},
});

export interface I18nProviderProps {
  children: React.ReactNode;
  config?: I18nConfig;
}

export function I18nProvider({
  children,
  config = { defaultLocale: 'en', supportedLocales: ['en', 'zh', 'ja'], messages: defaultMessages },
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState(config.defaultLocale);
  const messages = config.messages[locale] || config.messages['en'] || {};

  const setLocale = useCallback(
    (newLocale: string) => {
      if (config.supportedLocales.includes(newLocale)) {
        setLocaleState(newLocale);
      }
    },
    [config.supportedLocales],
  );

  const t = useCallback(
    (key: string, params?: Record<string, string>) => {
      let message = messages[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          message = message.replace(`{${k}}`, v);
        });
      }
      return message;
    },
    [messages],
  );

  return <I18nContext.Provider value={{ locale, t, setLocale }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
