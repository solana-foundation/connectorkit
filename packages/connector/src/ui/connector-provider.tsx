'use client';

import React, { createContext, useContext, useMemo, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { ConnectorClient } from '../lib/core/connector-client';
import type { ConnectorConfig } from '../types/connector';
import type { ExtendedConnectorConfig } from '../config/default-config';
import { ConnectorErrorBoundary } from './error-boundary';
import { installPolyfills } from '../lib/utils/polyfills';
import { createLogger } from '../lib/utils/secure-logger';
import type {
    AuthorizationCache,
    ChainSelector,
    SolanaMobileWalletAdapterWallet,
} from '@solana-mobile/wallet-standard-mobile';
import type { IdentifierArray } from '@wallet-standard/base';

/** Configuration for registerMwa - defined locally as the package doesn't export this type */
interface RegisterMwaConfig {
    appIdentity: {
        name: string;
        uri?: string;
        icon?: string;
    };
    authorizationCache: AuthorizationCache;
    chains: IdentifierArray;
    chainSelector: ChainSelector;
    remoteHostAuthority?: string;
    onWalletNotFound: (mobileWalletAdapter: SolanaMobileWalletAdapterWallet) => Promise<void>;
}

const logger = createLogger('ConnectorProvider');

installPolyfills();

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
    chains?: RegisterMwaConfig['chains'];
    authorizationCache?: AuthorizationCache;
    chainSelector?: ChainSelector;
    onWalletNotFound?: (wallet: SolanaMobileWalletAdapterWallet) => Promise<void>;
}

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

    const getClient = React.useCallback(() => {
        if (!clientRef.current) {
            try {
                clientRef.current = new ConnectorClient(config);

                if (typeof window !== 'undefined') {
                    window.__connectorClient = clientRef.current;
                }

                if (config?.debug) {
                    logger.info('Client initialized successfully');
                }
            } catch (error) {
                const err = error as Error;
                logger.error('Failed to initialize client', { error: err });

                const extendedConfig = config as ExtendedConnectorConfig;
                if (extendedConfig?.errorBoundary?.onError) {
                    extendedConfig.errorBoundary.onError(err, {
                        componentStack: 'client-initialization',
                        digest: `constructor-${new Date().toISOString()}`,
                    });
                }

                return null;
            }
        }
        return clientRef.current;
    }, [config]);

    const client = getClient();

    React.useEffect(() => {
        const currentClient = clientRef.current;

        if (currentClient) {
            const privateClient = currentClient as unknown as { initialize?: () => void };
            if (privateClient.initialize && typeof privateClient.initialize === 'function') {
                privateClient.initialize();
            }
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.__connectorClient = undefined;
            }
            if (currentClient && typeof currentClient.destroy === 'function') {
                currentClient.destroy();
            }
        };
    }, []);

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
                } = mod;
                const defaultChains: RegisterMwaConfig['chains'] = [
                    'solana:mainnet',
                    'solana:devnet',
                    'solana:testnet',
                ];

                const mwaConfig: RegisterMwaConfig = {
                    appIdentity: mobile.appIdentity,
                    authorizationCache: mobile.authorizationCache ?? createDefaultAuthorizationCache(),
                    chains: mobile.chains ?? defaultChains,
                    chainSelector: mobile.chainSelector ?? createDefaultChainSelector(),
                    remoteHostAuthority: mobile.remoteHostAuthority,
                    onWalletNotFound: mobile.onWalletNotFound ?? createDefaultWalletNotFoundHandler(),
                };

                registerMwa(mwaConfig);
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

    if (!errorBoundaryConfig?.enabled) {
        return (
            <ConnectorProviderInternal config={config} mobile={mobile}>
                {children}
            </ConnectorProviderInternal>
        );
    }

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

    const state = useSyncExternalStore(
        React.useCallback(cb => client.subscribe(cb), [client]),
        React.useCallback(() => client.getSnapshot(), [client]),
        React.useCallback(() => client.getSnapshot(), [client]),
    );

    const methods = useMemo(
        () => ({
            select: client.select.bind(client),
            disconnect: client.disconnect.bind(client),
            selectAccount: client.selectAccount.bind(client),
        }),
        [client],
    );

    return useMemo(
        () => ({
            ...state,
            ...methods,
        }),
        [state, methods],
    );
}

export function useConnectorClient(): ConnectorClient | null {
    return useContext(ConnectorContext);
}
