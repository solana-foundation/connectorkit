'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { useConnectButtonContext } from '../connect-button/context';

export interface WalletSheetProps {
    /** Sheet content (blocks like BalanceBlock, TransactionHistoryBlock, etc.) */
    children: ReactNode;
    /** Custom className for the sheet overlay */
    overlayClassName?: string;
    /** Custom className for the sheet content */
    contentClassName?: string;
    /** Side from which the sheet slides in */
    side?: 'left' | 'right' | 'top' | 'bottom';
    /** Title for the sheet */
    title?: string;
    /** Description for the sheet */
    description?: string;
    /** Whether to show the close button */
    showCloseButton?: boolean;
    /** Custom render for the sheet wrapper (for using Radix Sheet) */
    renderWrapper?: (props: {
        open: boolean;
        onOpenChange: (open: boolean) => void;
        children: ReactNode;
    }) => ReactNode;
}

/**
 * Headless sheet/drawer container for connected wallet actions.
 * Provides more space than dropdown for rich content like transaction history.
 * 
 * @example Basic usage with blocks
 * ```tsx
 * <WalletSheet title="Wallet" side="right">
 *   <AccountBlock />
 *   <BalanceBlock showTokens />
 *   <TransactionHistoryBlock limit={10} />
 *   <DisconnectBlock />
 * </WalletSheet>
 * ```
 * 
 * @example With custom Sheet (e.g., shadcn)
 * ```tsx
 * <WalletSheet
 *   renderWrapper={({ open, onOpenChange, children }) => (
 *     <Sheet open={open} onOpenChange={onOpenChange}>
 *       <SheetContent>
 *         <SheetHeader>
 *           <SheetTitle>Wallet</SheetTitle>
 *         </SheetHeader>
 *         {children}
 *       </SheetContent>
 *     </Sheet>
 *   )}
 * >
 *   <AccountBlock />
 *   <BalanceBlock />
 * </WalletSheet>
 * ```
 */
export function WalletSheet({
    children,
    overlayClassName,
    contentClassName,
    side = 'right',
    title = 'Wallet',
    description,
    showCloseButton = true,
    renderWrapper,
}: WalletSheetProps) {
    const { isWalletOpen, setWalletOpen, connected } = useConnectButtonContext();
    
    // Don't render if not connected
    if (!connected) return null;
    
    // Custom wrapper (for integration with Radix Sheet)
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
    
    // Default headless sheet
    if (!isWalletOpen) return null;
    
    return (
        <>
            {/* Overlay */}
            <div 
                className={`ck-sheet-overlay ${overlayClassName || ''}`}
                onClick={() => setWalletOpen(false)}
                data-slot="wallet-sheet-overlay"
                aria-hidden="true"
            />
            
            {/* Content */}
            <div 
                className={`ck-sheet-content ${contentClassName || ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="wallet-sheet-title"
                aria-describedby={description ? "wallet-sheet-description" : undefined}
                data-slot="wallet-sheet-content"
                data-side={side}
            >
                {/* Header */}
                <div className="ck-sheet-header" data-slot="wallet-sheet-header">
                    <div>
                        <h2 id="wallet-sheet-title" className="ck-sheet-title">
                            {title}
                        </h2>
                        {description && (
                            <p id="wallet-sheet-description" className="ck-sheet-description">
                                {description}
                            </p>
                        )}
                    </div>
                    {showCloseButton && (
                        <button
                            type="button"
                            className="ck-sheet-close"
                            onClick={() => setWalletOpen(false)}
                            aria-label="Close"
                            data-slot="wallet-sheet-close"
                        >
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                                <path
                                    d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                                    fill="currentColor"
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    )}
                </div>
                
                {/* Body */}
                <div className="ck-sheet-body" data-slot="wallet-sheet-body">
                    {children}
                </div>
            </div>
        </>
    );
}

WalletSheet.displayName = 'WalletSheet';

export interface WalletSheetSectionProps {
    /** Section content */
    children: ReactNode;
    /** Section title */
    title?: string;
    /** Custom className */
    className?: string;
}

/**
 * Section within WalletSheet for grouping related content.
 */
export function WalletSheetSection({
    children,
    title,
    className,
}: WalletSheetSectionProps) {
    return (
        <div 
            className={`ck-sheet-section ${className || ''}`}
            data-slot="wallet-sheet-section"
        >
            {title && (
                <h3 className="ck-sheet-section-title" data-slot="wallet-sheet-section-title">
                    {title}
                </h3>
            )}
            <div className="ck-sheet-section-content" data-slot="wallet-sheet-section-content">
                {children}
            </div>
        </div>
    );
}

WalletSheetSection.displayName = 'WalletSheetSection';
