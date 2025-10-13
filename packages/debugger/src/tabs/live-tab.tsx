/**
 * @connector-kit/debugger - Live Tab
 * 
 * Real-time transaction monitoring with automatic simulation
 */

'use client';

import { useState } from 'react';
import type { ConnectorClient } from '@connector-kit/connector/headless';
import { useAutoSimulation } from '../hooks/use-auto-simulation';
import { LiveTransactionCard } from '../components/live-transaction-card';
import { DEFAULT_AUTO_SIMULATION_CONFIG } from '../types/live-transaction';
import { Button, EmptyState } from '../ui-components';

interface LiveTabProps {
    client: ConnectorClient;
    rpcUrl: string;
}

/**
 * Live tab showing real-time transaction monitoring
 * Automatically simulates transactions before they're sent
 */
export function LiveTab({ client, rpcUrl }: LiveTabProps) {
    // Load config from localStorage or use defaults
    const [config] = useState(() => {
        try {
            const stored = localStorage.getItem('connector-debugger:auto-sim-config');
            return stored ? { ...DEFAULT_AUTO_SIMULATION_CONFIG, ...JSON.parse(stored) } : DEFAULT_AUTO_SIMULATION_CONFIG;
        } catch {
            return DEFAULT_AUTO_SIMULATION_CONFIG;
        }
    });

    const { liveTransactions, clearTransaction, clearAll, activeCount } = useAutoSimulation(
        client,
        rpcUrl,
        config,
    );

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 12,
                }}
            >
                <div>
                    <div
                        style={{
                            opacity: 0.7,
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            fontWeight: 400,
                            marginBottom: 4,
                        }}
                    >
                        Live Transactions
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>
                        {liveTransactions.length} total
                        {activeCount > 0 && (
                            <span
                                style={{
                                    marginLeft: 8,
                                    padding: '2px 6px',
                                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                    borderRadius: 4,
                                    fontSize: 9,
                                    fontWeight: 600,
                                    color: '#3b82f6',
                                }}
                            >
                                {activeCount} active
                            </span>
                        )}
                    </div>
                </div>
                {liveTransactions.length > 0 && (
                    <Button onClick={clearAll} small>
                        Clear All
                    </Button>
                )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {liveTransactions.length === 0 ? (
                    <EmptyState
                        icon={
                            <div
                                style={{
                                    fontSize: 48,
                                    opacity: 0.3,
                                    marginBottom: 8,
                                }}
                            >
                                🔴
                            </div>
                        }
                        title="No Live Transactions"
                        description="Transactions will appear here in real-time when you send them. Pre-flight simulation happens automatically."
                    />
                ) : (
                    <>
                        {liveTransactions.map(tx => (
                            <LiveTransactionCard key={tx.id} transaction={tx} onClear={() => clearTransaction(tx.id)} />
                        ))}
                    </>
                )}
            </div>

            {/* Info Footer */}
            {liveTransactions.length === 0 && (
                <div
                    style={{
                        marginTop: 12,
                        padding: 12,
                        backgroundColor: 'rgba(59, 130, 246, 0.05)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: 8,
                        fontSize: 9,
                        lineHeight: 1.6,
                    }}
                >
                    <div style={{ fontWeight: 600, marginBottom: 6, color: '#3b82f6' }}>
                        💡 How it works
                    </div>
                    <div style={{ opacity: 0.9 }}>
                        When you call <code style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '2px 4px', borderRadius: 3 }}>signer.signAndSendTransaction()</code>,
                        this tab automatically:
                        <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 20 }}>
                            <li>Simulates your transaction before wallet popup</li>
                            <li>Shows if it will succeed and compute units needed</li>
                            <li>Suggests optimizations (ALT) if beneficial</li>
                            <li>Tracks through signing → sending → confirmation</li>
                            <li>Auto-clears after 5 seconds (configurable)</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

