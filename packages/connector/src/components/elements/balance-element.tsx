'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { useBalance, type TokenBalance } from '../../hooks/use-balance';

export interface BalanceElementRenderProps {
    solBalance: number;
    formattedSol: string;
    tokens: TokenBalance[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

export interface BalanceElementProps {
    /** Show SOL balance */
    showSol?: boolean;
    /** Show token balances */
    showTokens?: boolean;
    /** Maximum number of tokens to display */
    tokenCount?: number;
    /** Custom className */
    className?: string;
    /** Display variant */
    variant?: 'compact' | 'expanded' | 'inline';
    /** Show refresh button */
    showRefresh?: boolean;
    /** Show loading skeleton */
    showSkeleton?: boolean;
    /** Custom render function for full control */
    render?: (props: BalanceElementRenderProps) => ReactNode;
}

/**
 * Element for displaying wallet balance (SOL and tokens).
 *
 * @example Basic usage
 * ```tsx
 * <BalanceElement />
 * ```
 *
 * @example With tokens
 * ```tsx
 * <BalanceElement showTokens tokenCount={5} />
 * ```
 *
 * @example Custom render
 * ```tsx
 * <BalanceElement
 *   render={({ formattedSol, isLoading }) => (
 *     <div className="text-2xl font-bold">
 *       {isLoading ? 'Loading...' : formattedSol}
 *     </div>
 *   )}
 * />
 * ```
 */
export function BalanceElement({
    showSol = true,
    showTokens = false,
    tokenCount = 3,
    className,
    variant = 'compact',
    showRefresh = false,
    showSkeleton = true,
    render,
}: BalanceElementProps) {
    const { solBalance, formattedSol, tokens, isLoading, error, refetch } = useBalance();

    // Custom render
    if (render) {
        return <>{render({ solBalance, formattedSol, tokens, isLoading, error, refetch })}</>;
    }

    const displayTokens = tokens.slice(0, tokenCount);

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
            data-slot="balance-element-refresh-icon"
        >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
        </svg>
    );

    // Loading skeleton
    if (isLoading && showSkeleton && solBalance === 0) {
        return (
            <div
                className={`ck-balance-block ck-balance-block--${variant} ck-balance-block--loading ${className || ''}`}
                data-slot="balance-element"
                data-variant={variant}
                data-loading="true"
            >
                <div className="ck-balance-block-skeleton" data-slot="balance-element-skeleton">
                    <div className="ck-skeleton ck-skeleton--text" />
                    {showTokens && (
                        <>
                            <div className="ck-skeleton ck-skeleton--text ck-skeleton--short" />
                            <div className="ck-skeleton ck-skeleton--text ck-skeleton--short" />
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div
                className={`ck-balance-block ck-balance-block--${variant} ck-balance-block--error ${className || ''}`}
                data-slot="balance-element"
                data-variant={variant}
                data-error="true"
            >
                <span className="ck-balance-block-error" data-slot="balance-element-error">
                    Failed to load balance
                </span>
                {showRefresh && (
                    <button
                        type="button"
                        className="ck-balance-block-refresh"
                        onClick={() => refetch()}
                        data-slot="balance-element-refresh"
                    >
                        {refreshIcon}
                    </button>
                )}
            </div>
        );
    }

    // Inline variant
    if (variant === 'inline') {
        return (
            <div
                className={`ck-balance-block ck-balance-block--inline ${className || ''}`}
                data-slot="balance-element"
                data-variant="inline"
            >
                {showSol && (
                    <span className="ck-balance-block-sol" data-slot="balance-element-sol">
                        {formattedSol}
                    </span>
                )}
                {showRefresh && (
                    <button
                        type="button"
                        className="ck-balance-block-refresh"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        data-slot="balance-element-refresh"
                    >
                        {refreshIcon}
                    </button>
                )}
            </div>
        );
    }

    // Expanded variant
    if (variant === 'expanded') {
        return (
            <div
                className={`ck-balance-block ck-balance-block--expanded ${className || ''}`}
                data-slot="balance-element"
                data-variant="expanded"
            >
                {showSol && (
                    <div className="ck-balance-block-sol-section" data-slot="balance-element-sol-section">
                        <span className="ck-balance-block-label" data-slot="balance-element-label">
                            SOL Balance
                        </span>
                        <span className="ck-balance-block-sol" data-slot="balance-element-sol">
                            {formattedSol}
                        </span>
                    </div>
                )}

                {showTokens && displayTokens.length > 0 && (
                    <div className="ck-balance-block-tokens-section" data-slot="balance-element-tokens-section">
                        <span className="ck-balance-block-label" data-slot="balance-element-label">
                            Tokens ({tokens.length})
                        </span>
                        <div className="ck-balance-block-tokens" data-slot="balance-element-tokens">
                            {displayTokens.map(token => (
                                <div
                                    key={token.mint}
                                    className="ck-balance-block-token"
                                    data-slot="balance-element-token"
                                >
                                    {token.logo && (
                                        <img
                                            src={token.logo}
                                            alt={token.symbol || 'Token'}
                                            className="ck-balance-block-token-logo"
                                            data-slot="balance-element-token-logo"
                                        />
                                    )}
                                    <span
                                        className="ck-balance-block-token-info"
                                        data-slot="balance-element-token-info"
                                    >
                                        <span
                                            className="ck-balance-block-token-symbol"
                                            data-slot="balance-element-token-symbol"
                                        >
                                            {token.symbol || token.mint.slice(0, 4) + '...' + token.mint.slice(-4)}
                                        </span>
                                        <span
                                            className="ck-balance-block-token-amount"
                                            data-slot="balance-element-token-amount"
                                        >
                                            {token.formatted}
                                        </span>
                                    </span>
                                </div>
                            ))}
                            {tokens.length > tokenCount && (
                                <div className="ck-balance-block-more" data-slot="balance-element-more">
                                    +{tokens.length - tokenCount} more
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {showRefresh && (
                    <button
                        type="button"
                        className="ck-balance-block-refresh"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        data-slot="balance-element-refresh"
                    >
                        {refreshIcon}
                        <span>Refresh</span>
                    </button>
                )}
            </div>
        );
    }

    // Compact variant (default)
    return (
        <div
            className={`ck-balance-block ck-balance-block--compact ${className || ''}`}
            data-slot="balance-element"
            data-variant="compact"
        >
            {showSol && (
                <span className="ck-balance-block-sol" data-slot="balance-element-sol">
                    {formattedSol}
                </span>
            )}

            {showTokens && displayTokens.length > 0 && (
                <span className="ck-balance-block-token-count" data-slot="balance-element-token-count">
                    +{tokens.length} tokens
                </span>
            )}

            {showRefresh && (
                <button
                    type="button"
                    className="ck-balance-block-refresh"
                    onClick={() => refetch()}
                    disabled={isLoading}
                    data-slot="balance-element-refresh"
                >
                    {refreshIcon}
                </button>
            )}
        </div>
    );
}

BalanceElement.displayName = 'BalanceElement';
