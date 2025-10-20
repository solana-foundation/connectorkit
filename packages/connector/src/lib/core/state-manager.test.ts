/**
 * StateManager unit tests
 *
 * Tests state management, structural sharing, and listener notifications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StateManager } from './state-manager';
import type { ConnectorState } from '../../types/connector';
import { createTestAccounts } from '../../__tests__/fixtures/accounts';

describe('StateManager', () => {
    let stateManager: StateManager;
    let initialState: ConnectorState;

    beforeEach(() => {
        initialState = {
            wallets: [],
            selectedWallet: null,
            connected: false,
            connecting: false,
            accounts: [],
            selectedAccount: null,
            cluster: null,
            clusters: [],
        };
        stateManager = new StateManager(initialState);
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe('initialization', () => {
        it('should initialize with provided state', () => {
            const state = stateManager.getSnapshot();
            expect(state).toEqual(initialState);
        });
    });

    describe('updateState', () => {
        it('should update primitive values', () => {
            const updated = stateManager.updateState({ connected: true });

            expect(updated).toBe(true);
            expect(stateManager.getSnapshot().connected).toBe(true);
        });

        it('should not update when value is the same', () => {
            const updated = stateManager.updateState({ connected: false });

            expect(updated).toBe(false);
            expect(stateManager.getSnapshot().connected).toBe(false);
        });

        it('should update string values', () => {
            const updated = stateManager.updateState({ selectedWallet: 'Phantom' });

            expect(updated).toBe(true);
            expect(stateManager.getSnapshot().selectedWallet).toBe('Phantom');
        });

        it('should handle null values', () => {
            stateManager.updateState({ selectedWallet: 'Phantom' });
            const updated = stateManager.updateState({ selectedWallet: null });

            expect(updated).toBe(true);
            expect(stateManager.getSnapshot().selectedWallet).toBe(null);
        });
    });

    describe('array equality', () => {
        it('should detect array changes when items are added', () => {
            const accounts = createTestAccounts(2);
            const updated = stateManager.updateState({ accounts });

            expect(updated).toBe(true);
            expect(stateManager.getSnapshot().accounts).toEqual(accounts);
        });

        it('should not update when array content is the same', () => {
            const accounts = createTestAccounts(2);
            stateManager.updateState({ accounts });

            // Same content, different array instance
            const sameAccounts = [...accounts];
            const updated = stateManager.updateState({ accounts: sameAccounts });

            expect(updated).toBe(false);
        });

        it('should detect changes when array order changes', () => {
            const accounts = createTestAccounts(2);
            stateManager.updateState({ accounts });

            const reversed = [...accounts].reverse();
            const updated = stateManager.updateState({ accounts: reversed });

            expect(updated).toBe(true);
            expect(stateManager.getSnapshot().accounts).toEqual(reversed);
        });

        it('should detect changes when array length changes', () => {
            const accounts = createTestAccounts(2);
            stateManager.updateState({ accounts });

            const moreAccounts = createTestAccounts(3);
            const updated = stateManager.updateState({ accounts: moreAccounts });

            expect(updated).toBe(true);
            expect(stateManager.getSnapshot().accounts.length).toBe(3);
        });

        it('should handle empty arrays', () => {
            const accounts = createTestAccounts(2);
            stateManager.updateState({ accounts });

            const updated = stateManager.updateState({ accounts: [] });

            expect(updated).toBe(true);
            expect(stateManager.getSnapshot().accounts).toEqual([]);
        });
    });

    describe('object equality', () => {
        it('should detect object changes', () => {
            const cluster = { id: 'mainnet-beta', name: 'Mainnet Beta' };
            const updated = stateManager.updateState({ cluster });

            expect(updated).toBe(true);
            expect(stateManager.getSnapshot().cluster).toEqual(cluster);
        });

        it('should not update when object content is the same', () => {
            const cluster = { id: 'mainnet-beta', name: 'Mainnet Beta' };
            stateManager.updateState({ cluster });

            // Same content, different object instance
            const sameCluster = { ...cluster };
            const updated = stateManager.updateState({ cluster: sameCluster });

            expect(updated).toBe(false);
        });

        it('should detect changes when object properties change', () => {
            const cluster = { id: 'mainnet-beta', name: 'Mainnet Beta' };
            stateManager.updateState({ cluster });

            const differentCluster = { id: 'devnet', name: 'Devnet' };
            const updated = stateManager.updateState({ cluster: differentCluster });

            expect(updated).toBe(true);
            expect(stateManager.getSnapshot().cluster).toEqual(differentCluster);
        });
    });

    describe('listeners', () => {
        it('should notify listeners on state change', async () => {
            const listener = vi.fn();
            stateManager.subscribe(listener);

            stateManager.updateState({ connected: true });

            // Wait for debounced notification
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(expect.objectContaining({ connected: true }));
        });

        it('should notify immediately when immediate flag is true', () => {
            const listener = vi.fn();
            stateManager.subscribe(listener);

            stateManager.updateState({ connected: true }, true);

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(expect.objectContaining({ connected: true }));
        });

        it('should debounce multiple updates', async () => {
            const listener = vi.fn();
            stateManager.subscribe(listener);

            stateManager.updateState({ connecting: true });
            stateManager.updateState({ connected: true });
            stateManager.updateState({ connecting: false });

            // Wait for debounced notification
            await new Promise(resolve => setTimeout(resolve, 50));

            // Should only be called once with final state
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    connecting: false,
                    connected: true,
                }),
            );
        });

        it('should support multiple listeners', async () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();
            const listener3 = vi.fn();

            stateManager.subscribe(listener1);
            stateManager.subscribe(listener2);
            stateManager.subscribe(listener3);

            stateManager.updateState({ connected: true });

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(listener1).toHaveBeenCalledTimes(1);
            expect(listener2).toHaveBeenCalledTimes(1);
            expect(listener3).toHaveBeenCalledTimes(1);
        });

        it('should allow unsubscribing', async () => {
            const listener = vi.fn();
            const unsubscribe = stateManager.subscribe(listener);

            stateManager.updateState({ connected: true }, true);
            expect(listener).toHaveBeenCalledTimes(1);

            unsubscribe();

            stateManager.updateState({ connected: false }, true);
            expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
        });

        it('should not notify listeners when state does not change', async () => {
            const listener = vi.fn();
            stateManager.subscribe(listener);

            stateManager.updateState({ connected: false }); // Same as initial

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('clear', () => {
        it('should remove all listeners', async () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            stateManager.subscribe(listener1);
            stateManager.subscribe(listener2);

            stateManager.clear();

            stateManager.updateState({ connected: true }, true);

            expect(listener1).not.toHaveBeenCalled();
            expect(listener2).not.toHaveBeenCalled();
        });
    });

    describe('getSnapshot', () => {
        it('should return current state', () => {
            const accounts = createTestAccounts(2);
            stateManager.updateState({
                connected: true,
                selectedWallet: 'Phantom',
                accounts,
            });

            const snapshot = stateManager.getSnapshot();

            expect(snapshot).toEqual(
                expect.objectContaining({
                    connected: true,
                    selectedWallet: 'Phantom',
                    accounts,
                }),
            );
        });

        it('should return the same state reference until updated', () => {
            const snapshot1 = stateManager.getSnapshot();
            const snapshot2 = stateManager.getSnapshot();

            expect(snapshot1).toBe(snapshot2);

            stateManager.updateState({ connected: true });
            const snapshot3 = stateManager.getSnapshot();

            expect(snapshot3).not.toBe(snapshot1);
        });
    });

    describe('structural sharing', () => {
        it('should maintain object reference when no changes', () => {
            const accounts = createTestAccounts(2);
            stateManager.updateState({ accounts });

            const stateBefore = stateManager.getSnapshot();
            stateManager.updateState({ connected: true });
            const stateAfter = stateManager.getSnapshot();

            // Accounts array should be the same reference
            expect(stateAfter.accounts).toBe(stateBefore.accounts);
        });
    });
});
