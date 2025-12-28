'use client';

import { motion } from 'motion/react';
import { TransactionStepNode } from './transaction-step-node';
import type { VisualPipeline } from '@/lib/visual-pipeline';
import { springs } from '@/lib/pipeline-animations';

interface BatchGroupProps {
    visualPipeline: VisualPipeline;
    stepNames: string[];
    batchIndex: number;
    getExplorerUrl?: (signature: string) => string;
}

export function BatchGroup({ visualPipeline, stepNames, batchIndex, getExplorerUrl }: BatchGroupProps) {
    // Check if batch is executing
    const isExecuting = stepNames.some(name => {
        const stepState = visualPipeline.getStepState(name);
        return stepState.type === 'building' || stepState.type === 'signing' || stepState.type === 'sending';
    });

    const isCompleted = stepNames.every(name => {
        const stepState = visualPipeline.getStepState(name);
        return stepState.type === 'confirmed';
    });

    return (
        <motion.div
            className="relative border-2 border-dashed border-purple-400 rounded-lg p-4 bg-purple-50/50 backdrop-blur-sm min-w-[225px]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
                opacity: 1,
                scale: 1,
                borderColor: isExecuting
                    ? 'rgba(146, 51, 234, 0.6)' // purple-600
                    : isCompleted
                      ? 'rgba(147, 51, 234, 0.6)' // purple-500
                      : 'rgba(192, 132, 252, 0.6)', // purple-400
            }}
            transition={{ duration: 0.3 }}
            style={{
                boxShadow: isExecuting
                    ? '0 0 24px rgba(147, 51, 234, 0.3)'
                    : isCompleted
                      ? '0 0 16px rgba(147, 51, 234, 0.2)'
                      : 'none',
            }}
        >
            {/* Batch header */}
            <motion.div
                className="absolute -top-3 left-4 bg-purple-100 px-2 py-0.5 rounded text-xs font-mono text-purple-700 border border-purple-300"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                Batch {batchIndex + 1} ({stepNames.length} instructions)
            </motion.div>

            {/* Steps in batch */}
            <div className="flex items-center justify-center gap-4 mt-2">
                {stepNames.map((stepName, index) => {
                    const step = visualPipeline.steps.find(s => s.name === stepName);
                    const stepState = visualPipeline.getStepState(stepName);
                    const isStepCompleted = stepState.type === 'confirmed';

                    return (
                        <motion.div
                            key={stepName}
                            className="flex items-center"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                            }}
                            transition={{
                                delay: index * 0.1,
                                ...springs.default,
                            }}
                        >
                            <TransactionStepNode
                                visualPipeline={visualPipeline}
                                stepName={stepName}
                                stepType={step?.type || 'instruction'}
                                isBatched={true}
                                getExplorerUrl={getExplorerUrl}
                            />
                            {index < stepNames.length - 1 && (
                                <motion.div
                                    className="w-6 h-[2.5px] bg-purple-400 ml-3.5 mt-[-15px] rounded-full"
                                    initial={{ scaleX: 0 }}
                                    animate={{
                                        scaleX: 1,
                                        backgroundColor: isStepCompleted
                                            ? 'rgba(147, 51, 234, 0.8)'
                                            : 'rgb(156, 160, 165)',
                                    }}
                                    transition={{
                                        delay: index * 0.1 + 0.2,
                                        duration: 0.3,
                                    }}
                                />
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Success shimmer effect */}
            {isCompleted && (
                <motion.div
                    className="absolute inset-0 rounded-lg pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: [0, 0.3, 0],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 2,
                    }}
                    style={{
                        background:
                            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                    }}
                />
            )}
        </motion.div>
    );
}
