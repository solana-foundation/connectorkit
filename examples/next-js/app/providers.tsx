'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { AppProvider, getDefaultConfig, getDefaultMobileConfig } from '@solana/connector/react';
import { createRemoteSignerWallet } from '@solana/connector/remote';

// Get origin synchronously on client, fallback for SSR
const getOrigin = () => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return 'http://localhost:3000';
};

// Enable remote signer via environment variable (set NEXT_PUBLIC_ENABLE_REMOTE_SIGNER=true)
// For testing, default to true if not explicitly set to 'false'
const ENABLE_REMOTE_SIGNER = process.env.NEXT_PUBLIC_ENABLE_REMOTE_SIGNER !== 'false';

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

        // Create remote signer wallet if enabled
        // This wallet delegates signing to the /api/connector-signer endpoint
        const additionalWallets = ENABLE_REMOTE_SIGNER
            ? [
                  createRemoteSignerWallet({
                      endpoint: `${origin}/api/connector-signer`,
                      name: 'Privy',
                      // Optional: provide auth headers for the signing API
                      // getAuthHeaders: () => ({
                      //     'Authorization': `Bearer ${getSessionToken()}`
                      // }),
                  }),
              ]
            : undefined;

        return getDefaultConfig({
            appName: 'ConnectorKit Example',
            appUrl: origin,
            autoConnect: true,
            enableMobile: true,
            clusters,
            additionalWallets,
            // WalletConnect: just set to true!
            // Project ID is auto-read from NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
            // Metadata is auto-generated from appName/appUrl
            // Callbacks are auto-wired by AppProvider
            walletConnect: true,
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
        </AppProvider>
    );
}
