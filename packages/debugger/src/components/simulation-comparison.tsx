/**
 * @solana/connector-debugger - Simulation Comparison Component
 *
 * Side-by-side comparison of simulation results (with/without ALT)
 */

'use client';

import type { SimulationComparison } from '../types/simulation';
import { formatComputeUnits, formatFee } from '../utils/transaction-simulator';
import { PassedIcon, FailedIcon } from '../icons';

interface SimulationComparisonProps {
    comparison: SimulationComparison;
}

/**
 * Displays side-by-side comparison of two simulation results
 */
export function SimulationComparisonView({ comparison }: SimulationComparisonProps) {
    const { original, optimized, savings } = comparison;

    return (
        <div
            style={{
                padding: 12,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
        >
            {/* Header */}
            <div style={{ marginBottom: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Simulation Comparison</div>
                <div style={{ fontSize: 9, opacity: 0.6 }}>Without ALT vs. With ALT</div>
            </div>

            {/* Comparison Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    gap: 12,
                    alignItems: 'start',
                }}
            >
                {/* Original (Without ALT) */}
                <div>
                    <div
                        style={{
                            fontSize: 9,
                            fontWeight: 600,
                            marginBottom: 8,
                            opacity: 0.8,
                            textAlign: 'center',
                        }}
                    >
                        Without ALT
                    </div>

                    {/* Status */}
                    <ComparisonMetric
                        label="Status"
                        value={
                            <span
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    color: original.success ? '#22c55e' : '#ef4444',
                                }}
                            >
                                {original.success ? <PassedIcon /> : <FailedIcon />}
                                {original.success ? 'Success' : 'Would fail'}
                            </span>
                        }
                    />

                    {/* Compute Units */}
                    {original.computeUnitsConsumed !== null && (
                        <ComparisonMetric
                            label="Compute Units"
                            value={formatComputeUnits(original.computeUnitsConsumed)}
                        />
                    )}

                    {/* Fee */}
                    {original.estimatedFee !== null && (
                        <ComparisonMetric label="Est. Fee" value={formatFee(original.estimatedFee)} />
                    )}
                </div>

                {/* Savings Arrow/Indicator */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 8px',
                    }}
                >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>→</div>
                    {savings.computeUnits > 0 && (
                        <div
                            style={{
                                padding: '4px 8px',
                                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                borderRadius: 6,
                                fontSize: 9,
                                fontWeight: 600,
                                color: '#22c55e',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            -{savings.computeUnits} CU
                            <br />
                            <span style={{ fontSize: 8, opacity: 0.8 }}>({savings.percentReduction.toFixed(1)}%)</span>
                        </div>
                    )}
                </div>

                {/* Optimized (With ALT) */}
                <div>
                    <div
                        style={{
                            fontSize: 9,
                            fontWeight: 600,
                            marginBottom: 8,
                            opacity: 0.8,
                            textAlign: 'center',
                        }}
                    >
                        With ALT
                    </div>

                    {/* Status */}
                    <ComparisonMetric
                        label="Status"
                        value={
                            <span
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    color: optimized.success ? '#22c55e' : '#ef4444',
                                }}
                            >
                                {optimized.success ? <PassedIcon /> : <FailedIcon />}
                                {optimized.success ? 'Success' : 'Would fail'}
                            </span>
                        }
                        highlight
                    />

                    {/* Compute Units */}
                    {optimized.computeUnitsConsumed !== null && (
                        <ComparisonMetric
                            label="Compute Units"
                            value={formatComputeUnits(optimized.computeUnitsConsumed)}
                            highlight
                        />
                    )}

                    {/* Fee */}
                    {optimized.estimatedFee !== null && (
                        <ComparisonMetric label="Est. Fee" value={formatFee(optimized.estimatedFee)} highlight />
                    )}
                </div>
            </div>

            {/* Summary */}
            {savings.computeUnits > 0 && (
                <div
                    style={{
                        marginTop: 12,
                        padding: 10,
                        backgroundColor: 'rgba(34, 197, 94, 0.08)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        borderRadius: 6,
                        textAlign: 'center',
                    }}
                >
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#22c55e', marginBottom: 4 }}>
                        ✨ Optimization Impact
                    </div>
                    <div style={{ fontSize: 9, opacity: 0.9 }}>
                        Saves {savings.computeUnits} compute units ({savings.percentReduction.toFixed(1)}% reduction)
                    </div>
                    {savings.bytes > 0 && (
                        <div style={{ fontSize: 8, opacity: 0.7, marginTop: 2 }}>
                            Also reduces transaction size by {savings.bytes} bytes
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Individual metric in comparison view
 */
function ComparisonMetric({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: React.ReactNode;
    highlight?: boolean;
}) {
    return (
        <div
            style={{
                padding: 8,
                marginBottom: 6,
                backgroundColor: highlight ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                border: highlight ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: 4,
            }}
        >
            <div style={{ fontSize: 8, opacity: 0.6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {label}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}>{value}</div>
        </div>
    );
}
