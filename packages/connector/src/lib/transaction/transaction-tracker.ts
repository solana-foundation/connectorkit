import type { TransactionActivity } from '../../types/transactions';
import { BaseCollaborator } from '../core/base-collaborator';

/**
 * TransactionTracker - Tracks transaction history and status updates
 *
 * Provides debugging and monitoring for transaction activity.
 */
export class TransactionTracker extends BaseCollaborator {
    private transactions: TransactionActivity[] = [];
    private totalTransactions = 0;
    private maxTransactions: number;

    constructor(
        stateManager: import('../core/state-manager').StateManager,
        eventEmitter: import('../core/event-emitter').EventEmitter,
        maxTransactions = 20,
        debug = false,
    ) {
        super({ stateManager, eventEmitter, debug }, 'TransactionTracker');
        this.maxTransactions = maxTransactions;
    }

    /**
     * Track a transaction for debugging and monitoring
     */
    trackTransaction(activity: Omit<TransactionActivity, 'timestamp' | 'cluster'>): void {
        const state = this.getState();
        const fullActivity: TransactionActivity = {
            ...activity,
            timestamp: new Date().toISOString(),
            cluster: (state.cluster?.id || 'solana:devnet') as any,
        };

        this.transactions.unshift(fullActivity);
        if (this.transactions.length > this.maxTransactions) {
            this.transactions.pop();
        }
        this.totalTransactions++;

        this.eventEmitter.emit({
            type: 'transaction:tracked',
            signature: fullActivity.signature,
            status: fullActivity.status,
            timestamp: fullActivity.timestamp,
        });

        this.log('[Connector] Transaction tracked:', fullActivity);
    }

    /**
     * Update transaction status (e.g., from pending to confirmed/failed)
     */
    updateStatus(signature: string, status: TransactionActivity['status'], error?: string): void {
        const tx = this.transactions.find(t => t.signature === signature);
        if (tx) {
            tx.status = status;
            if (error) tx.error = error;

            this.eventEmitter.emit({
                type: 'transaction:updated',
                signature: signature as any,
                status,
                timestamp: new Date().toISOString(),
            });

            this.log('[Connector] Transaction updated:', { signature, status, error });
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
