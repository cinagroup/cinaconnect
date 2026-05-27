import { defineConfig } from 'vitepress'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  title: 'Cinacoin',
  description: '自有品牌链上 UX 工具包 — Self-hosted Wallet Connection Toolkit',
  base: isProd ? '/cinacoin/' : '/',
  lang: 'zh-CN',
  locales: {
    root: {
      label: '中文',
      lang: 'zh-CN',
    },
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      description: 'Self-hosted Wallet Connection Toolkit',
    },
  },
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#3B82F6' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Cinacoin',

    nav: [
      { text: '指南', link: '/guide/quick-start' },
      { text: '快速开始 (图文)', link: '/guide/quick-start-visual' },
      { text: 'API', link: '/api/core-sdk' },
      { text: '迁移指南', link: '/guide/migrate-from-reown' },
      { text: '故障排除', link: '/guide/troubleshooting' },
      { text: '示例', link: '/examples/web' },
      { text: '部署', link: '/deployment/environment-variables' },
      { text: '安全', link: '/security/best-practices' },
      { text: 'FAQ', link: '/faq' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '快速开始 (图文指南)', link: '/guide/quick-start-visual' },
            { text: '安装', link: '/guide/installation' },
            { text: '配置', link: '/guide/configuration' },
          ],
        },
        {
          text: '迁移',
          items: [
            { text: '从 Reown/WalletConnect 迁移', link: '/guide/migrate-from-reown' },
          ],
        },
        {
          text: '故障排除',
          items: [
            { text: '常见问题与解决方案', link: '/guide/troubleshooting' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'Error Code Reference', link: '/guide/error-codes' },
            { text: 'FAQ', link: '/guide/faq' },
            { text: 'Security Best Practices', link: '/guide/security' },
            { text: 'Go-To-Market Checklist', link: '/guide/gtm-checklist' },
            { text: 'AI Skills Integration', link: '/guide/ai-skills' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'SDK API',
          items: [
            { text: 'Core SDK', link: '/api/core-sdk' },
            { text: 'UI 组件', link: '/api/ui-components' },
            { text: 'SIWE 认证', link: '/api/siwe' },
            { text: 'Mobile SDK', link: '/api/mobile' },
            { text: 'Swap SDK', link: '/api/swap-sdk' },
            { text: 'On-Ramp SDK', link: '/api/onramp-sdk' },
            { text: 'Session Keys', link: '/api/session-keys' },
          ],
        },
        {
          text: 'Account Abstraction',
          items: [
            { text: 'AA SDK (ERC-4337)', link: '/api/generated/aa-sdk' },
          ],
        },
        {
          text: 'Analytics',
          items: [
            { text: 'Analytics SDK', link: '/api/generated/analytics' },
          ],
        },
        {
          text: '基础设施 API',
          items: [
            { text: 'Bundler (ERC-4337)', link: '/api/bundler' },
            { text: 'Paymaster 合约', link: '/api/paymaster' },
          ],
        },
        {
          text: '自动生成文档',
          items: [
            { text: 'TypeDoc API 参考', link: '/api/typedoc/' },
            { text: '生成文档说明', link: '/api/generated/README' },
            { text: 'Core SDK (自动)', link: '/api/generated/core-sdk' },
            { text: 'Mobile SDK (自动)', link: '/api/generated/mobile' },
            { text: 'Swap SDK (自动)', link: '/api/generated/swap-sdk' },
            { text: 'On-Ramp SDK (自动)', link: '/api/generated/onramp-sdk' },
            { text: 'Session Keys (自动)', link: '/api/generated/session-keys' },
            { text: 'Analytics (自动)', link: '/api/generated/analytics' },
            { text: 'AA SDK (自动)', link: '/api/generated/aa-sdk' },
            { text: '基础设施概览', link: '/api/generated/infra' },
          ],
        },
      ],
      '/examples/': [
        {
          text: '示例代码',
          items: [
            { text: 'Web 示例', link: '/examples/web' },
            { text: 'React Native 示例', link: '/examples/react-native' },
            { text: 'iOS 示例', link: '/examples/ios' },
            { text: 'Android 示例', link: '/examples/android' },
          ],
        },
      ],
      '/security/': [
        {
          text: '安全',
          items: [
            { text: '最佳实践', link: '/security/best-practices' },
            { text: '审计报告模板', link: '/security/audit-report' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/cinacoin/cinacoin' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Cinacoin',
    },

    editLink: {
      pattern: 'https://github.com/cinacoin/cinacoin/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    lastUpdatedText: '最后更新',

    sidebarMenuLabel: '菜单',

    returnToTopLabel: '返回顶部',

    outline: {
      level: [2, 3],
      label: '页面导航',
    },

    search: {
      provider: 'algolia',
      options: {
        // Algolia 配置 — 替换为实际值
        appId: 'YOUR_ALGOLIA_APP_ID',
        apiKey: 'YOUR_ALGOLIA_API_KEY',
        indexName: 'cinacoin',
        // placeholder: '搜索文档…',
        // translations: {
        //   button: {
        //     buttonText: '搜索',
        //     buttonAriaLabel: '搜索文档',
        //   },
        //   modal: {
        //     searchBox: {
        //       resetButtonTitle: '清除查询',
        //       resetButtonAriaLabel: '清除查询',
        //       cancelButtonText: '取消',
        //       cancelButtonAriaLabel: '取消',
        //     },
        //     startScreen: {
        //       recentSearchesTitle: '最近搜索',
        //       noRecentSearchesText: '无最近搜索',
        //       saveRecentSearchButtonTitle: '保存到此搜索',
        //       removeRecentSearchButtonTitle: '从此历史中移除',
        //     },
        //     errorScreen: {
        //       titleText: '无法获取结果',
        //       helpText: '请检查网络连接并重试',
        //     },
        //   },
        // },
      },
    },
  },

  markdown: {
    lineNumbers: true,
  },
})
