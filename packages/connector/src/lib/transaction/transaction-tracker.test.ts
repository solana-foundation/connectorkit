/**
 * TransactionTracker unit tests
 *
 * Tests transaction tracking, status updates, and history management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionTracker } from './transaction-tracker';
import { StateManager } from '../core/state-manager';
import { EventEmitter } from '../core/event-emitter';
import type { ConnectorState } from '../../types/connector';
import { createEventCollector } from '../../__tests__/utils/test-helpers';
import { createMockTransaction, TEST_SIGNATURES } from '../../__tests__/fixtures/transactions';

describe('TransactionTracker', () => {
    let stateManager: StateManager;
    let eventEmitter: EventEmitter;
    let transactionTracker: TransactionTracker;
    let eventCollector: ReturnType<typeof createEventCollector>;

    beforeEach(() => {
        const initialState: ConnectorState = {
            wallets: [],
            selectedWallet: null,
            connected: false,
            connecting: false,
            accounts: [],
            selectedAccount: null,
            cluster: { id: 'mainnet-beta', label: 'Mainnet Beta', endpoint: 'https://api.mainnet-beta.solana.com' },
            clusters: [],
        };

        stateManager = new StateManager(initialState);
        eventEmitter = new EventEmitter(false);
        eventCollector = createEventCollector();

        eventEmitter.on(eventCollector.collect);

        transactionTracker = new TransactionTracker(stateManager, eventEmitter, 20, false);
    });

    describe('trackTransaction', () => {
        it('should track a transaction', () => {
            const transaction = {
                signature: TEST_SIGNATURES.TX_1,
                status: 'pending' as const,
            };

            transactionTracker.trackTransaction(transaction);

            const transactions = transactionTracker.getTransactions();
            expect(transactions).toHaveLength(1);
            expect(transactions[0]).toMatchObject({
                signature: TEST_SIGNATURES.TX_1,
                status: 'pending',
                cluster: 'Mainnet Beta',
            });
            expect(transactions[0].timestamp).toBeDefined();
        });

        it('should emit transaction:tracked event', () => {
            const transaction = {
                signature: TEST_SIGNATURES.TX_1,
                status: 'pending' as const,
            };

            transactionTracker.trackTransaction(transaction);

            eventCollector.assertEventEmitted('transaction:tracked');
        });

        it('should add transactions to the beginning of the list', () => {
            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_1,
                status: 'pending' as const,
            });

            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_2,
                status: 'pending' as const,
            });

            const transactions = transactionTracker.getTransactions();
            expect(transactions[0].signature).toBe(TEST_SIGNATURES.TX_2);
            expect(transactions[1].signature).toBe(TEST_SIGNATURES.TX_1);
        });

        it('should respect max transaction limit', () => {
            const smallTracker = new TransactionTracker(stateManager, eventEmitter, 3, false);

            for (let i = 0; i < 5; i++) {
                smallTracker.trackTransaction({
                    signature: `signature-${i}`,
                    status: 'pending' as const,
                });
            }

            const transactions = smallTracker.getTransactions();
            expect(transactions).toHaveLength(3);
            // Should keep most recent
            expect(transactions[0].signature).toBe('signature-4');
            expect(transactions[1].signature).toBe('signature-3');
            expect(transactions[2].signature).toBe('signature-2');
        });

        it('should increment total transaction count', () => {
            expect(transactionTracker.getTotalCount()).toBe(0);

            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_1,
                status: 'pending' as const,
            });

            expect(transactionTracker.getTotalCount()).toBe(1);

            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_2,
                status: 'confirmed' as const,
            });

            expect(transactionTracker.getTotalCount()).toBe(2);
        });

        it('should include cluster information', () => {
            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_1,
                status: 'pending' as const,
            });

            const transactions = transactionTracker.getTransactions();
            expect(transactions[0].cluster).toBe('Mainnet Beta');
        });

        it('should handle unknown cluster', () => {
            // Update state to have no cluster
            stateManager.updateState({ cluster: null });

            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_1,
                status: 'pending' as const,
            });

            const transactions = transactionTracker.getTransactions();
            expect(transactions[0].cluster).toBe('unknown');
        });
    });

    describe('updateStatus', () => {
        beforeEach(() => {
            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_1,
                status: 'pending' as const,
            });
        });

        it('should update transaction status', () => {
            transactionTracker.updateStatus(TEST_SIGNATURES.TX_1, 'confirmed');

            const transactions = transactionTracker.getTransactions();
            expect(transactions[0].status).toBe('confirmed');
        });

        it('should emit transaction:updated event', () => {
            eventCollector.clear();

            transactionTracker.updateStatus(TEST_SIGNATURES.TX_1, 'confirmed');

            eventCollector.assertEventEmitted('transaction:updated');
        });

        it('should update error message', () => {
            transactionTracker.updateStatus(TEST_SIGNATURES.TX_1, 'failed', 'Insufficient funds');

            const transactions = transactionTracker.getTransactions();
            expect(transactions[0].status).toBe('failed');
            expect(transactions[0].error).toBe('Insufficient funds');
        });

        it('should handle non-existent transaction gracefully', () => {
            expect(() => {
                transactionTracker.updateStatus('non-existent-signature', 'confirmed');
            }).not.toThrow();
        });

        it('should update correct transaction when multiple exist', () => {
            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_2,
                status: 'pending' as const,
            });

            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_3,
                status: 'pending' as const,
            });

            transactionTracker.updateStatus(TEST_SIGNATURES.TX_2, 'confirmed');

            const transactions = transactionTracker.getTransactions();
            const tx2 = transactions.find(t => t.signature === TEST_SIGNATURES.TX_2);
            const tx1 = transactions.find(t => t.signature === TEST_SIGNATURES.TX_1);
            const tx3 = transactions.find(t => t.signature === TEST_SIGNATURES.TX_3);

            expect(tx2?.status).toBe('confirmed');
            expect(tx1?.status).toBe('pending');
            expect(tx3?.status).toBe('pending');
        });
    });

    describe('getTransactions', () => {
        it('should return empty array initially', () => {
            const transactions = transactionTracker.getTransactions();
            expect(transactions).toEqual([]);
        });

        it('should return copy of transactions array', () => {
            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_1,
                status: 'pending' as const,
            });

            const transactions1 = transactionTracker.getTransactions();
            const transactions2 = transactionTracker.getTransactions();

            expect(transactions1).toEqual(transactions2);
            expect(transactions1).not.toBe(transactions2); // Different array instance
        });

        it('should return all tracked transactions', () => {
            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_1,
                status: 'pending' as const,
            });

            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_2,
                status: 'confirmed' as const,
            });

            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_3,
                status: 'failed' as const,
                error: 'Error message',
            });

            const transactions = transactionTracker.getTransactions();
            expect(transactions).toHaveLength(3);
        });
    });

    describe('getTotalCount', () => {
        it('should return 0 initially', () => {
            expect(transactionTracker.getTotalCount()).toBe(0);
        });

        it('should track total across history limit', () => {
            const smallTracker = new TransactionTracker(stateManager, eventEmitter, 2, false);

            for (let i = 0; i < 5; i++) {
                smallTracker.trackTransaction({
                    signature: `signature-${i}`,
                    status: 'pending' as const,
                });
            }

            // Only 2 in history
            expect(smallTracker.getTransactions()).toHaveLength(2);
            // But total count is 5
            expect(smallTracker.getTotalCount()).toBe(5);
        });
    });

    describe('clearHistory', () => {
        it('should clear transaction history', () => {
            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_1,
                status: 'pending' as const,
            });

            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_2,
                status: 'confirmed' as const,
            });

            expect(transactionTracker.getTransactions()).toHaveLength(2);

            transactionTracker.clearHistory();

            expect(transactionTracker.getTransactions()).toHaveLength(0);
        });

        it('should not affect total count', () => {
            transactionTracker.trackTransaction({
                signature: TEST_SIGNATURES.TX_1,
                status: 'pending' as const,
            });

            expect(transactionTracker.getTotalCount()).toBe(1);

            transactionTracker.clearHistory();

            // Total count should still be 1
            expect(transactionTracker.getTotalCount()).toBe(1);
        });
    });
});
