/**
 * RPC endpoint classification
 *
 * Single source of truth for "which cluster is this endpoint" — shared by the
 * `ClusterType`-vocabulary consumers (`utils/chain.ts`) and the wallet-chain
 * consumers (`lib/kit/signer-integration.ts`), which map the result into
 * their own vocabularies. Kept dependency-free (type-only imports) so it can
 * be imported from anywhere without creating a cycle through the barrels.
 */

import type { ClusterType } from './cluster';

const LOCAL_RPC_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];

/**
 * Classify an RPC endpoint URL into a cluster type, or 'custom' when nothing
 * matches. Well-known clusters match by substring; local endpoints match by
 * hostname (with a substring fallback for strings that do not parse as URLs).
 */
export function getClusterTypeFromRpcEndpoint(rpcUrl: string): ClusterType {
    if (rpcUrl.includes('mainnet')) return 'mainnet';
    if (rpcUrl.includes('testnet')) return 'testnet';
    if (rpcUrl.includes('devnet')) return 'devnet';

    try {
        const host = new URL(rpcUrl).hostname.toLowerCase();
        if (LOCAL_RPC_HOSTS.includes(host)) return 'localnet';
    } catch {
        // Not a parseable URL; fall through to the substring check.
    }
    if (rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1')) return 'localnet';

    return 'custom';
}
