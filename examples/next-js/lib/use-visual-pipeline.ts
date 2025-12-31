'use client';

import { useSyncExternalStore } from 'react';
import type { StepState, VisualPipeline } from './visual-pipeline';

export function useStepState(visualPipeline: VisualPipeline, stepName: string): StepState {
    return useSyncExternalStore(
        listener => visualPipeline.subscribe(listener),
        () => visualPipeline.getStepState(stepName),
        () => visualPipeline.getStepState(stepName),
    );
}

export function usePipelineState(visualPipeline: VisualPipeline): VisualPipeline['state'] {
    return useSyncExternalStore(
        listener => visualPipeline.subscribe(listener),
        () => visualPipeline.state,
        () => visualPipeline.state,
    );
}

export function usePipelineMetrics(visualPipeline: VisualPipeline) {
    return useSyncExternalStore(
        listener => visualPipeline.subscribe(listener),
        () => ({
            duration: visualPipeline.getExecutionDuration(),
        }),
        () => ({
            duration: visualPipeline.getExecutionDuration(),
        }),
    );
}
