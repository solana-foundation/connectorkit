/**
 * ConnectorDevtools - Framework-agnostic devtools for @solana/connector
 *
 * Inspired by TanStack Devtools architecture:
 * - Imperative mount/unmount API
 * - Web Components for framework independence
 * - Plugin-based extensibility
 * - localStorage persistence
 */

import type { ConnectorClient } from '@solana/connector/headless';
import {
    type ConnectorDevtoolsInit,
    type ConnectorDevtoolsConfig,
    type ConnectorDevtoolsPlugin,
    type PluginContext,
    type DevtoolsPersistedState,
    DEFAULT_CONFIG,
} from './types';
import { loadPersistedState, savePersistedState, loadPersistedSettings } from './utils/storage';
import { resolveTheme, subscribeToSystemTheme } from './utils/theme';
import { createDevtoolsElement } from './components/devtools-element';
import { createOverviewPlugin } from './plugins/overview';
import { createEventsPlugin } from './plugins/events';
import { createTransactionsPlugin } from './plugins/transactions';

declare global {
    interface Window {
        __connectorClient?: ConnectorClient;
    }
}

/**
 * Main devtools class with TanStack-style imperative API
 */
export class ConnectorDevtools {
    #client: ConnectorClient | undefined;
    #config: ConnectorDevtoolsConfig;
    #plugins: ConnectorDevtoolsPlugin[];
    #isMounted = false;
    #mountElement: HTMLElement | null = null;
    #devtoolsElement: HTMLElement | null = null;
    #state: DevtoolsPersistedState;
    #unsubscribeTheme?: () => void;
    #stateSubscribers = new Set<() => void>();

    constructor(init: ConnectorDevtoolsInit = {}) {
        // Load persisted settings and merge with provided config
        const persistedSettings = loadPersistedSettings();
        this.#config = {
            ...DEFAULT_CONFIG,
            ...persistedSettings,
            ...init.config,
        };

        // Load persisted state
        const persistedState = loadPersistedState();
        this.#state = {
            isOpen: persistedState?.isOpen ?? this.#config.defaultOpen,
            activeTab: persistedState?.activeTab ?? 'overview',
            position: persistedState?.position ?? this.#config.position,
            panelHeight: persistedState?.panelHeight ?? this.#config.panelHeight,
        };

        // Store client reference if provided, otherwise will auto-detect on mount
        this.#client = init.client;

        // Set up built-in plugins + user plugins
        this.#plugins = [
            createOverviewPlugin(),
            createEventsPlugin(this.#config.maxEvents),
            createTransactionsPlugin(this.#config.maxTransactions),
            ...(init.plugins ?? []),
        ];
    }

    /**
     * Get the ConnectorClient instance (auto-detect if not provided)
     */
    #getClient(): ConnectorClient | undefined {
        if (this.#client) return this.#client;

        // Auto-detect from window.__connectorClient
        if (typeof window !== 'undefined' && window.__connectorClient) {
            this.#client = window.__connectorClient;
            return this.#client;
        }

        return undefined;
    }

    /**
     * Create plugin context for rendering plugins
     */
    #createPluginContext(): PluginContext | null {
        const client = this.#getClient();
        if (!client) return null;

        return {
            client,
            theme: resolveTheme(this.#config.theme),
            subscribe: (callback: () => void) => {
                this.#stateSubscribers.add(callback);
                return () => this.#stateSubscribers.delete(callback);
            },
            getConfig: () => this.#config,
        };
    }

    /**
     * Notify all state subscribers
     */
    #notifySubscribers(): void {
        this.#stateSubscribers.forEach(cb => cb());
    }

    /**
     * Save current state to localStorage
     */
    #persistState(): void {
        savePersistedState(this.#state);
    }

    /**
     * Update state and persist
     */
    #updateState(partial: Partial<DevtoolsPersistedState>): void {
        this.#state = { ...this.#state, ...partial };
        this.#persistState();
        this.#notifySubscribers();
    }

    /**
     * Mount the devtools to a DOM element
     */
    mount(el: HTMLElement): void {
        // SSR guard
        if (typeof window === 'undefined') return;

        if (this.#isMounted) {
            console.warn('[ConnectorDevtools] Already mounted. Call unmount() first.');
            return;
        }

        const client = this.#getClient();
        if (!client) {
            console.warn(
                '[ConnectorDevtools] No ConnectorClient found. ' +
                    'Either pass `client` in the constructor or ensure window.__connectorClient is set.',
            );
            return;
        }

        this.#mountElement = el;

        // Create the devtools web component
        this.#devtoolsElement = createDevtoolsElement({
            config: this.#config,
            state: this.#state,
            plugins: this.#plugins,
            context: this.#createPluginContext()!,
            onStateChange: partial => this.#updateState(partial),
        });

        el.appendChild(this.#devtoolsElement);
        this.#isMounted = true;

        // Subscribe to system theme changes if using 'system' theme
        if (this.#config.theme === 'system') {
            this.#unsubscribeTheme = subscribeToSystemTheme(() => {
                // Re-render with new theme
                this.#notifySubscribers();
            });
        }
    }

    /**
     * Unmount the devtools from the DOM
     */
    unmount(): void {
        if (!this.#isMounted) {
            console.warn('[ConnectorDevtools] Not mounted.');
            return;
        }

        // Cleanup plugins
        this.#plugins.forEach(plugin => plugin.destroy?.());

        // Cleanup theme subscription
        this.#unsubscribeTheme?.();
        this.#unsubscribeTheme = undefined;

        // Cleanup devtools element listeners/subscriptions (Shadow DOM may attach document-level handlers)
        if (this.#devtoolsElement) {
            (this.#devtoolsElement as any).__cdtCleanup?.();
        }

        // Remove from DOM
        if (this.#devtoolsElement && this.#mountElement) {
            this.#mountElement.removeChild(this.#devtoolsElement);
        }

        this.#devtoolsElement = null;
        this.#mountElement = null;
        this.#isMounted = false;
        this.#stateSubscribers.clear();
    }

    /**
     * Update configuration (partial merge)
     */
    setConfig(config: Partial<ConnectorDevtoolsConfig>): void {
        this.#config = { ...this.#config, ...config };
        this.#notifySubscribers();
    }

    /**
     * Check if devtools is currently mounted
     */
    get isMounted(): boolean {
        return this.#isMounted;
    }

    /**
     * Get current configuration
     */
    get config(): ConnectorDevtoolsConfig {
        return { ...this.#config };
    }

    /**
     * Get current state
     */
    get state(): DevtoolsPersistedState {
        return { ...this.#state };
    }
}

// Re-export types
export type { ConnectorDevtoolsInit, ConnectorDevtoolsConfig, ConnectorDevtoolsPlugin, PluginContext };
