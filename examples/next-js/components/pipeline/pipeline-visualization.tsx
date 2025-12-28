'use client';

import { motion } from 'motion/react';
import { useMemo } from 'react';
import { TransactionStepNode } from './transaction-step-node';
import { BatchGroup } from './batch-group';
import type { VisualPipeline } from '@/lib/visual-pipeline';
import { usePipelineState } from '@/lib/use-visual-pipeline';
import { springs } from '@/lib/pipeline-animations';
import { IconArrowRight } from './icons/arrow-right';
import { IconArrowUpRight } from './icons/arrow-up-right';

interface PipelineVisualizationProps {
    visualPipeline: VisualPipeline;
    strategy?: 'auto' | 'batch' | 'sequential';
    getExplorerUrl?: (signature: string) => string;
}

export function PipelineVisualization({
    visualPipeline,
    strategy = 'auto',
    getExplorerUrl,
}: PipelineVisualizationProps) {
    const pipelineState = usePipelineState(visualPipeline);

    // Determine which steps are batched together (for 'auto' and 'batch' strategies)
    const batchGroups = useMemo(() => {
        if (strategy === 'sequential') {
            // No batching in sequential mode
            return [];
        }

        // Group consecutive instruction steps into batches
        const groups: string[][] = [];
        let currentBatch: string[] = [];

        visualPipeline.steps.forEach(step => {
            if (step.type === 'instruction') {
                currentBatch.push(step.name);
            } else {
                // Transaction step breaks the batch
                if (currentBatch.length > 0) {
                    groups.push([...currentBatch]);
                    currentBatch = [];
                }
                // Transaction steps are not batched
            }
        });

        // Add final batch if exists
        if (currentBatch.length > 0) {
            groups.push(currentBatch);
        }

        return groups;
    }, [visualPipeline.steps, strategy]);

    // Build render items (either batch groups or individual steps)
    const renderItems = useMemo(() => {
        const items: Array<
            | { type: 'batch'; stepNames: string[]; batchIndex: number }
            | { type: 'step'; stepName: string; stepType: 'instruction' | 'transaction' }
        > = [];
        const processedSteps = new Set<string>();

        visualPipeline.steps.forEach(step => {
            // Skip if already processed as part of a batch
            if (processedSteps.has(step.name)) return;

            // Check if step is in a batch
            const batchIndex = batchGroups.findIndex(group => group.includes(step.name));
            const isFirstInBatch = batchIndex >= 0 && batchGroups[batchIndex]?.[0] === step.name;

            if (isFirstInBatch && batchIndex >= 0) {
                // Add batch group
                items.push({
                    type: 'batch',
                    stepNames: batchGroups[batchIndex],
                    batchIndex,
                });
                // Mark all steps in batch as processed
                batchGroups[batchIndex].forEach(name => processedSteps.add(name));
            } else {
                // Add individual step
                items.push({
                    type: 'step',
                    stepName: step.name,
                    stepType: step.type,
                });
                processedSteps.add(step.name);
            }
        });

        return items;
    }, [visualPipeline.steps, batchGroups]);

    // Calculate progress (cheap; recompute whenever pipelineState changes)
    const totalSteps = visualPipeline.steps.length;
    const completedSteps = visualPipeline.steps.filter(
        step => visualPipeline.getStepState(step.name).type === 'confirmed',
    ).length;
    const progress = totalSteps > 0 ? completedSteps / totalSteps : 0;

    // Get signature from last completed step
    let signature: string | null = null;
    for (let i = visualPipeline.steps.length - 1; i >= 0; i--) {
        const step = visualPipeline.steps[i];
        const state = step ? visualPipeline.getStepState(step.name) : null;
        if (state?.type === 'confirmed') {
            signature = state.signature;
            break;
        }
    }

    return (
        <div className="w-full h-full flex flex-col items-center justify-center py-12">
            {/* Progress bar */}
            {pipelineState === 'executing' && (
                <motion.div
                    className="mb-6 h-1 bg-muted rounded-full overflow-hidden max-w-md mx-auto w-full"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={springs.default}
                >
                    <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: progress }}
                        style={{
                            transformOrigin: 'left',
                        }}
                        transition={springs.default}
                    />
                </motion.div>
            )}

            <div className="flex flex-col items-center justify-center gap-8 min-w-max px-8">
                <div className="flex flex-row items-center justify-center">
                    {/* Render items */}
                    {renderItems.map((item, index) => {
                        // Check if previous item is completed
                        const prevItem = index > 0 ? renderItems[index - 1] : null;
                        const prevCompleted =
                            prevItem &&
                            (prevItem.type === 'batch'
                                ? prevItem.stepNames.every(name => {
                                      const state = visualPipeline.getStepState(name);
                                      return state.type === 'confirmed';
                                  })
                                : visualPipeline.getStepState(prevItem.stepName).type === 'confirmed');

                        return (
                            <div key={index} className="flex items-center justify-center">
                                {/* Arrow from previous item */}
                                {index > 0 && (
                                    <motion.div
                                        className="mx-4 mt-[-17px] mr-6"
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{
                                            delay: index * 0.1,
                                            ...springs.default,
                                        }}
                                    >
                                        <IconArrowRight
                                            width={30}
                                            height={30}
                                            fill={prevCompleted ? 'rgb(74, 222, 128)' : 'rgb(156, 160, 165)'}
                                            stroke={prevCompleted ? 'rgb(74, 222, 128)' : 'rgb(156, 160, 165)'}
                                        />
                                    </motion.div>
                                )}

                                {/* Render batch group or individual step */}
                                {item.type === 'batch' ? (
                                    <BatchGroup
                                        visualPipeline={visualPipeline}
                                        stepNames={item.stepNames}
                                        batchIndex={item.batchIndex}
                                        getExplorerUrl={getExplorerUrl}
                                    />
                                ) : (
                                    <TransactionStepNode
                                        visualPipeline={visualPipeline}
                                        stepName={item.stepName}
                                        stepType={item.stepType}
                                        isBatched={false}
                                        getExplorerUrl={getExplorerUrl}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Pipeline state indicator */}
                <motion.div
                    className="mt-4 flex items-center gap-2 text-sm text-muted-foreground border border-dashed border-sand-300 p-2 px-4 rounded-lg bg-sand-100"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <span>
                        Status: <span className="font-medium">{pipelineState}</span>
                    </span>
                    {signature && pipelineState === 'completed' && (
                        <a
                            href={
                                getExplorerUrl
                                    ? getExplorerUrl(signature)
                                    : `https://explorer.solana.com/tx/${signature}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-purple-600 hover:text-purple-700 transition-colors"
                        >
                            <span>{signature.slice(0, 8)}...</span>
                            <IconArrowUpRight width={14} height={14} stroke="currentColor" />
                        </a>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
