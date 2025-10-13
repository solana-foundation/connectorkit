/**
 * @connector-kit/debugger - Simulation Section Component
 * 
 * Displays simulation results in transaction detail view
 */

'use client';

import { useState } from 'react';
import type { SimulationResult } from '../types/simulation';
import { analyzeSimulation, formatComputeUnits, formatFee } from '../utils/transaction-simulator';
import { PassedIcon, FailedIcon } from '../icons';

interface SimulationSectionProps {
    simulationResult: SimulationResult | null;
    isSimulating: boolean;
    onSimulate: () => void;
    onSimulateWithALT?: () => void;
    hasALTOption?: boolean;
}

/**
 * Transaction simulation section with results display
 */
export function SimulationSection({
    simulationResult,
    isSimulating,
    onSimulate,
    onSimulateWithALT,
    hasALTOption = false,
}: SimulationSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Get advice based on simulation result
    const advice = simulationResult ? analyzeSimulation(simulationResult) : [];

    return (
        <div>
            {/* Header Button */}
            <div
                onClick={() => {
                    if (simulationResult) {
                        setIsExpanded(!isExpanded);
                    }
                }}
                style={{
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: simulationResult
                        ? simulationResult.success
                            ? 'rgba(34, 197, 94, 0.05)'
                            : 'rgba(239, 68, 68, 0.05)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border: simulationResult
                        ? simulationResult.success
                            ? '1px solid rgba(34, 197, 94, 0.2)'
                            : '1px solid rgba(239, 68, 68, 0.2)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 4,
                    cursor: simulationResult ? 'pointer' : 'default',
                    fontSize: 10,
                    fontWeight: 500,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                    if (simulationResult) {
                        e.currentTarget.style.backgroundColor = simulationResult.success
                            ? 'rgba(34, 197, 94, 0.08)'
                            : 'rgba(239, 68, 68, 0.08)';
                    }
                }}
                onMouseLeave={e => {
                    if (simulationResult) {
                        e.currentTarget.style.backgroundColor = simulationResult.success
                            ? 'rgba(34, 197, 94, 0.05)'
                            : 'rgba(239, 68, 68, 0.05)';
                    }
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {simulationResult && (
                        <span>{isExpanded ? '▼' : '▶'}</span>
                    )}
                    <span>🔍 Simulation</span>
                    {simulationResult && (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                color: simulationResult.success ? '#22c55e' : '#ef4444',
                            }}
                        >
                            {simulationResult.success ? <PassedIcon /> : <FailedIcon />}
                            <span style={{ fontSize: 9 }}>
                                {simulationResult.success ? 'Would succeed' : 'Would fail'}
                            </span>
                        </span>
                    )}
                </span>

                {!simulationResult && (
                    <button
                        onClick={e => {
                            e.stopPropagation();
                            onSimulate();
                        }}
                        disabled={isSimulating}
                        style={{
                            padding: '4px 8px',
                            fontSize: 9,
                            backgroundColor: isSimulating ? 'rgba(255, 255, 255, 0.05)' : 'rgba(59, 130, 246, 0.2)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: 4,
                            color: isSimulating ? 'rgba(255, 255, 255, 0.5)' : '#3b82f6',
                            cursor: isSimulating ? 'not-allowed' : 'pointer',
                            fontWeight: 500,
                        }}
                    >
                        {isSimulating ? 'Simulating...' : 'Simulate'}
                    </button>
                )}
            </div>

            {/* Expanded Content */}
            {isExpanded && simulationResult && (
                <div style={{ marginTop: 8, padding: 12, backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: 6 }}>
                    {/* Compute Units */}
                    {simulationResult.computeUnitsConsumed !== null && (
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 9, opacity: 0.6, marginBottom: 4 }}>
                                Compute Units
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            height: 8,
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: 4,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <div
                                            style={{
                                                height: '100%',
                                                width: `${Math.min((simulationResult.computeUnitsConsumed / 1_400_000) * 100, 100)}%`,
                                                backgroundColor:
                                                    simulationResult.computeUnitsConsumed > 1_120_000
                                                        ? '#ef4444'
                                                        : simulationResult.computeUnitsConsumed > 700_000
                                                          ? '#f59e0b'
                                                          : '#22c55e',
                                                transition: 'all 0.3s ease',
                                            }}
                                        />
                                    </div>
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'monospace' }}>
                                    {formatComputeUnits(simulationResult.computeUnitsConsumed)}
                                </div>
                            </div>
                            {simulationResult.unitsConsumed && (
                                <div style={{ fontSize: 8, opacity: 0.5, marginTop: 2 }}>
                                    {simulationResult.unitsConsumed.percentOfLimit.toFixed(1)}% of limit
                                </div>
                            )}
                        </div>
                    )}

                    {/* Estimated Fee */}
                    {simulationResult.estimatedFee !== null && (
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 9, opacity: 0.6, marginBottom: 4 }}>
                                Estimated Fee
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'monospace' }}>
                                {formatFee(simulationResult.estimatedFee)}
                            </div>
                        </div>
                    )}

                    {/* Advice/Warnings */}
                    {advice.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            {advice.map((item, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        padding: 8,
                                        marginBottom: 6,
                                        backgroundColor:
                                            item.severity === 'error'
                                                ? 'rgba(239, 68, 68, 0.1)'
                                                : item.severity === 'warning'
                                                  ? 'rgba(245, 158, 11, 0.1)'
                                                  : item.severity === 'success'
                                                    ? 'rgba(34, 197, 94, 0.1)'
                                                    : 'rgba(59, 130, 246, 0.1)',
                                        border: `1px solid ${
                                            item.severity === 'error'
                                                ? 'rgba(239, 68, 68, 0.3)'
                                                : item.severity === 'warning'
                                                  ? 'rgba(245, 158, 11, 0.3)'
                                                  : item.severity === 'success'
                                                    ? 'rgba(34, 197, 94, 0.3)'
                                                    : 'rgba(59, 130, 246, 0.3)'
                                        }`,
                                        borderRadius: 4,
                                        fontSize: 9,
                                    }}
                                >
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.message}</div>
                                    {item.action && (
                                        <div style={{ opacity: 0.8, marginBottom: 4 }}>{item.action}</div>
                                    )}
                                    {item.code && (
                                        <pre
                                            style={{
                                                marginTop: 6,
                                                padding: 6,
                                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                borderRadius: 4,
                                                fontSize: 8,
                                                fontFamily: 'monospace',
                                                overflow: 'auto',
                                                whiteSpace: 'pre-wrap',
                                            }}
                                        >
                                            {item.code}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                            onClick={onSimulate}
                            disabled={isSimulating}
                            style={{
                                padding: '4px 10px',
                                fontSize: 9,
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: 4,
                                color: 'rgba(255, 255, 255, 0.9)',
                                cursor: isSimulating ? 'not-allowed' : 'pointer',
                                fontWeight: 500,
                            }}
                        >
                            {isSimulating ? 'Simulating...' : 'Re-simulate'}
                        </button>

                        {hasALTOption && onSimulateWithALT && (
                            <button
                                onClick={onSimulateWithALT}
                                disabled={isSimulating}
                                style={{
                                    padding: '4px 10px',
                                    fontSize: 9,
                                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    borderRadius: 4,
                                    color: '#22c55e',
                                    cursor: isSimulating ? 'not-allowed' : 'pointer',
                                    fontWeight: 500,
                                }}
                            >
                                Simulate with ALT
                            </button>
                        )}
                    </div>

                    {/* Warnings */}
                    {simulationResult.warnings.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 9, opacity: 0.6, marginBottom: 4 }}>
                                Warnings
                            </div>
                            {simulationResult.warnings.map((warning, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        fontSize: 9,
                                        padding: 6,
                                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                        border: '1px solid rgba(245, 158, 11, 0.2)',
                                        borderRadius: 4,
                                        marginBottom: 4,
                                        color: '#f59e0b',
                                    }}
                                >
                                    ⚠️ {warning}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

