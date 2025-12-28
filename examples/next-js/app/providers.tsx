'use client';

import { useMemo, useEffect } from 'react';
import { AppProvider } from '@solana/connector/react';
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

    // Mount devtools in development mode
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;

        let devtools: { mount: (el: HTMLElement) => void; unmount: () => void } | undefined;
        let container: HTMLDivElement | undefined;

        // Dynamic import to avoid bundling in production
        import('@solana/devtools').then(({ ConnectorDevtools }) => {
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
