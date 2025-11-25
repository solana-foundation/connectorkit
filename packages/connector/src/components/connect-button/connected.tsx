'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { useConnectButtonContext } from './context';

export interface ConnectButtonConnectedProps {
    /** Content to render when wallet is connected */
    children: ReactNode;
    /** Whether to render children even when disconnected (for transition effects) */
    forceMount?: boolean;
}

/**
 * Wrapper component that only renders its children when a wallet is connected.
 * Use this to wrap dropdown/sheet content that should only appear when connected.
 * 
 * @example
 * ```tsx
 * <ConnectButton.Connected>
 *   <WalletDropdown>
 *     <BalanceBlock />
 *     <DisconnectBlock />
 *   </WalletDropdown>
 * </ConnectButton.Connected>
 * ```
 */
export function ConnectButtonConnected({
    children,
    forceMount = false,
}: ConnectButtonConnectedProps) {
    const { connected } = useConnectButtonContext();
    
    if (!connected && !forceMount) {
        return null;
    }
    
    return (
        <div data-slot="connect-button-connected" data-connected={connected}>
            {children}
        </div>
    );
}

ConnectButtonConnected.displayName = 'ConnectButton.Connected';

export interface ConnectButtonDisconnectedProps {
    /** Content to render when wallet is disconnected */
    children: ReactNode;
    /** Whether to render children even when connected (for transition effects) */
    forceMount?: boolean;
}

/**
 * Wrapper component that only renders its children when no wallet is connected.
 * Use this to wrap modal/dropdown content for wallet selection.
 * 
 * @example
 * ```tsx
 * <ConnectButton.Disconnected>
 *   <WalletModal>
 *     <WalletList />
 *   </WalletModal>
 * </ConnectButton.Disconnected>
 * ```
 */
export function ConnectButtonDisconnected({
    children,
    forceMount = false,
}: ConnectButtonDisconnectedProps) {
    const { connected } = useConnectButtonContext();
    
    if (connected && !forceMount) {
        return null;
    }
    
    return (
        <div data-slot="connect-button-disconnected" data-connected={connected}>
            {children}
        </div>
    );
}

ConnectButtonDisconnected.displayName = 'ConnectButton.Disconnected';
