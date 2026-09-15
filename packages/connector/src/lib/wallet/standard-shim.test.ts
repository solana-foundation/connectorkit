import { describe, it, expect, vi } from 'vitest';
import { getWalletsRegistry, __resetWalletRegistryForTesting } from './standard-shim';

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

    it('should deliver register events subscribed before the registry is ready', () => {
        __resetWalletRegistryForTesting();

        const originalWallets = (window.navigator as Navigator & { wallets?: unknown }).wallets;
        const registerCallback = vi.fn();

        try {
            Object.defineProperty(window.navigator, 'wallets', {
                value: undefined,
                configurable: true,
                writable: true,
            });

            const api = getWalletsRegistry();
            api.on('register', registerCallback);

            const attached: Array<(wallet: unknown) => void> = [];
            const lateRegistry = {
                get: () => [],
                on: (event: string, callback: (wallet: unknown) => void) => {
                    if (event === 'register') attached.push(callback);
                    return () => {};
                },
            };

            Object.defineProperty(window.navigator, 'wallets', {
                value: lateRegistry,
                configurable: true,
                writable: true,
            });

            getWalletsRegistry().get();

            const wallet = { name: 'Phantom' };
            attached.forEach(callback => callback(wallet));

            expect(registerCallback).toHaveBeenCalledWith(wallet);
        } finally {
            Object.defineProperty(window.navigator, 'wallets', {
                value: originalWallets,
                configurable: true,
                writable: true,
            });
            __resetWalletRegistryForTesting();
        }
    });

    it('unsubscribe before the registry is ready does not reattach later', () => {
        __resetWalletRegistryForTesting();

        const originalWallets = (window.navigator as Navigator & { wallets?: unknown }).wallets;
        const registerCallback = vi.fn();

        try {
            Object.defineProperty(window.navigator, 'wallets', {
                value: undefined,
                configurable: true,
                writable: true,
            });

            const api = getWalletsRegistry();
            const unsubscribe = api.on('register', registerCallback);

            const attached: Array<(wallet: unknown) => void> = [];
            const lateRegistry = {
                get: () => [],
                on: (event: string, callback: (wallet: unknown) => void) => {
                    if (event === 'register') attached.push(callback);
                    return () => {
                        const index = attached.indexOf(callback);
                        if (index >= 0) attached.splice(index, 1);
                    };
                },
            };

            Object.defineProperty(window.navigator, 'wallets', {
                value: lateRegistry,
                configurable: true,
                writable: true,
            });

            getWalletsRegistry().get();
            unsubscribe();
            getWalletsRegistry().get();

            const wallet = { name: 'Phantom' };
            attached.forEach(callback => callback(wallet));

            expect(registerCallback).not.toHaveBeenCalled();
        } finally {
            Object.defineProperty(window.navigator, 'wallets', {
                value: originalWallets,
                configurable: true,
                writable: true,
            });
            __resetWalletRegistryForTesting();
        }
    });

    it('should return fallback registry in SSR', () => {
        const originalWindow = globalThis.window;
        Object.defineProperty(globalThis, 'window', { value: undefined, configurable: true });

        const registry = getWalletsRegistry();
        expect(registry.get()).toEqual([]);

        Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
    });
});
