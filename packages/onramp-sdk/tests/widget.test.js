import { describe, it, expect, vi, beforeEach } from 'vitest';
// ============================================================
// Tests for @cinacoin/onramp-sdk OnRampWidget
// ============================================================
// Mock DOM APIs for browser environment
const mockIframe = {
    src: '',
    style: {},
    remove: vi.fn(),
};
const mockContainer = {
    innerHTML: '',
    appendChild: vi.fn(),
};
const mockPopup = {
    closed: false,
    close: vi.fn(),
};
vi.stubGlobal('document', {
    getElementById: vi.fn((id) => {
        if (id === 'onramp-widget')
            return mockContainer;
        return null;
    }),
    createElement: vi.fn(() => mockIframe),
});
vi.stubGlobal('window', {
    screen: { width: 1920, height: 1080 },
    open: vi.fn(() => mockPopup),
    addEventListener: vi.fn(),
});
// Import after mocks
import { OnRampWidget } from '../src/widget.js';
import { OnRampAggregator } from '../src/aggregator.js';
describe('OnRampWidget', () => {
    let aggregator;
    beforeEach(() => {
        vi.clearAllMocks();
        aggregator = new OnRampAggregator();
    });
    describe('constructor', () => {
        it('should create widget with default config', () => {
            const widget = new OnRampWidget(aggregator);
            expect(widget).toBeDefined();
        });
        it('should accept custom width and height', () => {
            const widget = new OnRampWidget(aggregator, {
                width: 500,
                height: 700,
                popup: false,
                containerId: 'custom-container',
            });
            expect(widget).toBeDefined();
        });
        it('should default to popup mode', () => {
            const widget = new OnRampWidget(aggregator);
            // Default config sets popup: true
            expect(widget).toBeDefined();
        });
        it('should accept popup dimensions', () => {
            const widget = new OnRampWidget(aggregator, {
                popup: true,
                popupWidth: 600,
                popupHeight: 800,
            });
            expect(widget).toBeDefined();
        });
        it('should accept event callback', () => {
            const callback = vi.fn();
            const widget = new OnRampWidget(aggregator, {
                onEvent: callback,
            });
            expect(widget).toBeDefined();
        });
    });
    describe('open', () => {
        it('should return error when no providers available', async () => {
            const widget = new OnRampWidget(aggregator);
            const result = await widget.open({
                fiatCurrency: 'USD',
                fiatAmount: 100,
                cryptoToken: 'ETH',
                destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
            });
            expect(result.completed).toBe(false);
            expect(result.error).toBe('No on-ramp providers available');
        });
        it('should open as popup by default', async () => {
            aggregator.registerProvider({
                id: 'moonpay',
                getProviderInfo: () => ({
                    id: 'moonpay',
                    name: 'MoonPay',
                    regions: ['US'],
                    supportedFiat: ['USD'],
                    supportedCrypto: ['ETH'],
                    minAmount: 10,
                    maxAmount: 10000,
                }),
                getQuote: async () => ({
                    providerId: 'moonpay',
                    providerName: 'MoonPay',
                    fiatAmount: 100,
                    fiatCurrency: 'USD',
                    cryptoAmount: '0.05',
                    cryptoToken: 'ETH',
                    fees: { providerFee: 2.99, networkFee: 1.5, totalFeePercent: 4.49 },
                    totalCost: 104.49,
                    estimatedTime: 600,
                }),
                getWidgetUrl: () => 'https://buy.moonpay.com/?apiKey=test',
            });
            const widget = new OnRampWidget(aggregator, { popup: true });
            // Start the open in background since it waits for popup close
            const openPromise = widget.open({
                fiatCurrency: 'USD',
                fiatAmount: 100,
                cryptoToken: 'ETH',
                destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
            });
            // Simulate popup closing
            mockPopup.closed = true;
            const result = await openPromise;
            expect(result.completed).toBe(false);
        });
        it('should open as embedded iframe when popup is false', async () => {
            aggregator.registerProvider({
                id: 'moonpay',
                getProviderInfo: () => ({
                    id: 'moonpay',
                    name: 'MoonPay',
                    regions: ['US'],
                    supportedFiat: ['USD'],
                    supportedCrypto: ['ETH'],
                    minAmount: 10,
                    maxAmount: 10000,
                }),
                getQuote: async () => ({
                    providerId: 'moonpay',
                    providerName: 'MoonPay',
                    fiatAmount: 100,
                    fiatCurrency: 'USD',
                    cryptoAmount: '0.05',
                    cryptoToken: 'ETH',
                    fees: { providerFee: 2.99, networkFee: 1.5, totalFeePercent: 4.49 },
                    totalCost: 104.49,
                    estimatedTime: 600,
                }),
                getWidgetUrl: () => 'https://buy.moonpay.com/?apiKey=test',
            });
            const widget = new OnRampWidget(aggregator, {
                popup: false,
                containerId: 'onramp-widget',
                width: 400,
                height: 600,
            });
            const openPromise = widget.open({
                fiatCurrency: 'USD',
                fiatAmount: 100,
                cryptoToken: 'ETH',
                destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
            });
            // Simulate iframe message completing the flow
            const messageHandler = window.addEventListener.mock.calls[0][1];
            messageHandler({
                data: {
                    type: 'onramp_complete',
                    result: {
                        completed: true,
                        provider: 'moonpay',
                        cryptoAmount: '0.05',
                        fiatAmount: 100,
                    },
                },
            });
            const result = await openPromise;
            expect(result.completed).toBe(true);
            expect(result.cryptoAmount).toBe('0.05');
        });
        it('should handle embedded error message', async () => {
            aggregator.registerProvider({
                id: 'moonpay',
                getProviderInfo: () => ({
                    id: 'moonpay',
                    name: 'MoonPay',
                    regions: ['US'],
                    supportedFiat: ['USD'],
                    supportedCrypto: ['ETH'],
                    minAmount: 10,
                    maxAmount: 10000,
                }),
                getQuote: async () => ({
                    providerId: 'moonpay',
                    providerName: 'MoonPay',
                    fiatAmount: 100,
                    fiatCurrency: 'USD',
                    cryptoAmount: '0.05',
                    cryptoToken: 'ETH',
                    fees: { providerFee: 2.99, networkFee: 1.5, totalFeePercent: 4.49 },
                    totalCost: 104.49,
                    estimatedTime: 600,
                }),
                getWidgetUrl: () => 'https://buy.moonpay.com/?apiKey=test',
            });
            const widget = new OnRampWidget(aggregator, {
                popup: false,
                containerId: 'onramp-widget',
            });
            const openPromise = widget.open({
                fiatCurrency: 'USD',
                fiatAmount: 100,
                cryptoToken: 'ETH',
                destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
            });
            const messageHandler = window.addEventListener.mock.calls[0][1];
            messageHandler({
                data: {
                    type: 'onramp_error',
                    error: 'Payment failed',
                },
            });
            const result = await openPromise;
            expect(result.completed).toBe(false);
            expect(result.error).toBe('Payment failed');
        });
        it('should handle missing container for embedded mode', async () => {
            const widget = new OnRampWidget(aggregator, {
                popup: false,
                containerId: 'nonexistent-container',
            });
            const result = await widget.open({
                fiatCurrency: 'USD',
                fiatAmount: 100,
                cryptoToken: 'ETH',
                destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
            });
            expect(result.completed).toBe(false);
            expect(result.error).toBe('Widget container not found');
        });
    });
    describe('close', () => {
        it('should close popup window', () => {
            const widget = new OnRampWidget(aggregator, { popup: true });
            // Manually set popupWindow
            widget.popupWindow = mockPopup;
            widget.close();
            expect(mockPopup.close).toHaveBeenCalled();
        });
        it('should remove iframe in embedded mode', () => {
            const widget = new OnRampWidget(aggregator, { popup: false });
            // Manually set iframe
            widget.iframe = mockIframe;
            widget.close();
            expect(mockIframe.remove).toHaveBeenCalled();
        });
        it('should emit close event', () => {
            const callback = vi.fn();
            const widget = new OnRampWidget(aggregator, { onEvent: callback });
            widget.close();
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({ type: 'close' }));
        });
    });
    describe('events', () => {
        it('should emit open event', async () => {
            aggregator.registerProvider({
                id: 'moonpay',
                getProviderInfo: () => ({
                    id: 'moonpay',
                    name: 'MoonPay',
                    regions: ['US'],
                    supportedFiat: ['USD'],
                    supportedCrypto: ['ETH'],
                    minAmount: 10,
                    maxAmount: 10000,
                }),
                getQuote: async () => ({
                    providerId: 'moonpay',
                    providerName: 'MoonPay',
                    fiatAmount: 100,
                    fiatCurrency: 'USD',
                    cryptoAmount: '0.05',
                    cryptoToken: 'ETH',
                    fees: { providerFee: 2.99, networkFee: 1.5, totalFeePercent: 4.49 },
                    totalCost: 104.49,
                    estimatedTime: 600,
                }),
                getWidgetUrl: () => 'https://buy.moonpay.com/?apiKey=test',
            });
            const callback = vi.fn();
            const widget = new OnRampWidget(aggregator, { onEvent: callback, popup: true });
            const openPromise = widget.open({
                fiatCurrency: 'USD',
                fiatAmount: 100,
                cryptoToken: 'ETH',
                destinationAddress: '0x1234567890abcdef1234567890abcdef12345678',
            });
            // Close popup to resolve the promise
            mockPopup.closed = true;
            await openPromise;
            // Should have emitted 'open' event
            expect(callback).toHaveBeenCalledWith(expect.objectContaining({ type: 'open' }));
        });
    });
});
//# sourceMappingURL=widget.test.js.map