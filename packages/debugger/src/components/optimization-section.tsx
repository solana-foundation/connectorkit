/**
 * @solana/connector-debugger - Optimization Section Component
 *
 * Displays optimization analysis in transaction detail view
 */

'use client';

import { useState } from 'react';
import type { ALTSavingsAnalysis } from '../utils/alt-optimizer';
import type { ALTUsageInfo } from '../utils/alt-detector';
import { ALTSuggestionCard } from './alt-suggestion-card';
import { formatALTUsage } from '../utils/alt-detector';

interface OptimizationSectionProps {
    altSavings: ALTSavingsAnalysis | null;
    altUsage: ALTUsageInfo | null;
}

/**
 * Transaction optimization section showing ALT analysis
 */
export function OptimizationSection({ altSavings, altUsage }: OptimizationSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Show if either has useful information
    const hasOptimizationInfo = (altSavings && altSavings.worthOptimizing) || (altUsage && altUsage.usesALT);

    if (!hasOptimizationInfo) {
        return null;
    }

    return (
        <div>
            {/* Header Button */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 500,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
            >
                <span>
                    {isExpanded ? '▼' : '▶'} {altUsage?.usesALT ? '🔧 ALT Optimization' : '💡 Optimization Analysis'}
                </span>
                {altSavings && altSavings.worthOptimizing && (
                    <span
                        style={{
                            padding: '2px 6px',
                            backgroundColor: 'rgba(34, 197, 94, 0.15)',
                            borderRadius: 4,
                            fontSize: 9,
                            color: '#22c55e',
                        }}
                    >
                        -{altSavings.percentReduction.toFixed(0)}% possible
                    </span>
                )}
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div style={{ marginTop: 8 }}>
                    {/* ALT Usage (if transaction uses ALT) */}
                    {altUsage && altUsage.usesALT && (
                        <div
                            style={{
                                padding: 12,
                                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                borderRadius: 6,
                                marginBottom: 8,
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
                                <span style={{ fontSize: 16 }}>🔧</span>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#22c55e' }}>
                                        Using Address Lookup Table
                                    </div>
                                    <div style={{ fontSize: 9, opacity: 0.7 }}>{formatALTUsage(altUsage)}</div>
                                </div>
                            </div>

                            {/* ALT Details */}
                            <div
                                style={{
                                    fontSize: 9,
                                    padding: 8,
                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                    borderRadius: 4,
                                }}
                            >
                                <div style={{ marginBottom: 6 }}>
                                    <span style={{ opacity: 0.6 }}>Lookup Tables:</span>{' '}
                                    {altUsage.lookupTableAddresses.length}
                                </div>
                                {altUsage.lookupTableAddresses.map((addr, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            fontFamily: 'monospace',
                                            fontSize: 8,
                                            padding: '4px 6px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: 4,
                                            marginTop: 4,
                                            wordBreak: 'break-all',
                                        }}
                                    >
                                        {addr}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ALT Suggestion (if transaction doesn't use ALT but could benefit) */}
                    {altSavings && !altUsage?.usesALT && <ALTSuggestionCard analysis={altSavings} />}

                    {/* Combined view (uses ALT but could optimize more) */}
                    {altSavings && altUsage?.usesALT && altSavings.worthOptimizing && (
                        <div style={{ marginTop: 8 }}>
                            <div
                                style={{
                                    fontSize: 9,
                                    padding: 8,
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    borderRadius: 6,
                                    color: '#3b82f6',
                                }}
                            >
                                💡 This transaction uses ALT but could be optimized further by including more addresses
                                (potential {altSavings.percentReduction.toFixed(0)}% additional reduction).
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
