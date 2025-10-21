/**
 * @solana/connector-debugger - ALT Suggestion Card Component
 *
 * Displays optimization suggestions for Address Lookup Tables
 */

'use client';

import { useState } from 'react';
import type { ALTSavingsAnalysis } from '../utils/alt-optimizer';
import { getRatingColor, getRatingDescription } from '../utils/alt-optimizer';
import { CodeSnippet } from './code-snippet';
import { generateQuickALTCode, generateALTExplanation } from '../utils/code-generator';

interface ALTSuggestionCardProps {
    analysis: ALTSavingsAnalysis;
    onGenerateCode?: () => void;
}

/**
 * Card displaying ALT optimization suggestion
 */
export function ALTSuggestionCard({ analysis, onGenerateCode }: ALTSuggestionCardProps) {
    const [showCode, setShowCode] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);

    if (!analysis.worthOptimizing) {
        return null;
    }

    const ratingColor = getRatingColor(analysis.rating);
    const ratingDescription = getRatingDescription(analysis.rating);

    return (
        <div
            style={{
                border: `1px solid ${ratingColor}40`,
                borderRadius: 8,
                padding: 12,
                backgroundColor: `${ratingColor}08`,
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                }}
            >
                <span style={{ fontSize: 16 }}>💡</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Optimization Available</div>
                    <div style={{ fontSize: 9, opacity: 0.7 }}>{ratingDescription}</div>
                </div>
            </div>

            {/* Savings Info */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    marginBottom: 12,
                    padding: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: 6,
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: 8,
                            opacity: 0.6,
                            marginBottom: 2,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                        }}
                    >
                        Current Size
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>
                        {analysis.currentSize} bytes
                    </div>
                </div>
                <div>
                    <div
                        style={{
                            fontSize: 8,
                            opacity: 0.6,
                            marginBottom: 2,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                        }}
                    >
                        With ALT
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: ratingColor }}>
                        {analysis.potentialSize} bytes
                    </div>
                </div>
                <div>
                    <div
                        style={{
                            fontSize: 8,
                            opacity: 0.6,
                            marginBottom: 2,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                        }}
                    >
                        Bytes Saved
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: '#22c55e' }}>
                        -{analysis.bytesSaved}
                    </div>
                </div>
                <div>
                    <div
                        style={{
                            fontSize: 8,
                            opacity: 0.6,
                            marginBottom: 2,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                        }}
                    >
                        Reduction
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: '#22c55e' }}>
                        {analysis.percentReduction.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Addresses Info */}
            <div
                style={{
                    fontSize: 9,
                    padding: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 4,
                    marginBottom: 8,
                }}
            >
                <div style={{ opacity: 0.7, marginBottom: 4 }}>
                    {analysis.numRepeatedAddresses} addresses can be optimized
                </div>
                <div style={{ opacity: 0.9, fontSize: 8 }}>
                    Compression ratio: <strong>{analysis.compressionRatio.toFixed(2)}:1</strong>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                    onClick={() => setShowCode(!showCode)}
                    style={{
                        flex: 1,
                        padding: '6px 10px',
                        fontSize: 10,
                        fontWeight: 500,
                        backgroundColor: showCode ? ratingColor : 'rgba(255, 255, 255, 0.1)',
                        border: `1px solid ${showCode ? ratingColor : 'rgba(255, 255, 255, 0.2)'}`,
                        borderRadius: 6,
                        color: showCode ? '#000' : 'rgba(255, 255, 255, 0.9)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {showCode ? '✓ Code Shown' : '📋 Show Code'}
                </button>
                <button
                    onClick={() => setShowExplanation(!showExplanation)}
                    style={{
                        flex: 1,
                        padding: '6px 10px',
                        fontSize: 10,
                        fontWeight: 500,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: 6,
                        color: 'rgba(255, 255, 255, 0.9)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {showExplanation ? 'Hide Info' : 'ℹ️ Learn More'}
                </button>
            </div>

            {/* Code Snippet */}
            {showCode && (
                <div style={{ marginTop: 12 }}>
                    <CodeSnippet
                        code={generateQuickALTCode(analysis.recommendedAddresses)}
                        title="Quick ALT Setup"
                        maxHeight={300}
                    />
                </div>
            )}

            {/* Explanation */}
            {showExplanation && (
                <div
                    style={{
                        marginTop: 12,
                        padding: 10,
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: 6,
                        fontSize: 9,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        opacity: 0.9,
                    }}
                >
                    {generateALTExplanation(analysis.bytesSaved, analysis.percentReduction)}
                </div>
            )}
        </div>
    );
}

/**
 * Compact ALT suggestion badge
 */
export function ALTSuggestionBadge({ analysis }: { analysis: ALTSavingsAnalysis }) {
    if (!analysis.worthOptimizing) {
        return null;
    }

    const ratingColor = getRatingColor(analysis.rating);

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px',
                backgroundColor: `${ratingColor}15`,
                border: `1px solid ${ratingColor}40`,
                borderRadius: 4,
                fontSize: 9,
                fontWeight: 500,
                color: ratingColor,
            }}
            title={`Could save ${analysis.bytesSaved} bytes (${analysis.percentReduction.toFixed(1)}% reduction)`}
        >
            <span>💡</span>
            <span>-{analysis.percentReduction.toFixed(0)}%</span>
        </span>
    );
}
