'use client';

import type { ReactNode, ComponentType, PropsWithChildren } from 'react';
import { useMemo } from 'react';
import { ConnectorProvider } from './connector-provider';
import { WalletConnectProvider, useWalletConnectUri } from './walletconnect-context';
import type { MobileWalletAdapterConfig } from './connector-provider';
import type { ConnectorConfig } from '../types/connector';

export interface AppProviderProps {
    children: ReactNode;

    /** ConnectorKit configuration */
    connectorConfig?: ConnectorConfig;

    /** Mobile Wallet Adapter configuration */
    mobile?: MobileWalletAdapterConfig;

    /** Optional additional providers to wrap around children */
    providers?: Array<{
        component: ComponentType<PropsWithChildren>;
        props?: Record<string, unknown>;
    }>;
}

/**
 * Internal component that auto-wires WalletConnect callbacks
 * This must be inside WalletConnectProvider to use the context
 */
function AppProviderInner({ children, connectorConfig, mobile, providers = [] }: AppProviderProps) {
    const { setUri, clearUri } = useWalletConnectUri();

    // Auto-wire WalletConnect callbacks if WalletConnect is enabled
    const enhancedConfig = useMemo(() => {
        if (!connectorConfig?.walletConnect?.enabled) {
            return connectorConfig;
        }

        const wcConfig = connectorConfig.walletConnect;
        return {
            ...connectorConfig,
            walletConnect: {
                ...wcConfig,
                // Auto-wire callbacks - use provided ones or fall back to context-based ones
                onDisplayUri: wcConfig.onDisplayUri ?? setUri,
                onSessionEstablished: wcConfig.onSessionEstablished ?? clearUri,
                onSessionDisconnected: wcConfig.onSessionDisconnected ?? clearUri,
            },
        };
    }, [connectorConfig, setUri, clearUri]);

    // Start with connector provider as the base
    let content = (
        <ConnectorProvider config={enhancedConfig} mobile={mobile}>
            {children}
        </ConnectorProvider>
    );

    // Wrap with additional providers in reverse order
    // so they nest properly (first provider is outermost)
    for (let i = providers.length - 1; i >= 0; i--) {
        const { component: Provider, props = {} } = providers[i];
        content = <Provider {...props}>{content}</Provider>;
    }

    return content;
}

/**
 * Main application provider for ConnectorKit
 * 
 * Automatically sets up:
 * - Wallet connection management
 * - WalletConnect URI state (when enabled)
 * - Mobile Wallet Adapter (when configured)
 * - Error boundaries (when configured)
 * 
 * @example
 * ```tsx
 * import { AppProvider, getDefaultConfig } from '@solana/connector/react';
 * 
 * const config = getDefaultConfig({
 *   appName: 'My App',
 *   walletConnect: true, // Auto-detects project ID from env
 * });
 * 
 * export function Providers({ children }) {
 *   return (
 *     <AppProvider connectorConfig={config}>
 *       {children}
 *     </AppProvider>
 *   );
 * }
 * ```
 */
export function AppProvider(props: AppProviderProps) {
    const hasWalletConnect = props.connectorConfig?.walletConnect?.enabled;

    // Only wrap with WalletConnectProvider if WalletConnect is enabled
    // This avoids unnecessary context overhead when not using WalletConnect
    if (hasWalletConnect) {
        return (
            <WalletConnectProvider>
                <AppProviderInner {...props} />
            </WalletConnectProvider>
        );
    }

    return <AppProviderInner {...props} />;
}

/** @deprecated Use `AppProvider` instead */
export const UnifiedProvider = AppProvider;

/** @deprecated Use `AppProviderProps` instead */
export type UnifiedProviderProps = AppProviderProps;
