'use client';

import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useMemo, useState } from 'react';
import type { VisualPipeline } from '@/lib/visual-pipeline';
import { usePipelineState } from '@/lib/use-visual-pipeline';
import { RotateCcw } from 'lucide-react';
import { IconPlayFill } from 'symbols-react';
import { IconSparkle } from './icons/sparkle';

interface PipelineHeaderButtonProps {
    visualPipeline: VisualPipeline;
    disabled?: boolean;
    onExecute: () => Promise<void>;
}

function PipelineHeaderButtonComponent({ visualPipeline, disabled = false, onExecute }: PipelineHeaderButtonProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const pipelineState = usePipelineState(visualPipeline);

    const isExecuting = pipelineState === 'executing';
    const isCompleted = pipelineState === 'completed';
    const isFailed = pipelineState === 'failed';
    const canReset = isCompleted || isFailed;
    const isDisabled = disabled || isExecuting;

    const handleAction = useCallback(() => {
        if (isDisabled) return;

        if (canReset) {
            visualPipeline.reset();
            return;
        }

        void onExecute();
    }, [canReset, isDisabled, onExecute, visualPipeline]);

    const background = useMemo(() => {
        if (isDisabled && !isExecuting) return 'rgb(156, 163, 175)'; // gray-400
        if (isExecuting) return 'rgb(192, 132, 252)'; // purple-400
        if (isCompleted) return 'rgb(34, 197, 94)'; // green-500
        if (isFailed) return 'rgb(239, 68, 68)'; // red-500
        return 'oklch(0.442 0.0111 34.3)'; // sand-1200
    }, [isCompleted, isDisabled, isExecuting, isFailed]);

    const glow = useMemo(() => {
        if (isExecuting) return 'rgba(192, 132, 252, 0.5)';
        if (isCompleted) return 'rgba(34, 197, 94, 0.5)';
        if (isFailed) return 'rgba(239, 68, 68, 0.5)';
        return 'rgba(107, 114, 128, 0.5)';
    }, [isCompleted, isExecuting, isFailed]);

    const icon = () => {
        // Don't show hover icons when executing
        if (isHovered && !isExecuting) {
            if (canReset) {
                return (
                    <motion.div
                        key="reset"
                        initial={{ scale: 0, rotate: -180, filter: 'blur(10px)' }}
                        animate={{ scale: 1, rotate: 0, filter: 'blur(0px)' }}
                        exit={{ scale: 0, rotate: 180, filter: 'blur(10px)' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                        <RotateCcw className="h-4 w-4" />
                    </motion.div>
                );
            }

            return (
                <motion.div
                    key="play"
                    initial={{ scale: 0, rotate: -180, filter: 'blur(10px)' }}
                    animate={{ scale: 1, rotate: 0, filter: 'blur(0px)' }}
                    exit={{ scale: 0, rotate: 180, filter: 'blur(10px)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                    <IconPlayFill className="fill-white" width={14} height={14} />
                </motion.div>
            );
        }

        return (
            <motion.div
                key="sparkle"
                initial={{ scale: 0, filter: 'blur(10px)' }}
                animate={
                    isExecuting
                        ? { rotate: 360, scale: 1, filter: 'blur(0px)' }
                        : { rotate: 0, scale: 1, filter: 'blur(0px)' }
                }
                exit={{ scale: 0, filter: 'blur(10px)' }}
                transition={
                    isExecuting
                        ? {
                              rotate: { duration: 1, repeat: Infinity, ease: 'circInOut' },
                              scale: { type: 'spring', stiffness: 300, damping: 20 },
                              filter: { type: 'spring', stiffness: 300, damping: 20 },
                          }
                        : { type: 'spring', stiffness: 300, damping: 20 }
                }
            >
                <IconSparkle className="fill-white" width={16} height={16} />
            </motion.div>
        );
    };

    return (
        <motion.div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={() => !isDisabled && setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onClick={handleAction}
            className={isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
            whileHover={!isDisabled ? { scale: 1.05 } : {}}
            whileTap={!isDisabled ? { scale: 0.95 } : {}}
        >
            <motion.div
                animate={{
                    scale: isPressed ? 0.95 : 1,
                    background,
                }}
                transition={{
                    scale: { type: 'spring', stiffness: 300, damping: 20 },
                    background: { duration: 0.2, ease: 'easeInOut' },
                }}
                className="w-8 h-8 rounded-md flex items-center justify-center text-white relative overflow-hidden shadow-lg"
            >
                <AnimatePresence mode="popLayout">{icon()}</AnimatePresence>

                {isExecuting && (
                    <motion.div
                        className="absolute -inset-0.5 -z-10"
                        style={{
                            background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
                        }}
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                )}
            </motion.div>
        </motion.div>
    );
}

export const PipelineHeaderButton = memo(PipelineHeaderButtonComponent);
