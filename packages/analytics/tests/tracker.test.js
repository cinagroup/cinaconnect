import { describe, it, expect, beforeEach } from 'vitest';
import { Analytics } from '../src/tracker.js';
describe('Analytics Event Tracking', () => {
    let analytics;
    beforeEach(() => {
        analytics = new Analytics({ local: false, remote: undefined });
    });
    it('should create an analytics instance', () => {
        const state = analytics.getState();
        expect(state.sessionId).toBeTruthy();
        expect(state.tracking).toBe(true);
        expect(state.eventCount).toBe(0);
    });
    it('should track a wallet connect event', () => {
        analytics.trackWalletConnect({
            walletId: 'metamask',
            chainId: 1,
            address: '0xabc',
            connectorType: 'injected',
            duration: 1500,
            success: true,
        });
        const events = analytics.getEvents();
        expect(events.length).toBe(1);
        expect(events[0].type).toBe('wallet_connect');
    });
    it('should track a wallet disconnect event', () => {
        analytics.trackWalletDisconnect('metamask', 'user_initiated');
        const events = analytics.getEvents();
        expect(events.length).toBe(1);
        expect(events[0].type).toBe('wallet_disconnect');
    });
    it('should track a chain switch event', () => {
        analytics.trackChainSwitch(1, 137);
        const events = analytics.getEvents();
        expect(events.length).toBe(1);
        expect(events[0].type).toBe('chain_switch');
    });
    it('should track a successful transaction', () => {
        analytics.trackTransactionAttempt({
            chainId: 1,
            method: 'transfer',
            duration: 3000,
            success: true,
        });
        const events = analytics.getEvents();
        expect(events.length).toBe(1);
        expect(events[0].type).toBe('transaction_success');
    });
    it('should track a failed transaction', () => {
        analytics.trackTransactionAttempt({
            chainId: 1,
            method: 'swap',
            duration: 5000,
            success: false,
            error: 'Slippage exceeded',
        });
        const events = analytics.getEvents();
        expect(events.length).toBe(1);
        expect(events[0].type).toBe('transaction_failure');
    });
    it('should track an error event', () => {
        analytics.trackError('CONN_001', 'Connection timeout', { chainId: 1 });
        const events = analytics.getEvents();
        expect(events.length).toBe(1);
        expect(events[0].type).toBe('error');
    });
    it('should not track when disabled', () => {
        analytics.disable();
        analytics.trackWalletConnect({
            walletId: 'test', chainId: 1, address: '0x0', connectorType: 'injected', success: true,
        });
        expect(analytics.getEvents().length).toBe(0);
    });
    it('should clear all events', () => {
        analytics.trackWalletConnect({
            walletId: 'test', chainId: 1, address: '0x0', connectorType: 'injected', success: true,
        });
        analytics.clear();
        expect(analytics.getEvents().length).toBe(0);
    });
    it('should compute metrics from events', () => {
        analytics.trackWalletConnect({
            walletId: 'metamask', chainId: 1, address: '0x1', connectorType: 'injected',
            duration: 1000, success: true,
        });
        analytics.trackWalletConnect({
            walletId: 'walletconnect', chainId: 1, address: '0x2', connectorType: 'wc',
            duration: 2000, success: true,
        });
        analytics.trackWalletConnect({
            walletId: 'metamask', chainId: 137, address: '0x3', connectorType: 'injected',
            duration: 500, success: false,
        });
        const metrics = analytics.getMetrics();
        expect(metrics.connection.totalAttempts).toBe(3);
        expect(metrics.connection.successful).toBe(2);
        expect(metrics.connection.failed).toBe(1);
        expect(metrics.connection.successRate).toBeCloseTo(2 / 3, 2);
        expect(metrics.wallet.uniqueWallets).toBe(2);
    });
});
