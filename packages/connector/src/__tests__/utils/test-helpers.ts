/**
 * Test helper utilities
 *
 * Common test utilities and assertions
 */

import { expect } from 'vitest';
import type { ConnectorState } from '../../types/connector';
import type { ConnectorEvent } from '../../types/events';

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
    condition: () => boolean,
    options: {
        timeout?: number;
        interval?: number;
        timeoutMessage?: string;
    } = {},
): Promise<void> {
    const { timeout = 5000, interval = 50, timeoutMessage = 'Condition not met within timeout' } = options;

    const startTime = Date.now();

    while (!condition()) {
        if (Date.now() - startTime > timeout) {
            throw new Error(timeoutMessage);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
}

/**
 * Wait for state to match expected values
 */
export async function waitForState(
    getState: () => ConnectorState,
    expected: Partial<ConnectorState>,
    timeout = 5000,
): Promise<void> {
    await waitForCondition(
        () => {
            const state = getState();
            return Object.entries(expected).every(([key, value]) => {
                const stateKey = key as keyof ConnectorState;
                if (Array.isArray(value)) {
                    return JSON.stringify(state[stateKey]) === JSON.stringify(value);
                }
                return state[stateKey] === value;
            });
        },
        {
            timeout,
            timeoutMessage: `State did not match expected values within ${timeout}ms`,
        },
    );
}

/**
 * Collect events emitted during a test
 */
export function createEventCollector() {
    const events: ConnectorEvent[] = [];

    return {
        collect: (event: ConnectorEvent) => {
            events.push(event);
        },
        getEvents: () => events,
        getEventsByType: (type: string) => events.filter(e => e.type === type),
        clear: () => {
            events.length = 0;
        },
        assertEventEmitted: (type: string) => {
            expect(events.some(e => e.type === type)).toBe(true);
        },
        assertEventNotEmitted: (type: string) => {
            expect(events.some(e => e.type === type)).toBe(false);
        },
        assertEventsInOrder: (types: string[]) => {
            const actualTypes = events.map(e => e.type);
            const relevantTypes = actualTypes.filter(t => types.includes(t));
            expect(relevantTypes).toEqual(types);
        },
    };
}

/**
 * Simulate time passing
 */
export async function advanceTime(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a deferred promise for manual control
 */
export function createDeferred<T>() {
    let resolve: (value: T) => void;
    let reject: (error: Error) => void;

    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return {
        promise,
        resolve: resolve!,
        reject: reject!,
    };
}

/**
 * Assert that an async function throws
 */
export async function expectToThrow(fn: () => Promise<unknown>, expectedError?: string | RegExp): Promise<void> {
    let error: Error | undefined;

    try {
        await fn();
    } catch (e) {
        error = e as Error;
    }

    expect(error).toBeDefined();

    if (expectedError) {
        if (typeof expectedError === 'string') {
            expect(error?.message).toContain(expectedError);
        } else {
            expect(error?.message).toMatch(expectedError);
        }
    }
}

/**
 * Create a spy function that tracks calls
 */
export function createCallTracker<T extends (...args: unknown[]) => unknown>() {
    const calls: Array<{ args: unknown[]; result?: unknown; error?: Error; timestamp: number }> = [];

    const tracker = ((...args: unknown[]) => {
        const call = { args, timestamp: Date.now() };
        calls.push(call);
    }) as T & { getCalls: () => typeof calls; clear: () => void };

    tracker.getCalls = () => calls;
    tracker.clear = () => {
        calls.length = 0;
    };

    return tracker;
}
