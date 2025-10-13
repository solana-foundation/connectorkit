import type { ConnectorState, Listener } from '../../types/connector';

/**
 * StateManager - Handles state updates and notifications with structural sharing
 *
 * Optimizes React re-renders by using deep equality checks for arrays and objects,
 * only updating state when values truly differ.
 */
export class StateManager {
    private state: ConnectorState;
    private listeners = new Set<Listener>();
    private notifyTimeout?: ReturnType<typeof setTimeout>;

    constructor(initialState: ConnectorState) {
        this.state = initialState;
    }

    /**
     * Optimized state update with structural sharing
     * Only updates if values actually changed
     */
    updateState(updates: Partial<ConnectorState>, immediate = false): boolean {
        let hasChanges = false;
        const nextState = { ...this.state };

        for (const [key, value] of Object.entries(updates)) {
            const stateKey = key as keyof ConnectorState & string;
            const currentValue = nextState[stateKey];

            if (Array.isArray(value) && Array.isArray(currentValue)) {
                if (!this.arraysEqual(value as readonly unknown[], currentValue as readonly unknown[])) {
                    (nextState as Record<string, unknown>)[stateKey] = value;
                    hasChanges = true;
                }
            }
            else if (value && typeof value === 'object' && currentValue && typeof currentValue === 'object') {
                if (!this.objectsEqual(value, currentValue)) {
                    (nextState as Record<string, unknown>)[stateKey] = value;
                    hasChanges = true;
                }
            }
            else if (currentValue !== value) {
                (nextState as Record<string, unknown>)[stateKey] = value;
                hasChanges = true;
            }
        }

        if (hasChanges) {
            this.state = nextState;

            if (immediate) {
                this.notifyImmediate();
            } else {
                this.notify();
            }
        }

        return hasChanges;
    }

    /**
     * Fast array equality check for wallet/account arrays
     */
    private arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
        if (a.length !== b.length) return false;

        if (a[0] && typeof a[0] === 'object' && 'name' in a[0] && b[0] && typeof b[0] === 'object' && 'name' in b[0]) {
            return a.every((item, i) => {
                const aItem = item as Record<string, unknown>;
                const bItem = b[i] as Record<string, unknown> | undefined;

                if (!bItem || typeof bItem !== 'object') return false;

                const keysA = Object.keys(aItem);
                const keysB = Object.keys(bItem);

                if (keysA.length !== keysB.length) return false;

                return keysA.every(key => aItem[key] === bItem[key]);
            });
        }

        if (
            a[0] &&
            typeof a[0] === 'object' &&
            'address' in a[0] &&
            b[0] &&
            typeof b[0] === 'object' &&
            'address' in b[0]
        ) {
            return a.every((item, i) => {
                const aItem = item as { address: string };
                const bItem = b[i] as { address: string };
                return aItem.address === bItem?.address;
            });
        }

        return a === b;
    }

    /**
     * Deep equality check for objects
     * Used to prevent unnecessary state updates when object contents haven't changed
     */
    private objectsEqual(a: unknown, b: unknown): boolean {
        if (a === b) return true;

        if (!a || !b) return false;
        if (typeof a !== 'object' || typeof b !== 'object') return false;

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) return false;

        return keysA.every(key => (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key]);
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getSnapshot(): ConnectorState {
        return this.state;
    }

    private notify(): void {
        if (this.notifyTimeout) {
            clearTimeout(this.notifyTimeout);
        }

        this.notifyTimeout = setTimeout(() => {
            this.listeners.forEach(l => l(this.state));
            this.notifyTimeout = undefined;
        }, 16);
    }

    private notifyImmediate(): void {
        if (this.notifyTimeout) {
            clearTimeout(this.notifyTimeout);
            this.notifyTimeout = undefined;
        }
        this.listeners.forEach(l => l(this.state));
    }

    clear(): void {
        this.listeners.clear();
    }
}
