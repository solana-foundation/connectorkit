'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { useAccount } from '../../hooks/use-account';
import { useWalletInfo } from '../../hooks/use-wallet-info';

export interface AccountBlockProps {
    /** Show wallet avatar/icon */
    showAvatar?: boolean;
    /** Show copy button */
    showCopy?: boolean;
    /** Show full address instead of truncated */
    showFullAddress?: boolean;
    /** Custom className */
    className?: string;
    /** Custom avatar size (in pixels) */
    avatarSize?: number;
    /** Layout variant */
    variant?: 'compact' | 'expanded' | 'inline';
    /** Custom render function for full control */
    render?: (props: {
        address: string | null;
        formatted: string;
        walletName: string | null;
        walletIcon: string | null;
        copy: () => Promise<{ success: boolean }>;
        copied: boolean;
    }) => ReactNode;
}

/**
 * Block for displaying connected account information.
 * 
 * @example Basic usage
 * ```tsx
 * <AccountBlock />
 * ```
 * 
 * @example With full address
 * ```tsx
 * <AccountBlock showFullAddress />
 * ```
 * 
 * @example Custom render
 * ```tsx
 * <AccountBlock
 *   render={({ formatted, walletIcon, copy, copied }) => (
 *     <DropdownMenuLabel>
 *       <img src={walletIcon} className="w-5 h-5" />
 *       <button onClick={copy}>
 *         {copied ? 'Copied!' : formatted}
 *       </button>
 *     </DropdownMenuLabel>
 *   )}
 * />
 * ```
 */
export function AccountBlock({
    showAvatar = true,
    showCopy = true,
    showFullAddress = false,
    className,
    avatarSize = 32,
    variant = 'compact',
    render,
}: AccountBlockProps) {
    const { address, formatted, copy, copied } = useAccount();
    const { name: walletName, icon: walletIcon } = useWalletInfo();
    
    // Custom render
    if (render) {
        return <>{render({ address, formatted, walletName, walletIcon, copy, copied })}</>;
    }
    
    if (!address) return null;
    
    const displayAddress = showFullAddress ? address : formatted;
    
    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await copy();
    };
    
    const copyIcon = (
        <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ck-block-icon"
            data-slot="account-block-copy-icon"
        >
            {copied ? (
                <polyline points="20 6 9 17 4 12" />
            ) : (
                <>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </>
            )}
        </svg>
    );
    
    // Inline variant
    if (variant === 'inline') {
        return (
            <div 
                className={`ck-account-block ck-account-block--inline ${className || ''}`}
                data-slot="account-block"
                data-variant="inline"
            >
                {showAvatar && walletIcon && (
                    <img 
                        src={walletIcon} 
                        alt={walletName || 'Wallet'}
                        className="ck-account-block-avatar"
                        style={{ width: avatarSize, height: avatarSize }}
                        data-slot="account-block-avatar"
                    />
                )}
                <span 
                    className="ck-account-block-address"
                    data-slot="account-block-address"
                >
                    {displayAddress}
                </span>
                {showCopy && (
                    <button
                        type="button"
                        className="ck-account-block-copy"
                        onClick={handleCopy}
                        title={copied ? 'Copied!' : 'Copy address'}
                        data-slot="account-block-copy"
                        data-copied={copied}
                    >
                        {copyIcon}
                    </button>
                )}
            </div>
        );
    }
    
    // Expanded variant
    if (variant === 'expanded') {
        return (
            <div 
                className={`ck-account-block ck-account-block--expanded ${className || ''}`}
                data-slot="account-block"
                data-variant="expanded"
            >
                <div className="ck-account-block-header" data-slot="account-block-header">
                    {showAvatar && walletIcon && (
                        <img 
                            src={walletIcon} 
                            alt={walletName || 'Wallet'}
                            className="ck-account-block-avatar"
                            style={{ width: avatarSize, height: avatarSize }}
                            data-slot="account-block-avatar"
                        />
                    )}
                    <div className="ck-account-block-info" data-slot="account-block-info">
                        {walletName && (
                            <span 
                                className="ck-account-block-wallet-name"
                                data-slot="account-block-wallet-name"
                            >
                                {walletName}
                            </span>
                        )}
                        <span 
                            className="ck-account-block-address"
                            data-slot="account-block-address"
                        >
                            {displayAddress}
                        </span>
                    </div>
                </div>
                {showCopy && (
                    <button
                        type="button"
                        className="ck-account-block-copy"
                        onClick={handleCopy}
                        data-slot="account-block-copy"
                        data-copied={copied}
                    >
                        {copyIcon}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                )}
            </div>
        );
    }
    
    // Compact variant (default)
    return (
        <div 
            className={`ck-account-block ck-account-block--compact ${className || ''}`}
            data-slot="account-block"
            data-variant="compact"
        >
            {showAvatar && walletIcon && (
                <img 
                    src={walletIcon} 
                    alt={walletName || 'Wallet'}
                    className="ck-account-block-avatar"
                    style={{ width: avatarSize, height: avatarSize }}
                    data-slot="account-block-avatar"
                />
            )}
            <div className="ck-account-block-content" data-slot="account-block-content">
                {walletName && (
                    <span 
                        className="ck-account-block-wallet-name"
                        data-slot="account-block-wallet-name"
                    >
                        {walletName}
                    </span>
                )}
                <span 
                    className="ck-account-block-address"
                    data-slot="account-block-address"
                >
                    {displayAddress}
                </span>
            </div>
            {showCopy && (
                <button
                    type="button"
                    className="ck-account-block-copy"
                    onClick={handleCopy}
                    title={copied ? 'Copied!' : 'Copy address'}
                    data-slot="account-block-copy"
                    data-copied={copied}
                >
                    {copyIcon}
                </button>
            )}
        </div>
    );
}

AccountBlock.displayName = 'AccountBlock';
