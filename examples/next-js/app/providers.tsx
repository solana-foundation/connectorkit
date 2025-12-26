'use client';

import { useMemo } from 'react';
import { AppProvider } from '@solana/connector/react';
// import { ConnectorDebugPanel } from '@solana/connector-debugger/react';
import { getDefaultConfig, getDefaultMobileConfig } from '@solana/connector/headless';
import type { ReactNode } from 'react';

// Get origin synchronously on client, fallback for SSR
const getOrigin = () => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return 'http://localhost:3000';
};

export function Providers({ children }: { children: ReactNode }) {
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

        return getDefaultConfig({
            appName: 'ConnectorKit Example',
            appUrl: origin,
            autoConnect: true,
            enableMobile: true,
            clusters,
        });
    }, []);

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
