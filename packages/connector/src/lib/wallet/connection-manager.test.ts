import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConnectionManager } from './connection-manager';
import { StateManager } from '../core/state-manager';
import { EventEmitter } from '../core/event-emitter';
import type { ConnectorState } from '../../types/connector';
import type { Wallet, WalletAccount } from '../../types/wallets';
import type { StorageAdapter } from '../../types/storage';
import type { WalletConnectorId } from '../../types/session';
import { INITIAL_WALLET_STATUS } from '../../types/session';

// Mock dependencies
vi.mock('../utils/secure-logger', () => ({
    createLogger: vi.fn(() => ({ info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

/**
 * Create a mock wallet with configurable behavior
 */
function createMockWallet(options?: {
    name?: string;
    accounts?: WalletAccount[];
    connectResolveAccounts?: WalletAccount[];
    connectSilentFails?: boolean;
    connectSilentNoAccounts?: boolean;
    supportsEvents?: boolean;
}): Wallet {
    const {
        name = 'MockWallet',
        accounts = [],
        connectResolveAccounts,
        connectSilentFails = false,
        connectSilentNoAccounts = false,
        supportsEvents = true,
    } = options ?? {};

    const eventListeners = new Map<string, Set<(props: { accounts?: readonly WalletAccount[] }) => void>>();

    const connect = vi.fn().mockImplementation(async (input?: { silent?: boolean }) => {
        if (input?.silent && connectSilentFails) {
            throw new Error('Silent connect failed');
        }
        if (input?.silent && connectSilentNoAccounts) {
            return { accounts: [] };
        }
        return {
            accounts: connectResolveAccounts ?? [
                {
                    address: 'ConnectedAccount111111111111111111111111111' as const,
                    publicKey: new Uint8Array(32),
                    chains: ['solana:mainnet'] as const,
                    features: [],
                },
            ],
        };
    });

    const disconnect = vi.fn().mockResolvedValue(undefined);

    const eventsOn = vi
        .fn()
        .mockImplementation((event: string, listener: (props: { accounts?: readonly WalletAccount[] }) => void) => {
            if (!eventListeners.has(event)) {
                eventListeners.set(event, new Set());
            }
            eventListeners.get(event)!.add(listener);
            return () => {
                eventListeners.get(event)?.delete(listener);
            };
        });

    const features: Record<string, unknown> = {
        'standard:connect': { connect, version: '1.0.0' },
        'standard:disconnect': { disconnect, version: '1.0.0' },
    };

    if (supportsEvents) {
        features['standard:events'] = { on: eventsOn, version: '1.0.0' };
    }

    const wallet: Wallet = {
        version: '1.0.0',
        name,
        icon: 'data:image/svg+xml;base64,test' as Wallet['icon'],
        chains: ['solana:mainnet', 'solana:devnet'] as const,
        accounts,
        features,
    };

    // Helper to emit events for testing
    (wallet as unknown as { _emitChange: (accounts: WalletAccount[]) => void })._emitChange = (
        newAccounts: WalletAccount[],
    ) => {
        const listeners = eventListeners.get('change');
        if (listeners) {
            listeners.forEach(listener => listener({ accounts: newAccounts }));
        }
    };

    return wallet;
}

function createMockAccount(address: string, label?: string): WalletAccount {
    return {
        address: address as `${string}`,
        publicKey: new Uint8Array(32),
        chains: ['solana:mainnet'] as const,
        features: [],
        label,
    };
}

describe('ConnectionManager', () => {
    let connectionManager: ConnectionManager;
    let mockStateManager: StateManager;
    let mockEventEmitter: EventEmitter;
    let mockStorage: StorageAdapter<string | undefined>;

    function createInitialState(): ConnectorState {
        return {
            wallets: [],
            selectedWallet: null,
            connected: false,
            connecting: false,
            accounts: [],
            selectedAccount: null,
            cluster: null,
            clusters: [],
            wallet: INITIAL_WALLET_STATUS,
            connectors: [],
        };
    }

    beforeEach(() => {
        mockStorage = {
            get: vi.fn(() => undefined),
            set: vi.fn(),
            clear: vi.fn(),
            isAvailable: vi.fn(() => true),
        } as StorageAdapter<string | undefined> & { clear: () => void; isAvailable: () => boolean };

        mockStateManager = new StateManager(createInitialState());
        mockEventEmitter = new EventEmitter(false);

        connectionManager = new ConnectionManager(mockStateManager, mockEventEmitter, mockStorage, true);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('should initialize successfully', () => {
            expect(connectionManager).toBeInstanceOf(ConnectionManager);
        });

        it('should have connect method', () => {
            expect(typeof connectionManager.connect).toBe('function');
        });

        it('should have connectWallet method (vNext)', () => {
            expect(typeof connectionManager.connectWallet).toBe('function');
        });

        it('should have disconnect method', () => {
            expect(typeof connectionManager.disconnect).toBe('function');
        });

        it('should have selectAccount method', () => {
            expect(typeof connectionManager.selectAccount).toBe('function');
        });
    });

    describe('connectWallet (vNext silent-first)', () => {
        it('should connect with silent=false by default', async () => {
            const wallet = createMockWallet();
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await connectionManager.connectWallet(wallet, connectorId, {});

            const connect = (wallet.features['standard:connect'] as { connect: ReturnType<typeof vi.fn> }).connect;
            expect(connect).toHaveBeenCalledWith({ silent: false });

            const state = mockStateManager.getSnapshot();
            expect(state.connected).toBe(true);
            expect(state.wallet.status).toBe('connected');
        });

        it('should attempt silent connect first when silent=true', async () => {
            const wallet = createMockWallet();
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await connectionManager.connectWallet(wallet, connectorId, { silent: true });

            const connect = (wallet.features['standard:connect'] as { connect: ReturnType<typeof vi.fn> }).connect;
            expect(connect).toHaveBeenCalledWith({ silent: true });

            const state = mockStateManager.getSnapshot();
            expect(state.connected).toBe(true);
        });

        it('should fallback to interactive when silent fails and allowInteractiveFallback=true', async () => {
            const wallet = createMockWallet({ connectSilentFails: true });
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await connectionManager.connectWallet(wallet, connectorId, {
                silent: true,
                allowInteractiveFallback: true,
            });

            const connect = (wallet.features['standard:connect'] as { connect: ReturnType<typeof vi.fn> }).connect;
            expect(connect).toHaveBeenCalledTimes(2);
            expect(connect).toHaveBeenNthCalledWith(1, { silent: true });
            expect(connect).toHaveBeenNthCalledWith(2, { silent: false });

            const state = mockStateManager.getSnapshot();
            expect(state.connected).toBe(true);
        });

        it('should throw when silent fails and allowInteractiveFallback=false', async () => {
            const wallet = createMockWallet({ connectSilentFails: true });
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await expect(
                connectionManager.connectWallet(wallet, connectorId, {
                    silent: true,
                    allowInteractiveFallback: false,
                }),
            ).rejects.toThrow('Silent connect failed');

            const state = mockStateManager.getSnapshot();
            expect(state.connected).toBe(false);
            expect(state.wallet.status).toBe('error');
        });

        it('should fallback to interactive when silent returns no accounts', async () => {
            const wallet = createMockWallet({ connectSilentNoAccounts: true });
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await connectionManager.connectWallet(wallet, connectorId, {
                silent: true,
                allowInteractiveFallback: true,
            });

            const connect = (wallet.features['standard:connect'] as { connect: ReturnType<typeof vi.fn> }).connect;
            expect(connect).toHaveBeenCalledTimes(2);
            expect(connect).toHaveBeenNthCalledWith(1, { silent: true });
            expect(connect).toHaveBeenNthCalledWith(2, { silent: false });
        });

        it('should use preferredAccount if available', async () => {
            const preferredAddress = 'PreferredAccount1111111111111111111111111';
            const wallet = createMockWallet({
                connectResolveAccounts: [
                    createMockAccount('Account111111111111111111111111111111111111'),
                    createMockAccount(preferredAddress),
                    createMockAccount('Account333333333333333333333333333333333333'),
                ],
            });
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await connectionManager.connectWallet(wallet, connectorId, {
                preferredAccount: preferredAddress as import('@solana/addresses').Address,
            });

            const state = mockStateManager.getSnapshot();
            expect(state.selectedAccount).toBe(preferredAddress);
            if (state.wallet.status === 'connected') {
                expect(state.wallet.session.selectedAccount.address).toBe(preferredAddress);
            }
        });

        it('should select first account if preferredAccount not found', async () => {
            const wallet = createMockWallet({
                connectResolveAccounts: [
                    createMockAccount('Account111111111111111111111111111111111111'),
                    createMockAccount('Account222222222222222222222222222222222222'),
                ],
            });
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await connectionManager.connectWallet(wallet, connectorId, {
                preferredAccount: 'NonExistent11111111111111111111111111111' as import('@solana/addresses').Address,
            });

            const state = mockStateManager.getSnapshot();
            expect(state.selectedAccount).toBe('Account111111111111111111111111111111111111');
        });

        it('should set wallet status to connecting during connection', async () => {
            let capturedStatus: string | null = null;
            const originalUpdateState = mockStateManager.updateState.bind(mockStateManager);
            vi.spyOn(mockStateManager, 'updateState').mockImplementation((update, batch) => {
                if (update.wallet && (update.wallet as { status: string }).status === 'connecting') {
                    capturedStatus = 'connecting';
                }
                return originalUpdateState(update, batch);
            });

            const wallet = createMockWallet();
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await connectionManager.connectWallet(wallet, connectorId);

            expect(capturedStatus).toBe('connecting');
        });

        it('should emit wallet:connected event on successful connection', async () => {
            const emitSpy = vi.spyOn(mockEventEmitter, 'emit');
            const wallet = createMockWallet();
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await connectionManager.connectWallet(wallet, connectorId);

            expect(emitSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'wallet:connected',
                    wallet: wallet.name,
                }),
            );
        });

        it('should classify user rejection as recoverable error', async () => {
            const wallet = createMockWallet();
            (wallet.features['standard:connect'] as { connect: ReturnType<typeof vi.fn> }).connect.mockRejectedValue(
                new Error('User rejected the request'),
            );
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            try {
                await connectionManager.connectWallet(wallet, connectorId);
            } catch {
                // Expected to throw
            }

            const state = mockStateManager.getSnapshot();
            if (state.wallet.status === 'error') {
                expect(state.wallet.recoverable).toBe(true);
            }
        });
    });

    describe('disconnect', () => {
        it('should reset wallet status to disconnected', async () => {
            const wallet = createMockWallet();
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await connectionManager.connectWallet(wallet, connectorId);
            expect(mockStateManager.getSnapshot().wallet.status).toBe('connected');

            await connectionManager.disconnect();
            expect(mockStateManager.getSnapshot().wallet.status).toBe('disconnected');
        });

        it('should cancel in-flight connection', async () => {
            const wallet = createMockWallet();
            // Make connect take a long time
            (wallet.features['standard:connect'] as { connect: ReturnType<typeof vi.fn> }).connect.mockImplementation(
                () => new Promise(resolve => setTimeout(resolve, 1000)),
            );
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            // Start connection but don't await
            const connectPromise = connectionManager.connectWallet(wallet, connectorId);

            // Disconnect immediately
            await connectionManager.disconnect();

            // Connection should be cancelled
            await expect(connectPromise).rejects.toThrow('Connection cancelled');
        });

        it('should clear storage on disconnect', async () => {
            const wallet = createMockWallet();
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await connectionManager.connectWallet(wallet, connectorId);
            await connectionManager.disconnect();

            // Storage should be cleared (either via clear() or set(undefined))
            expect(mockStorage.set).toHaveBeenCalled();
        });

        it('should emit wallet:disconnected event', async () => {
            const emitSpy = vi.spyOn(mockEventEmitter, 'emit');
            const wallet = createMockWallet();
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await connectionManager.connectWallet(wallet, connectorId);
            await connectionManager.disconnect();

            expect(emitSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'wallet:disconnected',
                }),
            );
        });
    });

    describe('account change handling', () => {
        it('should disconnect when wallet reports no accounts', async () => {
            const wallet = createMockWallet({ supportsEvents: true });
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await connectionManager.connectWallet(wallet, connectorId);
            expect(mockStateManager.getSnapshot().connected).toBe(true);

            // Emit account change with empty accounts
            (wallet as unknown as { _emitChange: (accounts: WalletAccount[]) => void })._emitChange([]);

            // Should trigger disconnect
            const state = mockStateManager.getSnapshot();
            expect(state.connected).toBe(false);
        });

        it('should select first account when selected account disappears', async () => {
            const accounts = [
                createMockAccount('Account111111111111111111111111111111111111'),
                createMockAccount('Account222222222222222222222222222222222222'),
            ];
            const wallet = createMockWallet({
                connectResolveAccounts: accounts,
                supportsEvents: true,
            });
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            // Connect and select second account
            await connectionManager.connectWallet(wallet, connectorId);
            await connectionManager.selectAccount('Account222222222222222222222222222222222222');
            expect(mockStateManager.getSnapshot().selectedAccount).toBe('Account222222222222222222222222222222222222');

            // Emit change event with only first account
            const remainingAccount = createMockAccount('Account111111111111111111111111111111111111');
            (wallet as unknown as { _emitChange: (accounts: WalletAccount[]) => void })._emitChange([remainingAccount]);

            // Should auto-select remaining account
            const state = mockStateManager.getSnapshot();
            expect(state.selectedAccount).toBe('Account111111111111111111111111111111111111');
        });

        it('should emit account:changed event when selected account changes', async () => {
            const accounts = [
                createMockAccount('Account111111111111111111111111111111111111'),
                createMockAccount('Account222222222222222222222222222222222222'),
            ];
            const wallet = createMockWallet({
                connectResolveAccounts: accounts,
                supportsEvents: true,
            });
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;
            const emitSpy = vi.spyOn(mockEventEmitter, 'emit');

            await connectionManager.connectWallet(wallet, connectorId);
            emitSpy.mockClear();

            // Emit change event with only first account (second disappears)
            mockStateManager.updateState({
                selectedAccount: 'Account222222222222222222222222222222222222' as import('@solana/addresses').Address,
            });
            const remainingAccount = createMockAccount('Account111111111111111111111111111111111111');
            (wallet as unknown as { _emitChange: (accounts: WalletAccount[]) => void })._emitChange([remainingAccount]);

            expect(emitSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'account:changed',
                    account: 'Account111111111111111111111111111111111111',
                }),
            );
        });

        it('should keep selected account if still available after change', async () => {
            const accounts = [
                createMockAccount('Account111111111111111111111111111111111111'),
                createMockAccount('Account222222222222222222222222222222222222'),
            ];
            const wallet = createMockWallet({
                connectResolveAccounts: accounts,
                supportsEvents: true,
            });
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await connectionManager.connectWallet(wallet, connectorId);
            await connectionManager.selectAccount('Account222222222222222222222222222222222222');

            // Emit change event with both accounts (add a third)
            const newAccounts = [...accounts, createMockAccount('Account333333333333333333333333333333333333')];
            (wallet as unknown as { _emitChange: (accounts: WalletAccount[]) => void })._emitChange(newAccounts);

            // Selected account should remain the same
            expect(mockStateManager.getSnapshot().selectedAccount).toBe('Account222222222222222222222222222222222222');
        });
    });

    describe('selectAccount', () => {
        it('should update selected account in state', async () => {
            const accounts = [
                createMockAccount('Account111111111111111111111111111111111111'),
                createMockAccount('Account222222222222222222222222222222222222'),
            ];
            const wallet = createMockWallet({ connectResolveAccounts: accounts });
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await connectionManager.connectWallet(wallet, connectorId);
            await connectionManager.selectAccount('Account222222222222222222222222222222222222');

            expect(mockStateManager.getSnapshot().selectedAccount).toBe('Account222222222222222222222222222222222222');
        });

        it('should throw when no wallet is connected', async () => {
            await expect(connectionManager.selectAccount('SomeAddress11111111111111111111111111111')).rejects.toThrow(
                'No wallet connected',
            );
        });

        it('should throw for invalid address format', async () => {
            const wallet = createMockWallet();
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;

            await connectionManager.connectWallet(wallet, connectorId);

            await expect(connectionManager.selectAccount('abc')).rejects.toThrow('Invalid address format');
        });

        it('should emit account:changed event', async () => {
            const accounts = [
                createMockAccount('Account111111111111111111111111111111111111'),
                createMockAccount('Account222222222222222222222222222222222222'),
            ];
            const wallet = createMockWallet({ connectResolveAccounts: accounts });
            const connectorId = 'wallet-standard:mock-wallet' as WalletConnectorId;
            const emitSpy = vi.spyOn(mockEventEmitter, 'emit');

            await connectionManager.connectWallet(wallet, connectorId);
            emitSpy.mockClear();

            await connectionManager.selectAccount('Account222222222222222222222222222222222222');

            expect(emitSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'account:changed',
                    account: 'Account222222222222222222222222222222222222',
                }),
            );
        });
    });

    describe('legacy connect method', () => {
        it('should still work for backwards compatibility', async () => {
            const wallet = createMockWallet();

            await connectionManager.connect(wallet, wallet.name);

            const state = mockStateManager.getSnapshot();
            expect(state.connected).toBe(true);
            expect(state.selectedWallet).toBe(wallet);
        });
    });
});
