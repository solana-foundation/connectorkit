import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealthMonitor } from './health-monitor';
import type { StateManager } from '../core/state-manager';

// Mock dependencies
vi.mock('../adapters/wallet-standard-shim', () => ({
    getWalletsRegistry: vi.fn(() => ({ get: vi.fn(() => []) })),
}));

describe('HealthMonitor', () => {
    let healthMonitor: HealthMonitor;
    let mockStateManager: StateManager;

    beforeEach(() => {
        mockStateManager = {
            getSnapshot: vi.fn(() => ({ wallets: [], connected: false })),
        } as any;

        healthMonitor = new HealthMonitor(mockStateManager, undefined, undefined, () => true);
    });

    it('should initialize successfully', () => {
        expect(healthMonitor).toBeInstanceOf(HealthMonitor);
    });

    it('should get health status', () => {
        const health = healthMonitor.getHealth();

        expect(health).toHaveProperty('initialized');
        expect(health).toHaveProperty('walletStandardAvailable');
        expect(health).toHaveProperty('storageAvailable');
        expect(health).toHaveProperty('errors');
    });

    it('should return errors array', () => {
        const health = healthMonitor.getHealth();
        expect(Array.isArray(health.errors)).toBe(true);
    });
});
