'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { useDisconnectWallet } from '../../hooks/use-disconnect-wallet';
import { useWallet } from '../../hooks/use-wallet';

export interface DisconnectElementProps {
    /** Display variant */
    variant?: 'button' | 'menuitem' | 'link';
    /** Custom className */
    className?: string;
    /** Custom label */
    label?: string;
    /** Custom icon (render function) */
    icon?: ReactNode;
    /** Show icon */
    showIcon?: boolean;
    /** Callback after disconnect */
    onDisconnect?: () => void;
    /** Custom render function for full control */
    render?: (props: { disconnect: () => Promise<void>; disconnecting: boolean }) => ReactNode;
}

/**
 * Element for disconnecting the current wallet.
 *
 * @example Basic usage
 * ```tsx
 * <DisconnectElement />
 * ```
 *
 * @example Button variant
 * ```tsx
 * <DisconnectElement variant="button" />
 * ```
 *
 * @example Custom render
 * ```tsx
 * <DisconnectElement
 *   render={({ disconnect }) => (
 *     <DropdownMenuItem onClick={disconnect}>
 *       <LogOut className="mr-2 h-4 w-4" />
 *       Sign Out
 *     </DropdownMenuItem>
 *   )}
 * />
 * ```
 */
export function DisconnectElement({
    variant = 'menuitem',
    className,
    label = 'Disconnect',
    icon,
    showIcon = true,
    onDisconnect,
    render,
}: DisconnectElementProps) {
    const { isConnecting } = useWallet();
    const { disconnect, isDisconnecting } = useDisconnectWallet();

    const handleDisconnect = async () => {
        await disconnect();
        onDisconnect?.();
    };

    // Custom render
    if (render) {
        return <>{render({ disconnect: handleDisconnect, disconnecting: isDisconnecting })}</>;
    }

    const isDisabled = isConnecting || isDisconnecting;

    const defaultIcon = showIcon && !icon && (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ck-block-icon"
            data-slot="disconnect-element-icon"
        >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    );

    const content = (
        <>
            {showIcon && (icon || defaultIcon)}
            <span data-slot="disconnect-element-label">{label}</span>
        </>
    );

    // Button variant
    if (variant === 'button') {
        return (
            <button
                type="button"
                className={`ck-disconnect-block ck-disconnect-block--button ${className || ''}`}
                onClick={handleDisconnect}
                disabled={isDisabled}
                data-slot="disconnect-element"
                data-variant="button"
                data-disconnecting={isDisconnecting}
            >
                {content}
            </button>
        );
    }

    // Link variant
    if (variant === 'link') {
        return (
            <button
                type="button"
                className={`ck-disconnect-block ck-disconnect-block--link ${className || ''}`}
                onClick={handleDisconnect}
                disabled={isDisabled}
                data-slot="disconnect-element"
                data-variant="link"
                data-disconnecting={isDisconnecting}
            >
                {content}
            </button>
        );
    }

    // Menu item variant (default)
    return (
        <button
            type="button"
            role="menuitem"
            className={`ck-disconnect-block ck-disconnect-block--menuitem ${className || ''}`}
            onClick={handleDisconnect}
            disabled={isDisabled}
            data-slot="disconnect-element"
            data-variant="menuitem"
            data-disconnecting={isDisconnecting}
        >
            {content}
        </button>
    );
}

DisconnectElement.displayName = 'DisconnectElement';
