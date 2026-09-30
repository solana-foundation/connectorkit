/**
 * @solana/connector - Explorer Utilities
 *
 * Generate block explorer links (Solana Explorer, Solscan, XRAY, SolanaFM)
 * for addresses, transactions, and blocks.
 */

/** Cluster type for explorer links */
export type ExplorerCluster = 'mainnet' | 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet' | 'localhost';

/** Arguments for generating an explorer link */
export type GetExplorerLinkArgs =
    | { address: string; cluster?: ExplorerCluster }
    | { transaction: string; cluster?: ExplorerCluster }
    | { block: string | number; cluster?: ExplorerCluster }
    | { cluster?: ExplorerCluster };

export type ExplorerType = 'solana-explorer' | 'solscan' | 'xray' | 'solana-fm';

export interface ExplorerOptions {
    /** Cluster to use for the explorer link */
    cluster?: string;
    /** Custom RPC URL for localnet */
    customUrl?: string;
}

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

/**
 * Generate Solana Explorer URL for a transaction signature
 */
export function getSolanaExplorerUrl(signature: string, options: ExplorerOptions = {}): string {
    const { cluster = 'mainnet', customUrl } = options;
    const normalizedCluster = cluster === 'mainnet-beta' ? 'mainnet' : cluster;

    // Localnet supports a configurable RPC URL, which getExplorerLink does not expose
    if (normalizedCluster === 'localnet') {
        const url = customUrl || 'http://localhost:8899';
        return `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${encodeURIComponent(url)}`;
    }

    // Custom clusters default to devnet
    const validClusters = ['mainnet', 'devnet', 'testnet'] as const;
    const explorerCluster = validClusters.includes(normalizedCluster as 'mainnet' | 'devnet' | 'testnet')
        ? (normalizedCluster as 'mainnet' | 'devnet' | 'testnet')
        : 'devnet';

    return getExplorerLink({
        transaction: signature,
        cluster: explorerCluster,
    });
}

/**
 * Generate Solscan URL for a transaction signature
 */
export function getSolscanUrl(signature: string, options: ExplorerOptions = {}): string {
    const { cluster = 'mainnet' } = options;
    const normalizedCluster = cluster === 'mainnet-beta' ? 'mainnet' : cluster;

    if (normalizedCluster === 'mainnet') {
        return `https://solscan.io/tx/${signature}`;
    }

    if (normalizedCluster === 'localnet') {
        return `https://solscan.io/tx/${signature}?cluster=custom`;
    }

    return `https://solscan.io/tx/${signature}?cluster=${normalizedCluster}`;
}

/**
 * Generate XRAY (Helius) URL for a transaction signature
 * Note: XRAY works best with mainnet transactions
 */
export function getXrayUrl(signature: string): string {
    return `https://xray.helius.xyz/tx/${signature}`;
}

/**
 * Generate SolanaFM URL for a transaction signature
 */
export function getSolanaFmUrl(signature: string, options: ExplorerOptions = {}): string {
    const { cluster = 'mainnet' } = options;
    const normalizedCluster = cluster === 'mainnet-beta' ? 'mainnet' : cluster;

    if (normalizedCluster === 'mainnet') {
        return `https://solana.fm/tx/${signature}`;
    }

    return `https://solana.fm/tx/${signature}?cluster=${normalizedCluster}`;
}

/**
 * Get all explorer URLs for a transaction
 */
export function getAllExplorerUrls(signature: string, options: ExplorerOptions = {}): Record<ExplorerType, string> {
    return {
        'solana-explorer': getSolanaExplorerUrl(signature, options),
        solscan: getSolscanUrl(signature, options),
        xray: getXrayUrl(signature),
        'solana-fm': getSolanaFmUrl(signature, options),
    };
}

/**
 * Format a transaction signature for display (truncated)
 */
export function formatSignature(signature: string, chars = 8): string {
    if (signature.length <= chars * 2) return signature;
    return `${signature.slice(0, chars)}...${signature.slice(-chars)}`;
}

/**
 * Copy signature to clipboard with enhanced error handling
 *
 * @deprecated Use copySignatureToClipboard from utils/clipboard instead
 * This is maintained for backwards compatibility but will be removed in a future version
 */
export async function copySignature(signature: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(signature);
        return true;
    } catch {
        return false;
    }
}
