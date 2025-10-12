import type { TransactionActivity } from '../../types/transactions';
import type { StateManager } from '../core/state-manager';
import type { EventEmitter } from '../core/event-emitter';

/**
 * TransactionTracker - Tracks transaction history and status updates
 *
 * Provides debugging and monitoring for transaction activity.
 */
export class TransactionTracker {
    private stateManager: StateManager;
    private eventEmitter: EventEmitter;
    private debug: boolean;
    private transactions: TransactionActivity[] = [];
    private totalTransactions = 0;
    private maxTransactions: number;

    constructor(stateManager: StateManager, eventEmitter: EventEmitter, maxTransactions = 20, debug = false) {
        this.stateManager = stateManager;
        this.eventEmitter = eventEmitter;
        this.maxTransactions = maxTransactions;
        this.debug = debug;
    }

    /**
     * Track a transaction for debugging and monitoring
     */
    trackTransaction(activity: Omit<TransactionActivity, 'timestamp' | 'cluster'>): void {
        const state = this.stateManager.getSnapshot();
        const fullActivity: TransactionActivity = {
            ...activity,
            timestamp: new Date().toISOString(),
            cluster: state.cluster?.label || 'unknown',
        };

        this.transactions.unshift(fullActivity);
        if (this.transactions.length > this.maxTransactions) {
            this.transactions.pop();
        }
        this.totalTransactions++;

        // Emit event
        this.eventEmitter.emit({
            type: 'transaction:tracked',
            signature: fullActivity.signature,
            status: fullActivity.status,
            timestamp: fullActivity.timestamp,
        });

        if (this.debug) {
            console.log('[Connector] Transaction tracked:', fullActivity);
        }
    }

    /**
     * Update transaction status (e.g., from pending to confirmed/failed)
     */
    updateStatus(signature: string, status: TransactionActivity['status'], error?: string): void {
        const tx = this.transactions.find(t => t.signature === signature);
        if (tx) {
            tx.status = status;
            if (error) tx.error = error;

            // Emit event
            this.eventEmitter.emit({
                type: 'transaction:updated',
                signature,
                status,
                timestamp: new Date().toISOString(),
            });

            if (this.debug) {
                console.log('[Connector] Transaction updated:', {
                    signature,
                    status,
                    error,
                });
            }
        }
    }

    /**
     * Get transaction history
     */
    getTransactions(): TransactionActivity[] {
        return [...this.transactions];
    }

    /**
     * Get total transaction count
     */
    getTotalCount(): number {
        return this.totalTransactions;
    }

    /**
     * Clear transaction history
     */
    clearHistory(): void {
        this.transactions = [];
    }
}
