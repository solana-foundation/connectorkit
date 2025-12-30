'use client';

import React, { createContext, useContext, useMemo, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { ConnectorClient } from '../lib/core/connector-client';
import type { ConnectorConfig } from '../types/connector';
import type { ExtendedConnectorConfig } from '../config/default-config';
import { ConnectorErrorBoundary } from './error-boundary';
import { useWalletConnectUri } from './walletconnect-context';
import { installPolyfills } from '../lib/utils/polyfills';
import { createLogger } from '../lib/utils/secure-logger';
import type { MobileWalletAdapterConfig, RegisterMwaConfig } from '../types/mobile';
import type {
    WalletConnectorId,
    WalletConnectorMetadata,
    ConnectOptions,
    WalletStatus,
    SessionAccount,
} from '../types/session';
import type { Address } from '@solana/addresses';

// Re-export for backwards compatibility
export type { MobileWalletAdapterConfig };

const logger = createLogger('ConnectorProvider');

installPolyfills();

declare global {
    interface Window {
        __connectorClient?: ConnectorClient;
    }
}

export type ConnectorSnapshot = ReturnType<ConnectorClient['getSnapshot']> & {
    // ========================================================================
    // Legacy Actions (kept for backwards compatibility)
    // ========================================================================
    /** @deprecated Use `connectWallet(connectorId)` instead */
    select: (walletName: string) => Promise<void>;
    /** @deprecated Use `disconnectWallet()` instead */
    disconnect: () => Promise<void>;
    selectAccount: (address: string) => Promise<void>;

    // ========================================================================
    // WalletConnect URI
    // ========================================================================
    /** WalletConnect URI for QR code display (null when not connecting via WalletConnect) */
    walletConnectUri: string | null;
    /** Clear the WalletConnect URI (call when modal closes or connection completes) */
    clearWalletConnectUri: () => void;

    // ========================================================================
    // vNext Actions
    // ========================================================================
    /** Connect to a wallet by connector ID (vNext) */
    connectWallet: (connectorId: WalletConnectorId, options?: ConnectOptions) => Promise<void>;
    /** Disconnect the current wallet session (vNext) */
    disconnectWallet: () => Promise<void>;

    // ========================================================================
    // vNext Derived Fields (from wallet status state machine)
    // ========================================================================
    /** Full wallet status object (discriminated union) */
    walletStatus: WalletStatus;
    /** Whether a wallet is connected */
    isConnected: boolean;
    /** Whether a wallet connection is in progress */
    isConnecting: boolean;
    /** Whether an error occurred */
    isError: boolean;
    /** Error object if status is 'error', otherwise null */
    walletError: Error | null;
    /** Currently selected account address (null if not connected) */
    account: Address | null;
    /** All available accounts in the session (empty if not connected) */
    sessionAccounts: SessionAccount[];
    /** Connected connector ID (null if not connected) */
    connectorId: WalletConnectorId | null;
    /** Resolved connector metadata for the connected wallet (null if not connected) */
    connector: WalletConnectorMetadata | null;
};

export const ConnectorContext = createContext<ConnectorClient | null>(null);
ConnectorContext.displayName = 'ConnectorContext';

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

    // Get WalletConnect URI from context (gracefully returns null if not in WalletConnect flow)
    const { uri: walletConnectUri, clearUri: clearWalletConnectUri } = useWalletConnectUri();

    const state = useSyncExternalStore(
        React.useCallback(cb => client.subscribe(cb), [client]),
        React.useCallback(() => client.getSnapshot(), [client]),
        React.useCallback(() => client.getSnapshot(), [client]),
    );

    // Legacy + vNext actions
    const methods = useMemo(
        () => ({
            // Legacy (kept for backwards compatibility)
            select: client.select.bind(client),
            disconnect: client.disconnect.bind(client),
            selectAccount: client.selectAccount.bind(client),
            // vNext
            connectWallet: client.connectWallet.bind(client),
            disconnectWallet: client.disconnectWallet.bind(client),
        }),
        [client],
    );

    // Derive vNext convenience fields from wallet status state machine
    const vNextFields = useMemo(() => {
        const walletStatus = state.wallet;
        const isConnected = walletStatus.status === 'connected';
        const isConnecting = walletStatus.status === 'connecting';
        const isError = walletStatus.status === 'error';

        let connectorId: WalletConnectorId | null = null;
        let account: Address | null = null;
        let sessionAccounts: SessionAccount[] = [];
        let walletError: Error | null = null;

        if (walletStatus.status === 'connected') {
            connectorId = walletStatus.connectorId;
            account = walletStatus.selectedAccount.address;
            sessionAccounts = walletStatus.accounts;
        } else if (walletStatus.status === 'connecting') {
            connectorId = walletStatus.connectorId;
        } else if (walletStatus.status === 'error') {
            walletError = walletStatus.error;
            connectorId = walletStatus.connectorId ?? null;
        }

        // Resolve connector metadata from connectors array
        const connector = connectorId
            ? state.connectors.find(c => c.id === connectorId) ?? null
            : null;

        return {
            walletStatus,
            isConnected,
            isConnecting,
            isError,
            walletError,
            account,
            sessionAccounts,
            connectorId,
            connector,
        };
    }, [state.wallet, state.connectors]);

    return useMemo(
        () => ({
            ...state,
            ...methods,
            ...vNextFields,
            walletConnectUri,
            clearWalletConnectUri,
        }),
        [state, methods, vNextFields, walletConnectUri, clearWalletConnectUri],
    );
}

export function useConnectorClient(): ConnectorClient | null {
    return useContext(ConnectorContext);
}
