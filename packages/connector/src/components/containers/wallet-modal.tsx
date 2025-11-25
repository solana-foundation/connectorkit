'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { useConnectButtonContext } from '../connect-button/context';

export interface WalletModalProps {
    /** Modal content (typically WalletList) */
    children: ReactNode;
    /** Custom className for the modal overlay */
    overlayClassName?: string;
    /** Custom className for the modal content */
    contentClassName?: string;
    /** Title for the modal */
    title?: string;
    /** Description for the modal */
    description?: string;
    /** Whether to show the close button */
    showCloseButton?: boolean;
    /** Custom render for the modal wrapper (for using Radix/shadcn Dialog) */
    renderWrapper?: (props: {
        open: boolean;
        onOpenChange: (open: boolean) => void;
        children: ReactNode;
    }) => ReactNode;
}

/**
 * Headless modal container for wallet selection.
 * Provides state management and default UI, but can be fully customized.
 * 
 * @example Basic usage
 * ```tsx
 * <WalletModal title="Connect Wallet">
 *   <WalletList onConnect={() => {}} />
 * </WalletModal>
 * ```
 * 
 * @example With custom Dialog (e.g., shadcn)
 * ```tsx
 * <WalletModal
 *   renderWrapper={({ open, onOpenChange, children }) => (
 *     <Dialog open={open} onOpenChange={onOpenChange}>
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Connect Wallet</DialogTitle>
 *         </DialogHeader>
 *         {children}
 *       </DialogContent>
 *     </Dialog>
 *   )}
 * >
 *   <WalletList />
 * </WalletModal>
 * ```
 */
export function WalletModal({
    children,
    overlayClassName,
    contentClassName,
    title = 'Connect Wallet',
    description = 'Choose a wallet to connect',
    showCloseButton = true,
    renderWrapper,
}: WalletModalProps) {
    const { isConnectOpen, setConnectOpen, connected } = useConnectButtonContext();
    
    // Close modal when connected
    React.useEffect(() => {
        if (connected && isConnectOpen) {
            setConnectOpen(false);
        }
    }, [connected, isConnectOpen, setConnectOpen]);
    
    // Custom wrapper (for integration with Radix/shadcn Dialog)
    if (renderWrapper) {
        return (
            <>
                {renderWrapper({
                    open: isConnectOpen,
                    onOpenChange: setConnectOpen,
                    children,
                })}
            </>
        );
    }
    
    // Default headless modal
    if (!isConnectOpen) return null;
    
    return (
        <>
            {/* Overlay */}
            <div 
                className={`ck-modal-overlay ${overlayClassName || ''}`}
                onClick={() => setConnectOpen(false)}
                data-slot="wallet-modal-overlay"
                aria-hidden="true"
            />
            
            {/* Content */}
            <div 
                className={`ck-modal-content ${contentClassName || ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="wallet-modal-title"
                aria-describedby="wallet-modal-description"
                data-slot="wallet-modal-content"
            >
                {/* Header */}
                <div className="ck-modal-header" data-slot="wallet-modal-header">
                    <h2 id="wallet-modal-title" className="ck-modal-title">
                        {title}
                    </h2>
                    {description && (
                        <p id="wallet-modal-description" className="ck-modal-description">
                            {description}
                        </p>
                    )}
                    {showCloseButton && (
                        <button
                            type="button"
                            className="ck-modal-close"
                            onClick={() => setConnectOpen(false)}
                            aria-label="Close"
                            data-slot="wallet-modal-close"
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
                <div className="ck-modal-body" data-slot="wallet-modal-body">
                    {children}
                </div>
            </div>
        </>
    );
}

WalletModal.displayName = 'WalletModal';
