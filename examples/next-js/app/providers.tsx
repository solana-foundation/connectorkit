'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { AppProvider, getDefaultConfig, getDefaultMobileConfig } from '@solana/connector/react';
import { createRemoteSignerWallet } from '@solana/connector/remote';
import { registerBurnerWallet } from '@/lib/burner-wallet';

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

// The burner wallet keeps its throwaway key in plaintext localStorage and can sign on
// mainnet, so it stays out of production connect modals unless a deployment opts in.
const ENABLE_BURNER_WALLET =
    process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_BURNER_WALLET === 'true';

let remoteSignerWallet: ReturnType<typeof createRemoteSignerWallet> | undefined;

/**
 * The remote signer wallet is registered with wallet-standard by whichever
 * ConnectorClient receives it, and the registry keys wallets by object
 * identity. A module-level singleton — like `registerBurnerWallet` uses —
 * keeps a remount from registering a second wallet under the same name, which
 * would surface as two connectors sharing one id.
 */
function getRemoteSignerWallet(origin: string) {
    remoteSignerWallet ??= createRemoteSignerWallet({
        endpoint: `${origin}/api/connector-signer`,
        name: 'Privy',
        // Optional: provide auth headers for the signing API
        // getAuthHeaders: () => ({
        //     'Authorization': `Bearer ${getSessionToken()}`
        // }),
    });
    return remoteSignerWallet;
}

export function Providers({ children }: { children: ReactNode }) {
    useEffect(() => {
        if (ENABLE_BURNER_WALLET) {
            registerBurnerWallet();
        }
    }, []);

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

        // Remote signer wallet, which delegates signing to /api/connector-signer
        const additionalWallets = ENABLE_REMOTE_SIGNER ? [getRemoteSignerWallet(origin)] : undefined;

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

    // Mount devtools in development mode
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;

        let devtools: { mount: (el: HTMLElement) => void; unmount: () => void } | undefined;
        let container: HTMLDivElement | undefined;

        // Dynamic import to avoid bundling in production
        import('@solana/connector-debugger').then(({ ConnectorDevtools }) => {
            // Create container for devtools
            container = document.createElement('div');
            container.id = 'connector-devtools-container';
            document.body.appendChild(container);

            // Create and mount devtools (auto-detects window.__connectorClient)
            devtools = new ConnectorDevtools({
                config: {
                    position: 'bottom-right',
                    theme: 'dark',
                    defaultOpen: false,
                    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
                },
            });
            devtools.mount(container);
        });

        // Cleanup on unmount
        return () => {
            devtools?.unmount();
            container?.remove();
        };
    }, []);

    return (
        <AppProvider connectorConfig={connectorConfig} mobile={mobile}>
            {children}
        </AppProvider>
    );
}
