import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AutoConnector } from './auto-connector';
import type { WalletDetector } from './detector';
import type { ConnectionManager } from './connection-manager';
import type { StateManager } from '../core/state-manager';
import type { StorageAdapter, PersistedWalletState } from '../../types/storage';
import type { ConnectorState } from '../../types/connector';
import type { Wallet, WalletAccount, WalletInfo } from '../../types/wallets';
import type { WalletConnectorId } from '../../types/session';
import { INITIAL_WALLET_STATUS } from '../../types/session';

// Mock dependencies
vi.mock('./standard-shim', () => ({
    getWalletsRegistry: vi.fn(() => ({ get: vi.fn(() => []), on: vi.fn(() => vi.fn()) })),
    ready: Promise.resolve(),
}));

vi.mock('../utils/secure-logger', () => ({
    createLogger: vi.fn(() => ({ info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

function createMockWallet(name: string): Wallet {
    return {
        version: '1.0.0',
        name,
        icon: 'data:image/svg+xml;base64,test' as Wallet['icon'],
        chains: ['solana:mainnet'] as const,
        accounts: [] as readonly WalletAccount[],
        features: {
            'standard:connect': {
                connect: vi.fn().mockResolvedValue({ accounts: [] }),
                version: '1.0.0',
            },
            'standard:disconnect': {
                disconnect: vi.fn().mockResolvedValue(undefined),
                version: '1.0.0',
            },
        },
    };
}

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

describe('AutoConnector', () => {
    let autoConnector: AutoConnector;
    let mockWalletDetector: WalletDetector;
    let mockConnectionManager: ConnectionManager;
    let mockStateManager: StateManager;
    let mockWalletStorage: StorageAdapter<string | undefined>;
    let mockWalletStateStorage: StorageAdapter<PersistedWalletState | null>;
    let initialState: ConnectorState;

    beforeEach(() => {
        initialState = createInitialState();

        const walletDetectorMock = {
            getDetectedWallets: vi.fn(() => []),
            detectDirectWallet: vi.fn(() => null),
            getConnectorById: vi.fn(() => undefined),
            initialize: vi.fn(),
        } satisfies Pick<WalletDetector, 'getDetectedWallets' | 'detectDirectWallet' | 'getConnectorById' | 'initialize'>;

        const connectionManagerMock = {
            connect: vi.fn().mockResolvedValue(undefined),
            connectWallet: vi.fn().mockResolvedValue(undefined),
            disconnect: vi.fn().mockResolvedValue(undefined),
        } satisfies Pick<ConnectionManager, 'connect' | 'connectWallet' | 'disconnect'>;

        const stateManagerMock = {
            getSnapshot: vi.fn(() => initialState),
            updateState: vi.fn((update: Partial<ConnectorState>) => {
                Object.assign(initialState, update);
            }),
        } satisfies Pick<StateManager, 'getSnapshot' | 'updateState'>;

        const walletStorageMock = {
            get: vi.fn(() => undefined),
            set: vi.fn(),
        } satisfies StorageAdapter<string | undefined>;

        const walletStateStorageMock = {
            get: vi.fn(() => null),
            set: vi.fn(),
        } satisfies StorageAdapter<PersistedWalletState | null>;

        mockWalletDetector = walletDetectorMock as unknown as WalletDetector;
        mockConnectionManager = connectionManagerMock as unknown as ConnectionManager;
        mockStateManager = stateManagerMock as unknown as StateManager;
        mockWalletStorage = walletStorageMock;
        mockWalletStateStorage = walletStateStorageMock;

        autoConnector = new AutoConnector(
            mockWalletDetector,
            mockConnectionManager,
            mockStateManager,
            mockWalletStorage,
            true, // debug
            mockWalletStateStorage,
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('should initialize successfully', () => {
            expect(autoConnector).toBeInstanceOf(AutoConnector);
        });
    });

    describe('vNext auto-connect (silent-first)', () => {
        it('should attempt vNext auto-connect when walletStateStorage is present', async () => {
            const mockWallet = createMockWallet('Phantom');
            const connectorId = 'wallet-standard:phantom' as WalletConnectorId;
            const walletState: PersistedWalletState = {
                version: 1,
                connectorId,
                autoConnect: true,
                lastConnected: new Date().toISOString(),
            };

            (mockWalletStateStorage.get as ReturnType<typeof vi.fn>).mockReturnValue(walletState);
            (mockWalletDetector.getConnectorById as ReturnType<typeof vi.fn>).mockReturnValue(mockWallet);

            await autoConnector.attemptAutoConnect();

            expect(mockWalletDetector.getConnectorById).toHaveBeenCalledWith(connectorId);
            expect(mockConnectionManager.connectWallet).toHaveBeenCalledWith(mockWallet, connectorId, {
                silent: true,
                allowInteractiveFallback: false,
                preferredAccount: undefined,
            });
        });

        it('should use lastAccount as preferredAccount', async () => {
            const mockWallet = createMockWallet('Phantom');
            const connectorId = 'wallet-standard:phantom' as WalletConnectorId;
            const lastAccount = 'LastAccount1111111111111111111111111111111';
            const walletState: PersistedWalletState = {
                version: 1,
                connectorId,
                lastAccount,
                autoConnect: true,
                lastConnected: new Date().toISOString(),
            };

            (mockWalletStateStorage.get as ReturnType<typeof vi.fn>).mockReturnValue(walletState);
            (mockWalletDetector.getConnectorById as ReturnType<typeof vi.fn>).mockReturnValue(mockWallet);

            await autoConnector.attemptAutoConnect();

            expect(mockConnectionManager.connectWallet).toHaveBeenCalledWith(mockWallet, connectorId, {
                silent: true,
                allowInteractiveFallback: false,
                preferredAccount: lastAccount,
            });
        });

        it('should skip vNext auto-connect when autoConnect is disabled', async () => {
            const walletState: PersistedWalletState = {
                version: 1,
                connectorId: 'wallet-standard:phantom',
                autoConnect: false,
                lastConnected: new Date().toISOString(),
            };

            (mockWalletStateStorage.get as ReturnType<typeof vi.fn>).mockReturnValue(walletState);

            await autoConnector.attemptAutoConnect();

            expect(mockConnectionManager.connectWallet).not.toHaveBeenCalled();
        });

        it('should skip vNext auto-connect when no stored state', async () => {
            (mockWalletStateStorage.get as ReturnType<typeof vi.fn>).mockReturnValue(null);

            await autoConnector.attemptAutoConnect();

            expect(mockConnectionManager.connectWallet).not.toHaveBeenCalled();
        });

        it('should skip vNext auto-connect when connector not found', async () => {
            const walletState: PersistedWalletState = {
                version: 1,
                connectorId: 'wallet-standard:phantom',
                autoConnect: true,
                lastConnected: new Date().toISOString(),
            };

            (mockWalletStateStorage.get as ReturnType<typeof vi.fn>).mockReturnValue(walletState);
            (mockWalletDetector.getConnectorById as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

            const result = await autoConnector.attemptAutoConnect();

            expect(mockConnectionManager.connectWallet).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it('should return true on successful vNext auto-connect', async () => {
            const mockWallet = createMockWallet('Phantom');
            const connectorId = 'wallet-standard:phantom' as WalletConnectorId;
            const walletState: PersistedWalletState = {
                version: 1,
                connectorId,
                autoConnect: true,
                lastConnected: new Date().toISOString(),
            };

            (mockWalletStateStorage.get as ReturnType<typeof vi.fn>).mockReturnValue(walletState);
            (mockWalletDetector.getConnectorById as ReturnType<typeof vi.fn>).mockReturnValue(mockWallet);

            const result = await autoConnector.attemptAutoConnect();

            expect(result).toBe(true);
        });

        it('should not prompt user (allowInteractiveFallback: false) on auto-connect', async () => {
            const mockWallet = createMockWallet('Phantom');
            const connectorId = 'wallet-standard:phantom' as WalletConnectorId;
            const walletState: PersistedWalletState = {
                version: 1,
                connectorId,
                autoConnect: true,
                lastConnected: new Date().toISOString(),
            };

            (mockWalletStateStorage.get as ReturnType<typeof vi.fn>).mockReturnValue(walletState);
            (mockWalletDetector.getConnectorById as ReturnType<typeof vi.fn>).mockReturnValue(mockWallet);

            await autoConnector.attemptAutoConnect();

            expect(mockConnectionManager.connectWallet).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                expect.objectContaining({
                    allowInteractiveFallback: false,
                }),
            );
        });

        it('should fall back to legacy connect when vNext fails', async () => {
            const mockWallet = createMockWallet('Phantom');
            const connectorId = 'wallet-standard:phantom' as WalletConnectorId;
            const walletState: PersistedWalletState = {
                version: 1,
                connectorId,
                autoConnect: true,
                lastConnected: new Date().toISOString(),
            };

            (mockWalletStateStorage.get as ReturnType<typeof vi.fn>).mockReturnValue(walletState);
            (mockWalletDetector.getConnectorById as ReturnType<typeof vi.fn>).mockReturnValue(mockWallet);
            (mockConnectionManager.connectWallet as ReturnType<typeof vi.fn>).mockRejectedValue(
                new Error('Silent connect failed'),
            );

            // Set up legacy wallet detection
            (mockWalletStorage.get as ReturnType<typeof vi.fn>).mockReturnValue('Phantom');
            (mockWalletDetector.detectDirectWallet as ReturnType<typeof vi.fn>).mockReturnValue({
                connect: vi.fn().mockResolvedValue({ publicKey: { toString: () => 'addr', toBytes: () => new Uint8Array() } }),
                disconnect: vi.fn(),
            });

            await autoConnector.attemptAutoConnect();

            // Should have tried vNext first, then fallen back
            expect(mockConnectionManager.connectWallet).toHaveBeenCalled();
        });
    });

    describe('legacy auto-connect fallback', () => {
        it('should try legacy connect when no vNext state', async () => {
            const mockWalletInfo: WalletInfo = {
                wallet: createMockWallet('Phantom'),
                installed: true,
                connectable: true,
            };

            (mockWalletStateStorage.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
            (mockWalletStorage.get as ReturnType<typeof vi.fn>).mockReturnValue('Phantom');
            initialState.wallets = [mockWalletInfo];

            await autoConnector.attemptAutoConnect();

            expect(mockConnectionManager.connect).toHaveBeenCalledWith(mockWalletInfo.wallet, 'Phantom');
        });

        it('should skip legacy connect when no stored wallet name', async () => {
            (mockWalletStateStorage.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
            (mockWalletStorage.get as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

            await autoConnector.attemptAutoConnect();

            expect(mockConnectionManager.connect).not.toHaveBeenCalled();
        });
    });

    describe('instant connect (direct wallet detection)', () => {
        it('should attempt instant connect via direct wallet detection', async () => {
            const directWallet = {
                connect: vi.fn().mockResolvedValue({
                    publicKey: {
                        toString: () => 'DirectWallet11111111111111111111111111111',
                        toBytes: () => new Uint8Array(32),
                    },
                }),
                disconnect: vi.fn(),
            };

            (mockWalletStateStorage.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
            (mockWalletStorage.get as ReturnType<typeof vi.fn>).mockReturnValue('Phantom');
            (mockWalletDetector.detectDirectWallet as ReturnType<typeof vi.fn>).mockReturnValue(directWallet);

            await autoConnector.attemptAutoConnect();

            expect(mockWalletDetector.detectDirectWallet).toHaveBeenCalledWith('Phantom');
        });
    });

    describe('error handling', () => {
        it('should handle vNext connect errors gracefully', async () => {
            const mockWallet = createMockWallet('Phantom');
            const walletState: PersistedWalletState = {
                version: 1,
                connectorId: 'wallet-standard:phantom',
                autoConnect: true,
            };

            (mockWalletStateStorage.get as ReturnType<typeof vi.fn>).mockReturnValue(walletState);
            (mockWalletDetector.getConnectorById as ReturnType<typeof vi.fn>).mockReturnValue(mockWallet);
            (mockConnectionManager.connectWallet as ReturnType<typeof vi.fn>).mockRejectedValue(
                new Error('Connection error'),
            );

            // Should not throw
            const result = await autoConnector.attemptAutoConnect();
            expect(result).toBe(false);
        });

        it('should handle legacy connect errors gracefully', async () => {
            const mockWalletInfo: WalletInfo = {
                wallet: createMockWallet('Phantom'),
                installed: true,
                connectable: true,
            };

            (mockWalletStateStorage.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
            (mockWalletStorage.get as ReturnType<typeof vi.fn>).mockReturnValue('Phantom');
            initialState.wallets = [mockWalletInfo];
            (mockConnectionManager.connect as ReturnType<typeof vi.fn>).mockRejectedValue(
                new Error('Connection error'),
            );

            // Should not throw
            const result = await autoConnector.attemptAutoConnect();
            expect(result).toBe(false);
        });
    });

    describe('priority order', () => {
        it('should prioritize vNext over legacy', async () => {
            const mockWallet = createMockWallet('Phantom');
            const connectorId = 'wallet-standard:phantom' as WalletConnectorId;
            const walletState: PersistedWalletState = {
                version: 1,
                connectorId,
                autoConnect: true,
            };

            // Set up both vNext and legacy
            (mockWalletStateStorage.get as ReturnType<typeof vi.fn>).mockReturnValue(walletState);
            (mockWalletDetector.getConnectorById as ReturnType<typeof vi.fn>).mockReturnValue(mockWallet);
            (mockWalletStorage.get as ReturnType<typeof vi.fn>).mockReturnValue('Phantom');

            await autoConnector.attemptAutoConnect();

            // vNext should be called, not legacy
            expect(mockConnectionManager.connectWallet).toHaveBeenCalled();
            expect(mockConnectionManager.connect).not.toHaveBeenCalled();
        });
    });
});
