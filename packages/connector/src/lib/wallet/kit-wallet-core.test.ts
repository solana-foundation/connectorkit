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

    it('prefers storage.clear() when clearing the persisted wallet name', async () => {
        const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
        registerWallet(createMockPhantomWallet({ accounts: [account] }));

        const storage = { get: vi.fn(), set: vi.fn(), clear: vi.fn() };
        const walletCore = createCore({ walletStorage: storage });

        await walletCore.connectWallet(createConnectorId('Phantom'));
        expect(storage.set).toHaveBeenCalledWith('Phantom');

        await walletCore.disconnect();
        expect(storage.clear).toHaveBeenCalled();
        expect(events.some(e => e.type === 'wallet:disconnected')).toBe(true);
    });
});
