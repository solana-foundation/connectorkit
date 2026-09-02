import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getWallets } from '@wallet-standard/app';
import type { Wallet } from '@wallet-standard/base';

import { KitWalletCore, applyWalletDisplayConfig, normalizeWalletChain } from './kit-wallet-core';
import { StateManager } from '../core/state-manager';
import { EventEmitter } from '../core/event-emitter';
import { INITIAL_WALLET_STATUS, createConnectorId } from '../../types/session';
import type { ConnectorState } from '../../types/connector';
import type { ConnectorEvent } from '../../types/events';
import { createMockPhantomWallet, createMockSolflareWallet } from '../../__tests__/mocks/wallet-standard-mock';
import { createMockWalletAccount, TEST_ADDRESSES } from '../../__tests__/fixtures/accounts';
import { setupMockWindow, cleanupMockWindow } from '../../__tests__/mocks/window-mock';
import { waitForCondition } from '../../__tests__/utils/test-helpers';

describe('normalizeWalletChain', () => {
    it('passes through standard chains', () => {
        expect(normalizeWalletChain('solana:devnet')).toBe('solana:devnet');
        expect(normalizeWalletChain('solana:testnet')).toBe('solana:testnet');
        expect(normalizeWalletChain('solana:localnet')).toBe('solana:localnet');
        expect(normalizeWalletChain('solana:mainnet')).toBe('solana:mainnet');
    });

    it('falls back to mainnet for custom or missing cluster ids', () => {
        expect(normalizeWalletChain('solana:my-custom-cluster')).toBe('solana:mainnet');
        expect(normalizeWalletChain(null)).toBe('solana:mainnet');
        expect(normalizeWalletChain(undefined)).toBe('solana:mainnet');
    });
});

describe('applyWalletDisplayConfig', () => {
    const wallets = [{ name: 'Phantom' }, { name: 'Solflare' }, { name: 'Backpack' }];

    it('returns all wallets without config', () => {
        expect(applyWalletDisplayConfig(wallets, undefined)).toEqual(wallets);
    });

    it('filters with allowList (case-insensitive)', () => {
        const result = applyWalletDisplayConfig(wallets, { allowList: ['phantom', 'SOLFLARE'] });
        expect(result.map(w => w.name)).toEqual(['Phantom', 'Solflare']);
    });

    it('removes denyList entries and deny wins over allow', () => {
        const result = applyWalletDisplayConfig(wallets, {
            allowList: ['Phantom', 'Solflare'],
            denyList: ['solflare'],
        });
        expect(result.map(w => w.name)).toEqual(['Phantom']);
    });

    it('reorders featured wallets to the front without dropping others', () => {
        const result = applyWalletDisplayConfig(wallets, { featured: ['backpack'] });
        expect(result.map(w => w.name)).toEqual(['Backpack', 'Phantom', 'Solflare']);
    });
});

