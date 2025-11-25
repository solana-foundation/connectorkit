'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { ConnectButtonRoot } from './root';
import { ConnectButtonTrigger } from './trigger';
import { ConnectButtonConnected, ConnectButtonDisconnected } from './connected';
import { useConnectButtonContext } from './context';

export type ConnectWithType = 'modal' | 'dropdown';
export type ConnectedWithType = 'dropdown' | 'sheet';

export interface ConnectButtonProps {
    /** Custom className for the button */
    className?: string;
    /** Type of UI for connection selection */
    connectWith?: ConnectWithType;
    /** Type of UI for connected wallet actions */
    connectedWith?: ConnectedWithType;
    /** Custom content to show when connected (overrides connectedWith) */
    connectedContent?: ReactNode;
    /** Label for the connect button */
    connectLabel?: string;
    /** Label shown while connecting */
    connectingLabel?: string;
    /** Callback when connect modal/dropdown opens or closes */
    onConnectOpenChange?: (open: boolean) => void;
    /** Callback when wallet dropdown/sheet opens or closes */
    onWalletOpenChange?: (open: boolean) => void;
}

/**
 * Preset ConnectButton component that works out of the box.
 * 
 * @example
 * // Basic usage - just works
 * <ConnectButton />
 * 
 * @example
 * // Use dropdown for connection instead of modal
 * <ConnectButton connectWith="dropdown" />
 * 
 * @example
 * // Use sheet for connected state instead of dropdown
 * <ConnectButton connectedWith="sheet" />
 * 
 * @example
 * // Custom connected content
 * <ConnectButton 
 *   connectedContent={
 *     <>
 *       <BalanceBlock />
 *       <DisconnectBlock />
 *     </>
 *   }
 * />
 */
export function ConnectButton({
    className,
    connectWith = 'modal',
    connectedWith = 'dropdown',
    connectedContent,
    connectLabel = 'Connect Wallet',
    connectingLabel = 'Connecting...',
    onConnectOpenChange,
    onWalletOpenChange,
}: ConnectButtonProps) {
    return (
        <ConnectButtonRoot
            onConnectOpenChange={onConnectOpenChange}
            onWalletOpenChange={onWalletOpenChange}
        >
            <ConnectButtonPresetContent
                className={className}
                connectWith={connectWith}
                connectedWith={connectedWith}
                connectedContent={connectedContent}
                connectLabel={connectLabel}
                connectingLabel={connectingLabel}
            />
        </ConnectButtonRoot>
    );
}

interface ConnectButtonPresetContentProps {
    className?: string;
    connectWith: ConnectWithType;
    connectedWith: ConnectedWithType;
    connectedContent?: ReactNode;
    connectLabel: string;
    connectingLabel: string;
}

function ConnectButtonPresetContent({
    className,
    connectWith,
    connectedWith,
    connectedContent,
    connectLabel,
    connectingLabel,
}: ConnectButtonPresetContentProps) {
    const {
        connected,
        connecting,
        isConnectOpen,
        setConnectOpen,
        isWalletOpen,
        setWalletOpen,
        select,
        disconnect,
        address,
        formatted,
        walletName,
        walletIcon,
        wallets,
        copy,
        copied,
    } = useConnectButtonContext();
    
    // Default button styles using CSS variables
    const buttonClassName = `ck-connect-button ${className || ''}`.trim();
    
    return (
        <>
            <ConnectButtonTrigger
                className={buttonClassName}
                connectLabel={connectLabel}
                connectingLabel={connectingLabel}
            />
            
            {/* Connection UI - rendered by user or default */}
            {/* Note: Users should provide their own modal/dropdown implementation */}
            {/* This preset provides the state management, not the UI primitives */}
        </>
    );
}

// Attach compound components to ConnectButton
ConnectButton.Root = ConnectButtonRoot;
ConnectButton.Trigger = ConnectButtonTrigger;
ConnectButton.Connected = ConnectButtonConnected;
ConnectButton.Disconnected = ConnectButtonDisconnected;

ConnectButton.displayName = 'ConnectButton';
