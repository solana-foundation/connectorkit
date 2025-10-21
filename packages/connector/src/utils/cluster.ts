/**
 * @solana/connector - Cluster utilities
 *
 * Utility functions for working with Solana clusters (networks)
 */

import type { SolanaCluster } from '@wallet-ui/core';
import { getExplorerLink } from 'gill';
import { PUBLIC_RPC_ENDPOINTS } from './network';

/**
 * Cluster type enum for all supported Solana cluster types
 */
export type ClusterType = 'mainnet' | 'devnet' | 'testnet' | 'localnet' | 'custom';

/**
 * Get the RPC endpoint URL for a cluster
 * Handles both string cluster names and full URLs
 *
 * @example
 * getClusterRpcUrl(devnetCluster) // Returns: 'https://api.devnet.solana.com'
 */
export function getClusterRpcUrl(cluster: SolanaCluster): string {
    // Handle null/undefined cluster
    if (!cluster) {
        throw new Error('Invalid cluster configuration: unable to determine RPC URL for cluster unknown');
    }

    // Safely extract url/rpcUrl property with type validation
    // Try both 'url' and 'rpcUrl' properties for compatibility
    let url: string;
    if (typeof cluster === 'string') {
        // Handle string cluster names directly (e.g., 'mainnet-beta')
        url = cluster;
    } else if (typeof cluster === 'object' && cluster !== null) {
        if ('url' in cluster && typeof cluster.url === 'string') {
            url = cluster.url;
        } else if ('rpcUrl' in cluster && typeof (cluster as any).rpcUrl === 'string') {
            url = (cluster as any).rpcUrl;
        } else {
            url = '';
        }
    } else {
        url = '';
    }

    // If it's already a full URL, return it
    if (url?.startsWith('http://') || url?.startsWith('https://')) {
        return url;
    }

    // Use shared public RPC endpoints with mainnet-beta alias
    const presets: Record<string, string> = {
        ...PUBLIC_RPC_ENDPOINTS,
        'mainnet-beta': PUBLIC_RPC_ENDPOINTS.mainnet,
    };

    // Check presets mapping first
    if (url && presets[url]) {
        return presets[url];
    }

    // If url is empty or invalid, throw an error
    if (!url || url === '[object Object]') {
        throw new Error(
            `Invalid cluster configuration: unable to determine RPC URL for cluster ${cluster?.id ?? 'unknown'}`,
        );
    }

    return url;
}

/**
 * Get the base Solana Explorer URL for a cluster
 *
 * @example
 * getClusterExplorerUrl(mainnetCluster) // Returns: 'https://explorer.solana.com'
 */
export function getClusterExplorerUrl(cluster: SolanaCluster, path?: string): string {
    // Handle null/undefined cluster
    if (!cluster || !cluster.id) {
        const base = 'https://explorer.solana.com?cluster=devnet';
        return path ? `https://explorer.solana.com/${path}?cluster=devnet` : base;
    }

    // Defensively extract cluster segment from id (format: 'solana:cluster' or 'solana:cluster:extra')
    const parts = cluster.id.split(':');
    // Handle cases with multiple colons by taking the second part, or default to 'devnet' if not present
    const clusterSegment = parts.length >= 2 && parts[1] ? parts[1] : 'devnet';

    // Strict mainnet check: exact match or post-colon segment equals 'mainnet' or 'mainnet-beta'
    const isMainnet =
        cluster.id === 'solana:mainnet' ||
        cluster.id === 'solana:mainnet-beta' ||
        clusterSegment === 'mainnet' ||
        clusterSegment === 'mainnet-beta';

    const base = isMainnet ? 'https://explorer.solana.com' : `https://explorer.solana.com?cluster=${clusterSegment}`;

    // Handle path properly - if mainnet, no cluster param; otherwise include cluster in path
    if (path) {
        return isMainnet
            ? `https://explorer.solana.com/${path}`
            : `https://explorer.solana.com/${path}?cluster=${clusterSegment}`;
    }

    return base;
}

/**
 * Get the Solana Explorer URL for a transaction signature
 *
 * @example
 * getTransactionUrl('5VERv8...', devnetCluster)
 * // Returns: 'https://explorer.solana.com/tx/5VERv8...?cluster=devnet'
 */
