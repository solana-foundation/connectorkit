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
import { getBase64Decoder } from '@solana/kit';
import {
    type ConnectorDevtoolsInit,
    type ConnectorDevtoolsConfig,
    type ConnectorDevtoolsPlugin,
    type PluginContext,
    type DevtoolsCacheV1,
    type DevtoolsCacheClearScope,
    type DevtoolsInflightTransaction,
    type DevtoolsPersistedState,
    DEFAULT_CONFIG,
} from './types';
import {
    clearPersistedCache,
    loadPersistedCache,
    loadPersistedSettings,
    loadPersistedState,
    savePersistedCache,
    savePersistedState,
} from './utils/storage';
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
    #cache: DevtoolsCacheV1;
    #cacheSubscribers = new Set<() => void>();
    #unsubscribeClientEvents?: () => void;

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

        // Load persisted devtools cache (events/transactions history)
        const persistedCache = loadPersistedCache(this.#config.persistSessionId);
        this.#cache = this.#hydrateCache(persistedCache);

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

    #createDefaultCache(): DevtoolsCacheV1 {
        return {
            v: 1,
            sessionId: this.#config.persistSessionId ?? null,
            updatedAt: Date.now(),
            events: {
                expandedEventId: null,
                isPaused: false,
                items: [],
                nextId: 1,
                selectedType: null,
            },
            transactions: {
                inflight: [],
                items: [],
            },
        };
    }

    #hydrateCache(persisted?: DevtoolsCacheV1): DevtoolsCacheV1 {
        const base = this.#createDefaultCache();
        if (!persisted) return base;

        return {
            ...base,
            ...persisted,
            // Always scope to the current session id
            sessionId: this.#config.persistSessionId ?? null,
            events: {
                ...base.events,
                ...(persisted.events ?? {}),
                items: persisted.events?.items ?? base.events.items,
            },
            transactions: {
                ...base.transactions,
                ...(persisted.transactions ?? {}),
                items: persisted.transactions?.items ?? base.transactions.items,
                inflight: persisted.transactions?.inflight ?? base.transactions.inflight,
            },
        };
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
            getCache: () => this.#cache,
            subscribeCache: (callback: () => void) => {
                this.#cacheSubscribers.add(callback);
                return () => this.#cacheSubscribers.delete(callback);
            },
            updateCache: updater => this.#updateCache(updater),
            clearCache: scope => this.#clearCache(scope),
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

    #notifyCacheSubscribers(): void {
        this.#cacheSubscribers.forEach(cb => cb());
    }

    #persistCache(): void {
        savePersistedCache(this.#cache);
    }

    #updateCache(updater: (cache: DevtoolsCacheV1) => DevtoolsCacheV1): void {
        const next = updater(this.#cache);
        this.#cache = {
            ...next,
            sessionId: this.#config.persistSessionId ?? null,
            updatedAt: Date.now(),
        };
        this.#persistCache();
        this.#notifyCacheSubscribers();
    }

    #clearCache(scope: DevtoolsCacheClearScope = 'all'): void {
        const base = this.#createDefaultCache();

        if (scope === 'all') {
            this.#cache = base;
            clearPersistedCache();
            this.#notifyCacheSubscribers();
            return;
        }

        if (scope === 'events') {
            this.#updateCache(cache => ({ ...cache, events: base.events }));
            return;
        }

        this.#updateCache(cache => ({ ...cache, transactions: base.transactions }));
    }

    #subscribeToClientEvents(client: ConnectorClient): void {
        // Replace any previous subscription
        this.#unsubscribeClientEvents?.();

        const base64Decoder = getBase64Decoder();
        const maxInflight = 10;

        function findLatestInflightIndex(inflight: DevtoolsInflightTransaction[]): number {
            for (let i = inflight.length - 1; i >= 0; i--) {
                if (!inflight[i].signature) return i;
            }
            return -1;
        }

        this.#unsubscribeClientEvents = client.on(event => {
            switch (event.type) {
                case 'transaction:preparing': {
                    const inflightTx: DevtoolsInflightTransaction = {
                        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                        stage: 'preparing',
                        timestamp: event.timestamp,
                        size: event.size,
                        transactionBase64: base64Decoder.decode(event.transaction),
                    };

                    this.#updateCache(cache => {
                        const nextInflight = [...cache.transactions.inflight, inflightTx].slice(-maxInflight);
                        return {
                            ...cache,
                            transactions: { ...cache.transactions, inflight: nextInflight },
                        };
                    });
                    break;
                }

                case 'transaction:signing': {
                    this.#updateCache(cache => {
                        const inflight = cache.transactions.inflight.slice();
                        const idx = findLatestInflightIndex(inflight);
                        if (idx === -1) return cache;
                        inflight[idx] = { ...inflight[idx], stage: 'signing' };
                        return { ...cache, transactions: { ...cache.transactions, inflight } };
                    });
                    break;
                }

                case 'transaction:sent': {
                    const signatureStr = String(event.signature);

                    // Attach signature to the most recent inflight entry, if any.
                    let matchedInflight: DevtoolsInflightTransaction | undefined;
                    this.#updateCache(cache => {
                        const inflight = cache.transactions.inflight.slice();
                        const idx = findLatestInflightIndex(inflight);
                        if (idx !== -1) {
                            inflight[idx] = { ...inflight[idx], stage: 'sent', signature: signatureStr };
                            matchedInflight = inflight[idx];
                        } else {
                            // Some send paths (e.g. wallet-adapter style sendTransaction) do not emit
                            // `transaction:preparing`. Still create an inflight entry so the UI can show
                            // that a transaction was just sent (even if wire bytes are unavailable).
                            const placeholder: DevtoolsInflightTransaction = {
                                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                stage: 'sent',
                                timestamp: event.timestamp,
                                size: 0,
                                transactionBase64: '',
                                signature: signatureStr,
                            };
                            inflight.push(placeholder);
                            matchedInflight = placeholder;
                        }

                        // Also upsert into persisted transaction history so it survives reloads.
                        const existingIdx = cache.transactions.items.findIndex(tx => tx.signature === signatureStr);
                        const nextItem = {
                            signature: signatureStr,
                            timestamp: event.timestamp,
                            status: 'pending' as const,
                            ...(matchedInflight?.size ? { size: matchedInflight.size } : {}),
                            ...(matchedInflight?.transactionBase64
                                ? { wireTransactionBase64: matchedInflight.transactionBase64 }
                                : {}),
                        };

                        const nextItems =
                            existingIdx === -1
                                ? [nextItem, ...cache.transactions.items]
                                : cache.transactions.items.map((tx, i) => (i === existingIdx ? { ...tx, ...nextItem } : tx));

                        return {
                            ...cache,
                            transactions: { ...cache.transactions, inflight: inflight.slice(-maxInflight), items: nextItems },
                        };
                    });

                    // Ensure the connector tracks this transaction even if the Transactions tab is not open.
                    const alreadyTracked = client
                        .getDebugState()
                        .transactions?.some(tx => String(tx.signature) === signatureStr);

                    if (!alreadyTracked) {
                        client.trackTransaction({
                            signature: event.signature,
                            status: 'pending',
                            method: 'signAndSendTransaction',
                            ...(matchedInflight?.size ? { metadata: { size: matchedInflight.size } } : {}),
                        });
                    }
                    break;
                }

                case 'transaction:tracked': {
                    const signatureStr = String(event.signature);
                    this.#updateCache(cache => {
                        const existingIdx = cache.transactions.items.findIndex(tx => tx.signature === signatureStr);
                        const nextItem = {
                            signature: signatureStr,
                            timestamp: event.timestamp,
                            status: event.status,
                        };
                        const nextItems =
                            existingIdx === -1
                                ? [nextItem, ...cache.transactions.items]
                                : cache.transactions.items.map((tx, i) => (i === existingIdx ? { ...tx, ...nextItem } : tx));

                        const inflight = cache.transactions.inflight.slice();

                        // Fallback for apps that manually call `client.trackTransaction(...)` (common in Kit flows).
                        // If we don't already have an inflight entry for this signature, create one so the UI can
                        // show it while it's pending.
                        const hasInflightForSig = inflight.some(ix => ix.signature === signatureStr);
                        if (!hasInflightForSig && event.status === 'pending') {
                            inflight.push({
                                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                stage: 'sent',
                                timestamp: event.timestamp,
                                size: 0,
                                transactionBase64: '',
                                signature: signatureStr,
                            });
                        }

                        return {
                            ...cache,
                            transactions: { ...cache.transactions, inflight: inflight.slice(-maxInflight), items: nextItems },
                        };
                    });
                    break;
                }

                case 'transaction:updated': {
                    const signatureStr = String(event.signature);
                    this.#updateCache(cache => {
                        const existingIdx = cache.transactions.items.findIndex(tx => tx.signature === signatureStr);
                        if (existingIdx === -1) return cache;
                        const nextItems = cache.transactions.items.map((tx, i) =>
                            i === existingIdx ? { ...tx, status: event.status } : tx,
                        );
                        return { ...cache, transactions: { ...cache.transactions, items: nextItems } };
                    });
                    break;
                }

                default:
                    break;
            }
        });
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

        // Subscribe to connector events globally so we can track inflight txs even if the tab isn't open.
        this.#subscribeToClientEvents(client);

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

        // Cleanup client event subscription
        this.#unsubscribeClientEvents?.();
        this.#unsubscribeClientEvents = undefined;

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
