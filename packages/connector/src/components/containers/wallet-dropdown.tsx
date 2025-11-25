'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { useConnectButtonContext } from '../connect-button/context';

export interface WalletDropdownProps {
    /** Dropdown content (blocks like BalanceBlock, DisconnectBlock, etc.) */
    children: ReactNode;
    /** Custom className for the dropdown */
    className?: string;
    /** Alignment of the dropdown relative to trigger */
    align?: 'start' | 'center' | 'end';
    /** Side of the dropdown relative to trigger */
    side?: 'top' | 'bottom' | 'left' | 'right';
    /** Offset from the trigger */
    sideOffset?: number;
    /** Custom render for the dropdown wrapper (for using Radix DropdownMenu) */
    renderWrapper?: (props: {
        open: boolean;
        onOpenChange: (open: boolean) => void;
        children: ReactNode;
    }) => ReactNode;
}

/**
 * Headless dropdown container for connected wallet actions.
 * Provides state management and default UI, but can be fully customized.
 * 
 * @example Basic usage with blocks
 * ```tsx
 * <WalletDropdown>
 *   <AccountBlock />
 *   <BalanceBlock />
 *   <Separator />
 *   <DisconnectBlock />
 * </WalletDropdown>
 * ```
 * 
 * @example With custom DropdownMenu (e.g., shadcn)
 * ```tsx
 * <WalletDropdown
 *   renderWrapper={({ open, onOpenChange, children }) => (
 *     <DropdownMenu open={open} onOpenChange={onOpenChange}>
 *       <DropdownMenuContent align="end">
 *         {children}
 *       </DropdownMenuContent>
 *     </DropdownMenu>
 *   )}
 * >
 *   <DropdownMenuItem>
 *     <AccountBlock />
 *   </DropdownMenuItem>
 * </WalletDropdown>
 * ```
 */
export function WalletDropdown({
    children,
    className,
    align = 'end',
    side = 'bottom',
    sideOffset = 4,
    renderWrapper,
}: WalletDropdownProps) {
    const { isWalletOpen, setWalletOpen, connected } = useConnectButtonContext();
    
    // Don't render if not connected
    if (!connected) return null;
    
    // Custom wrapper (for integration with Radix DropdownMenu)
    if (renderWrapper) {
        return (
            <>
                {renderWrapper({
                    open: isWalletOpen,
                    onOpenChange: setWalletOpen,
                    children,
                })}
            </>
        );
    }
    
    // Default headless dropdown
    if (!isWalletOpen) return null;
    
    return (
        <>
            {/* Backdrop to close on outside click */}
            <div 
                className="ck-dropdown-backdrop"
                onClick={() => setWalletOpen(false)}
                data-slot="wallet-dropdown-backdrop"
                aria-hidden="true"
            />
            
            {/* Dropdown content */}
            <div 
                className={`ck-dropdown ${className || ''}`}
                role="menu"
                data-slot="wallet-dropdown"
                data-align={align}
                data-side={side}
                style={{ '--ck-dropdown-offset': `${sideOffset}px` } as React.CSSProperties}
            >
                {children}
            </div>
        </>
    );
}

WalletDropdown.displayName = 'WalletDropdown';

export interface WalletDropdownItemProps {
    /** Item content */
    children: ReactNode;
    /** Custom className */
    className?: string;
    /** Click handler */
    onClick?: () => void;
    /** Whether the item is disabled */
    disabled?: boolean;
    /** Whether to close dropdown on click */
    closeOnClick?: boolean;
    /** Destructive styling (e.g., for disconnect) */
    variant?: 'default' | 'destructive';
}

/**
 * Individual item within WalletDropdown.
 * Provides consistent styling and behavior.
 */
export function WalletDropdownItem({
    children,
    className,
    onClick,
    disabled = false,
    closeOnClick = true,
    variant = 'default',
}: WalletDropdownItemProps) {
    const { setWalletOpen } = useConnectButtonContext();
    
    const handleClick = () => {
        if (disabled) return;
        onClick?.();
        if (closeOnClick) {
            setWalletOpen(false);
        }
    };
    
    return (
        <button
            type="button"
            role="menuitem"
            className={`ck-dropdown-item ${className || ''}`}
            onClick={handleClick}
            disabled={disabled}
            data-slot="wallet-dropdown-item"
            data-variant={variant}
            data-disabled={disabled}
        >
            {children}
        </button>
    );
}

WalletDropdownItem.displayName = 'WalletDropdownItem';

export interface WalletDropdownLabelProps {
    /** Label content */
    children: ReactNode;
    /** Custom className */
    className?: string;
}

/**
 * Label/header within WalletDropdown.
 */
export function WalletDropdownLabel({
    children,
    className,
}: WalletDropdownLabelProps) {
    return (
        <div 
            className={`ck-dropdown-label ${className || ''}`}
            data-slot="wallet-dropdown-label"
        >
            {children}
        </div>
    );
}

WalletDropdownLabel.displayName = 'WalletDropdownLabel';

export interface WalletDropdownSeparatorProps {
    /** Custom className */
    className?: string;
}

/**
 * Separator/divider within WalletDropdown.
 */
export function WalletDropdownSeparator({
    className,
}: WalletDropdownSeparatorProps) {
    return (
        <div 
            className={`ck-dropdown-separator ${className || ''}`}
            role="separator"
            data-slot="wallet-dropdown-separator"
        />
    );
}

WalletDropdownSeparator.displayName = 'WalletDropdownSeparator';
