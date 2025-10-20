import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalletDetector } from './wallet-detector';
import type { StateManager } from '../core/state-manager';
import type { EventEmitter } from '../core/event-emitter';

// Mock dependencies
vi.mock('../adapters/wallet-standard-shim', () => ({
    getWalletsRegistry: vi.fn(() => ({
        get: vi.fn(() => []),
        on: vi.fn(() => vi.fn()),
    })),
}));

vi.mock('./wallet-authenticity-verifier', () => ({
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
        mockStateManager = {
            updateState: vi.fn(),
            getSnapshot: vi.fn(() => ({ wallets: [] })),
        } as any;

        mockEventEmitter = {
            emit: vi.fn(),
        } as any;

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
});
