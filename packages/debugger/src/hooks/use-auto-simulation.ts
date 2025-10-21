/**
 * @solana/connector-debugger - Auto-Simulation Hook
 *
 * Automatically simulates transactions when connector emits preparing events
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ConnectorClient } from '@solana/connector';
import type { LiveTransaction, AutoSimulationConfig, LiveTransactionStatus } from '../types/live-transaction';
import { simulateTransaction } from '../utils/transaction-simulator';
import { SimulationTracker } from '../utils/simulation-tracker';
import { AddressTracker, extractAccountAddresses } from '../utils/address-tracker';
import { calculateALTSavings } from '../utils/alt-optimizer';
import { analyzeTransactionSize } from '../utils/transaction-analyzer';
import { detectALTUsage } from '../utils/alt-detector';

/**
 * Generate unique ID for live transaction
 */
function generateId(): string {
    return `live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hook return type
 */
export interface UseAutoSimulationReturn {
    /** Active live transactions */
    liveTransactions: LiveTransaction[];
    /** Clear a specific transaction */
    clearTransaction: (id: string) => void;
    /** Clear all transactions */
    clearAll: () => void;
    /** Number of active (non-confirmed) transactions */
    activeCount: number;
}

/**
 * Hook that automatically simulates transactions when preparing
 *
 * Listens for 'transaction:preparing' events from connector and:
 * 1. Simulates the transaction immediately
 * 2. Analyzes size and optimization opportunities
 * 3. Tracks lifecycle through completion
 * 4. Auto-clears after confirmation
 *
 * @param client - Connector client instance
 * @param rpcUrl - RPC endpoint for simulation
 * @param config - Auto-simulation configuration
 * @returns Live transactions and control functions
 */
export function useAutoSimulation(
    client: ConnectorClient | null,
    rpcUrl: string,
    config: AutoSimulationConfig,
): UseAutoSimulationReturn {
    const [liveTransactions, setLiveTransactions] = useState<LiveTransaction[]>([]);

    // Clear a specific transaction
    const clearTransaction = useCallback((id: string) => {
        setLiveTransactions(prev => prev.filter(tx => tx.id !== id));
    }, []);

    // Clear all transactions
    const clearAll = useCallback(() => {
        setLiveTransactions([]);
    }, []);

    // Count active (non-confirmed/failed) transactions
    const activeCount = liveTransactions.filter(tx => tx.status !== 'confirmed' && tx.status !== 'failed').length;

    // Auto-clear logic
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setLiveTransactions(prev =>
                prev.filter(tx => {
                    // Keep if no auto-clear time set
                    if (!tx.autoClearAt) return true;
                    // Keep if auto-clear time not reached
                    return now < tx.autoClearAt;
                }),
            );
        }, 1000); // Check every second

        return () => clearInterval(interval);
    }, []);

    // Listen for transaction events and auto-simulate
    useEffect(() => {
        if (!client || !config.enabled) {
            console.log('[Auto-Simulation] Hook inactive:', { hasClient: !!client, enabled: config.enabled });
            return;
        }

        console.log('[Auto-Simulation] Hook active, listening for events...');

        const handlePreparingEvent = async (event: unknown) => {
            const evt = event as { type: string; transaction: Uint8Array; size: number; timestamp: string };

            if (evt.type !== 'transaction:preparing') return;

            console.log('[Auto-Simulation] Received transaction:preparing event:', {
                size: evt.size,
                timestamp: evt.timestamp,
            });

            const id = generateId();

            // Create initial live transaction
            const liveTx: LiveTransaction = {
                id,
                status: 'preparing',
                transaction: evt.transaction,
                size: evt.size,
                simulationResult: null,
                signature: null,
                timestamp: evt.timestamp,
            };

            console.log('[Auto-Simulation] Adding live transaction:', { id, status: 'preparing' });
            setLiveTransactions(prev => [liveTx, ...prev]);

            // Start simulation asynchronously
            (async () => {
                try {
                    // Update status to simulating
                    setLiveTransactions(prev =>
                        prev.map(tx => (tx.id === id ? { ...tx, status: 'simulating' as const } : tx)),
                    );

                    // Perform simulation
                    console.log('[Auto-Simulation] Starting simulation...');
                    const simResult = await simulateTransaction(evt.transaction, rpcUrl);
                    console.log('[Auto-Simulation] Simulation complete:', {
                        success: simResult.success,
                        computeUnits: simResult.computeUnitsConsumed,
                    });

                    // Analyze size
                    const sizeAnalysis = analyzeTransactionSize(evt.size);

                    // Extract addresses and calculate ALT savings
                    const addresses = extractAccountAddresses({ transaction: evt.transaction });
                    let altSavings = null;

                    if (addresses.length > 0 && config.showOptimizationSuggestions) {
                        const allStats = AddressTracker.getAllAddresses();
                        const frequencyMap = new Map(allStats.map(s => [s.address, s.count]));
                        altSavings = calculateALTSavings(evt.size, addresses, frequencyMap);
                    }

                    // Track simulation if configured
                    if (config.trackInStats) {
                        const altUsage = detectALTUsage({ transaction: evt.transaction });
                        SimulationTracker.trackSimulation(simResult, evt.size, altUsage.usesALT);
                    }

                    // Update with simulation results
                    setLiveTransactions(prev =>
                        prev.map(tx =>
                            tx.id === id
                                ? {
                                      ...tx,
                                      status: 'simulated' as const,
                                      simulationResult: simResult,
                                      altSuggestion: altSavings && altSavings.worthOptimizing ? altSavings : undefined,
                                  }
                                : tx,
                        ),
                    );
                } catch (error) {
                    console.error('Auto-simulation failed:', error);

                    // Update status to show simulation failed but allow tx to proceed
                    setLiveTransactions(prev =>
                        prev.map(tx =>
                            tx.id === id
                                ? {
                                      ...tx,
                                      status: 'simulated' as const,
                                      error: 'Simulation failed (transaction can still proceed)',
                                  }
                                : tx,
                        ),
                    );
                }
            })();
        };

        const handleSigningEvent = (event: unknown) => {
            const evt = event as { type: string; timestamp: string };
            if (evt.type !== 'transaction:signing') return;

            // Update latest transaction to signing status
            setLiveTransactions(prev => {
                if (prev.length === 0) return prev;
                const updated = [...prev];
                updated[0] = { ...updated[0], status: 'signing' };
                return updated;
            });
        };

        const handleSentEvent = (event: unknown) => {
            const evt = event as { type: string; signature: string; timestamp: string };
            if (evt.type !== 'transaction:sent') return;

            // Update latest transaction with signature and confirming status
            setLiveTransactions(prev => {
                if (prev.length === 0) return prev;
                const updated = [...prev];
                updated[0] = {
                    ...updated[0],
                    status: 'confirming',
                    signature: evt.signature,
                };
                return updated;
            });
        };

        const handleTrackedEvent = (event: unknown) => {
            const evt = event as { type: string; signature: string; status: string; timestamp: string };
            if (evt.type !== 'transaction:tracked' && evt.type !== 'transaction:updated') return;

            // Find transaction by signature and update status
            setLiveTransactions(prev =>
                prev.map(tx => {
                    if (tx.signature === evt.signature) {
                        const newStatus: LiveTransactionStatus =
                            evt.status === 'confirmed' ? 'confirmed' : evt.status === 'failed' ? 'failed' : tx.status;
                        const autoClearAt =
                            newStatus === 'confirmed' && config.autoClearDelay > 0
                                ? Date.now() + config.autoClearDelay
                                : undefined;

                        return {
                            ...tx,
                            status: newStatus,
                            autoClearAt,
                        };
                    }
                    return tx;
                }),
            );
        };

        // Subscribe to all transaction events
        const unsubscribe = client.on((event: unknown) => {
            const evt = event as { type: string };

            console.log('[Auto-Simulation] Received event:', evt.type);

            if (evt.type === 'transaction:preparing') {
                handlePreparingEvent(event);
            } else if (evt.type === 'transaction:signing') {
                handleSigningEvent(event);
            } else if (evt.type === 'transaction:sent') {
                handleSentEvent(event);
            } else if (evt.type === 'transaction:tracked' || evt.type === 'transaction:updated') {
                handleTrackedEvent(event);
            }
        });

        console.log('[Auto-Simulation] Subscribed to events');

        return () => {
            console.log('[Auto-Simulation] Unsubscribing from events');
            unsubscribe();
        };
    }, [client, rpcUrl, config]);

    return {
        liveTransactions,
        clearTransaction,
        clearAll,
        activeCount,
    };
}
