import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseCollaborator } from './base-collaborator';
import { StateManager } from './state-manager';
import { EventEmitter } from './event-emitter';
import type { ConnectorState } from '../../types/connector';

// Mock dependencies
vi.mock('../utils/secure-logger', () => ({
    createLogger: vi.fn(() => ({ debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() })),
}));

// Test implementation
class TestCollaborator extends BaseCollaborator {
    constructor(stateManager: StateManager, eventEmitter: EventEmitter, debug = false) {
        super({ stateManager, eventEmitter, debug }, 'TestCollaborator');
    }

    getStateForTest() {
        return this.getState();
    }
}

describe('BaseCollaborator', () => {
    let mockStateManager: StateManager;
    let mockEventEmitter: EventEmitter;

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

        mockStateManager = new StateManager(initialState);
        mockEventEmitter = new EventEmitter(false);
    });

    it('should initialize with required dependencies', () => {
        const collaborator = new TestCollaborator(mockStateManager, mockEventEmitter);
        expect(collaborator).toBeInstanceOf(BaseCollaborator);
    });

    it('should access state via getState', () => {
        const collaborator = new TestCollaborator(mockStateManager, mockEventEmitter);
        const state = collaborator.getStateForTest();
        expect(state).toEqual(mockStateManager.getSnapshot());
    });
});
