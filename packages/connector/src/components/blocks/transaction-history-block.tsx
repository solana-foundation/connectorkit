'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { useTransactions, type TransactionInfo } from '../../hooks/use-transactions';

export interface TransactionHistoryBlockRenderProps {
    transactions: TransactionInfo[];
    isLoading: boolean;
    error: Error | null;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    refetch: () => Promise<void>;
}

export interface TransactionHistoryBlockProps {
    /** Number of transactions to display */
    limit?: number;
    /** Show transaction status */
    showStatus?: boolean;
    /** Show transaction time */
    showTime?: boolean;
    /** Custom className */
    className?: string;
    /** Display variant */
    variant?: 'compact' | 'expanded' | 'list';
    /** Show load more button */
    showLoadMore?: boolean;
    /** Show skeleton while loading */
    showSkeleton?: boolean;
    /** Custom render function for full control */
    render?: (props: TransactionHistoryBlockRenderProps) => ReactNode;
    /** Custom render for individual transaction item */
    renderItem?: (transaction: TransactionInfo) => ReactNode;
}

/**
 * Block for displaying recent transaction history.
 *
 * @example Basic usage
 * ```tsx
 * <TransactionHistoryBlock limit={5} />
 * ```
 *
 * @example With load more
 * ```tsx
 * <TransactionHistoryBlock limit={10} showLoadMore />
 * ```
 *
 * @example Custom item render
 * ```tsx
 * <TransactionHistoryBlock
 *   renderItem={(tx) => (
 *     <a href={tx.explorerUrl} target="_blank">
 *       {tx.signature.slice(0, 8)}... - {tx.status}
 *     </a>
 *   )}
 * />
 * ```
 */
export function TransactionHistoryBlock({
    limit = 5,
    showStatus = true,
    showTime = true,
    className,
    variant = 'list',
    showLoadMore = false,
    showSkeleton = true,
    render,
    renderItem,
}: TransactionHistoryBlockProps) {
    const { transactions, isLoading, error, hasMore, loadMore, refetch } = useTransactions({ limit });

    // Custom render
    if (render) {
        return <>{render({ transactions, isLoading, error, hasMore, loadMore, refetch })}</>;
    }

    const statusIcon = (status: 'success' | 'failed') => (
        <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`ck-tx-status-icon ck-tx-status-icon--${status}`}
            data-slot="tx-status-icon"
            data-status={status}
        >
            {status === 'success' ? (
                <polyline points="20 6 9 17 4 12" />
            ) : (
                <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </>
            )}
        </svg>
    );

    const externalLinkIcon = (
        <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ck-block-icon"
            data-slot="tx-external-link-icon"
        >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    );

    // Loading skeleton
    if (isLoading && showSkeleton && transactions.length === 0) {
        return (
            <div
                className={`ck-tx-history-block ck-tx-history-block--${variant} ck-tx-history-block--loading ${className || ''}`}
                data-slot="tx-history-block"
                data-variant={variant}
                data-loading="true"
            >
                <div className="ck-tx-history-skeleton" data-slot="tx-history-skeleton">
                    {Array.from({ length: Math.min(limit, 3) }).map((_, i) => (
                        <div key={i} className="ck-skeleton ck-skeleton--tx" />
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div
                className={`ck-tx-history-block ck-tx-history-block--${variant} ck-tx-history-block--error ${className || ''}`}
                data-slot="tx-history-block"
                data-variant={variant}
                data-error="true"
            >
                <span className="ck-tx-history-error" data-slot="tx-history-error">
                    Failed to load transactions
                </span>
                <button
                    type="button"
                    className="ck-tx-history-retry"
                    onClick={() => refetch()}
                    data-slot="tx-history-retry"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Empty state
    if (transactions.length === 0) {
        return (
            <div
                className={`ck-tx-history-block ck-tx-history-block--${variant} ck-tx-history-block--empty ${className || ''}`}
                data-slot="tx-history-block"
                data-variant={variant}
                data-empty="true"
            >
                <span className="ck-tx-history-empty" data-slot="tx-history-empty">
                    No transactions yet
                </span>
            </div>
        );
    }

    // Default item renderer
    const defaultRenderItem = (tx: TransactionInfo) => (
        <a
            key={tx.signature}
            href={tx.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ck-tx-item"
            data-slot="tx-item"
            data-status={tx.status}
        >
            <div className="ck-tx-item-main" data-slot="tx-item-main">
                {showStatus && (
                    <span
                        className={`ck-tx-status ck-tx-status--${tx.status}`}
                        data-slot="tx-status"
                        data-status={tx.status}
                    >
                        {statusIcon(tx.status)}
                    </span>
                )}
                <span className="ck-tx-signature" data-slot="tx-signature">
                    {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                </span>
            </div>
            <div className="ck-tx-item-meta" data-slot="tx-item-meta">
                {showTime && (
                    <span className="ck-tx-time" data-slot="tx-time">
                        {tx.formattedDate} {tx.formattedTime}
                    </span>
                )}
                {externalLinkIcon}
            </div>
        </a>
    );

    const itemRenderer = renderItem || defaultRenderItem;

    return (
        <div
            className={`ck-tx-history-block ck-tx-history-block--${variant} ${className || ''}`}
            data-slot="tx-history-block"
            data-variant={variant}
        >
            {variant === 'expanded' && (
                <div className="ck-tx-history-header" data-slot="tx-history-header">
                    <span className="ck-tx-history-title" data-slot="tx-history-title">
                        Recent Transactions
                    </span>
                    <span className="ck-tx-history-count" data-slot="tx-history-count">
                        {transactions.length}
                    </span>
                </div>
            )}

            <div className="ck-tx-history-list" data-slot="tx-history-list">
                {transactions.map(itemRenderer)}
            </div>

            {showLoadMore && hasMore && (
                <button
                    type="button"
                    className="ck-tx-history-load-more"
                    onClick={() => loadMore()}
                    disabled={isLoading}
                    data-slot="tx-history-load-more"
                >
                    {isLoading ? 'Loading...' : 'Load more'}
                </button>
            )}
        </div>
    );
}

TransactionHistoryBlock.displayName = 'TransactionHistoryBlock';