export function getTransactionUrl(signature: string, cluster: SolanaCluster): string {
    const clusterType = getClusterType(cluster);
    // Map cluster types to valid explorer cluster values
    // Custom and local clusters default to devnet explorer (since explorer doesn't support them)
    const explorerCluster = clusterType === 'custom' || clusterType === 'localnet' ? 'devnet' : clusterType;
    return getExplorerLink({
        transaction: signature,
        cluster: explorerCluster === 'mainnet' ? 'mainnet' : explorerCluster,
    });
}

/**
 * Get the Solana Explorer URL for an address
 * Works for wallet addresses, token accounts, and programs
 *
 * @example
 * getAddressUrl('7xKXtg2C...', mainnetCluster)
 * // Returns: 'https://explorer.solana.com/address/7xKXtg2C...'
 */
export function getAddressUrl(address: string, cluster: SolanaCluster): string {
    const clusterType = getClusterType(cluster);
    // Map cluster types to valid explorer cluster values
    // Custom and local clusters default to devnet explorer (since explorer doesn't support them)
    const explorerCluster = clusterType === 'custom' || clusterType === 'localnet' ? 'devnet' : clusterType;
    return getExplorerLink({
        address,
        cluster: explorerCluster === 'mainnet' ? 'mainnet' : explorerCluster,
    });
}

/**
 * Get the Solana Explorer URL for a token
 *
 * @example
 * getTokenUrl('EPjFWdd5...', mainnetCluster)
 */
export function getTokenUrl(tokenAddress: string, cluster: SolanaCluster): string {
    return getClusterExplorerUrl(cluster, `token/${tokenAddress}`);
}

/**
 * Get the Solana Explorer URL for a block
 */
export function getBlockUrl(slot: number, cluster: SolanaCluster): string {
    return getClusterExplorerUrl(cluster, `block/${slot}`);
}

/**
 * Check if a cluster is production (mainnet)
 */
export function isMainnetCluster(cluster: SolanaCluster): boolean {
    return cluster.id === 'solana:mainnet' || cluster.id === 'solana:mainnet-beta';
}

/**
 * Check if a cluster is devnet
 */
export function isDevnetCluster(cluster: SolanaCluster): boolean {
    return cluster.id === 'solana:devnet';
}

/**
 * Check if a cluster is testnet
 */
export function isTestnetCluster(cluster: SolanaCluster): boolean {
    return cluster.id === 'solana:testnet';
}

/**
 * Check if a cluster is running locally
 */
export function isLocalCluster(cluster: SolanaCluster): boolean {
    // Safely extract url/rpcUrl property with type validation
    let url: string = '';
    if ('url' in cluster && typeof cluster.url === 'string') {
        url = cluster.url;
    } else if ('rpcUrl' in cluster && typeof (cluster as any).rpcUrl === 'string') {
        url = (cluster as any).rpcUrl;
    }

    return cluster.id === 'solana:localnet' || url.includes('localhost') || url.includes('127.0.0.1');
}

/**
 * Get a user-friendly name for the cluster
 */
export function getClusterName(cluster: SolanaCluster): string {
    // Check for both label and name properties for compatibility
    if (cluster.label) return cluster.label;
    if ('name' in cluster && typeof (cluster as any).name === 'string') {
        return (cluster as any).name;
    }

    // Defensively extract cluster segment from id
    // For IDs with multiple colons (e.g., 'solana:mainnet:extra'), join all parts after the first
    const parts = cluster.id.split(':');
    if (parts.length >= 2 && parts[1]) {
        return parts.slice(1).join(':');
    }
    return 'Unknown';
}

/**
 * Get the cluster type (mainnet, devnet, testnet, localnet, custom)
 */
export function getClusterType(cluster: SolanaCluster): ClusterType {
    if (isMainnetCluster(cluster)) return 'mainnet';
    if (isDevnetCluster(cluster)) return 'devnet';
    if (isTestnetCluster(cluster)) return 'testnet';
    if (isLocalCluster(cluster)) return 'localnet';
    return 'custom';
}
