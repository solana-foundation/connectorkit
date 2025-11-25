/**
 * @solana/connector - Kit RPC Utilities
 *
 * RPC URL helpers for Solana clusters.
 */

import type { DevnetUrl, MainnetUrl, TestnetUrl } from '@solana/kit';

/** Solana cluster moniker */
export type SolanaClusterMoniker = 'devnet' | 'localnet' | 'mainnet' | 'testnet';

/** Localnet URL type */
export type LocalnetUrl = string & { '~cluster': 'localnet' };

/** Generic URL type */
export type GenericUrl = string & {};

/** Union of all cluster URL types */
export type ModifiedClusterUrl = DevnetUrl | GenericUrl | LocalnetUrl | MainnetUrl | TestnetUrl;

/** URL or moniker that can be used to create a Solana client */
export type SolanaClientUrlOrMoniker = ModifiedClusterUrl | SolanaClusterMoniker | URL;

/**
 * Helper to create a localnet URL type
 */
export function localnet(putativeString: string): LocalnetUrl {
    return putativeString as LocalnetUrl;
}

/**
 * Get a public Solana RPC endpoint for a cluster based on its moniker
 *
 * Note: These RPC URLs are rate limited and not suitable for production applications.
 * For production, use a dedicated RPC provider like Triton, Helius, QuickNode, or Alchemy.
 *
 * @param cluster - Cluster moniker
 * @returns Public RPC URL for the cluster
 */
export function getPublicSolanaRpcUrl(cluster: SolanaClusterMoniker | 'mainnet-beta' | 'localhost'): ModifiedClusterUrl {
    switch (cluster) {
        case 'devnet':
            return 'https://api.devnet.solana.com' as DevnetUrl;
        case 'testnet':
            return 'https://api.testnet.solana.com' as TestnetUrl;
        case 'mainnet-beta':
        case 'mainnet':
            return 'https://api.mainnet-beta.solana.com' as MainnetUrl;
        case 'localnet':
        case 'localhost':
            return 'http://127.0.0.1:8899' as LocalnetUrl;
        default:
            throw new Error('Invalid cluster moniker');
    }
}

/**
 * Get the WebSocket URL for a given RPC URL
 *
 * @param rpcUrl - HTTP/HTTPS RPC URL
 * @returns WebSocket URL
 */
export function getWebSocketUrl(rpcUrl: string): string {
    const url = new URL(rpcUrl);
    url.protocol = url.protocol.replace('http', 'ws');

    // Default WebSocket port for localnet
    if (url.hostname === 'localhost' || url.hostname.startsWith('127')) {
        url.port = '8900';
    }

    return url.toString();
}




