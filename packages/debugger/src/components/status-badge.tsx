/**
 * @solana/connector-debugger - Status Badge Component
 *
 * Animated status indicators for transaction lifecycle
 */

'use client';

import type { LiveTransactionStatus } from '../types/live-transaction';

interface StatusBadgeProps {
    status: LiveTransactionStatus;
    size?: 'small' | 'medium' | 'large';
}

/**
 * Get status display info
 */
function getStatusInfo(status: LiveTransactionStatus) {
    switch (status) {
        case 'preparing':
            return {
                label: 'Preparing',
                color: '#3b82f6',
                icon: '⚙️',
                animated: true,
            };
        case 'simulating':
            return {
                label: 'Simulating',
                color: '#8b5cf6',
                icon: '🔍',
                animated: true,
            };
        case 'simulated':
            return {
                label: 'Ready',
                color: '#3b82f6',
                icon: '✓',
                animated: false,
            };
        case 'signing':
            return {
                label: 'Signing',
                color: '#eab308',
                icon: '✍️',
                animated: true,
            };
        case 'sending':
            return {
                label: 'Sending',
                color: '#f59e0b',
                icon: '📤',
                animated: true,
            };
        case 'confirming':
            return {
                label: 'Confirming',
                color: '#f59e0b',
                icon: '⏳',
                animated: true,
            };
        case 'confirmed':
            return {
                label: 'Confirmed',
                color: '#22c55e',
                icon: '✅',
                animated: false,
            };
        case 'failed':
            return {
                label: 'Failed',
                color: '#ef4444',
                icon: '❌',
                animated: false,
            };
    }
}

/**
 * Animated status badge for live transactions
 */
export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
    const info = getStatusInfo(status);

    const sizeMap = {
        small: { fontSize: 9, padding: '2px 6px', iconSize: 11 },
        medium: { fontSize: 10, padding: '4px 8px', iconSize: 14 },
        large: { fontSize: 11, padding: '6px 10px', iconSize: 16 },
    };

    const dimensions = sizeMap[size];

    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: dimensions.padding,
                backgroundColor: `${info.color}15`,
                border: `1px solid ${info.color}40`,
                borderRadius: 6,
                fontSize: dimensions.fontSize,
                fontWeight: 600,
                color: info.color,
                position: 'relative',
            }}
        >
            <span style={{ fontSize: dimensions.iconSize }}>{info.icon}</span>
            <span>{info.label}</span>

            {/* Pulsing animation for active states */}
            {info.animated && (
                <>
                    <span
                        style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: info.color,
                        }}
                    />
                    <span
                        style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: info.color,
                            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                        }}
                    />
                    <style>
                        {`
                            @keyframes ping {
                                75%, 100% {
                                    transform: scale(2);
                                    opacity: 0;
                                }
                            }
                        `}
                    </style>
                </>
            )}
        </div>
    );
}

/**
 * Minimal status dot indicator
 */
export function StatusDot({ status }: { status: LiveTransactionStatus }) {
    const info = getStatusInfo(status);

    return (
        <span
            style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 8,
                height: 8,
            }}
            title={info.label}
        >
            <span
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: info.color,
                }}
            />
            {info.animated && (
                <span
                    style={{
                        position: 'absolute',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: info.color,
                        animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                    }}
                />
            )}
        </span>
    );
}
