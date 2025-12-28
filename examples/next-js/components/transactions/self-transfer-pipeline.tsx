'use client';

import { useCallback } from 'react';
import { PipelineVisualization } from '@/components/pipeline';
import type { VisualPipeline } from '@/lib/visual-pipeline';
import { usePipelineState } from '@/lib/use-visual-pipeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Play, RotateCcw } from 'lucide-react';

interface SelfTransferPipelineProps {
    title: string;
    description: string;
    visualPipeline: VisualPipeline;
    disabled?: boolean;
    getExplorerUrl?: (signature: string) => string;
    onExecute: () => Promise<void>;
}

export function SelfTransferPipeline({
    title,
    description,
    visualPipeline,
    disabled = false,
    getExplorerUrl,
    onExecute,
}: SelfTransferPipelineProps) {
    const pipelineState = usePipelineState(visualPipeline);
    const isExecuting = pipelineState === 'executing';
    const canReset = pipelineState === 'completed' || pipelineState === 'failed';

    const handleAction = useCallback(() => {
        if (disabled || isExecuting) return;
        if (canReset) {
            visualPipeline.reset();
            return;
        }
        void onExecute();
    }, [canReset, disabled, isExecuting, onExecute, visualPipeline]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
                <Button
                    type="button"
                    onClick={handleAction}
                    disabled={disabled || isExecuting}
                    variant={canReset ? 'secondary' : 'default'}
                >
                    {isExecuting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Running…
                        </>
                    ) : canReset ? (
                        <>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset
                        </>
                    ) : (
                        <>
                            <Play className="mr-2 h-4 w-4" />
                            Run
                        </>
                    )}
                </Button>
            </CardHeader>
            <CardContent>
                <div className="min-h-[220px]">
                    <PipelineVisualization
                        visualPipeline={visualPipeline}
                        strategy="sequential"
                        getExplorerUrl={getExplorerUrl}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
