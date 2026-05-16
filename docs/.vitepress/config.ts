import { defineConfig } from 'vitepress'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  title: 'OnChainUX',
  description: '自有品牌链上 UX 工具包 — Self-hosted Wallet Connection Toolkit',
  base: isProd ? '/onchainux/' : '/',
  lang: 'zh-CN',
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#3B82F6' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'OnChainUX',

    nav: [
      { text: '指南', link: '/guide/quick-start' },
      { text: '快速开始 (图文)', link: '/guide/quick-start-visual' },
      { text: 'API', link: '/api/core-sdk' },
      { text: '示例', link: '/examples/web' },
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
      ],
      '/api/': [
        {
          text: 'SDK API',
          items: [
            { text: 'Core SDK', link: '/api/core-sdk' },
            { text: 'UI 组件', link: '/api/ui-components' },
            { text: 'SIWE 认证', link: '/api/siwe' },
            { text: 'Mobile SDK', link: '/api/mobile' },
            { text: 'Auto-Generated API (TypeDoc)', link: '/api/typedoc/' },
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
      { icon: 'github', link: 'https://github.com/onchainux/onchainux' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 OnChainUX',
    },

    editLink: {
      pattern: 'https://github.com/onchainux/onchainux/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    outline: {
      level: [2, 3],
      label: '页面导航',
    },

    search: {
      provider: 'local',
    },
  },

  markdown: {
    lineNumbers: true,
  },
})
