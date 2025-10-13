'use client';

import React, { createContext, useContext, useMemo, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { ConnectorClient } from '../lib/core/connector-client';
import type { ConnectorConfig } from '../types/connector';
import type { ExtendedConnectorConfig } from '../config/default-config';
import { ConnectorErrorBoundary } from './error-boundary';
import { installPolyfills } from '../lib/utils/polyfills';

// Install browser compatibility polyfills immediately when module loads
// This ensures crypto operations work across all browser environments
installPolyfills();

// Global connector client declaration for auto-detection
declare global {
    interface Window {
        __connectorClient?: ConnectorClient;
    }
}

export type ConnectorSnapshot = ReturnType<ConnectorClient['getSnapshot']> & {
    select: (walletName: string) => Promise<void>;
    disconnect: () => Promise<void>;
    selectAccount: (address: string) => Promise<void>;
};

export const ConnectorContext = createContext<ConnectorClient | null>(null);
ConnectorContext.displayName = 'ConnectorContext';

export interface MobileWalletAdapterConfig {
    appIdentity: {
        name: string;
        uri?: string;
        icon?: string;
    };
    remoteHostAuthority?: string;
    chains?: readonly string[];
    authorizationCache?: unknown;
    chainSelector?: unknown;
    onWalletNotFound?: (wallet: unknown) => Promise<void>;
}

// Internal provider without error boundary
function ConnectorProviderInternal({
    children,
    config,
    mobile,
}: {
    children: ReactNode;
    config?: ConnectorConfig;
    mobile?: MobileWalletAdapterConfig;
}) {
    const clientRef = useRef<ConnectorClient | null>(null);

    // Lazy initialization - only create client once on first render
    // This prevents double-initialization in React 19 strict mode
    const getClient = React.useCallback(() => {
        if (!clientRef.current) {
            try {
                clientRef.current = new ConnectorClient(config);

                // ✅ Set window.__connectorClient IMMEDIATELY for auto-detection
                if (typeof window !== 'undefined') {
                    window.__connectorClient = clientRef.current;
                }

                // Log successful initialization in debug mode
                if (config?.debug) {
                    console.log('[Connector] ✓ Client initialized successfully');
                }
            } catch (error) {
                const err = error as Error;
                console.error('[Connector] ✗ Failed to initialize client:', err);

                // Call config error handler if provided
                const extendedConfig = config as ExtendedConnectorConfig;
                if (extendedConfig?.errorBoundary?.onError) {
                    extendedConfig.errorBoundary.onError(err, {
                        componentStack: 'client-initialization',
                        digest: `constructor-${new Date().toISOString()}`,
                    });
                }

                // Return null to allow graceful degradation
                // Components can check for null client and show fallback UI
                return null;
            }
        }
        return clientRef.current;
    }, [config]);

    // Get client reference (memoized)
    const client = getClient();

    // On client mount, ensure wallet detection runs (run only once)
    React.useEffect(() => {
        const currentClient = clientRef.current;

        if (currentClient) {
            // Force re-initialization if client was created during SSR
            // This ensures wallets are detected even if client was created before window existed
            const privateClient = currentClient as unknown as { initialize?: () => void };
            if (privateClient.initialize && typeof privateClient.initialize === 'function') {
                privateClient.initialize();
            }
        }

        return () => {
            // Cleanup global reference and client on unmount
            if (typeof window !== 'undefined') {
                window.__connectorClient = undefined;
            }
            if (currentClient && typeof currentClient.destroy === 'function') {
                currentClient.destroy();
            }
        };
    }, []); // Empty dependency array - run only once

    // Optionally register Mobile Wallet Adapter on the client
    React.useEffect(() => {
        if (!mobile) return;
        let cancelled = false;
        (async () => {
            try {
                const mod = (await import(
                    '@solana-mobile/wallet-standard-mobile'
                )) as typeof import('@solana-mobile/wallet-standard-mobile');
                if (cancelled) return;
                const {
                    registerMwa,
                    createDefaultAuthorizationCache,
                    createDefaultChainSelector,
                    createDefaultWalletNotFoundHandler,
                    MWA_SOLANA_CHAINS,
                } = mod;
                registerMwa({
                    appIdentity: mobile.appIdentity,
                    authorizationCache: mobile.authorizationCache ?? createDefaultAuthorizationCache(),
                    chains: (mobile.chains ?? MWA_SOLANA_CHAINS) as readonly string[],
                    chainSelector: mobile.chainSelector ?? createDefaultChainSelector(),
                    remoteHostAuthority: mobile.remoteHostAuthority,
                    onWalletNotFound: mobile.onWalletNotFound ?? createDefaultWalletNotFoundHandler(),
                });
            } catch (e) {
                // Failed to register Mobile Wallet Adapter
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [mobile]);

    return <ConnectorContext.Provider value={client}>{children}</ConnectorContext.Provider>;
}

// Enhanced provider with optional error boundary
export function ConnectorProvider({
    children,
    config,
    mobile,
}: {
    children: ReactNode;
    config?: ExtendedConnectorConfig;
    mobile?: MobileWalletAdapterConfig;
}) {
    const extendedConfig = config as ExtendedConnectorConfig;
    const errorBoundaryConfig = extendedConfig?.errorBoundary;

    // If error boundary is disabled, use internal provider directly
    if (!errorBoundaryConfig?.enabled) {
        return (
            <ConnectorProviderInternal config={config} mobile={mobile}>
                {children}
            </ConnectorProviderInternal>
        );
    }

    // Wrap with error boundary for enhanced error handling
    return (
        <ConnectorErrorBoundary
            maxRetries={errorBoundaryConfig.maxRetries ?? 3}
            onError={errorBoundaryConfig.onError}
            fallback={errorBoundaryConfig.fallback}
        >
            <ConnectorProviderInternal config={config} mobile={mobile}>
                {children}
            </ConnectorProviderInternal>
        </ConnectorErrorBoundary>
    );
}

export function useConnector(): ConnectorSnapshot {
    const client = useContext(ConnectorContext);
    if (!client) {
        throw new Error(
            'useConnector must be used within ConnectorProvider. ' +
                'Wrap your app with <ConnectorProvider> or <UnifiedProvider> to use connector hooks.',
        );
    }

    // Subscribe to state changes
    const state = useSyncExternalStore(
        React.useCallback(cb => client.subscribe(cb), [client]),
        React.useCallback(() => client.getSnapshot(), [client]),
        React.useCallback(() => client.getSnapshot(), [client]),
    );

    // Stable method references that don't change when state changes
    // These are bound once and reused across renders
    const methods = useMemo(
        () => ({
            select: client.select.bind(client),
            disconnect: client.disconnect.bind(client),
            selectAccount: client.selectAccount.bind(client),
        }),
        [client],
    );

    // Optimized: Only create new object when state actually changes
    return useMemo(
        () => ({
            ...state,
            ...methods,
        }),
        [state, methods],
    );
}

/**
 * Get the connector client instance
 * Returns null if not within ConnectorProvider or if initialization failed
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const client = useConnectorClient()
 *
 *   if (!client) {
 *     return <div>Connector not available</div>
 *   }
 *
 *   // Use client methods directly
 *   const health = client.getHealth()
 * }
 * ```
 */
export function useConnectorClient(): ConnectorClient | null {
    return useContext(ConnectorContext);
}
