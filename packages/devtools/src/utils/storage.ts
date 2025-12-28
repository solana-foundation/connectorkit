/**
 * localStorage utilities for persisting devtools state
 */

import { STORAGE_KEYS, type DevtoolsPersistedState, type ConnectorDevtoolsConfig } from '../types';

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
