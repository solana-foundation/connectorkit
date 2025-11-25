'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { ConnectButtonProvider, type ConnectButtonProviderProps } from './context';

export interface ConnectButtonRootProps extends ConnectButtonProviderProps {
    children: ReactNode;
    className?: string;
}

/**
 * Root compound component for ConnectButton.
 * Provides context for all child compound components.
 * 
 * @example
 * ```tsx
 * <ConnectButton.Root>
 *   <ConnectButton.Trigger />
 *   <ConnectButton.Modal>
 *     <WalletList />
 *   </ConnectButton.Modal>
 *   <ConnectButton.Connected>
 *     <WalletDropdown>
 *       <BalanceBlock />
 *       <DisconnectBlock />
 *     </WalletDropdown>
 *   </ConnectButton.Connected>
 * </ConnectButton.Root>
 * ```
 */
export function ConnectButtonRoot({
    children,
    className,
    ...providerProps
}: ConnectButtonRootProps) {
    return (
        <ConnectButtonProvider {...providerProps}>
            <div className={className} data-slot="connect-button-root">
                {children}
            </div>
        </ConnectButtonProvider>
    );
}

ConnectButtonRoot.displayName = 'ConnectButton.Root';
