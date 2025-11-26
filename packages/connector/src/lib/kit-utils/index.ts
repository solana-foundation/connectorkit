/**
 * @solana/connector - Kit Utilities
 *
 * Local implementations of utilities that were previously imported from gill.
 * These are now built directly on top of @solana/kit packages.
 */

// Constants
export { LAMPORTS_PER_SOL, GENESIS_HASH, lamportsToSol, solToLamports } from './constants';

// RPC utilities
export {
    getPublicSolanaRpcUrl,
    getWebSocketUrl,
    localnet,
    type SolanaClusterMoniker,
    type LocalnetUrl,
    type GenericUrl,
    type ModifiedClusterUrl,
    type SolanaClientUrlOrMoniker,
} from './rpc';

// Explorer utilities
export { getExplorerLink, type ExplorerCluster, type GetExplorerLinkArgs } from './explorer';

// Client factory
export {
    createSolanaClient,
    type CreateSolanaClientArgs,
    type CreateSolanaClientRpcConfig,
    type CreateSolanaClientRpcSubscriptionsConfig,
    type SolanaClient,
} from './client';

// Debug utilities
export { debug, isDebugEnabled, type LogLevel } from './debug';

// Transaction preparation
export { prepareTransaction, type PrepareTransactionConfig } from './prepare-transaction';
