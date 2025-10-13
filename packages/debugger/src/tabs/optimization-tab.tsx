/**
 * @connector-kit/debugger - Optimization Tab
 * 
 * Session-wide statistics and ALT recommendations
 */

'use client';

import { useState } from 'react';
import { AddressTracker } from '../utils/address-tracker';
import type { AddressStats } from '../utils/address-tracker';
import { CodeSnippet } from '../components/code-snippet';
import { generateALTCreationCode, generateQuickALTCode } from '../utils/code-generator';
import { Button } from '../ui-components';
import { SimulationTracker } from '../utils/simulation-tracker';
import { formatComputeUnits } from '../utils/transaction-simulator';

/**
 * Optimization tab showing session statistics and ALT candidates
 */
export function OptimizationTab() {
    const [showFullCode, setShowFullCode] = useState(false);
    const [copiedAddresses, setCopiedAddresses] = useState(false);

    // Get statistics from address tracker
    const transactionCount = AddressTracker.getTransactionCount();
    const uniqueAddressCount = AddressTracker.getUniqueAddressCount();
    const topCandidates = AddressTracker.getTopCandidates(3); // Min frequency 3
    const totalPotentialSavings = AddressTracker.getTotalPotentialSavings(3);
    
    // Get simulation statistics
    const simStats = SimulationTracker.getStatistics();

    // Handle copy addresses to clipboard
    const handleCopyAddresses = async () => {
        const addresses = topCandidates.map(a => a.address).join('\n');
        try {
            await navigator.clipboard.writeText(addresses);
            setCopiedAddresses(true);
            setTimeout(() => setCopiedAddresses(false), 2000);
        } catch (err) {
            console.error('Failed to copy addresses:', err);
        }
    };

    // Handle reset
    const handleReset = () => {
        if (confirm('Clear all tracked statistics? This will reset the address frequency tracker.')) {
            AddressTracker.reset();
            // Force re-render
            window.location.reload();
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ marginBottom: 12 }}>
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
                    Transaction Optimization
                </div>
                <div style={{ fontSize: 9, opacity: 0.6 }}>
                    Session-wide analysis and Address Lookup Table recommendations
                </div>
            </div>

            {/* Session Overview */}
            <div
                style={{
                    padding: 12,
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: 12,
                }}
            >
                <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 10, opacity: 0.9 }}>
                    📊 Session Overview
                </div>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                    }}
                >
                    <div>
                        <div style={{ fontSize: 8, opacity: 0.6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Transactions
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>
                            {transactionCount}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 8, opacity: 0.6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Unique Addresses
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>
                            {uniqueAddressCount}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 8, opacity: 0.6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            ALT Candidates
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#3b82f6' }}>
                            {topCandidates.length}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 8, opacity: 0.6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Potential Savings
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#22c55e' }}>
                            ~{totalPotentialSavings}b
                        </div>
                    </div>
                </div>
            </div>

            {/* Simulation Statistics */}
            {simStats.totalSimulations > 0 && (
                <div
                    style={{
                        padding: 12,
                        backgroundColor: 'rgba(59, 130, 246, 0.05)',
                        borderRadius: 8,
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        marginBottom: 12,
                    }}
                >
                    <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 10, opacity: 0.9 }}>
                        🔍 Simulation Statistics
                    </div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 12,
                        }}
                    >
                        <div>
                            <div style={{ fontSize: 8, opacity: 0.6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Success Rate
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#22c55e' }}>
                                {simStats.successRate.toFixed(1)}%
                            </div>
                            <div style={{ fontSize: 8, opacity: 0.5 }}>
                                {simStats.successfulSimulations}/{simStats.totalSimulations}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 8, opacity: 0.6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Avg Compute Units
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#3b82f6' }}>
                                {formatComputeUnits(simStats.averageComputeUnits)}
                            </div>
                        </div>
                        {simStats.withALT.count > 0 && (
                            <>
                                <div>
                                    <div style={{ fontSize: 8, opacity: 0.6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        With ALT Avg
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace', color: '#22c55e' }}>
                                        {formatComputeUnits(simStats.withALT.averageComputeUnits)}
                                    </div>
                                    <div style={{ fontSize: 8, opacity: 0.5 }}>
                                        {simStats.withALT.count} simulations
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 8, opacity: 0.6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Savings
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace', color: '#22c55e' }}>
                                        {simStats.withoutALT.averageComputeUnits > 0
                                            ? `-${formatComputeUnits(simStats.withoutALT.averageComputeUnits - simStats.withALT.averageComputeUnits)}`
                                            : 'N/A'}
                                    </div>
                                    {simStats.withoutALT.averageComputeUnits > 0 && (
                                        <div style={{ fontSize: 8, opacity: 0.5 }}>
                                            {(((simStats.withoutALT.averageComputeUnits - simStats.withALT.averageComputeUnits) / simStats.withoutALT.averageComputeUnits) * 100).toFixed(1)}% reduction
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Content based on data availability */}
            {transactionCount === 0 ? (
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: 20,
                    }}
                >
                    <div>
                        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>📊</div>
                        <div style={{ fontSize: 11, marginBottom: 6, opacity: 0.8 }}>
                            No Transaction Data Yet
                        </div>
                        <div style={{ fontSize: 9, opacity: 0.6, lineHeight: 1.5 }}>
                            Send some transactions to see optimization<br />
                            recommendations and ALT candidates
                        </div>
                    </div>
                </div>
            ) : topCandidates.length === 0 ? (
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: 20,
                    }}
                >
                    <div>
                        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>✨</div>
                        <div style={{ fontSize: 11, marginBottom: 6, opacity: 0.8 }}>
                            Transactions Look Good!
                        </div>
                        <div style={{ fontSize: 9, opacity: 0.6, lineHeight: 1.5 }}>
                            No repeated addresses found yet.<br />
                            ALT optimization works best with addresses<br />
                            that appear in multiple transactions.
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Top ALT Candidates */}
                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 8, opacity: 0.9 }}>
                            💡 Top ALT Candidates (appears 3+ times)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {topCandidates.slice(0, 15).map((addr, idx) => (
                                <AddressCandidate key={addr.address} address={addr} rank={idx + 1} />
                            ))}
                        </div>
                        {topCandidates.length > 15 && (
                            <div style={{ fontSize: 9, opacity: 0.5, textAlign: 'center', marginTop: 8 }}>
                                ... and {topCandidates.length - 15} more addresses
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div
                        style={{
                            padding: 12,
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: 8,
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 10, opacity: 0.9 }}>
                            🚀 Quick Actions
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                            <Button onClick={() => setShowFullCode(!showFullCode)} small>
                                {showFullCode ? '▼ Hide Code' : '📋 Generate ALT Code'}
                            </Button>
                            <Button onClick={handleCopyAddresses} small>
                                {copiedAddresses ? '✓ Copied!' : '📎 Copy Addresses'}
                            </Button>
                            <Button onClick={handleReset} small>
                                🔄 Reset Stats
                            </Button>
                        </div>

                        {/* Code Snippet */}
                        {showFullCode && (
                            <CodeSnippet
                                code={generateQuickALTCode(topCandidates.slice(0, 20).map(a => a.address))}
                                title="Address Lookup Table Setup"
                                maxHeight={300}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * Individual address candidate display
 */
function AddressCandidate({ address, rank }: { address: AddressStats; rank: number }) {
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(address.address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy address:', err);
        }
    };

    return (
        <div
            style={{
                padding: 10,
                backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleCopy}
            title="Click to copy address"
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {/* Rank */}
                <div
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#3b82f6',
                    }}
                >
                    {rank}
                </div>

                {/* Name or shortened address */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>
                        {address.displayName || `${address.address.slice(0, 8)}...${address.address.slice(-8)}`}
                    </div>
                    {address.displayName && (
                        <div
                            style={{
                                fontSize: 8,
                                fontFamily: 'monospace',
                                opacity: 0.6,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {address.address}
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'monospace', color: '#eab308' }}>
                        {address.count}×
                    </div>
                    {address.potentialSavings > 0 && (
                        <div style={{ fontSize: 8, opacity: 0.6, fontFamily: 'monospace' }}>
                            ~{address.potentialSavings}b
                        </div>
                    )}
                </div>

                {/* Copy indicator */}
                {copied && (
                    <div style={{ fontSize: 9, color: '#22c55e', fontWeight: 600 }}>
                        ✓
                    </div>
                )}
            </div>
        </div>
    );
}

