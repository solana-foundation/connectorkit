import type { ConnectorDebugMetrics } from '../../types/connector';

/**
 * DebugMetrics - Tracks performance and debug metrics
 *
 * Provides insights into connector performance and optimization effectiveness.
 */
export class DebugMetrics {
    private stateUpdates = 0;
    private noopUpdates = 0;
    private updateTimes: number[] = [];
    private lastUpdateTime = 0;
    private eventListenerCount = 0;
    private subscriptionCount = 0;

    /**
     * Record a state update attempt
     */
    recordUpdate(duration: number, hadChanges: boolean): void {
        if (hadChanges) {
            this.stateUpdates++;
        } else {
            this.noopUpdates++;
        }

        this.updateTimes.push(duration);
        // Keep last 100 update times for average calculation
        if (this.updateTimes.length > 100) {
            this.updateTimes.shift();
        }
        this.lastUpdateTime = Date.now();
    }

    /**
     * Update listener counts
     */
    updateListenerCounts(eventListeners: number, subscriptions: number): void {
        this.eventListenerCount = eventListeners;
        this.subscriptionCount = subscriptions;
    }

    /**
     * Get current metrics
     */
    getMetrics(): ConnectorDebugMetrics {
        const totalUpdates = this.stateUpdates + this.noopUpdates;
        const optimizationRate = totalUpdates > 0 ? Math.round((this.noopUpdates / totalUpdates) * 100) : 0;

        const avgUpdateTime =
            this.updateTimes.length > 0 ? this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length : 0;

        return {
            stateUpdates: this.stateUpdates,
            noopUpdates: this.noopUpdates,
            optimizationRate,
            eventListenerCount: this.eventListenerCount,
            subscriptionCount: this.subscriptionCount,
            avgUpdateTimeMs: Math.round(avgUpdateTime * 100) / 100, // 2 decimal places
            lastUpdateTime: this.lastUpdateTime,
        };
    }

    /**
     * Reset all metrics
     */
    resetMetrics(): void {
        this.stateUpdates = 0;
        this.noopUpdates = 0;
        this.updateTimes = [];
        this.lastUpdateTime = 0;
    }
}
