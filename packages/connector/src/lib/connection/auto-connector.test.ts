import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutoConnector } from './auto-connector';
import type { WalletDetector } from './wallet-detector';
import type { ConnectionManager } from './connection-manager';
import type { StateManager } from '../core/state-manager';
import type { StorageAdapter } from '../../types/storage';

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
        mockWalletDetector = { getDetectedWallets: vi.fn(() => []) } as any;
        mockConnectionManager = { connect: vi.fn() } as any;
        mockStateManager = { getSnapshot: vi.fn(() => ({ wallets: [] })) } as any;
        mockStorage = { get: vi.fn(async () => undefined), set: vi.fn() } as any;

        autoConnector = new AutoConnector(mockWalletDetector, mockConnectionManager, mockStateManager, mockStorage);
    });

    it('should initialize successfully', () => {
        expect(autoConnector).toBeInstanceOf(AutoConnector);
    });
});
