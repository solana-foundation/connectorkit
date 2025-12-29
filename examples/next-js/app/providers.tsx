'use client';

import { useMemo, useCallback } from 'react';
import { AppProvider } from '@solana/connector/react';
// import { ConnectorDebugPanel } from '@solana/connector-debugger/react';
import { getDefaultConfig, getDefaultMobileConfig } from '@solana/connector/headless';
import type { ReactNode } from 'react';
import { WalletConnectProvider, useWalletConnectUri } from '@/lib/walletconnect-context';

// Get origin synchronously on client, fallback for SSR
const getOrigin = () => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return 'http://localhost:3000';
};

function ProvidersInner({ children }: { children: ReactNode }) {
    const { setUri, clearUri } = useWalletConnectUri();

    // Memoized callbacks for WalletConnect events
    const onDisplayUri = useCallback(
        (uri: string) => {
            setUri(uri);
        },
        [setUri],
    );

    const onSessionEstablished = useCallback(() => {
        clearUri();
    }, [clearUri]);

    const onSessionDisconnected = useCallback(() => {
        clearUri();
    }, [clearUri]);

    const connectorConfig = useMemo(() => {
        const origin = getOrigin();

        // Use RPC proxy to keep API keys server-side
        const rpcProxyUrl = `${origin}/api/rpc`;

        const clusters = [
            {
                id: 'solana:mainnet' as const,
                label: 'Mainnet',
                name: 'mainnet-beta' as const,
                url: rpcProxyUrl,
            },
            {
                id: 'solana:devnet' as const,
                label: 'Devnet',
                name: 'devnet' as const,
                url: 'https://api.devnet.solana.com',
            },
            {
                id: 'solana:testnet' as const,
                label: 'Testnet',
                name: 'testnet' as const,
                url: 'https://api.testnet.solana.com',
            },
        ];

        // WalletConnect configuration (optional)
        // To enable:
        // 1. Install: pnpm add @walletconnect/universal-provider
        // 2. Get a project ID from https://cloud.walletconnect.com/
        // 3. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env.local
        const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
        
        // Dynamic cluster callback - reads current cluster from storage
        const getCurrentChain = (): 'solana:mainnet' | 'solana:devnet' | 'solana:testnet' => {
            if (typeof window === 'undefined') return 'solana:mainnet';
            try {
                const stored = localStorage.getItem('connector-kit:v1:cluster');
                if (stored) {
                    const clusterId = JSON.parse(stored) as string;
                    if (clusterId === 'solana:mainnet' || clusterId === 'solana:devnet' || clusterId === 'solana:testnet') {
                        return clusterId;
                    }
                }
            } catch {
                // Ignore parse errors
            }
            return 'solana:mainnet'; // Default fallback
        };
        
        const walletConnectConfig = walletConnectProjectId
            ? {
                  enabled: true,
                  projectId: walletConnectProjectId,
                  metadata: {
                      name: 'ConnectorKit Example',
                      description: 'ConnectorKit Example Application',
                      url: origin,
                      icons: [`${origin}/icon.svg`],
                  },
                  // Dynamic chain based on current cluster selection
                  getCurrentChain,
                  defaultChain: 'solana:mainnet' as const, // Fallback only
                  onDisplayUri,
                  onSessionEstablished,
                  onSessionDisconnected,
              }
            : undefined;

        return getDefaultConfig({
            appName: 'ConnectorKit Example',
            appUrl: origin,
            autoConnect: true,
            enableMobile: true,
            clusters,
            walletConnect: walletConnectConfig,
        });
    }, [onDisplayUri, onSessionEstablished, onSessionDisconnected]);

    const mobile = useMemo(
        () =>
            getDefaultMobileConfig({
                appName: 'ConnectorKit Example',
                appUrl: getOrigin(),
            }),
        [],
    );

    return (
        <AppProvider connectorConfig={connectorConfig} mobile={mobile}>
            {children}
            {/* Debug panel - only visible in development */}
            {/* {process.env.NODE_ENV === 'development' && <ConnectorDebugPanel />} */}
        </AppProvider>
    );
}

export function Providers({ children }: { children: ReactNode }) {
    return (
        <WalletConnectProvider>
            <ProvidersInner>{children}</ProvidersInner>
        </WalletConnectProvider>
    );
}
