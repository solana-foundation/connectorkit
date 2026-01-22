/**
 * localStorage utilities for persisting devtools state
 */

import {
    STORAGE_KEYS,
    type DevtoolsCacheV1,
    type DevtoolsPersistedState,
    type ConnectorDevtoolsConfig,
} from '../types';

/**
 * Safely get item from localStorage
 */
export function getStorageItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

/**
 * Safely set item in localStorage
 */
export function setStorageItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, value);
    } catch {
        // localStorage might be unavailable or full
    }
}

/**
 * Safely remove item from localStorage
 */
export function removeStorageItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(key);
    } catch {
        // ignore
    }
}

/**
 * Parse JSON safely, returning undefined on failure
 */
export function tryParseJson<T>(value: string | null): T | undefined {
    if (!value) return undefined;
    try {
        return JSON.parse(value) as T;
    } catch {
        return undefined;
    }
}

/**
 * Load persisted state from localStorage
 */
export function loadPersistedState(): Partial<DevtoolsPersistedState> | undefined {
    const raw = getStorageItem(STORAGE_KEYS.STATE);
    return tryParseJson<DevtoolsPersistedState>(raw);
}

/**
 * Save persisted state to localStorage
 */
export function savePersistedState(state: DevtoolsPersistedState): void {
    setStorageItem(STORAGE_KEYS.STATE, JSON.stringify(state));
}

/**
 * Load persisted settings from localStorage
 */
export function loadPersistedSettings(): Partial<ConnectorDevtoolsConfig> | undefined {
    const raw = getStorageItem(STORAGE_KEYS.SETTINGS);
    return tryParseJson<ConnectorDevtoolsConfig>(raw);
}

/**
 * Save persisted settings to localStorage
 */
export function savePersistedSettings(settings: Partial<ConnectorDevtoolsConfig>): void {
    setStorageItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

/**
 * Convert arbitrary values to JSON-safe data.
 * Useful for persisting Connector events that may include Errors, Uint8Arrays, etc.
 */
export function toJsonSafe(value: unknown, options?: { maxDepth?: number; bytesPreviewMax?: number }): unknown {
    const maxDepth = options?.maxDepth ?? 6;
    const bytesPreviewMax = options?.bytesPreviewMax ?? 64;
    const seen = new WeakSet<object>();

    function toHex(bytes: Uint8Array): string {
        const len = Math.min(bytes.length, bytesPreviewMax);
        let out = '';
        for (let i = 0; i < len; i++) {
            out += bytes[i].toString(16).padStart(2, '0');
        }
        return out;
    }

    function inner(v: unknown, depth: number): unknown {
        if (v === null) return null;
        const t = typeof v;
        if (t === 'string' || t === 'number' || t === 'boolean') return v;
        if (t === 'bigint') return v?.toString();
        if (t === 'symbol') return String(v);
        if (t === 'function') return `[Function${(v as Function).name ? `: ${(v as Function).name}` : ''}]`;
        if (t === 'undefined') return undefined;

        if (v instanceof Date) return v.toISOString();

        if (v instanceof Error) {
            return {
                name: v.name,
                message: v.message,
                stack: v.stack,
            };
        }

        if (v instanceof ArrayBuffer) {
            const bytes = new Uint8Array(v);
            return { byteLength: bytes.byteLength, previewHex: toHex(bytes) };
        }

        if (ArrayBuffer.isView(v)) {
            const view = v as ArrayBufferView;
            const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
            return { byteLength: bytes.byteLength, previewHex: toHex(bytes) };
        }

        if (depth >= maxDepth) return '[MaxDepth]';

        if (Array.isArray(v)) return v.map(item => inner(item, depth + 1));

        if (v && typeof v === 'object') {
            if (seen.has(v)) return '[Circular]';
            seen.add(v);

            if (v instanceof Map) {
                return Array.from(v.entries()).map(([k, val]) => [inner(k, depth + 1), inner(val, depth + 1)]);
            }

            if (v instanceof Set) return Array.from(v.values()).map(val => inner(val, depth + 1));

            const out: Record<string, unknown> = {};
            for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
                out[k] = inner(val, depth + 1);
            }
            return out;
        }

        return String(v);
    }

    return inner(value, 0);
}

/**
 * Load persisted devtools cache from localStorage.
 * If a session id is provided and it differs from the stored one, the cache is cleared.
 */
export function loadPersistedCache(sessionId?: string): DevtoolsCacheV1 | undefined {
    const raw = getStorageItem(STORAGE_KEYS.CACHE);
    const parsed = tryParseJson<DevtoolsCacheV1>(raw);
    if (!parsed || parsed.v !== 1) return undefined;

    const storedSessionId = parsed.sessionId ?? null;
    if (sessionId !== undefined && storedSessionId !== sessionId) {
        removeStorageItem(STORAGE_KEYS.CACHE);
        return undefined;
    }

    return parsed;
}

/**
 * Save persisted devtools cache to localStorage.
 */
export function savePersistedCache(cache: DevtoolsCacheV1): void {
    setStorageItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
}

/**
 * Clear persisted devtools cache from localStorage.
 */
export function clearPersistedCache(): void {
    removeStorageItem(STORAGE_KEYS.CACHE);
}
