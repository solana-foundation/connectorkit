/**
 * @connector-kit/debugger - Progress Indicator Component
 * 
 * Visual progress indicator for transaction lifecycle
 */

'use client';

import type { LiveTransactionStatus } from '../types/live-transaction';

interface ProgressIndicatorProps {
    status: LiveTransactionStatus;
}

/**
 * Progress steps for transaction lifecycle
 */
const STEPS: Array<{ status: LiveTransactionStatus; label: string }> = [
    { status: 'preparing', label: 'Prepare' },
    { status: 'simulating', label: 'Simulate' },
    { status: 'signing', label: 'Sign' },
    { status: 'sending', label: 'Send' },
    { status: 'confirmed', label: 'Confirm' },
];

/**
 * Get step index for current status
 */
function getStepIndex(status: LiveTransactionStatus): number {
    if (status === 'failed') return -1;
    if (status === 'simulated') return 2; // Between simulating and signing
    if (status === 'confirming') return 4; // Same as sending essentially
    
    const index = STEPS.findIndex(step => step.status === status);
    return index >= 0 ? index : 0;
}

/**
 * Visual progress indicator showing transaction lifecycle
 */
export function ProgressIndicator({ status }: ProgressIndicatorProps) {
    const currentStep = getStepIndex(status);
    const isFailed = status === 'failed';

    if (isFailed) {
        return (
            <div
                style={{
                    padding: 8,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 6,
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#ef4444',
                    textAlign: 'center',
                }}
            >
                ❌ Transaction Failed
            </div>
        );
    }

    return (
        <div style={{ padding: '8px 0' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                }}
            >
                {/* Progress Line */}
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: 0,
                        right: 0,
                        height: 2,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        transform: 'translateY(-50%)',
                        zIndex: 0,
                    }}
                >
                    <div
                        style={{
                            height: '100%',
                            width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
                            backgroundColor: '#3b82f6',
                            transition: 'width 0.3s ease',
                        }}
                    />
                </div>

                {/* Steps */}
                {STEPS.map((step, index) => {
                    const isComplete = index < currentStep;
                    const isCurrent = index === currentStep;
                    const isPending = index > currentStep;

                    return (
                        <div
                            key={step.status}
                            style={{
                                position: 'relative',
                                zIndex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                flex: 1,
                            }}
                        >
                            {/* Step Circle */}
                            <div
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    backgroundColor: isComplete
                                        ? '#22c55e'
                                        : isCurrent
                                          ? '#3b82f6'
                                          : 'rgba(255, 255, 255, 0.1)',
                                    border: `2px solid ${
                                        isComplete
                                            ? '#22c55e'
                                            : isCurrent
                                              ? '#3b82f6'
                                              : 'rgba(255, 255, 255, 0.2)'
                                    }`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: isComplete || isCurrent ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {isComplete ? '✓' : isPending ? '' : ''}
                                {isCurrent && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            border: '2px solid #3b82f6',
                                            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                                        }}
                                    />
                                )}
                            </div>

                            {/* Step Label */}
                            <div
                                style={{
                                    fontSize: 8,
                                    marginTop: 4,
                                    fontWeight: isCurrent ? 600 : 400,
                                    color: isComplete || isCurrent ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {step.label}
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>
                {`
                    @keyframes ping {
                        75%, 100% {
                            transform: scale(1.5);
                            opacity: 0;
                        }
                    }
                `}
            </style>
        </div>
    );
}

