/**
 * Abort / timeout helpers.
 */

/**
 * Creates a timeout signal with a browser compatibility fallback.
 *
 * - Uses `AbortSignal.timeout` when available.
 * - Falls back to a local `AbortController` + `setTimeout` when not.
 */
export function createTimeoutSignal(ms: number): { signal: AbortSignal; cleanup: () => void } {
    if (typeof AbortSignal.timeout === 'function') {
        return { signal: AbortSignal.timeout(ms), cleanup: () => {} };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ms);

    return {
        signal: controller.signal,
        cleanup: () => clearTimeout(timeoutId),
    };
}
