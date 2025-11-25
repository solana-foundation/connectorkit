'use client';

import React from 'react';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { useConnectButtonContext } from './context';

export interface ConnectButtonTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    /** Custom content to render inside the button */
    children?: ReactNode;
    /** Text to show when disconnected */
    connectLabel?: string;
    /** Text to show when connecting */
    connectingLabel?: string;
    /** Custom render function for connected state */
    renderConnected?: (props: {
        address: string;
        formatted: string;
        walletName: string | null;
        walletIcon: string | null;
    }) => ReactNode;
    /** Whether to show loading spinner when connecting */
    showLoadingSpinner?: boolean;
    /** Custom className */
    className?: string;
}

/**
 * Trigger button for the ConnectButton compound component.
 * Handles both disconnected (opens connection UI) and connected (opens wallet UI) states.
 */
export function ConnectButtonTrigger({
    children,
    connectLabel = 'Connect Wallet',
    connectingLabel = 'Connecting...',
    renderConnected,
    showLoadingSpinner = true,
    className = '',
    disabled,
    ...buttonProps
}: ConnectButtonTriggerProps) {
    const {
        connected,
        connecting,
        address,
        formatted,
        walletName,
        walletIcon,
        setConnectOpen,
        setWalletOpen,
    } = useConnectButtonContext();
    
    const handleClick = () => {
        if (connected) {
            setWalletOpen(true);
        } else {
            setConnectOpen(true);
        }
    };
    
    // Connecting state
    if (connecting) {
        return (
            <button
                type="button"
                className={className}
                disabled
                data-slot="connect-button-trigger"
                data-state="connecting"
                {...buttonProps}
            >
                {showLoadingSpinner && (
                    <span 
                        className="ck-spinner"
                        data-slot="connect-button-spinner"
                        aria-hidden="true"
                    />
                )}
                {connectingLabel}
            </button>
        );
    }
    
    // Connected state
    if (connected && address) {
        const connectedContent = renderConnected 
            ? renderConnected({ address, formatted, walletName, walletIcon })
            : (
                <>
                    {walletIcon && (
                        <img 
                            src={walletIcon} 
                            alt={walletName || 'Wallet'} 
                            className="ck-wallet-icon"
                            data-slot="connect-button-wallet-icon"
                        />
                    )}
                    <span data-slot="connect-button-address">{formatted}</span>
                </>
            );
        
        return (
            <button
                type="button"
                className={className}
                onClick={handleClick}
                disabled={disabled}
                data-slot="connect-button-trigger"
                data-state="connected"
                {...buttonProps}
            >
                {connectedContent}
            </button>
        );
    }
    
    // Disconnected state
    return (
        <button
            type="button"
            className={className}
            onClick={handleClick}
            disabled={disabled}
            data-slot="connect-button-trigger"
            data-state="disconnected"
            {...buttonProps}
        >
            {children || connectLabel}
        </button>
    );
}

ConnectButtonTrigger.displayName = 'ConnectButton.Trigger';
