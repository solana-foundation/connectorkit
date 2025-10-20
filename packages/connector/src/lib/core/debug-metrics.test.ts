import { describe, it, expect, beforeEach } from 'vitest';
import { DebugMetrics } from './debug-metrics';

describe('DebugMetrics', () => {
    let debugMetrics: DebugMetrics;

    beforeEach(() => {
        debugMetrics = new DebugMetrics();
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            const metrics = debugMetrics.getMetrics();

            expect(metrics).toEqual({
                stateUpdates: 0,
                noopUpdates: 0,
                optimizationRate: 0,
                eventListenerCount: 0,
                subscriptionCount: 0,
                avgUpdateTimeMs: 0,
                lastUpdateTime: 0,
            });
        });
    });

    describe('recordUpdate', () => {
        it('should record successful state updates', () => {
            debugMetrics.recordUpdate(5.5, true);
            debugMetrics.recordUpdate(3.2, true);

            const metrics = debugMetrics.getMetrics();

            expect(metrics.stateUpdates).toBe(2);
            expect(metrics.noopUpdates).toBe(0);
            expect(metrics.avgUpdateTimeMs).toBe(4.35); // (5.5 + 3.2) / 2
            expect(metrics.optimizationRate).toBe(0); // 0 noop / 2 total = 0%
            expect(metrics.lastUpdateTime).toBeGreaterThan(0);
        });

        it('should record noop updates', () => {
            debugMetrics.recordUpdate(2.1, false);
            debugMetrics.recordUpdate(1.9, false);

            const metrics = debugMetrics.getMetrics();

            expect(metrics.stateUpdates).toBe(0);
            expect(metrics.noopUpdates).toBe(2);
            expect(metrics.avgUpdateTimeMs).toBe(2); // (2.1 + 1.9) / 2
            expect(metrics.optimizationRate).toBe(100); // 2 noop / 2 total = 100%
        });

        it('should calculate correct optimization rate with mixed updates', () => {
            debugMetrics.recordUpdate(1, true); // state update
            debugMetrics.recordUpdate(2, false); // noop
            debugMetrics.recordUpdate(3, false); // noop
            debugMetrics.recordUpdate(4, true); // state update

            const metrics = debugMetrics.getMetrics();

            expect(metrics.stateUpdates).toBe(2);
            expect(metrics.noopUpdates).toBe(2);
            expect(metrics.optimizationRate).toBe(50); // 2 noop / 4 total = 50%
            expect(metrics.avgUpdateTimeMs).toBe(2.5); // (1+2+3+4) / 4
        });

        it('should maintain rolling window of update times (max 100)', () => {
            // Add 105 updates
            for (let i = 1; i <= 105; i++) {
                debugMetrics.recordUpdate(i, true);
            }

            const metrics = debugMetrics.getMetrics();

            // Should only keep the last 100 update times
            // Expected average: (6 + 7 + ... + 105) / 100 = 55.5
            expect(metrics.avgUpdateTimeMs).toBe(55.5);
            expect(metrics.stateUpdates).toBe(105); // Total count is still maintained
        });

        it('should update lastUpdateTime on each record', () => {
            const beforeTime = Date.now();
            debugMetrics.recordUpdate(1, true);
            const afterTime = Date.now();

            const metrics = debugMetrics.getMetrics();

            expect(metrics.lastUpdateTime).toBeGreaterThanOrEqual(beforeTime);
            expect(metrics.lastUpdateTime).toBeLessThanOrEqual(afterTime);
        });

        it('should handle zero duration updates', () => {
            debugMetrics.recordUpdate(0, true);
            debugMetrics.recordUpdate(0, false);

            const metrics = debugMetrics.getMetrics();

            expect(metrics.avgUpdateTimeMs).toBe(0);
            expect(metrics.stateUpdates).toBe(1);
            expect(metrics.noopUpdates).toBe(1);
        });

        it('should handle very small decimal durations', () => {
            debugMetrics.recordUpdate(0.001, true);
            debugMetrics.recordUpdate(0.002, false);

            const metrics = debugMetrics.getMetrics();

            expect(metrics.avgUpdateTimeMs).toBe(0); // Rounded to 2 decimal places
        });

        it('should handle very large durations', () => {
            debugMetrics.recordUpdate(999999.999, true);

            const metrics = debugMetrics.getMetrics();

            expect(metrics.avgUpdateTimeMs).toBe(1000000); // Rounded
        });
    });

    describe('updateListenerCounts', () => {
        it('should update listener counts', () => {
            debugMetrics.updateListenerCounts(5, 3);

            const metrics = debugMetrics.getMetrics();

            expect(metrics.eventListenerCount).toBe(5);
            expect(metrics.subscriptionCount).toBe(3);
        });

        it('should handle zero listener counts', () => {
            debugMetrics.updateListenerCounts(0, 0);

            const metrics = debugMetrics.getMetrics();

            expect(metrics.eventListenerCount).toBe(0);
            expect(metrics.subscriptionCount).toBe(0);
        });

        it('should handle negative listener counts', () => {
            debugMetrics.updateListenerCounts(-1, -2);

            const metrics = debugMetrics.getMetrics();

            expect(metrics.eventListenerCount).toBe(-1);
            expect(metrics.subscriptionCount).toBe(-2);
        });

        it('should override previous listener counts', () => {
            debugMetrics.updateListenerCounts(10, 5);
            debugMetrics.updateListenerCounts(3, 7);

            const metrics = debugMetrics.getMetrics();

            expect(metrics.eventListenerCount).toBe(3);
            expect(metrics.subscriptionCount).toBe(7);
        });
    });

    describe('getMetrics', () => {
        it('should return a complete metrics object', () => {
            debugMetrics.recordUpdate(1.23, true);
            debugMetrics.recordUpdate(4.56, false);
            debugMetrics.updateListenerCounts(2, 1);

            const metrics = debugMetrics.getMetrics();

            expect(metrics).toHaveProperty('stateUpdates');
            expect(metrics).toHaveProperty('noopUpdates');
            expect(metrics).toHaveProperty('optimizationRate');
            expect(metrics).toHaveProperty('eventListenerCount');
            expect(metrics).toHaveProperty('subscriptionCount');
            expect(metrics).toHaveProperty('avgUpdateTimeMs');
            expect(metrics).toHaveProperty('lastUpdateTime');

            expect(typeof metrics.stateUpdates).toBe('number');
            expect(typeof metrics.noopUpdates).toBe('number');
            expect(typeof metrics.optimizationRate).toBe('number');
            expect(typeof metrics.eventListenerCount).toBe('number');
            expect(typeof metrics.subscriptionCount).toBe('number');
            expect(typeof metrics.avgUpdateTimeMs).toBe('number');
            expect(typeof metrics.lastUpdateTime).toBe('number');
        });

        it('should round avgUpdateTimeMs to 2 decimal places', () => {
            debugMetrics.recordUpdate(1.23456789, true);
            debugMetrics.recordUpdate(2.87654321, true);

            const metrics = debugMetrics.getMetrics();
            const expectedAvg = (1.23456789 + 2.87654321) / 2; // 2.05555555

            expect(metrics.avgUpdateTimeMs).toBe(2.06); // Rounded to 2 decimal places
        });

        it('should return fresh metrics on each call', () => {
            const metrics1 = debugMetrics.getMetrics();

            debugMetrics.recordUpdate(1, true);

            const metrics2 = debugMetrics.getMetrics();

            expect(metrics1.stateUpdates).toBe(0);
            expect(metrics2.stateUpdates).toBe(1);
        });
    });

    describe('resetMetrics', () => {
        it('should reset all metrics to initial values', () => {
            // Add some data
            debugMetrics.recordUpdate(5, true);
            debugMetrics.recordUpdate(3, false);
            debugMetrics.updateListenerCounts(10, 5);

            // Verify data exists
            let metrics = debugMetrics.getMetrics();
            expect(metrics.stateUpdates).toBe(1);
            expect(metrics.noopUpdates).toBe(1);
            expect(metrics.lastUpdateTime).toBeGreaterThan(0);
            expect(metrics.avgUpdateTimeMs).toBeGreaterThan(0);

            // Reset
            debugMetrics.resetMetrics();

            // Verify reset
            metrics = debugMetrics.getMetrics();
            expect(metrics.stateUpdates).toBe(0);
            expect(metrics.noopUpdates).toBe(0);
            expect(metrics.optimizationRate).toBe(0);
            expect(metrics.avgUpdateTimeMs).toBe(0);
            expect(metrics.lastUpdateTime).toBe(0);

            // Listener counts should not be reset (they're not part of resetMetrics)
            expect(metrics.eventListenerCount).toBe(10);
            expect(metrics.subscriptionCount).toBe(5);
        });

        it('should not affect listener counts', () => {
            debugMetrics.updateListenerCounts(15, 8);
            debugMetrics.resetMetrics();

            const metrics = debugMetrics.getMetrics();

            expect(metrics.eventListenerCount).toBe(15);
            expect(metrics.subscriptionCount).toBe(8);
        });

        it('should clear update times array', () => {
            // Add several updates
            debugMetrics.recordUpdate(1, true);
            debugMetrics.recordUpdate(2, true);
            debugMetrics.recordUpdate(3, true);

            let metrics = debugMetrics.getMetrics();
            expect(metrics.avgUpdateTimeMs).toBe(2); // (1+2+3)/3

            debugMetrics.resetMetrics();

            // Add one update after reset
            debugMetrics.recordUpdate(10, true);

            metrics = debugMetrics.getMetrics();
            expect(metrics.avgUpdateTimeMs).toBe(10); // Only the new update
        });

        it('should be safe to call multiple times', () => {
            debugMetrics.resetMetrics();
            debugMetrics.resetMetrics();
            debugMetrics.resetMetrics();

            const metrics = debugMetrics.getMetrics();

            expect(metrics.stateUpdates).toBe(0);
            expect(metrics.noopUpdates).toBe(0);
            expect(metrics.optimizationRate).toBe(0);
            expect(metrics.avgUpdateTimeMs).toBe(0);
            expect(metrics.lastUpdateTime).toBe(0);
        });
    });

    describe('optimization rate calculation edge cases', () => {
        it('should handle division by zero (no updates)', () => {
            const metrics = debugMetrics.getMetrics();
            expect(metrics.optimizationRate).toBe(0);
        });

        it('should handle very small optimization rates', () => {
            // 1 noop out of 1000 updates = 0.1%
            for (let i = 0; i < 999; i++) {
                debugMetrics.recordUpdate(1, true);
            }
            debugMetrics.recordUpdate(1, false);

            const metrics = debugMetrics.getMetrics();
            expect(metrics.optimizationRate).toBe(0); // Rounds down to 0
        });

        it('should handle exactly 50% optimization rate', () => {
            debugMetrics.recordUpdate(1, true);
            debugMetrics.recordUpdate(1, false);

            const metrics = debugMetrics.getMetrics();
            expect(metrics.optimizationRate).toBe(50);
        });

        it('should handle rounding for optimization rate', () => {
            // 1 noop out of 3 updates = 33.333...%
            debugMetrics.recordUpdate(1, true);
            debugMetrics.recordUpdate(1, true);
            debugMetrics.recordUpdate(1, false);

            const metrics = debugMetrics.getMetrics();
            expect(metrics.optimizationRate).toBe(33); // Rounded down
        });
    });

    describe('concurrent operation simulation', () => {
        it('should handle rapid successive updates', () => {
            for (let i = 0; i < 50; i++) {
                debugMetrics.recordUpdate(Math.random() * 10, i % 2 === 0);
            }

            const metrics = debugMetrics.getMetrics();

            expect(metrics.stateUpdates).toBe(25); // Even indices
            expect(metrics.noopUpdates).toBe(25); // Odd indices
            expect(metrics.optimizationRate).toBe(50);
            expect(metrics.avgUpdateTimeMs).toBeGreaterThan(0);
            expect(metrics.lastUpdateTime).toBeGreaterThan(0);
        });
    });
});
