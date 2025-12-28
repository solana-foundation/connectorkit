'use client';

import type { ReactNode, ComponentType, PropsWithChildren } from 'react';
import { ConnectorProvider } from './connector-provider';
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

export function AppProvider({ children, connectorConfig, mobile, providers = [] }: AppProviderProps) {
    // Start with connector provider as the base
    let content = (
        <ConnectorProvider config={connectorConfig} mobile={mobile}>
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

/** @deprecated Use `AppProvider` instead */
export const UnifiedProvider = AppProvider;

/** @deprecated Use `AppProviderProps` instead */
export type UnifiedProviderProps = AppProviderProps;
