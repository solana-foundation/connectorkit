'use client';

import { useMemo } from 'react';
import { AppProvider } from '@solana/connector/react';
import { ConnectorDebugPanel } from '@solana/connector-debugger/react';
import { getDefaultConfig, getDefaultMobileConfig } from '@solana/connector/headless';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
    const connectorConfig = useMemo(() => {
        // Get custom RPC URL from environment variable
        const customRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;

        // If custom RPC is provided, create custom cluster configuration
        const clusters = customRpcUrl
            ? [
                  {
                      id: 'solana:mainnet' as const,
                      label: 'Mainnet (Custom RPC)',
                      name: 'mainnet-beta' as const,
                      url: customRpcUrl,
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
              ]
            : undefined;

        return getDefaultConfig({
            appName: 'ConnectorKit Example',
            appUrl: 'http://localhost:3000',
            autoConnect: true,
            enableMobile: true,
            // Pass custom clusters if RPC URL is provided
            clusters,
        });
    }, []);

    const mobile = useMemo(
        () =>
            getDefaultMobileConfig({
                appName: 'ConnectorKit Example',
                appUrl: 'http://localhost:3000',
            }),
        [],
    );

    return (
        <AppProvider connectorConfig={connectorConfig} mobile={mobile}>
            {children}
            {/* Debug panel - only visible in development */}
            {process.env.NODE_ENV === 'development' && <ConnectorDebugPanel />}
        </AppProvider>
    );
}
