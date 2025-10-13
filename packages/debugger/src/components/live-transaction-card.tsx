/**
 * @connector-kit/debugger - Live Transaction Card Component
 * 
 * Displays individual live transaction with real-time updates
 */

'use client';

import { useState } from 'react';
import type { LiveTransaction } from '../types/live-transaction';
import { StatusBadge, StatusDot } from './status-badge';
import { ProgressIndicator } from './progress-indicator';
import { SizeBadge } from './size-badge';
import { analyzeTransactionSize } from '../utils/transaction-analyzer';
import { formatComputeUnits, formatFee } from '../utils/transaction-simulator';
import { PassedIcon, FailedIcon } from '../icons';
import { ALTSuggestionBadge } from './alt-suggestion-card';

interface LiveTransactionCardProps {
    transaction: LiveTransaction;
    onClear: () => void;
}

/**
 * Card displaying a live transaction with real-time status updates
 */
export function LiveTransactionCard({ transaction, onClear }: LiveTransactionCardProps) {
    const [isExpanded, setIsExpanded] = useState(true); // Default expanded for live txs
    const [isHovered, setIsHovered] = useState(false);

    const sizeAnalysis = analyzeTransactionSize(transaction.size);
    const simResult = transaction.simulationResult;

    // Calculate time ago
    const timeAgo = getTimeAgo(transaction.timestamp);

    // Determine card background based on status
    const getCardBackground = () => {
        if (transaction.status === 'failed') return 'rgba(239, 68, 68, 0.05)';
        if (transaction.status === 'confirmed') return 'rgba(34, 197, 94, 0.05)';
        return isHovered ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.03)';
    };

    const getCardBorder = () => {
        if (transaction.status === 'failed') return '1px solid rgba(239, 68, 68, 0.3)';
        if (transaction.status === 'confirmed') return '1px solid rgba(34, 197, 94, 0.3)';
        return '1px solid rgba(255, 255, 255, 0.1)';
    };

    return (
        <div
            style={{
                border: getCardBorder(),
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
                backgroundColor: getCardBackground(),
                transition: 'all 0.2s ease',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                    cursor: 'pointer',
                    userSelect: 'none',
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <StatusDot status={transaction.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                        Transaction {transaction.signature ? `• ${formatSignature(transaction.signature)}` : ''}
                    </div>
                    <div style={{ fontSize: 9, opacity: 0.6 }}>{timeAgo}</div>
                </div>
                <StatusBadge status={transaction.status} size="small" />
                <span style={{ fontSize: 10, opacity: 0.6 }}>{isExpanded ? '▼' : '▶'}</span>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <>
                    {/* Progress Indicator */}
                    <div style={{ marginBottom: 12 }}>
                        <ProgressIndicator status={transaction.status} />
                    </div>

                    {/* Size Analysis */}
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 9, opacity: 0.6, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Transaction Size
                        </div>
                        <SizeBadge analysis={sizeAnalysis} showPercentage />
                    </div>

                    {/* Simulation Results */}
                    {simResult && (
                        <div
                            style={{
                                padding: 10,
                                backgroundColor: simResult.success
                                    ? 'rgba(34, 197, 94, 0.08)'
                                    : 'rgba(239, 68, 68, 0.08)',
                                border: simResult.success
                                    ? '1px solid rgba(34, 197, 94, 0.2)'
                                    : '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: 6,
                                marginBottom: 12,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginBottom: 8,
                                }}
                            >
                                {simResult.success ? (
                                    <PassedIcon className="text-[#22c55e]" />
                                ) : (
                                    <FailedIcon className="text-[#ef4444]" />
                                )}
                                <span
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: simResult.success ? '#22c55e' : '#ef4444',
                                    }}
                                >
                                    {simResult.success ? 'Simulation Passed' : 'Simulation Failed'}
                                </span>
                            </div>

                            {/* Compute Units */}
                            {simResult.computeUnitsConsumed !== null && (
                                <div style={{ fontSize: 9, marginBottom: 4 }}>
                                    <span style={{ opacity: 0.7 }}>Compute Units:</span>{' '}
                                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                                        {formatComputeUnits(simResult.computeUnitsConsumed)}
                                    </span>
                                    {simResult.unitsConsumed && (
                                        <span style={{ opacity: 0.6, marginLeft: 4 }}>
                                            ({simResult.unitsConsumed.percentOfLimit.toFixed(1)}% of limit)
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Fee */}
                            {simResult.estimatedFee !== null && (
                                <div style={{ fontSize: 9, marginBottom: 4 }}>
                                    <span style={{ opacity: 0.7 }}>Est. Fee:</span>{' '}
                                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                                        {formatFee(simResult.estimatedFee)}
                                    </span>
                                </div>
                            )}

                            {/* Error */}
                            {simResult.error && (
                                <div
                                    style={{
                                        fontSize: 9,
                                        marginTop: 6,
                                        padding: 6,
                                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                        borderRadius: 4,
                                        color: '#ef4444',
                                        fontWeight: 500,
                                    }}
                                >
                                    {simResult.error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ALT Optimization Suggestion */}
                    {transaction.altSuggestion && (
                        <div
                            style={{
                                padding: 10,
                                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                borderRadius: 6,
                                marginBottom: 12,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                <span style={{ fontSize: 14 }}>💡</span>
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#3b82f6' }}>
                                    Optimization Available
                                </span>
                            </div>
                            <div style={{ fontSize: 9, opacity: 0.9 }}>
                                Could save {transaction.altSuggestion.bytesSaved} bytes (
                                {transaction.altSuggestion.percentReduction.toFixed(1)}%) with Address Lookup Table
                            </div>
                            <div
                                style={{
                                    fontSize: 9,
                                    marginTop: 6,
                                    padding: 6,
                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                    borderRadius: 4,
                                }}
                            >
                                <div style={{ opacity: 0.7, marginBottom: 2 }}>Impact:</div>
                                <div style={{ fontFamily: 'monospace' }}>
                                    {transaction.size} bytes → {transaction.altSuggestion.potentialSize} bytes
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Signature (if available) */}
                    {transaction.signature && (
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 9, opacity: 0.6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Signature
                            </div>
                            <div
                                style={{
                                    fontSize: 9,
                                    fontFamily: 'monospace',
                                    padding: 6,
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: 4,
                                    wordBreak: 'break-all',
                                }}
                            >
                                {transaction.signature}
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {transaction.error && (
                        <div
                            style={{
                                padding: 8,
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: 6,
                                fontSize: 9,
                                color: '#ef4444',
                                marginBottom: 12,
                            }}
                        >
                            ⚠️ {transaction.error}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {transaction.status === 'confirmed' || transaction.status === 'failed' ? (
                            <button
                                onClick={onClear}
                                style={{
                                    padding: '4px 10px',
                                    fontSize: 9,
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: 4,
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                }}
                            >
                                Clear
                            </button>
                        ) : null}
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * Format signature for display
 */
function formatSignature(signature: string, chars = 8): string {
    if (signature.length <= chars * 2) return signature;
    return `${signature.slice(0, chars)}...${signature.slice(-chars)}`;
}

/**
 * Get relative time string
 */
function getTimeAgo(timestamp: string): string {
    const ms = Date.now() - new Date(timestamp).getTime();
    if (ms < 1000) return 'just now';
    if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    return `${Math.floor(ms / 3600000)}h ago`;
}

