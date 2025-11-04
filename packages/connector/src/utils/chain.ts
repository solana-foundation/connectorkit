import type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core';
import type { Connection } from '@solana/web3.js';
import type { ClusterType } from './cluster';
import { getClusterType, isMainnetCluster, isDevnetCluster, isTestnetCluster } from './cluster';

export const SOLANA_CHAIN_IDS = {
    mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    devnet: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    testnet: 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
} as const;

const CHAIN_ID_TO_CLUSTER_TYPE: Record<string, ClusterType> = {
    [SOLANA_CHAIN_IDS.mainnet]: 'mainnet',
    [SOLANA_CHAIN_IDS.devnet]: 'devnet',
    [SOLANA_CHAIN_IDS.testnet]: 'testnet',
};

const CLUSTER_ID_TO_CHAIN_ID: Partial<Record<SolanaClusterId, string>> = {
    'solana:mainnet': SOLANA_CHAIN_IDS.mainnet,
    'solana:mainnet-beta': SOLANA_CHAIN_IDS.mainnet,
    'solana:devnet': SOLANA_CHAIN_IDS.devnet,
    'solana:testnet': SOLANA_CHAIN_IDS.testnet,
};

export function getChainIdFromCluster(cluster: SolanaCluster): `solana:${string}` | null {
    const clusterType = getClusterType(cluster);

    if (clusterType === 'localnet' || clusterType === 'custom') {
        return null;
    }

    return getChainIdFromClusterType(clusterType);
}

export function getChainIdFromClusterId(clusterId: SolanaClusterId): `solana:${string}` | null {
    return (CLUSTER_ID_TO_CHAIN_ID[clusterId] as `solana:${string}` | undefined) || null;
}

export function getChainIdFromClusterType(type: ClusterType): `solana:${string}` | null {
    switch (type) {
        case 'mainnet':
            return SOLANA_CHAIN_IDS.mainnet;
        case 'devnet':
            return SOLANA_CHAIN_IDS.devnet;
        case 'testnet':
            return SOLANA_CHAIN_IDS.testnet;
        case 'localnet':
        case 'custom':
            return null;
    }
}

export function getClusterTypeFromChainId(chainId: string): ClusterType | null {
    return CHAIN_ID_TO_CLUSTER_TYPE[chainId] || null;
}

export function getClusterIdFromChainId(chainId: string): SolanaClusterId | null {
    const clusterType = getClusterTypeFromChainId(chainId);
    if (!clusterType) {
        return null;
    }

    switch (clusterType) {
        case 'mainnet':
            return 'solana:mainnet';
        case 'devnet':
            return 'solana:devnet';
        case 'testnet':
            return 'solana:testnet';
        default:
            return null;
    }
}

export function isSolanaChain(chain: string): chain is `solana:${string}` {
    return chain.startsWith('solana:');
}

export function isKnownSolanaChain(chain: string): boolean {
    return chain === SOLANA_CHAIN_IDS.mainnet || chain === SOLANA_CHAIN_IDS.devnet || chain === SOLANA_CHAIN_IDS.testnet;
}

export function validateKnownSolanaChain(chain: string): asserts chain is `solana:${string}` {
    if (!isSolanaChain(chain)) {
        throw new Error(`Invalid chain format: expected 'solana:...', got '${chain}'`);
    }

    if (!isKnownSolanaChain(chain)) {
        throw new Error(`Unknown Solana chain: ${chain}. Known chains: ${Object.values(SOLANA_CHAIN_IDS).join(', ')}`);
    }
}

export function getClusterTypeFromConnection(connection: Connection | null): ClusterType | null {
    if (!connection) {
        return null;
    }

    const rpcUrl = connection.rpcEndpoint || '';

    if (rpcUrl.includes('mainnet') || rpcUrl.includes('api.mainnet-beta')) {
        return 'mainnet';
    }

    if (rpcUrl.includes('testnet')) {
        return 'testnet';
    }

    if (rpcUrl.includes('devnet')) {
        return 'devnet';
    }

    if (rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1')) {
        return 'localnet';
    }

    return 'custom';
}

export function getChainIdFromConnection(
    connection: Connection | null,
    network?: 'mainnet' | 'devnet' | 'testnet',
): `solana:${string}` | null {
    if (network) {
        return getChainIdFromClusterType(network);
    }

    const clusterType = getClusterTypeFromConnection(connection);
    if (!clusterType) {
        return null;
    }

    return getChainIdFromClusterType(clusterType);
}

export function clusterToChainId(cluster: SolanaCluster): `solana:${string}` | null {
    return getChainIdFromCluster(cluster);
}

export function chainIdToClusterType(chainId: string): ClusterType | null {
    return getClusterTypeFromChainId(chainId);
}

export function chainIdToClusterId(chainId: string): SolanaClusterId | null {
    return getClusterIdFromChainId(chainId);
}

