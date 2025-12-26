import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutoConnector } from './auto-connector';
import type { WalletDetector } from './wallet-detector';
import type { ConnectionManager } from './connection-manager';
import type { StateManager } from '../core/state-manager';
import type { StorageAdapter } from '../../types/storage';
import type { ConnectorState } from '../../types/connector';

// Mock dependencies
vi.mock('../adapters/wallet-standard-shim', () => ({
    getWalletsRegistry: vi.fn(() => ({ get: vi.fn(() => []), on: vi.fn(() => vi.fn()) })),
}));

vi.mock('../utils/secure-logger', () => ({
    createLogger: vi.fn(() => ({ info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

describe('AutoConnector', () => {
    let autoConnector: AutoConnector;
    let mockWalletDetector: WalletDetector;
    let mockConnectionManager: ConnectionManager;
    let mockStateManager: StateManager;
    let mockStorage: StorageAdapter<string | undefined>;

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

        const walletDetectorMock = {
            getDetectedWallets: vi.fn(() => []),
        } satisfies Pick<WalletDetector, 'getDetectedWallets'>;

        const connectionManagerMock = {
            connect: vi.fn(),
        } satisfies Pick<ConnectionManager, 'connect'>;

        const stateManagerMock = {
            getSnapshot: vi.fn(() => initialState),
        } satisfies Pick<StateManager, 'getSnapshot'>;

        const storageMock = {
            get: vi.fn(() => undefined),
            set: vi.fn(),
        } satisfies StorageAdapter<string | undefined>;

        mockWalletDetector = walletDetectorMock as unknown as WalletDetector;
        mockConnectionManager = connectionManagerMock as unknown as ConnectionManager;
        mockStateManager = stateManagerMock as unknown as StateManager;
        mockStorage = storageMock;

        autoConnector = new AutoConnector(mockWalletDetector, mockConnectionManager, mockStateManager, mockStorage);
    });

    it('should initialize successfully', () => {
        expect(autoConnector).toBeInstanceOf(AutoConnector);
    });
});
