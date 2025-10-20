import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseCollaborator } from './base-collaborator';
import type { StateManager } from './state-manager';
import type { EventEmitter } from './event-emitter';

// Mock dependencies
vi.mock('../utils/secure-logger', () => ({
    createLogger: vi.fn(() => ({ debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() })),
}));

// Test implementation
class TestCollaborator extends BaseCollaborator {
    constructor(stateManager: StateManager, eventEmitter: EventEmitter, debug = false) {
        super({ stateManager, eventEmitter, debug }, 'TestCollaborator');
    }
}

describe('BaseCollaborator', () => {
    let mockStateManager: StateManager;
    let mockEventEmitter: EventEmitter;

    beforeEach(() => {
        mockStateManager = {
            getSnapshot: vi.fn(() => ({ test: 'state' })),
            updateState: vi.fn(),
        } as any;

        mockEventEmitter = {
            emit: vi.fn(),
        } as any;
    });

    it('should initialize with required dependencies', () => {
        const collaborator = new TestCollaborator(mockStateManager, mockEventEmitter);
        expect(collaborator).toBeInstanceOf(BaseCollaborator);
    });

    it('should access state via getState', () => {
        const collaborator = new TestCollaborator(mockStateManager, mockEventEmitter);
        const state = (collaborator as any).getState();
        expect(state).toEqual({ test: 'state' });
    });
});
