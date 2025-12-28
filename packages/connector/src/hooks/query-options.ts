/**
 * @solana/connector - Query Options
 *
 * Exports query key generators for cache invalidation and prefetching.
 * Use these to programmatically invalidate cached data after transactions.
 *
 * @example
 * ```tsx
 * import { getBalanceQueryKey, invalidateSharedQuery } from '@solana/connector/react';
 *
 * // After sending a transaction
 * async function sendAndRefresh() {
 *   await sendTransaction();
 *
 *   // Invalidate balance cache
 *   const balanceKey = getBalanceQueryKey(rpcUrl, address);
 *   if (balanceKey) invalidateSharedQuery(balanceKey);
 *
 *   // Invalidate transactions cache
 *   const txKey = getTransactionsQueryKey({ rpcUrl, address, clusterId });
 *   if (txKey) invalidateSharedQuery(txKey);
 * }
 * ```
 */

// Balance query key (shares cache with tokens via wallet-assets)
export { getBalanceQueryKey } from './use-balance';

// Tokens query key (shares cache with balance via wallet-assets)
export { getTokensQueryKey } from './use-tokens';

// Transactions query key
export { getTransactionsQueryKey, type TransactionsQueryKeyOptions } from './use-transactions';

// Underlying wallet assets query key (advanced usage)
export { getWalletAssetsQueryKey } from './_internal/use-wallet-assets';
