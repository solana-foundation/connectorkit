/**
 * Block components for wallet UI
 * 
 * Blocks are composable UI pieces that can be placed inside containers.
 * Each block provides a specific piece of functionality.
 */

// Basic blocks (no additional data fetching)
export { DisconnectBlock, type DisconnectBlockProps } from './disconnect-block';
export { AccountBlock, type AccountBlockProps } from './account-block';
export { ClusterBlock, type ClusterBlockProps } from './cluster-block';

// Data blocks (require data fetching hooks)
export { BalanceBlock, type BalanceBlockProps } from './balance-block';
export { TransactionHistoryBlock, type TransactionHistoryBlockProps } from './transaction-history-block';
export { TokenListBlock, type TokenListBlockProps } from './token-list-block';
