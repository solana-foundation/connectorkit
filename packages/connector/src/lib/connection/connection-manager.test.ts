import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectionManager } from './connection-manager';
import type { StateManager } from '../core/state-manager';
import type { EventEmitter } from '../core/event-emitter';

// Mock dependencies
vi.mock('../utils/secure-logger', () => ({
    createLogger: vi.fn(() => ({ info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

describe('ConnectionManager', () => {
    let connectionManager: ConnectionManager;
    let mockStateManager: StateManager;
    let mockEventEmitter: EventEmitter;

    beforeEach(() => {
        mockStateManager = {
            updateState: vi.fn(),
            getSnapshot: vi.fn(() => ({ wallets: [], connected: false })),
        } as any;

        mockEventEmitter = {
            emit: vi.fn(),
        } as any;

        connectionManager = new ConnectionManager(mockStateManager, mockEventEmitter);
    });

    it('should initialize successfully', () => {
        expect(connectionManager).toBeInstanceOf(ConnectionManager);
    });

    it('should have connect method', () => {
        expect(typeof connectionManager.connect).toBe('function');
    });

    it('should have disconnect method', () => {
        expect(typeof connectionManager.disconnect).toBe('function');
    });

    it('should have selectAccount method', () => {
        expect(typeof connectionManager.selectAccount).toBe('function');
    });
});
