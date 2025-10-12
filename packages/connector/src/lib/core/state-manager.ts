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

            // Array comparison (wallets, accounts, clusters)
            if (Array.isArray(value) && Array.isArray(currentValue)) {
                if (!this.arraysEqual(value as readonly unknown[], currentValue as readonly unknown[])) {
                    (nextState as Record<string, unknown>)[stateKey] = value;
                    hasChanges = true;
                }
            }
            // Object comparison (wallet, cluster)
            else if (value && typeof value === 'object' && currentValue && typeof currentValue === 'object') {
                if (!this.objectsEqual(value, currentValue)) {
                    (nextState as Record<string, unknown>)[stateKey] = value;
                    hasChanges = true;
                }
            }
            // Primitive comparison (strings, booleans, numbers)
            else if (currentValue !== value) {
                (nextState as Record<string, unknown>)[stateKey] = value;
                hasChanges = true;
            }
        }

        // Only update state and notify if there are actual changes
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

        // For wallet arrays, perform shallow object comparison
        if (a[0] && typeof a[0] === 'object' && 'name' in a[0] && b[0] && typeof b[0] === 'object' && 'name' in b[0]) {
            return a.every((item, i) => {
                const aItem = item as Record<string, unknown>;
                const bItem = b[i] as Record<string, unknown> | undefined;

                // Both items must be objects
                if (!bItem || typeof bItem !== 'object') return false;

                // Get all own enumerable keys from both objects
                const keysA = Object.keys(aItem);
                const keysB = Object.keys(bItem);

                // Different number of keys means different objects
                if (keysA.length !== keysB.length) return false;

                // Compare all key-value pairs (shallow comparison)
                return keysA.every(key => aItem[key] === bItem[key]);
            });
        }

        // For account arrays, compare by address
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

        // Fallback to reference equality
        return a === b;
    }

    /**
     * Deep equality check for objects
     * Used to prevent unnecessary state updates when object contents haven't changed
     */
    private objectsEqual(a: unknown, b: unknown): boolean {
        // Reference equality (fast path)
        if (a === b) return true;

        // Null/undefined checks
        if (!a || !b) return false;
        if (typeof a !== 'object' || typeof b !== 'object') return false;

        // Get keys
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        // Different number of keys
        if (keysA.length !== keysB.length) return false;

        // Compare each key's value (shallow comparison for nested objects)
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
        // Debounce notifications to reduce React re-renders
        if (this.notifyTimeout) {
            clearTimeout(this.notifyTimeout);
        }

        this.notifyTimeout = setTimeout(() => {
            this.listeners.forEach(l => l(this.state));
            this.notifyTimeout = undefined;
        }, 16); // One frame delay - smooth but responsive
    }

    private notifyImmediate(): void {
        // For critical updates that need immediate notification
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
