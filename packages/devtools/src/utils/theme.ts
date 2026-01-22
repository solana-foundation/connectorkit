/**
 * Theme utilities for resolving system preference
 */

import type { DevtoolsTheme } from '../types';

/**
 * Get the system preferred color scheme
 */
export function getSystemTheme(): 'dark' | 'light' {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resolve a theme setting to an actual theme value
 */
export function resolveTheme(theme: DevtoolsTheme): 'dark' | 'light' {
    if (theme === 'system') {
        return getSystemTheme();
    }
    return theme;
}

/**
 * Subscribe to system theme changes
 */
export function subscribeToSystemTheme(callback: (theme: 'dark' | 'light') => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
        callback(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
}
