/**
 * Core types for the connector devtools
 */

import type { ConnectorClient } from '@solana/connector/headless';

/**
 * Position of the devtools trigger button
 */
export type DevtoolsPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

/**
 * Color theme for the devtools
 */
export type DevtoolsTheme = 'dark' | 'light' | 'system';

/**
 * Configuration options for the devtools
 */
export interface ConnectorDevtoolsConfig {
    /** Position of the trigger button */
    position: DevtoolsPosition;
    /** Color theme */
    theme: DevtoolsTheme;
    /** Start with panel open */
    defaultOpen: boolean;
    /** Panel height in pixels */
    panelHeight: number;
    /** Hide the trigger button */
    triggerHidden: boolean;
    /** Maximum events to keep in memory */
    maxEvents: number;
    /** Maximum transactions to track */
    maxTransactions: number;
    /** RPC URL for display (useful when using a proxy) */
    rpcUrl?: string;
    /**
     * Optional session/build id for scoping persisted devtools cache.
     * If this value changes between page loads, the cached history is discarded.
     */
    persistSessionId?: string;
}

/**
 * Persisted state in localStorage
 */
export interface DevtoolsPersistedState {
    isOpen: boolean;
    activeTab: string;
    position: DevtoolsPosition;
    panelHeight: number;
}

export type DevtoolsCacheClearScope = 'all' | 'events' | 'transactions';

export interface DevtoolsStoredEvent {
    id: number;
    type: string;
    timestamp: string;
    data: Record<string, unknown>;
}

export interface DevtoolsTrackedTransaction {
    signature: string;
    timestamp: string;
    status: 'pending' | 'confirmed' | 'failed';
    method?: string;
    cluster?: string;
    error?: string;
    slot?: number;
    confirmations?: number | null;
}

export interface DevtoolsEventsCache {
    nextId: number;
    isPaused: boolean;
    selectedType: string | null;
    expandedEventId: number | null;
    items: DevtoolsStoredEvent[];
}

export interface DevtoolsTransactionsCache {
    items: DevtoolsTrackedTransaction[];
}

export interface DevtoolsCacheV1 {
    v: 1;
    sessionId: string | null;
    updatedAt: number;
    events: DevtoolsEventsCache;
    transactions: DevtoolsTransactionsCache;
}

/**
 * Context passed to plugin render functions
 */
export interface PluginContext {
    /** The ConnectorClient instance */
    client: ConnectorClient;
    /** Current effective theme (resolved from 'system') */
    theme: 'dark' | 'light';
    /** Subscribe to state changes - returns unsubscribe function */
    subscribe: (callback: () => void) => () => void;
    /** Get the current config */
    getConfig: () => ConnectorDevtoolsConfig;
    /** Get current in-memory devtools cache (persisted across reloads) */
    getCache?: () => DevtoolsCacheV1;
    /** Subscribe to cache changes - returns unsubscribe function */
    subscribeCache?: (callback: () => void) => () => void;
    /** Update cache atomically (useful for persisting UI prefs) */
    updateCache?: (updater: (cache: DevtoolsCacheV1) => DevtoolsCacheV1) => void;
    /** Clear cached history (and persisted storage) */
    clearCache?: (scope?: DevtoolsCacheClearScope) => void;
}

/**
 * Plugin definition for extending devtools
 */
export interface ConnectorDevtoolsPlugin {
    /** Unique plugin identifier */
    id: string;
    /** Display name for the tab */
    name: string;
    /** Icon (optional, rendered as innerHTML) */
    icon?: string;
    /** Whether this plugin should be active by default */
    defaultOpen?: boolean;
    /** Render function called when tab is activated */
    render: (el: HTMLElement, ctx: PluginContext) => void;
    /** Cleanup function called when unmounting or switching away */
    destroy?: () => void;
}

/**
 * Initialization options for ConnectorDevtools
 */
export interface ConnectorDevtoolsInit {
    /** ConnectorClient instance (auto-detected from window.__connectorClient if not provided) */
    client?: ConnectorClient;
    /** Initial configuration (merged with defaults) */
    config?: Partial<ConnectorDevtoolsConfig>;
    /** Additional plugins (in addition to built-in ones) */
    plugins?: ConnectorDevtoolsPlugin[];
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: ConnectorDevtoolsConfig = {
    position: 'bottom-right',
    theme: 'dark',
    defaultOpen: false,
    panelHeight: 400,
    triggerHidden: false,
    maxEvents: 100,
    maxTransactions: 50,
};

/**
 * localStorage keys for persisted state
 */
export const STORAGE_KEYS = {
    STATE: 'connector-devtools-state',
    SETTINGS: 'connector-devtools-settings',
    CACHE: 'connector-devtools-cache',
} as const;
