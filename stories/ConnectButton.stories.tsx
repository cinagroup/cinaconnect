import type { Meta, StoryObj } from '@storybook/react';
import { ConnectButton } from '../packages/react/src/ConnectButton';

const meta: Meta<typeof ConnectButton> = {
  title: 'CinaCoin/ConnectButton',
  component: ConnectButton,
  argTypes: {
    label: { control: 'text', description: 'Button text when disconnected.' },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
      description: 'Visual variant.',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Button size preset.',
    },
    showBalance: { control: 'boolean', description: 'Show account balance when connected.' },
    showAvatar: { control: 'boolean', description: 'Show avatar when connected.' },
    showNetwork: { control: 'boolean', description: 'Show network badge when connected.' },
    className: { control: 'text', description: 'CSS class name.' },
  },
  args: {
    label: 'Connect Wallet',
    variant: 'primary',
    size: 'md',
  },
};

export default meta;
type Story = StoryObj<typeof ConnectButton>;

/** Default disconnected state. */
export const Default: Story = {
  args: {
    label: 'Connect Wallet',
    variant: 'primary',
    size: 'md',
  },
};

/** Disabled button. */
export const Disabled: Story = {
  args: {
    label: 'Connect Wallet',
    variant: 'primary',
    size: 'md',
    className: 'cc-connect-button--disabled',
  },
  parameters: {
    docs: { description: { story: 'Simulated disabled state (CSS class applied).' } },
  },
  decorators: [
    (Story: any) => (
      <div style={{ pointerEvents: 'none', opacity: 0.5 }}>
        <Story />
      </div>
    ),
  ],
};

/** Loading / connecting state. */
export const Loading: Story = {
  args: {
    label: 'Connecting…',
    variant: 'primary',
    size: 'md',
  },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('ocx-connect-button') as HTMLElement;
    if (button) {
      button.setAttribute('state', 'connecting');
    }
  },
};

/** Connected state with balance and avatar. */
export const Connected: Story = {
  args: {
    label: '0x1234…5678',
    variant: 'primary',
    size: 'md',
    showBalance: true,
    showAvatar: true,
    showNetwork: true,
  },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('ocx-connect-button') as HTMLElement;
    if (button) {
      button.setAttribute('state', 'connected');
      button.setAttribute('address', '0x1234567890abcdef1234567890abcdef12345678');
      button.setAttribute('balance', '1.234');
      button.setAttribute('chain-symbol', 'ETH');
    }
  },
};

/** Secondary variant. */
export const SecondaryVariant: Story = {
  args: {
    label: 'Connect Wallet',
    variant: 'secondary',
    size: 'md',
  },
};

/** Ghost variant. */
export const GhostVariant: Story = {
  args: {
    label: 'Connect',
    variant: 'ghost',
    size: 'sm',
  },
};

/** Large size. */
export const Large: Story = {
  args: {
    label: 'Connect Wallet',
    variant: 'primary',
    size: 'lg',
  },
};

/** Small size. */
export const Small: Story = {
  args: {
    label: 'Connect',
    variant: 'primary',
    size: 'sm',
  },
};

/** Dark mode variant. */
export const DarkMode: Story = {
  args: {
    label: 'Connect Wallet',
    variant: 'primary',
    size: 'md',
  },
  decorators: [
    (Story: any) => (
      <div
        style={{
          background: '#0f172a',
          padding: '24px',
          borderRadius: '12px',
          display: 'inline-block',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

/** Error state. */
export const ErrorState: Story = {
  args: {
    label: 'Retry',
    variant: 'primary',
    size: 'md',
  },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('ocx-connect-button') as HTMLElement;
    if (button) {
      button.setAttribute('state', 'error');
    }
  },
};
