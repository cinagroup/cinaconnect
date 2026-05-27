import type { Preview } from '@storybook/react';

/* ── Cinacoin theme variables (injected globally) ───────────── */

const cinaConnectDecorator = (Story: any) => {
  return (
    <div
      style={{
        /* Theme CSS variables */
        '--cc-primary': '#3b82f6',
        '--cc-primary-hover': '#2563eb',
        '--cc-secondary': '#64748b',
        '--cc-background': '#ffffff',
        '--cc-surface': '#f8fafc',
        '--cc-text': '#0f172a',
        '--cc-text-muted': '#64748b',
        '--cc-border': '#e2e8f0',
        '--cc-success': '#22c55e',
        '--cc-warning': '#f59e0b',
        '--cc-danger': '#ef4444',
        '--cc-radius': '8px',
        '--cc-font': 'system-ui, -apple-system, sans-serif',

        fontFamily: 'var(--cc-font)',
        padding: '24px',
        minHeight: '100vh',
        boxSizing: 'border-box',
        background: 'var(--cc-surface)',
        color: 'var(--cc-text)',
      } as React.CSSProperties}
    >
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [cinaConnectDecorator],

  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      element: '#storybook-root',
      config: {},
      options: {},
      manual: false,
    },
  },

  tags: ['autodocs'],
};

export default preview;
