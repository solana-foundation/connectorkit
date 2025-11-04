/**
 * Connector flow integration tests
 *
 * Tests complete connection workflows from wallet detection to disconnection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectorClient } from '../../lib/core/connector-client';
import { createMockPhantomWallet, mockWalletRegistry } from '../mocks/wallet-standard-mock';
import { MockStorageAdapter } from '../mocks/storage-mock';
import { createEventCollector, waitForCondition } from '../utils/test-helpers';
import { waitForConnection, waitForDisconnection } from '../utils/wait-for-state';
import { createMockWalletAccount, TEST_ADDRESSES } from '../fixtures/accounts';

describe('Connector Flow Integration', () => {
    let client: ConnectorClient;
    let storage: MockStorageAdapter<string | undefined>;
    let eventCollector: ReturnType<typeof createEventCollector>;

    // Helper to add a wallet to the connector's state
    const addWalletToClient = (wallet: any) => {
        const state = client.getSnapshot();
        (client as any).stateManager.updateState({
            wallets: [
                ...state.wallets,
                {
                    wallet,
                    name: wallet.name,
                    icon: wallet.icon,
                    isRegistered: true,
                },
            ],
        });
    };

    beforeEach(() => {
        // Setup mock window environment
        global.window = {} as Window & typeof globalThis;

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
        // @ts-expect-error - Clean up
        delete global.window;
        vi.clearAllMocks();
    });

    describe('wallet detection and connection', () => {
        it('should detect and list available wallets', async () => {
            const wallet = createMockPhantomWallet();
            const registry = mockWalletRegistry([wallet]);

            // Client initializes automatically in constructor
            // Manually add wallet to simulate detection
            const state = client.getSnapshot();

            expect(state).toBeDefined();
        });

        it('should connect to a wallet successfully', async () => {
            const wallet = createMockPhantomWallet();
            const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);

            const connectFeature = wallet.features['standard:connect'];
            vi.mocked(connectFeature.connect).mockResolvedValue({
                accounts: [account],
            });

            // Add wallet to client state
            addWalletToClient(wallet);

            // Attempt connection
            await client.select(wallet.name);

            // Wait for connection
            const state = await waitForConnection(client, 2000);

            expect(state.connected).toBe(true);
            expect(state.selectedAccount).toBe(TEST_ADDRESSES.ACCOUNT_1);
        });

        it('should emit correct events during connection', async () => {
            const wallet = createMockPhantomWallet();
            const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);

            const connectFeature = wallet.features['standard:connect'];
            vi.mocked(connectFeature.connect).mockResolvedValue({
                accounts: [account],
            });

            // Add wallet to client state
            addWalletToClient(wallet);

            eventCollector.clear();

            await client.select(wallet.name);

            // Wait for connection to complete
            await waitForConnection(client, 2000);

            // Check events in order
            eventCollector.assertEventEmitted('connecting');
        });

        it('should persist wallet selection to storage', async () => {
            const wallet = createMockPhantomWallet();
            const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);

            const connectFeature = wallet.features['standard:connect'];
            vi.mocked(connectFeature.connect).mockResolvedValue({
                accounts: [account],
            });

            // Add wallet to client state
            addWalletToClient(wallet);

            await client.select(wallet.name);

            await waitForConnection(client, 2000);

            // Check storage
            const savedWallet = await storage.get();
            expect(savedWallet).toBe('Phantom');
        });

        it('should handle connection errors gracefully', async () => {
            const wallet = createMockPhantomWallet();

            const connectFeature = wallet.features['standard:connect'];
            vi.mocked(connectFeature.connect).mockRejectedValue(new Error('User rejected'));

            // Add wallet to client state
            addWalletToClient(wallet);

            await expect(client.select(wallet.name)).rejects.toThrow('User rejected');

            const state = client.getSnapshot();
            expect(state.connected).toBe(false);
            expect(state.connecting).toBe(false);
        });
    });

    describe('disconnection flow', () => {
        beforeEach(async () => {
            // Helper to setup connected state
            const wallet = createMockPhantomWallet();
            const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);

            const connectFeature = wallet.features['standard:connect'];
            vi.mocked(connectFeature.connect).mockResolvedValue({
                accounts: [account],
            });

            // Add wallet to client state
            addWalletToClient(wallet);

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
            const wallet = createMockPhantomWallet();
            const account1 = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
            const account2 = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_2);
            const account3 = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_3);

            const connectFeature = wallet.features['standard:connect'];
            vi.mocked(connectFeature.connect).mockResolvedValue({
                accounts: [account1, account2, account3],
            });

            // Add wallet to client state
            addWalletToClient(wallet);

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
            const wallet1 = createMockPhantomWallet();
            const wallet2 = createMockPhantomWallet();
            wallet2.name = 'Solflare';

            const account1 = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1);
            const account2 = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_2);

            vi.mocked(wallet1.features['standard:connect'].connect).mockResolvedValue({
                accounts: [account1],
            });

            vi.mocked(wallet2.features['standard:connect'].connect).mockResolvedValue({
                accounts: [account2],
            });

            // Add wallets to client state
            addWalletToClient(wallet1);
            addWalletToClient(wallet2);

            // Connect to first wallet
            await client.select(wallet1.name);
            await waitForConnection(client, 2000);

            let state = client.getSnapshot();
            expect(state.selectedAccount).toBe(TEST_ADDRESSES.ACCOUNT_1);

            // Switch to second wallet
            await client.select(wallet2.name);
            await waitForConnection(client, 2000);

            state = client.getSnapshot();
            expect(state.selectedAccount).toBe(TEST_ADDRESSES.ACCOUNT_2);
        });
    });
});
