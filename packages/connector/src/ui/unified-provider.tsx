'use client';

import type { ReactNode, ComponentType, PropsWithChildren } from 'react';
import { ConnectorProvider } from './connector-provider';
import type { MobileWalletAdapterConfig } from './connector-provider';
import type { ConnectorConfig } from '../types/connector';
import type { UnifiedConfig } from '../config/unified-config';

export interface UnifiedProviderProps {
    children: ReactNode;

    // NEW: Option 1 - Pass UnifiedConfig directly (recommended)
    config?: UnifiedConfig;

    // OLD: Option 2 - Pass configs separately (backward compatible)
    connectorConfig?: ConnectorConfig;
    mobile?: MobileWalletAdapterConfig;

    // Optional additional providers to wrap around children
    providers?: Array<{
        component: ComponentType<PropsWithChildren>;
        props?: Record<string, unknown>;
    }>;
}

export function UnifiedProvider({ children, config, connectorConfig, mobile, providers = [] }: UnifiedProviderProps) {
    // Handle both new and old patterns
    const actualConnectorConfig = config?.connectorConfig ?? connectorConfig;
    const actualMobile = config?.mobile ?? mobile;

    // Start with connector provider as the base
    let content = (
        <ConnectorProvider config={actualConnectorConfig} mobile={actualMobile}>
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

// Export with practical alias
export { UnifiedProvider as AppProvider };
