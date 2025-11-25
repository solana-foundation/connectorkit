/**
 * @solana/connector/react
 *
 * React-specific exports with hooks and components
 * Use this when you only need React functionality
 */

// React-specific components and providers (not in headless)
export { ConnectorProvider, useConnector, useConnectorClient } from './ui/connector-provider';
export { UnifiedProvider, AppProvider } from './ui/unified-provider';

// React-specific error boundaries
export { ConnectorErrorBoundary, withErrorBoundary } from './ui/error-boundary';

// Development tools
// Note: Debug panel has been moved to @solana/connector-debugger package
// Import from '@solana/connector-debugger/react' instead
// These re-exports are deprecated and will be removed in a future version

// Enhanced React hooks
export { useCluster } from './hooks/use-cluster';
export { useAccount } from './hooks/use-account';
export { useWalletInfo } from './hooks/use-wallet-info';
export { useTransactionSigner } from './hooks/use-transaction-signer';
export {
    useKitTransactionSigner,
    /** @deprecated Use `useKitTransactionSigner` instead */
    useGillTransactionSigner,
} from './hooks/use-kit-transaction-signer';
export {
    useSolanaClient,
    /** @deprecated Use `useSolanaClient` instead */
    useGillSolanaClient,
} from './hooks/use-kit-solana-client';
export { useTransactionPreparer } from './hooks/use-transaction-preparer';

// Data fetching hooks for blocks
export { useBalance, type UseBalanceReturn, type TokenBalance } from './hooks/use-balance';
export { useTransactions, type UseTransactionsReturn, type UseTransactionsOptions, type TransactionInfo } from './hooks/use-transactions';
export { useTokens, type UseTokensReturn, type UseTokensOptions, type Token } from './hooks/use-tokens';

// Block system components
export * from './components';

export type { UseClusterReturn } from './hooks/use-cluster';
export type { UseAccountReturn } from './hooks/use-account';
export type { UseWalletInfoReturn } from './hooks/use-wallet-info';
export type { UseTransactionSignerReturn } from './hooks/use-transaction-signer';
export type {
    UseKitTransactionSignerReturn,
    /** @deprecated Use `UseKitTransactionSignerReturn` instead */
    UseGillTransactionSignerReturn,
} from './hooks/use-kit-transaction-signer';
export type {
    UseSolanaClientReturn,
    /** @deprecated Use `UseSolanaClientReturn` instead */
    UseGillSolanaClientReturn,
} from './hooks/use-kit-solana-client';
export type { UseTransactionPreparerReturn, TransactionPrepareOptions } from './hooks/use-transaction-preparer';

// React-specific types
export type { ConnectorSnapshot, MobileWalletAdapterConfig } from './ui/connector-provider';

export type { UnifiedProviderProps } from './ui/unified-provider';

// Core types needed for React integration (no implementation re-exports)
export type { Wallet, WalletAccount, WalletInfo } from './types/wallets';

export type { AccountInfo } from './types/accounts';

export type { ConnectorConfig, ConnectorState } from './types/connector';

export type { WalletStandardWallet, WalletStandardAccount } from './lib/adapters/wallet-standard-shim';

// Essential configuration types
export type { DefaultConfigOptions, ExtendedConnectorConfig, UnifiedConfigOptions, UnifiedConfig } from './config';

// Re-export wallet-ui types for React components
export type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core';

// Cluster utilities and types
export type { ClusterType } from './utils/cluster';
