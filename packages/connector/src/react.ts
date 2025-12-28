/**
 * @solana/connector/react
 *
 * React-specific exports with hooks and components
 * Use this when you only need React functionality
 */

// ============================================================================
// React Providers & Core Hooks
// ============================================================================
export { ConnectorProvider, useConnector, useConnectorClient } from './ui/connector-provider';
export { UnifiedProvider, AppProvider } from './ui/unified-provider';

// ============================================================================
// Error Boundaries
// ============================================================================
export { ConnectorErrorBoundary, withErrorBoundary } from './ui/error-boundary';

// ============================================================================
// All React Hooks (via barrel)
// ============================================================================
export * from './hooks';

// ============================================================================
// Element Components (via barrel)
// ============================================================================
export * from './components';

// ============================================================================
// React-specific Types
// ============================================================================
export type { ConnectorSnapshot, MobileWalletAdapterConfig } from './ui/connector-provider';
export type { AppProviderProps, UnifiedProviderProps } from './ui/unified-provider';

// Core types needed for React integration
export type { Wallet, WalletAccount, WalletInfo } from './types/wallets';
export type { AccountInfo } from './types/accounts';
export type { ConnectorConfig, ConnectorState } from './types/connector';
export type { WalletStandardWallet, WalletStandardAccount } from './lib/wallet/standard-shim';

// Essential configuration types
export type { DefaultConfigOptions, ExtendedConnectorConfig } from './config';

// Re-export wallet-ui types for React components
export type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core';

// Cluster utilities and types
export type { ClusterType } from './utils/cluster';
