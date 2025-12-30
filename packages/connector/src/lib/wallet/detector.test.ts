import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalletDetector } from './detector';
import { StateManager } from '../core/state-manager';
import { EventEmitter } from '../core/event-emitter';
import type { ConnectorState } from '../../types/connector';
import { getWalletsRegistry } from './standard-shim';
import { createMockBackpackWallet, createMockPhantomWallet, createMockSolflareWallet } from '../../__tests__/mocks/wallet-standard-mock';
import { applyWalletIconOverride, getWalletIconOverride } from './wallet-icon-overrides';

// Mock dependencies
vi.mock('./standard-shim', () => ({
    getWalletsRegistry: vi.fn(() => ({
        get: vi.fn(() => []),
        on: vi.fn(() => vi.fn()),
    })),
}));

vi.mock('./authenticity-verifier', () => ({
    WalletAuthenticityVerifier: {
        verify: vi.fn(() => ({ authentic: true, confidence: 0.95 })),
    },
}));

vi.mock('../utils/secure-logger', () => ({
    createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

describe('WalletDetector', () => {
    let detector: WalletDetector;
    let mockStateManager: StateManager;
    let mockEventEmitter: EventEmitter;

    beforeEach(() => {
        const initialState: ConnectorState = {
            wallets: [],
            selectedWallet: null,
            connected: false,
            connecting: false,
            accounts: [],
            selectedAccount: null,
            cluster: null,
            clusters: [],
        };

        mockStateManager = new StateManager(initialState);
        mockEventEmitter = new EventEmitter(false);

        detector = new WalletDetector(mockStateManager, mockEventEmitter);
    });

    it('should initialize successfully', () => {
        expect(detector).toBeInstanceOf(WalletDetector);
    });

    it('should have initialize method', () => {
        expect(typeof detector.initialize).toBe('function');
    });

    it('should get detected wallets', () => {
        const wallets = detector.getDetectedWallets();
        expect(Array.isArray(wallets)).toBe(true);
    });

    it('should have destroy method for cleanup', () => {
        expect(typeof detector.destroy).toBe('function');
        expect(() => detector.destroy()).not.toThrow();
    });

    it('should override known wallet icons (Phantom, Solflare, Backpack)', () => {
        const phantom = createMockPhantomWallet({ icon: 'data:image/svg+xml,<svg><text>OLD_P</text></svg>' });
        const solflare = createMockSolflareWallet({ icon: 'data:image/svg+xml,<svg><text>OLD_S</text></svg>' });
        const backpack = createMockBackpackWallet({ icon: 'data:image/svg+xml,<svg><text>OLD_B</text></svg>' });

        vi.mocked(getWalletsRegistry).mockReturnValue({
            get: vi.fn(() => [phantom, solflare, backpack]),
            on: vi.fn(() => vi.fn()),
        } as unknown as ReturnType<typeof getWalletsRegistry>);

        detector.initialize();

        const detected = mockStateManager.getSnapshot().wallets;

        function iconFor(name: string) {
            return detected.find(w => w.wallet.name === name)?.wallet.icon;
        }

        expect(iconFor('Phantom')).toBe(getWalletIconOverride('Phantom'));
        expect(iconFor('Solflare')).toBe(getWalletIconOverride('Solflare'));
        expect(iconFor('Backpack')).toBe(getWalletIconOverride('Backpack'));
    });

    it('should not drop wallet fields when icon override cannot mutate (non-extensible prototype wallet)', () => {
        class ProtoWallet {
            private _name: string;
            private _icon: string;
            private _chains: readonly `${string}:${string}`[];
            private _accounts: readonly unknown[];
            private _features: Record<string, unknown>;

            constructor(name: string) {
                this._name = name;
                this._icon = 'data:image/svg+xml,<svg><text>ORIGINAL</text></svg>';
                this._chains = ['solana:mainnet'];
                this._accounts = [];
                this._features = {
                    'standard:connect': { version: '1.0.0' },
                    'standard:disconnect': { version: '1.0.0' },
                };
            }

            get version() {
                return '1.0.0';
            }
            get name() {
                return this._name;
            }
            get icon() {
                return this._icon;
            }
            get chains() {
                return this._chains;
            }
            get accounts() {
                return this._accounts;
            }
            get features() {
                return this._features;
            }
        }

        const wallet = new ProtoWallet('Phantom') as unknown as import('../../types/wallets').Wallet;
        Object.preventExtensions(wallet);

        const wrapped = applyWalletIconOverride(wallet);

        expect(wrapped.name).toBe('Phantom');
        expect(wrapped.features).toBeDefined();
        expect(wrapped.chains).toBeDefined();
        expect(wrapped.icon).toBe(getWalletIconOverride('Phantom'));
    });

    it('should support class wallets with private fields when using proxy fallback', () => {
        class PrivateFieldWallet {
            #name: string;
            #icon: string;
            #chains: readonly `${string}:${string}`[];
            #accounts: readonly unknown[];
            #features: Record<string, unknown>;

            constructor(name: string) {
                this.#name = name;
                this.#icon = 'data:image/svg+xml,<svg><text>ORIGINAL</text></svg>';
                this.#chains = ['solana:mainnet'];
                this.#accounts = [];
                this.#features = {
                    'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [] }) },
                    'standard:disconnect': { version: '1.0.0', disconnect: async () => {} },
                };
            }

            get version() {
                return '1.0.0';
            }
            get name() {
                return this.#name;
            }
            get icon() {
                return this.#icon;
            }
            get chains() {
                return this.#chains;
            }
            get accounts() {
                return this.#accounts;
            }
            get features() {
                return this.#features;
            }
        }

        const wallet = new PrivateFieldWallet('Phantom') as unknown as import('../../types/wallets').Wallet;
        Object.preventExtensions(wallet);

        const wrapped = applyWalletIconOverride(wallet);

        // These accesses must not throw (private fields must remain reachable).
        expect(wrapped.name).toBe('Phantom');
        expect(wrapped.features).toBeDefined();
        expect(wrapped.chains).toBeDefined();
        expect(wrapped.icon).toBe(getWalletIconOverride('Phantom'));
    });
});
