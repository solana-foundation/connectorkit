/**
 * @solana/connector - Kit Explorer Utilities
 *
 * Generate Solana Explorer links for addresses, transactions, and blocks.
 */

/** Cluster type for explorer links */
export type ExplorerCluster = 'mainnet' | 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet' | 'localhost';

/** Arguments for generating an explorer link */
export type GetExplorerLinkArgs =
    | { address: string; cluster?: ExplorerCluster }
    | { transaction: string; cluster?: ExplorerCluster }
    | { block: string | number; cluster?: ExplorerCluster }
    | { cluster?: ExplorerCluster };

/**
 * Craft a Solana Explorer link on any cluster
 *
 * @param props - Configuration for the explorer link
 * @returns Solana Explorer URL
 *
 * @example
 * ```ts
 * // Transaction link on mainnet
 * getExplorerLink({ transaction: 'abc123...', cluster: 'mainnet' });
 *
 * // Address link on devnet
 * getExplorerLink({ address: 'abc123...', cluster: 'devnet' });
 *
 * // Block link on testnet
 * getExplorerLink({ block: 12345, cluster: 'testnet' });
 * ```
 */
export function getExplorerLink(props: GetExplorerLinkArgs = {}): string {
    const url = new URL('https://explorer.solana.com');

    // Default to mainnet / mainnet-beta
    let cluster = props.cluster;
    if (!cluster || cluster === 'mainnet') {
        cluster = 'mainnet-beta';
    }

    if ('address' in props && props.address) {
        url.pathname = `/address/${props.address}`;
    } else if ('transaction' in props && props.transaction) {
        url.pathname = `/tx/${props.transaction}`;
    } else if ('block' in props && props.block !== undefined) {
        url.pathname = `/block/${props.block}`;
    }

    if (cluster !== 'mainnet-beta') {
        if (cluster === 'localnet' || cluster === 'localhost') {
            // localnet technically isn't a cluster, so requires special handling
            url.searchParams.set('cluster', 'custom');
            url.searchParams.set('customUrl', 'http://localhost:8899');
        } else {
            url.searchParams.set('cluster', cluster);
        }
    }

    return url.toString();
}




