/**
 * @solana/connector-debugger - Size Badge Component
 *
 * Visual indicator for transaction size with color coding
 */

'use client';

import type { TransactionSizeAnalysis } from '../utils/transaction-analyzer';

interface SizeBadgeProps {
    analysis: TransactionSizeAnalysis;
    showPercentage?: boolean;
    compact?: boolean;
}

/**
 * Transaction size badge with color-coded visual indicator
 *
 * @param props - Component props
 */
export function SizeBadge({ analysis, showPercentage = false, compact = false }: SizeBadgeProps) {
    const { sizeInBytes, percentOfLimit, category, icon, color } = analysis;

    if (compact) {
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 9,
                    fontWeight: 500,
                    color,
                }}
                title={`${sizeInBytes} bytes (${percentOfLimit.toFixed(1)}% of limit)`}
            >
                <span>{icon}</span>
                <span>{sizeInBytes}b</span>
            </span>
        );
    }

    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                backgroundColor: `${color}15`,
                border: `1px solid ${color}40`,
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 500,
            }}
        >
            <span style={{ fontSize: 12 }}>{icon}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ color, fontFamily: 'monospace' }}>{sizeInBytes} bytes</span>
                {showPercentage && (
                    <span style={{ opacity: 0.7, fontSize: 8 }}>{percentOfLimit.toFixed(1)}% of limit</span>
                )}
            </div>
        </div>
    );
}

/**
 * Inline size indicator (minimal version)
 */
export function SizeIndicator({ analysis }: { analysis: TransactionSizeAnalysis }) {
    const { icon, color } = analysis;

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 11,
                color,
            }}
            title={analysis.statusMessage}
        >
            {icon}
        </span>
    );
}
