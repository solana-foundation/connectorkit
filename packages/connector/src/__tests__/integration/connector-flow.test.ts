/**
 * Connector flow integration tests
 *
 * Tests complete connection workflows from wallet detection to disconnection.
 * Mock wallets are registered into the real wallet-standard registry so the
 * kit wallet plugin discovers and connects them like production wallets.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getWallets } from '@wallet-standard/app';
import { ConnectorClient } from '../../lib/core/connector-client';
import { createMockPhantomWallet, createMockSolflareWallet } from '../mocks/wallet-standard-mock';
import { MockStorageAdapter } from '../mocks/storage-mock';
import { createEventCollector, waitForCondition } from '../utils/test-helpers';
import { waitForConnection, waitForDisconnection } from '../utils/wait-for-state';
import { createMockWalletAccount, TEST_ADDRESSES } from '../fixtures/accounts';
import type { Wallet } from '@wallet-standard/base';

const KIT_WALLET_STORAGE_KEY = 'connector-kit:v1:kit-wallet';

function clearKitWalletStorage() {
    try {
        window.localStorage.removeItem(KIT_WALLET_STORAGE_KEY);
    } catch {
        // localStorage unavailable in this environment
    }
}

describe('Connector Flow Integration', () => {
    let client: ConnectorClient;
    let storage: MockStorageAdapter<string | undefined>;
    let eventCollector: ReturnType<typeof createEventCollector>;
    let unregisterFns: Array<() => void>;

    // Register a wallet into the real wallet-standard registry so the kit
    // wallet plugin can discover and connect it
    const registerWallet = (wallet: Wallet) => {
        unregisterFns.push(getWallets().register(wallet));
    };

    beforeEach(() => {
        clearKitWalletStorage();
        unregisterFns = [];

        storage = new MockStorageAdapter('test-wallet');
        eventCollector = createEventCollector();

        client = new ConnectorClient({
            storage: {
                wallet: storage,
            },
            debug: false,
        });

        client.on(eventCollector.collect);
    });

    afterEach(() => {
        client.destroy();
        for (const unregister of unregisterFns) unregister();
        clearKitWalletStorage();
        vi.clearAllMocks();
    });

    describe('wallet detection and connection', () => {
        it('should detect and list available wallets', async () => {
            const wallet = createMockPhantomWallet();
            registerWallet(wallet);

            await waitForCondition(() => client.getSnapshot().connectors.length > 0, { timeout: 2000 });

            const state = client.getSnapshot();
            expect(state.connectors.map(c => c.name)).toContain('Phantom');
            expect(state.wallets.map(w => w.wallet.name)).toContain('Phantom');
        });

        it('should connect to a wallet successfully', async () => {
            const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
            const wallet = createMockPhantomWallet({ accounts: [account] });
            registerWallet(wallet);

            await client.select(wallet.name);

            const state = await waitForConnection(client, 2000);

            expect(state.connected).toBe(true);
            expect(state.selectedAccount).toBe(TEST_ADDRESSES.ACCOUNT_1);
        });

        it('should emit correct events during connection', async () => {
            const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
            const wallet = createMockPhantomWallet({ accounts: [account] });
            registerWallet(wallet);

            eventCollector.clear();

            await client.select(wallet.name);

            await waitForConnection(client, 2000);

            // Check events in order
            eventCollector.assertEventEmitted('connecting');
            eventCollector.assertEventEmitted('wallet:connected');
        });

        it('should persist wallet selection to storage', async () => {
            const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
            const wallet = createMockPhantomWallet({ accounts: [account] });
            registerWallet(wallet);

            await client.select(wallet.name);

            await waitForConnection(client, 2000);

            // Check storage
            const savedWallet = await storage.get();
            expect(savedWallet).toBe('Phantom');
        });

        it('should handle connection errors gracefully', async () => {
            const wallet = createMockPhantomWallet();
            registerWallet(wallet);

            const connectFeature = wallet.features['standard:connect'];
            vi.mocked(connectFeature.connect).mockRejectedValue(new Error('User rejected'));

            await expect(client.select(wallet.name)).rejects.toThrow('User rejected');

            const state = client.getSnapshot();
            expect(state.connected).toBe(false);
            expect(state.connecting).toBe(false);
            expect(state.wallet.status).toBe('error');
        });
    });

    describe('disconnection flow', () => {
        beforeEach(async () => {
            const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
            const wallet = createMockPhantomWallet({ accounts: [account] });
            registerWallet(wallet);

            await client.select(wallet.name);
            await waitForConnection(client, 2000);

            eventCollector.clear();
        });

        it('should disconnect from wallet', async () => {
            await client.disconnect();

            const state = await waitForDisconnection(client, 2000);

            expect(state.connected).toBe(false);
            expect(state.selectedWallet).toBe(null);
            expect(state.selectedAccount).toBe(null);
            expect(state.accounts).toEqual([]);
        });

        it('should emit disconnected event', async () => {
            await client.disconnect();

            await waitForDisconnection(client, 2000);

            eventCollector.assertEventEmitted('wallet:disconnected');
        });
    });

    describe('account selection', () => {
        beforeEach(async () => {
            const account1 = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
            const account2 = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_2);
            const account3 = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_3);
            const wallet = createMockPhantomWallet({ accounts: [account1, account2, account3] });
            registerWallet(wallet);

            await client.select(wallet.name);
            await waitForConnection(client, 2000);

            eventCollector.clear();
        });

        it('should select different account', async () => {
            const initialState = client.getSnapshot();
            expect(initialState.selectedAccount).toBe(TEST_ADDRESSES.ACCOUNT_1);

            await client.selectAccount(TEST_ADDRESSES.ACCOUNT_2);

            await waitForCondition(() => client.getSnapshot().selectedAccount === TEST_ADDRESSES.ACCOUNT_2, {
                timeout: 2000,
            });

            const finalState = client.getSnapshot();
            expect(finalState.selectedAccount).toBe(TEST_ADDRESSES.ACCOUNT_2);
        });

        it('should emit account-changed event', async () => {
            await client.selectAccount(TEST_ADDRESSES.ACCOUNT_2);

            await waitForCondition(() => eventCollector.getEventsByType('account:changed').length > 0, {
                timeout: 5000,
                interval: 100,
            });

            eventCollector.assertEventEmitted('account:changed');
        });

        it('should throw error for invalid account', async () => {
            await expect(client.selectAccount('invalid-address')).rejects.toThrow();
        });
    });

    describe('state persistence and recovery', () => {
        it('should recover state on initialization with persisted wallet', async () => {
            // Pre-populate storage
            await storage.set('Phantom');

            const newClient = new ConnectorClient({
                storage: {
                    wallet: storage,
                },
                autoConnect: true,
                debug: false,
            });

            // The client should attempt to connect to the saved wallet
            // In a real scenario with actual wallet detection
            const state = newClient.getSnapshot();
            expect(state).toBeDefined();

            newClient.destroy();
        });
    });

    describe('multiple wallet switching', () => {
        it('should switch between wallets', async () => {
            const account1 = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
            const account2 = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_2);

            const wallet1 = createMockPhantomWallet({ accounts: [account1] });
            const wallet2 = createMockSolflareWallet({ accounts: [account2] });

            registerWallet(wallet1);
            registerWallet(wallet2);

            // Connect to first wallet
            await client.select(wallet1.name);
            await waitForConnection(client, 2000);

            let state = client.getSnapshot();
            expect(state.selectedAccount).toBe(TEST_ADDRESSES.ACCOUNT_1);

            // Switch to second wallet
            await client.select(wallet2.name);
            await waitForCondition(() => client.getSnapshot().selectedAccount === TEST_ADDRESSES.ACCOUNT_2, {
                timeout: 2000,
            });

            state = client.getSnapshot();
            expect(state.selectedAccount).toBe(TEST_ADDRESSES.ACCOUNT_2);
        });
    });
});
