/**
 * @solana/connector - Cluster utilities
 *
 * Utility functions for working with Solana clusters (networks)
 */

import type { SolanaCluster } from '@wallet-ui/core';
import { getExplorerLink } from '../lib/kit';
import { PUBLIC_RPC_ENDPOINTS } from './network';

/**
 * Cluster type enum for all supported Solana cluster types
 */
export type ClusterType = 'mainnet' | 'devnet' | 'testnet' | 'localnet' | 'custom';

function getMaybeStringProp(value: unknown, prop: string): string | undefined {
    if (typeof value !== 'object' || value === null) return undefined;
    const record = value as Record<string, unknown>;
    const v = record[prop];
    return typeof v === 'string' ? v : undefined;
}

export function getClusterRpcUrl(cluster: SolanaCluster | string): string {
    // Handle string input (cluster name/ID)
    if (typeof cluster === 'string') {
        const presets: Record<string, string> = {
            ...PUBLIC_RPC_ENDPOINTS,
            'mainnet-beta': PUBLIC_RPC_ENDPOINTS.mainnet,
        };
        if (presets[cluster]) {
            return presets[cluster];
        }
        throw new Error(`Unknown cluster: ${cluster}`);
    }

    const url = cluster.url ?? getMaybeStringProp(cluster, 'rpcUrl');

    if (!url) {
        throw new Error('Cluster URL is required');
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    const presets: Record<string, string> = {
        ...PUBLIC_RPC_ENDPOINTS,
        'mainnet-beta': PUBLIC_RPC_ENDPOINTS.mainnet,
    };

    if (presets[url]) {
        return presets[url];
    }

    return url;
}

export function getClusterExplorerUrl(cluster: SolanaCluster, path?: string): string {
    const parts = cluster.id.split(':');
    const clusterSegment = parts[1] || 'devnet';

    const isMainnet = cluster.id === 'solana:mainnet' || cluster.id === 'solana:mainnet-beta';

    const base = isMainnet ? 'https://explorer.solana.com' : `https://explorer.solana.com?cluster=${clusterSegment}`;

    if (path) {
        return isMainnet
            ? `https://explorer.solana.com/${path}`
            : `https://explorer.solana.com/${path}?cluster=${clusterSegment}`;
    }

    return base;
}

export function getTransactionUrl(signature: string, cluster: SolanaCluster): string {
    const clusterType = getClusterType(cluster);
    const explorerCluster = clusterType === 'custom' || clusterType === 'localnet' ? 'devnet' : clusterType;
    return getExplorerLink({
        transaction: signature,
        cluster: explorerCluster === 'mainnet' ? 'mainnet' : explorerCluster,
    });
}

export function getAddressUrl(address: string, cluster: SolanaCluster): string {
    const clusterType = getClusterType(cluster);
    const explorerCluster = clusterType === 'custom' || clusterType === 'localnet' ? 'devnet' : clusterType;
    return getExplorerLink({
        address,
        cluster: explorerCluster === 'mainnet' ? 'mainnet' : explorerCluster,
    });
}

export function getTokenUrl(tokenAddress: string, cluster: SolanaCluster): string {
    return getClusterExplorerUrl(cluster, `token/${tokenAddress}`);
}

export function getBlockUrl(slot: number, cluster: SolanaCluster): string {
    return getClusterExplorerUrl(cluster, `block/${slot}`);
}

export function isMainnetCluster(cluster: SolanaCluster): boolean {
    return cluster.id === 'solana:mainnet' || cluster.id === 'solana:mainnet-beta';
}

export function isDevnetCluster(cluster: SolanaCluster): boolean {
    return cluster.id === 'solana:devnet';
}

export function isTestnetCluster(cluster: SolanaCluster): boolean {
    return cluster.id === 'solana:testnet';
}

export function isLocalCluster(cluster: SolanaCluster): boolean {
    const url = cluster.url ?? getMaybeStringProp(cluster, 'rpcUrl');
    if (!url) return cluster.id === 'solana:localnet';
    return cluster.id === 'solana:localnet' || url.includes('localhost') || url.includes('127.0.0.1');
}

export function getClusterName(cluster: SolanaCluster): string {
    if (cluster.label) return cluster.label;
    const name = getMaybeStringProp(cluster, 'name');
    if (name) return name;

    const parts = cluster.id.split(':');
    if (parts.length >= 2 && parts[1]) {
        const name = parts.slice(1).join(':');
        // Capitalize first letter
        return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
    }
    return 'Unknown';
}

export function getClusterType(cluster: SolanaCluster): ClusterType {
    if (isMainnetCluster(cluster)) return 'mainnet';
    if (isDevnetCluster(cluster)) return 'devnet';
    if (isTestnetCluster(cluster)) return 'testnet';
    if (isLocalCluster(cluster)) return 'localnet';
    return 'custom';
}

export function getClusterChainId(cluster: SolanaCluster): `solana:${string}` | null {
    const clusterType = getClusterType(cluster);

    if (clusterType === 'localnet' || clusterType === 'custom') {
        return null;
    }

    switch (clusterType) {
        case 'mainnet':
            return 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
        case 'devnet':
            return 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
        case 'testnet':
            return 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z';
        default:
            return null;
    }
}

export function getChainIdForWalletStandard(cluster: SolanaCluster): `solana:${string}` | null {
    return getClusterChainId(cluster);
}
