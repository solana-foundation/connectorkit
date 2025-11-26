'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { useConnector } from '../../ui/connector-provider';

export interface DisconnectBlockProps {
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
 * Block for disconnecting the current wallet.
 *
 * @example Basic usage
 * ```tsx
 * <DisconnectBlock />
 * ```
 *
 * @example Button variant
 * ```tsx
 * <DisconnectBlock variant="button" />
 * ```
 *
 * @example Custom render
 * ```tsx
 * <DisconnectBlock
 *   render={({ disconnect }) => (
 *     <DropdownMenuItem onClick={disconnect}>
 *       <LogOut className="mr-2 h-4 w-4" />
 *       Sign Out
 *     </DropdownMenuItem>
 *   )}
 * />
 * ```
 */
export function DisconnectBlock({
    variant = 'menuitem',
    className,
    label = 'Disconnect',
    icon,
    showIcon = true,
    onDisconnect,
    render,
}: DisconnectBlockProps) {
    const { disconnect, connecting } = useConnector();
    const [disconnecting, setDisconnecting] = React.useState(false);

    const handleDisconnect = async () => {
        setDisconnecting(true);
        try {
            await disconnect();
            onDisconnect?.();
        } finally {
            setDisconnecting(false);
        }
    };

    // Custom render
    if (render) {
        return <>{render({ disconnect: handleDisconnect, disconnecting })}</>;
    }

    const isDisabled = connecting || disconnecting;

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
            data-slot="disconnect-block-icon"
        >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    );

    const content = (
        <>
            {showIcon && (icon || defaultIcon)}
            <span data-slot="disconnect-block-label">{label}</span>
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
                data-slot="disconnect-block"
                data-variant="button"
                data-disconnecting={disconnecting}
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
                data-slot="disconnect-block"
                data-variant="link"
                data-disconnecting={disconnecting}
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
            data-slot="disconnect-block"
            data-variant="menuitem"
            data-disconnecting={disconnecting}
        >
            {content}
        </button>
    );
}

DisconnectBlock.displayName = 'DisconnectBlock';
