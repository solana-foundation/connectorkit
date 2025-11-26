'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { useTokens, type Token } from '../../hooks/use-tokens';

export interface TokenListBlockRenderProps {
    tokens: Token[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    totalAccounts: number;
}

export interface TokenListBlockProps {
    /** Maximum number of tokens to display */
    limit?: number;
    /** Show USD value (requires price API integration) */
    showValue?: boolean;
    /** Custom className */
    className?: string;
    /** Display variant */
    variant?: 'compact' | 'expanded' | 'grid';
    /** Show refresh button */
    showRefresh?: boolean;
    /** Show skeleton while loading */
    showSkeleton?: boolean;
    /** Custom render function for full control */
    render?: (props: TokenListBlockRenderProps) => ReactNode;
    /** Custom render for individual token item */
    renderItem?: (token: Token) => ReactNode;
}

/**
 * Block for displaying token holdings.
 * 
 * @example Basic usage
 * ```tsx
 * <TokenListBlock limit={10} />
 * ```
 * 
 * @example Grid layout
 * ```tsx
 * <TokenListBlock variant="grid" limit={6} />
 * ```
 * 
 * @example Custom item render
 * ```tsx
 * <TokenListBlock
 *   renderItem={(token) => (
 *     <div className="token-card">
 *       <img src={token.logo} alt={token.symbol} />
 *       <span>{token.formatted}</span>
 *     </div>
 *   )}
 * />
 * ```
 */
export function TokenListBlock({
    limit = 10,
    showValue = false,
    className,
    variant = 'compact',
    showRefresh = false,
    showSkeleton = true,
    render,
    renderItem,
}: TokenListBlockProps) {
    const { tokens, isLoading, error, refetch, totalAccounts } = useTokens();
    
    // Custom render
    if (render) {
        return <>{render({ tokens, isLoading, error, refetch, totalAccounts })}</>;
    }
    
    const displayTokens = tokens.slice(0, limit);
    
    const refreshIcon = (
        <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`ck-block-icon ${isLoading ? 'ck-block-icon--spinning' : ''}`}
            data-slot="token-list-refresh-icon"
        >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
        </svg>
    );
    
    const tokenIcon = (
        <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ck-token-placeholder-icon"
            data-slot="token-placeholder-icon"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v12" />
            <path d="M6 12h12" />
        </svg>
    );
    
    // Loading skeleton
    if (isLoading && showSkeleton && tokens.length === 0) {
        return (
            <div 
                className={`ck-token-list-block ck-token-list-block--${variant} ck-token-list-block--loading ${className || ''}`}
                data-slot="token-list-block"
                data-variant={variant}
                data-loading="true"
            >
                <div className="ck-token-list-skeleton" data-slot="token-list-skeleton">
                    {Array.from({ length: Math.min(limit, 3) }).map((_, i) => (
                        <div key={i} className="ck-skeleton ck-skeleton--token" />
                    ))}
                </div>
            </div>
        );
    }
    
    // Error state
    if (error) {
        return (
            <div 
                className={`ck-token-list-block ck-token-list-block--${variant} ck-token-list-block--error ${className || ''}`}
                data-slot="token-list-block"
                data-variant={variant}
                data-error="true"
            >
                <span className="ck-token-list-error" data-slot="token-list-error">
                    Failed to load tokens
                </span>
                <button
                    type="button"
                    className="ck-token-list-retry"
                    onClick={() => refetch()}
                    data-slot="token-list-retry"
                >
                    Retry
                </button>
            </div>
        );
    }
    
    // Empty state
    if (tokens.length === 0) {
        return (
            <div 
                className={`ck-token-list-block ck-token-list-block--${variant} ck-token-list-block--empty ${className || ''}`}
                data-slot="token-list-block"
                data-variant={variant}
                data-empty="true"
            >
                <span className="ck-token-list-empty" data-slot="token-list-empty">
                    No tokens found
                </span>
            </div>
        );
    }
    
    // Default item renderer
    const defaultRenderItem = (token: Token) => (
        <div
            key={token.mint}
            className="ck-token-item"
            data-slot="token-item"
        >
            <div className="ck-token-item-icon" data-slot="token-item-icon">
                {token.logo ? (
                    <img 
                        src={token.logo} 
                        alt={token.symbol || 'Token'}
                        className="ck-token-logo"
                        data-slot="token-logo"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : (
                    tokenIcon
                )}
            </div>
            <div className="ck-token-item-info" data-slot="token-item-info">
                <span className="ck-token-symbol" data-slot="token-symbol">
                    {token.symbol || token.mint.slice(0, 4) + '...' + token.mint.slice(-4)}
                </span>
                {token.name && (
                    <span className="ck-token-name" data-slot="token-name">
                        {token.name}
                    </span>
                )}
            </div>
            <div className="ck-token-item-balance" data-slot="token-item-balance">
                <span className="ck-token-amount" data-slot="token-amount">
                    {token.formatted}
                </span>
                {showValue && (
                    <span className="ck-token-value" data-slot="token-value">
                        {/* Price integration would go here */}
                        -
                    </span>
                )}
            </div>
        </div>
    );
    
    const itemRenderer = renderItem || defaultRenderItem;
    
    return (
        <div 
            className={`ck-token-list-block ck-token-list-block--${variant} ${className || ''}`}
            data-slot="token-list-block"
            data-variant={variant}
        >
            {variant === 'expanded' && (
                <div className="ck-token-list-header" data-slot="token-list-header">
                    <span className="ck-token-list-title" data-slot="token-list-title">
                        Tokens
                    </span>
                    <span className="ck-token-list-count" data-slot="token-list-count">
                        {totalAccounts}
                    </span>
                    {showRefresh && (
                        <button
                            type="button"
                            className="ck-token-list-refresh"
                            onClick={() => refetch()}
                            disabled={isLoading}
                            data-slot="token-list-refresh"
                        >
                            {refreshIcon}
                        </button>
                    )}
                </div>
            )}
            
            <div 
                className={`ck-token-list ${variant === 'grid' ? 'ck-token-list--grid' : ''}`}
                data-slot="token-list"
            >
                {displayTokens.map(itemRenderer)}
            </div>
            
            {tokens.length > limit && (
                <div className="ck-token-list-more" data-slot="token-list-more">
                    +{tokens.length - limit} more tokens
                </div>
            )}
        </div>
    );
}

TokenListBlock.displayName = 'TokenListBlock';


