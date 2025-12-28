/**
 * Lightweight visual pipeline state machine used by the demo UI.
 *
 * This is adapted from Pipeit’s visual pipeline, but implemented locally so the
 * ConnectorKit examples don’t depend on `@pipeit/*` packages.
 */

export type StepState =
    | { type: 'idle' }
    | { type: 'building' }
    | { type: 'signing' }
    | { type: 'sending' }
    | { type: 'confirmed'; signature: string; cost?: number }
    | { type: 'failed'; error: Error };

export interface VisualPipelineStep {
    name: string;
    type: 'instruction' | 'transaction';
}

export class VisualPipeline {
    private stepStates = new Map<string, StepState>();
    private listeners = new Set<() => void>();
    private executionStartTime: number | null = null;
    private executionEndTime: number | null = null;

    state: 'idle' | 'executing' | 'completed' | 'failed' = 'idle';

    constructor(
        public name: string,
        public steps: VisualPipelineStep[],
    ) {
        this.reset();
    }

    getStepState(stepName: string): StepState {
        return this.stepStates.get(stepName) ?? { type: 'idle' };
    }

    setStepState(stepName: string, state: StepState): void {
        this.stepStates.set(stepName, state);
        this.notifyListeners();
    }

    reset(): void {
        this.steps.forEach(step => {
            this.stepStates.set(step.name, { type: 'idle' });
        });
        this.state = 'idle';
        this.executionStartTime = null;
        this.executionEndTime = null;
        this.notifyListeners();
    }

    async execute(executor: () => Promise<void>): Promise<void> {
        // Fresh run
        this.steps.forEach(step => {
            this.stepStates.set(step.name, { type: 'idle' });
        });
        this.state = 'executing';
        this.executionStartTime = Date.now();
        this.executionEndTime = null;
        this.notifyListeners();

        try {
            await executor();
            this.state = 'completed';
            this.executionEndTime = Date.now();
            this.notifyListeners();
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));

            // Mark any in-flight steps as failed for UI consistency
            this.steps.forEach(step => {
                const current = this.getStepState(step.name);
                if (current.type !== 'confirmed' && current.type !== 'failed') {
                    this.stepStates.set(step.name, { type: 'failed', error: err });
                }
            });

            this.state = 'failed';
            this.executionEndTime = Date.now();
            this.notifyListeners();
            throw err;
        }
    }

    getExecutionDuration(): number | null {
        if (this.executionStartTime === null) return null;
        const endTime = this.executionEndTime ?? Date.now();
        return endTime - this.executionStartTime;
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }
}