describe('KitWalletCore', () => {
    let stateManager: StateManager;
    let eventEmitter: EventEmitter;
    let events: ConnectorEvent[];
    let core: KitWalletCore | null;
    let unregisterFns: Array<() => void>;

    const initialState: ConnectorState = {
        wallet: INITIAL_WALLET_STATUS,
        connectors: [],
        wallets: [],
        selectedWallet: null,
        connected: false,
        connecting: false,
        accounts: [],
        selectedAccount: null,
        cluster: null,
        clusters: [],
    };

    const registerWallet = (wallet: Wallet) => {
        unregisterFns.push(getWallets().register(wallet));
    };

    const createCore = (options: ConstructorParameters<typeof KitWalletCore>[2] = {}) => {
        core = new KitWalletCore(stateManager, eventEmitter, options);
        core.start('solana:mainnet');
        return core;
    };

    beforeEach(() => {
        unregisterFns = [];
        events = [];
        stateManager = new StateManager({ ...initialState });
        eventEmitter = new EventEmitter(false);
        eventEmitter.on(event => events.push(event));
        core = null;
    });

    afterEach(() => {
        core?.destroy();
        for (const unregister of unregisterFns) unregister();
        vi.clearAllMocks();
    });

    it('projects discovered wallets into connectors and legacy wallets', async () => {
        registerWallet(createMockPhantomWallet());
        createCore();

        await waitForCondition(() => stateManager.getSnapshot().connectors.length > 0, { timeout: 2000 });

        const state = stateManager.getSnapshot();
        const phantom = state.connectors.find(c => c.name === 'Phantom');
        expect(phantom).toBeDefined();
        expect(phantom!.id).toBe('wallet-standard:phantom');
        expect(phantom!.ready).toBe(true);
        expect(phantom!.chains).toContain('solana:mainnet');
        expect(phantom!.features).toContain('standard:connect');
        expect(state.wallets.some(w => w.wallet.name === 'Phantom' && w.connectable)).toBe(true);
        expect(events.some(e => e.type === 'wallets:detected')).toBe(true);
    });

    it('applies display config to discovery and ordering', async () => {
        registerWallet(createMockPhantomWallet());
        registerWallet(createMockSolflareWallet());
        createCore({ display: { denyList: ['phantom'] } });

        await waitForCondition(() => stateManager.getSnapshot().connectors.length > 0, { timeout: 2000 });

        const names = stateManager.getSnapshot().connectors.map(c => c.name);
        expect(names).toContain('Solflare');
        expect(names).not.toContain('Phantom');
    });

    it('builds a session with legacy accounts carrying raw wallet-standard accounts', async () => {
        const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
        registerWallet(createMockPhantomWallet({ accounts: [account] }));
        const walletCore = createCore();

        await walletCore.connectWallet(createConnectorId('Phantom'));

        const state = stateManager.getSnapshot();
        expect(state.wallet.status).toBe('connected');
        if (state.wallet.status !== 'connected') return;
        expect(state.wallet.session.connectorId).toBe('wallet-standard:phantom');
        expect(state.wallet.session.selectedAccount.address).toBe(TEST_ADDRESSES.ACCOUNT_1);
        expect(state.wallet.session.accounts[0].account.address).toBe(TEST_ADDRESSES.ACCOUNT_1);

        // Legacy projection feeds the kit signer path
        expect(state.connected).toBe(true);
        expect(state.selectedWallet?.name).toBe('Phantom');
        expect(state.selectedAccount).toBe(TEST_ADDRESSES.ACCOUNT_1);
        expect(state.accounts[0].raw.address).toBe(TEST_ADDRESSES.ACCOUNT_1);
    });

    it('flags user rejections as recoverable errors', async () => {
        const wallet = createMockPhantomWallet();
        registerWallet(wallet);
        vi.mocked(wallet.features['standard:connect'].connect).mockRejectedValue(new Error('User rejected request'));
        const walletCore = createCore();

        await expect(walletCore.connectWallet(createConnectorId('Phantom'))).rejects.toThrow('User rejected');

        const state = stateManager.getSnapshot();
        expect(state.wallet.status).toBe('error');
        if (state.wallet.status !== 'error') return;
        expect(state.wallet.recoverable).toBe(true);
        expect(state.wallet.connectorId).toBe('wallet-standard:phantom');
        expect(events.some(e => e.type === 'connection:failed')).toBe(true);
    });

    it('throws for unknown connectors and wallet names', async () => {
        const walletCore = createCore();
        await expect(walletCore.connectWallet(createConnectorId('Ghost'))).rejects.toThrow(
            'Connector wallet-standard:ghost not found',
        );
        await expect(walletCore.connectByName('Ghost')).rejects.toThrow('Wallet Ghost not found');
    });

    it('validates selectAccount inputs', async () => {
        const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
        registerWallet(createMockPhantomWallet({ accounts: [account] }));
        const walletCore = createCore();

        await expect(walletCore.selectAccount(TEST_ADDRESSES.ACCOUNT_1)).rejects.toThrow('No wallet connected');

        await walletCore.connectWallet(createConnectorId('Phantom'));

        await expect(walletCore.selectAccount('abc')).rejects.toThrow('Invalid address format');
        await expect(walletCore.selectAccount(TEST_ADDRESSES.ACCOUNT_2)).rejects.toThrow(
            'Requested account not available',
        );
    });

    it('keeps the live session when a connect attempt to another wallet fails', async () => {
        const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
        registerWallet(createMockPhantomWallet({ accounts: [account] }));
        const solflare = createMockSolflareWallet();
        vi.mocked(solflare.features['standard:connect'].connect).mockRejectedValue(new Error('User rejected request'));
        registerWallet(solflare);
        const walletCore = createCore();

        await walletCore.connectWallet(createConnectorId('Phantom'));
        await expect(walletCore.connectWallet(createConnectorId('Solflare'))).rejects.toThrow('User rejected');

        const state = stateManager.getSnapshot();
        expect(state.wallet.status).toBe('connected');
        if (state.wallet.status !== 'connected') return;
        expect(state.wallet.session.connectorId).toBe('wallet-standard:phantom');
        expect(state.connected).toBe(true);
        expect(state.selectedWallet?.name).toBe('Phantom');
        expect(events.some(e => e.type === 'connection:failed')).toBe(true);
        expect(events.some(e => e.type === 'error' && e.context === 'connect')).toBe(true);
        expect(events.some(e => e.type === 'wallet:disconnected')).toBe(false);
    });

    it('preserves the session across setChain', async () => {
        setupMockWindow();
        try {
            const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
            registerWallet(createMockPhantomWallet({ accounts: [account] }));
            const walletCore = createCore();

            await walletCore.connectWallet(createConnectorId('Phantom'));
            events.length = 0;

            await walletCore.setChain('solana:devnet');
            await waitForCondition(() => stateManager.getSnapshot().wallet.status === 'connected', {
                timeout: 2000,
            });

            const state = stateManager.getSnapshot();
            expect(state.wallet.status).toBe('connected');
            expect(state.connected).toBe(true);
            expect(events.some(e => e.type === 'wallet:disconnected')).toBe(false);
        } finally {
            cleanupMockWindow();
        }
    });

    it('does not wipe persistence when silent reconnect fails during setChain', async () => {
        setupMockWindow();
        try {
            const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
            const wallet = createMockPhantomWallet({ accounts: [account] });
            registerWallet(wallet);

            let value: string | undefined;
            const storage = {
                get: vi.fn(() => value),
                set: vi.fn((next: string | undefined) => {
                    value = next;
                }),
                clear: vi.fn(),
            };
            const walletCore = createCore({ walletStorage: storage });

            await walletCore.connectWallet(createConnectorId('Phantom'));
            await waitForCondition(() => value === `Phantom:${TEST_ADDRESSES.ACCOUNT_1}`, { timeout: 2000 });

            // The replacement client's silent reconnect is rejected (a wallet
            // that refuses silent connects); a network switch must not turn
            // that into a wiped persisted session.
            vi.mocked(wallet.features['standard:connect'].connect).mockRejectedValue(new Error('silent rejected'));
            await walletCore.setChain('solana:devnet');

            expect(value).toBe(`Phantom:${TEST_ADDRESSES.ACCOUNT_1}`);
            expect(storage.clear).not.toHaveBeenCalled();
        } finally {
            cleanupMockWindow();
        }
    });

    it('clears persistence on explicit disconnect after a completed chain swap', async () => {
        setupMockWindow();
        try {
            const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
            registerWallet(createMockPhantomWallet({ accounts: [account] }));

            let value: string | undefined;
            const storage = {
                get: vi.fn(() => value),
                set: vi.fn((next: string | undefined) => {
                    value = next;
                }),
                clear: vi.fn(),
            };
            const walletCore = createCore({ walletStorage: storage });

            await walletCore.connectWallet(createConnectorId('Phantom'));
            await walletCore.setChain('solana:devnet');
            await waitForCondition(() => stateManager.getSnapshot().wallet.status === 'connected', { timeout: 2000 });

            // Suppression is scoped to the warm-up; a real disconnect on the
            // attached client still clears storage.
            await walletCore.disconnect();
            await waitForCondition(() => storage.clear.mock.calls.length > 0, { timeout: 2000 });
        } finally {
            cleanupMockWindow();
        }
    });

    it('silently restores a persisted session with autoConnect', async () => {
        setupMockWindow();
        try {
            const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
            registerWallet(createMockPhantomWallet({ accounts: [account] }));
            localStorage.setItem('connector-kit:v1:kit-wallet', `Phantom:${TEST_ADDRESSES.ACCOUNT_1}`);

            createCore({ autoConnect: true });

            await waitForCondition(() => stateManager.getSnapshot().wallet.status === 'connected', {
                timeout: 2000,
            });

            const state = stateManager.getSnapshot();
            expect(state.wallet.status).toBe('connected');
            expect(state.selectedAccount).toBe(TEST_ADDRESSES.ACCOUNT_1);
            expect(events.some(e => e.type === 'wallet:connected')).toBe(true);
        } finally {
            cleanupMockWindow();
        }
    });

    it('notifies onAccountsChanged only when the account set changes', async () => {
        const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
        registerWallet(createMockPhantomWallet({ accounts: [account] }));
        const walletCore = createCore();

        await walletCore.connectWallet(createConnectorId('Phantom'));

        const state = stateManager.getSnapshot();
        if (state.wallet.status !== 'connected') throw new Error('expected connected');
        const listener = vi.fn();
        state.wallet.session.onAccountsChanged(listener);

        registerWallet(createMockSolflareWallet());
        await waitForCondition(() => stateManager.getSnapshot().connectors.length === 2, { timeout: 2000 });

        expect(listener).not.toHaveBeenCalled();
    });

    it('does not fire session listeners after disconnect and a new connection', async () => {
        registerWallet(createMockPhantomWallet({ accounts: [createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1)] }));
        registerWallet(createMockSolflareWallet({ accounts: [createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_2)] }));
        const walletCore = createCore();

        await walletCore.connectWallet(createConnectorId('Phantom'));
        const state = stateManager.getSnapshot();
        if (state.wallet.status !== 'connected') throw new Error('expected connected');
        const listener = vi.fn();
        state.wallet.session.onAccountsChanged(listener);

        await walletCore.disconnect();
        await walletCore.connectWallet(createConnectorId('Solflare'));

        expect(listener).not.toHaveBeenCalled();
    });

    it('does not fire session listeners across a direct wallet switch', async () => {
        registerWallet(createMockPhantomWallet({ accounts: [createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1)] }));
        registerWallet(createMockSolflareWallet({ accounts: [createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_2)] }));
        const walletCore = createCore();

        await walletCore.connectWallet(createConnectorId('Phantom'));
        const state = stateManager.getSnapshot();
        if (state.wallet.status !== 'connected') throw new Error('expected connected');
        const listener = vi.fn();
        state.wallet.session.onAccountsChanged(listener);

        await walletCore.connectWallet(createConnectorId('Solflare'));

        expect(listener).not.toHaveBeenCalled();
    });

    it('supports connecting again after destroy and restart', async () => {
        const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
        registerWallet(createMockPhantomWallet({ accounts: [account] }));
        const walletCore = createCore();
        await waitForCondition(() => stateManager.getSnapshot().connectors.length > 0, { timeout: 2000 });

        walletCore.destroy();
        walletCore.start('solana:mainnet');

        await walletCore.connectWallet(createConnectorId('Phantom'));
        expect(stateManager.getSnapshot().wallet.status).toBe('connected');
    });

    it('persists the active connection through a consumer storage adapter', async () => {
        const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
        registerWallet(createMockPhantomWallet({ accounts: [account] }));

        let value: string | undefined;
        const storage = {
            get: vi.fn(() => value),
            set: vi.fn((next: string | undefined) => {
                value = next;
            }),
        };
        const walletCore = createCore({ walletStorage: storage });

        await walletCore.connectWallet(createConnectorId('Phantom'));
        await waitForCondition(() => storage.set.mock.calls.length > 0, { timeout: 2000 });
        expect(value).toBe(`Phantom:${TEST_ADDRESSES.ACCOUNT_1}`);

        await walletCore.disconnect();
        await waitForCondition(() => value === undefined, { timeout: 2000 });
        expect(events.some(e => e.type === 'wallet:disconnected')).toBe(true);
    });

    it('prefers storage.clear() when the adapter exposes it', async () => {
        const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
        registerWallet(createMockPhantomWallet({ accounts: [account] }));

        const storage = { get: vi.fn(() => undefined), set: vi.fn(), clear: vi.fn() };
        const walletCore = createCore({ walletStorage: storage });

        await walletCore.connectWallet(createConnectorId('Phantom'));
        await walletCore.disconnect();

        await waitForCondition(() => storage.clear.mock.calls.length > 0, { timeout: 2000 });
        expect(storage.set).not.toHaveBeenCalledWith(undefined);
    });

    it('preserves a legacy bare-name persisted value without reconnecting or clearing', async () => {
        const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
        registerWallet(createMockPhantomWallet({ accounts: [account] }));

        // Pre-plugin releases persisted just the wallet name.
        let value: string | undefined = 'Phantom';
        const storage = {
            get: vi.fn(() => value),
            set: vi.fn((next: string | undefined) => {
                value = next;
            }),
            clear: vi.fn(),
        };
        const walletCore = createCore({ autoConnect: true, walletStorage: storage });

        await waitForCondition(() => stateManager.getSnapshot().wallet.status === 'disconnected', { timeout: 2000 });
        expect(value).toBe('Phantom');
        expect(storage.clear).not.toHaveBeenCalled();
        expect(storage.set).not.toHaveBeenCalledWith(undefined);

        // The next manual connect upgrades the value to the plugin format.
        await walletCore.connectWallet(createConnectorId('Phantom'));
        await waitForCondition(() => value === `Phantom:${TEST_ADDRESSES.ACCOUNT_1}`, { timeout: 2000 });
    });

    it('auto-reconnects from a consumer storage adapter', async () => {
        const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
        registerWallet(createMockPhantomWallet({ accounts: [account] }));

        let value: string | undefined = `Phantom:${TEST_ADDRESSES.ACCOUNT_1}`;
        const storage = {
            get: vi.fn(() => value),
            set: vi.fn((next: string | undefined) => {
                value = next;
            }),
        };

        createCore({ autoConnect: true, walletStorage: storage });

        await waitForCondition(() => stateManager.getSnapshot().wallet.status === 'connected', { timeout: 2000 });

        expect(storage.get).toHaveBeenCalled();
        expect(stateManager.getSnapshot().selectedAccount).toBe(TEST_ADDRESSES.ACCOUNT_1);
    });

    it('projects the warm-up as a connect attempt against the persisted connector', async () => {
        const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
        registerWallet(createMockPhantomWallet({ accounts: [account] }));

        const storage = { get: vi.fn(() => `Phantom:${TEST_ADDRESSES.ACCOUNT_1}`), set: vi.fn() };
        const walletCore = new KitWalletCore(stateManager, eventEmitter, {
            autoConnect: true,
            walletStorage: storage,
        });
        core = walletCore;
        walletCore.start('solana:mainnet');

        const state = stateManager.getSnapshot();
        expect(state.wallet.status).toBe('connecting');
        if (state.wallet.status !== 'connecting') return;
        expect(state.wallet.connectorId).toBe('wallet-standard:phantom');
        expect(state.connecting).toBe(true);
    });

    it('leaves persistence to the plugin default when no adapter is supplied', async () => {
        setupMockWindow();
        try {
            const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
            registerWallet(createMockPhantomWallet({ accounts: [account] }));
            const walletCore = createCore();

            await walletCore.connectWallet(createConnectorId('Phantom'));
            await waitForCondition(() => localStorage.getItem('connector-kit:v1:kit-wallet') !== null, {
                timeout: 2000,
            });

            expect(localStorage.getItem('connector-kit:v1:kit-wallet')).toBe(`Phantom:${TEST_ADDRESSES.ACCOUNT_1}`);
        } finally {
            cleanupMockWindow();
        }
    });
});
