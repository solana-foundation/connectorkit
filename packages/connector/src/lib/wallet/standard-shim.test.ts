import { describe, it, expect, vi } from 'vitest';
import { getWalletsRegistry } from './standard-shim';

// Mock @wallet-standard/app
vi.mock('@wallet-standard/app', () => ({
    getWallets: vi.fn(() => null),
}));

describe('Wallet Standard Shim', () => {
    it('should get wallets registry', () => {
        const registry = getWalletsRegistry();

        expect(registry).toHaveProperty('get');
        expect(registry).toHaveProperty('on');
        expect(typeof registry.get).toBe('function');
        expect(typeof registry.on).toBe('function');
    });

    it('should return fallback registry in SSR', () => {
        const originalWindow = globalThis.window;
        Object.defineProperty(globalThis, 'window', { value: undefined, configurable: true });

        const registry = getWalletsRegistry();
        expect(registry.get()).toEqual([]);

        Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
    });
});
