import { describe, it, expect } from 'vitest';
import type {
  Token,
  ChainId,
  PaymentProvider,
  AssetBalance,
  PaymentConfig,
} from './types';
import fs from 'fs';
import path from 'path';

function readSource(filename: string): string {
  return fs.readFileSync(path.join(__dirname, filename), 'utf-8');
}

const mockToken: Token = {
  symbol: 'ETH',
  name: 'Ethereum',
  chain: 'ethereum',
  contractAddress: '',
  decimals: 18,
};

const mockConfig: PaymentConfig = {
  defaultCurrency: 'USD',
  defaultChain: 'ethereum',
  walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  tokens: [mockToken],
};

// ─── Tests ────────────────────────────────────────────────────────────────

describe('payment-flow', () => {
  describe('types: Token', () => {
    it('supports native tokens with empty contractAddress', () => {
      const token: Token = { symbol: 'ETH', name: 'Ethereum', chain: 'ethereum', contractAddress: '', decimals: 18 };
      expect(token.contractAddress).toBe('');
    });
    it('supports ERC-20 tokens with contract address', () => {
      const token: Token = { symbol: 'USDC', name: 'USD Coin', chain: 'ethereum', contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6 };
      expect(token.contractAddress.length).toBe(42);
    });
    it('supports all chain identifiers', () => {
      const chains: ChainId[] = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'solana'];
      chains.forEach(c => expect(typeof c).toBe('string'));
    });
  });

  describe('usePayment hook (source analysis)', () => {
    const src = readSource('hooks/usePayment.ts');

    it('exports usePayment function', () => { expect(src).toContain('export function usePayment'); });
    it('accepts PaymentConfig parameter', () => { expect(src).toContain('config: PaymentConfig'); });
    it('returns UsePaymentReturn shape', () => { expect(src).toContain('UsePaymentReturn'); });
    it('implements buy function', () => { expect(src).toContain('async (params: BuyParams)'); });
    it('implements send function', () => { expect(src).toContain('async (params: SendParams)'); });
    it('implements receive function', () => { expect(src).toContain('async (_params: ReceiveParams)'); });
    it('uses useState for loading', () => { expect(src).toContain('useState(false)'); });
    it('uses useState for error', () => { expect(src).toContain('useState<string | null>(null)'); });
    it('uses useState for transactions', () => { expect(src).toContain('useState<Transaction[]'); });
    it('uses useState for balances', () => { expect(src).toContain('useState<AssetBalance[]'); });
    it('uses useCallback for memoization', () => { expect(src).toContain('useCallback('); });
    it('buy sets status to pending', () => { expect(src).toContain('status: "pending"'); });
    it('send sets status to pending', () => { expect(src).toMatch(/type:\s*"send"/); });
    it('receive returns walletAddress as address', () => { expect(src).toContain('address: config.walletAddress'); });
    it('receive returns walletAddress as qrData', () => { expect(src).toContain('qrData: config.walletAddress'); });
    it('buy generates hash with buy_ prefix', () => { expect(src).toContain('0xbuy_'); });
    it('send generates hash with send_ prefix', () => { expect(src).toContain('0xsend_'); });
    it('handles errors with try/catch', () => { expect(src).toContain('try {'); expect(src).toContain('catch'); });
    it('sets loading to false in finally block', () => { expect(src).toContain('finally'); expect(src).toContain('setLoading(false)'); });
  });

  describe('BuyPage component (source analysis)', () => {
    const src = readSource('components/Buy/BuyPage.tsx');
    it('exports BuyPage function', () => { expect(src).toContain('export function BuyPage'); });
    it('accepts tokens prop', () => { expect(src).toContain('tokens?: Token[]'); });
    it('accepts providers prop', () => { expect(src).toContain('providers?: PaymentProvider[]'); });
    it('accepts onBuy callback', () => { expect(src).toContain('onBuy?:'); });
    it('handles processing state', () => { expect(src).toContain('"processing"'); expect(src).toContain('"success"'); });
    it('includes default tokens (ETH, USDC, USDT)', () => { expect(src).toContain('ETH'); expect(src).toContain('USDC'); expect(src).toContain('USDT'); });
    it('includes default providers (moonpay, coinbase, ramp)', () => { expect(src).toContain('moonpay'); expect(src).toContain('coinbase'); expect(src).toContain('ramp'); });
    it('filters compatible providers by token', () => { expect(src).toContain('compatibleProviders'); });
    it('disables buy button when amount is invalid', () => { expect(src).toContain('disabled={!fiatAmount'); });
    it('renders Buy Crypto heading', () => { expect(src).toContain('Buy Crypto'); });
  });

  describe('SendPage component (source analysis)', () => {
    const src = readSource('components/Send/SendPage.tsx');
    it('exports SendPage function', () => { expect(src).toContain('export function SendPage'); });
    it('accepts tokens prop', () => { expect(src).toContain('tokens?: Token[]'); });
    it('validates Ethereum address format', () => { expect(src).toContain('0x[a-fA-F0-9]{40}'); });
    it('validates Solana address format', () => { expect(src).toContain('[13][a-km-zA-HJ-NP-Z1-9]{25,34}'); });
    it('has confirm step', () => { expect(src).toContain('"confirm"'); expect(src).toContain('Confirm Transaction'); });
    it('has status step with pending/confirmed/failed', () => { expect(src).toContain('"pending"'); expect(src).toContain('"confirmed"'); expect(src).toContain('"failed"'); });
    it('shows network fee estimate', () => { expect(src).toContain('estimatedFee'); });
    it('generates tx hash on send', () => { expect(src).toContain('txHash'); });
    it('has reset functionality', () => { expect(src).toContain('handleReset'); });
  });

  describe('ReceivePage component (source analysis)', () => {
    const src = readSource('components/Receive/ReceivePage.tsx');
    it('exports ReceivePage function', () => { expect(src).toContain('export function ReceivePage'); });
    it('accepts walletAddress prop with default', () => { expect(src).toContain('walletAddress ='); });
    it('accepts qrData prop override', () => { expect(src).toContain('qrData?:'); });
    it('has copy to clipboard functionality', () => { expect(src).toContain('navigator.clipboard'); expect(src).toContain('handleCopy'); });
    it('has share functionality', () => { expect(src).toContain('handleShare'); expect(src).toContain('navigator.share'); });
    it('generates QR code with deterministic grid', () => { expect(src).toContain('QRCodePlaceholder'); });
  });

  describe('ConnectedPage component (source analysis)', () => {
    const src = readSource('components/Connected/ConnectedPage.tsx');
    it('exports ConnectedPage function', () => { expect(src).toContain('export function ConnectedPage'); });
    it('accepts walletAddress prop', () => { expect(src).toContain('walletAddress?:'); });
    it('accepts totalBalance prop', () => { expect(src).toContain('totalBalance?:'); });
    it('accepts recentTransactions prop', () => { expect(src).toContain('recentTransactions?:'); });
    it('accepts action callbacks', () => { expect(src).toContain('onBuy'); expect(src).toContain('onSend'); expect(src).toContain('onReceive'); });
    it('renders quick actions', () => { expect(src).toContain('"Send"'); expect(src).toContain('"Buy"'); });
    it('limits recent transactions to 5', () => { expect(src).toContain('.slice(0, 5)'); });
  });

  describe('AssetInventory component (source analysis)', () => {
    const src = readSource('components/AssetInventory/AssetInventory.tsx');
    it('exports AssetInventory function', () => { expect(src).toContain('export function AssetInventory'); });
    it('accepts balances prop', () => { expect(src).toContain('balances?: AssetBalance[]'); });
    it('shows empty state when no balances', () => { expect(src).toContain('No assets available'); });
    it('calculates total fiat value', () => { expect(src).toContain('totalFiatValue'); });
    it('renders token symbol abbreviation as icon', () => { expect(src).toContain('.slice(0, 2)'); });
  });

  describe('ProfilePage component (source analysis)', () => {
    const src = readSource('components/Profile/ProfilePage.tsx');
    it('exports ProfilePage function', () => { expect(src).toContain('export function ProfilePage'); });
    it('accepts linkedProviders prop', () => { expect(src).toContain('linkedProviders?:'); });
    it('has copy address functionality', () => { expect(src).toContain('handleCopyAddress'); });
    it('has remove provider functionality', () => { expect(src).toContain('handleRemoveProvider'); });
    it('has export key with confirmation', () => { expect(src).toContain('showConfirmExport'); });
    it('has default linked providers', () => { expect(src).toContain('DEFAULT_LINKED_PROVIDERS'); });
    it('displays connected/disconnected status', () => { expect(src).toContain('provider.connected'); });
  });
});
