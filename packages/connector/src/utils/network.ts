/**
 * @connector-kit/connector - Network utilities
 *
 * Utilities for translating between different Solana network naming conventions.
 * Ensures compatibility with WalletUI (SolanaClusterId) and Gill types.
 *
 * Primary type: SolanaNetwork - normalized network names
 * External integration: Use WalletUI's SolanaClusterId for cluster operations
 */

import type { SolanaClusterId } from '@wallet-ui/core';

/**
 * Normalized Solana network names
 * 
 * This is the canonical network type used throughout the connector.
 * Use `toClusterId()` to convert to WalletUI's SolanaClusterId format.
 * Use `toRpcNetwork()` internally when constructing RPC URLs.
 */
export type SolanaNetwork = 'mainnet' | 'devnet' | 'testnet' | 'localnet';

/**
 * Public RPC endpoints for each Solana network
 * 
 * ⚠️ WARNING: These are public, rate-limited endpoints provided by Solana Labs.
 * For production applications, use a dedicated RPC provider like:
 * - Helius (https://helius.dev)
 * - QuickNode (https://quicknode.com)
 * - Alchemy (https://alchemy.com)
 * 
 * Single source of truth for default RPC URLs across the package.
 */
export const PUBLIC_RPC_ENDPOINTS: Record<SolanaNetwork, string> = {
    mainnet: 'https://api.mainnet-beta.solana.com',
    devnet: 'https://api.devnet.solana.com',
    testnet: 'https://api.testnet.solana.com',
    localnet: 'http://localhost:8899',
} as const;

/**
 * Normalize network name to standard format
 * Accepts various naming conventions and returns the canonical SolanaNetwork format
 *
 * @example
 * normalizeNetwork('mainnet-beta') // Returns: 'mainnet'
 * normalizeNetwork('mainnet') // Returns: 'mainnet'
 * normalizeNetwork('MAINNET') // Returns: 'mainnet'
 */
export function normalizeNetwork(network: string): SolanaNetwork {
    const normalized = network.toLowerCase().replace('-beta', '');

    switch (normalized) {
        case 'mainnet':
            return 'mainnet';
        case 'devnet':
            return 'devnet';
        case 'testnet':
            return 'testnet';
        case 'localnet':
            return 'localnet';
        default:
            // Default to mainnet for unknown networks
            return 'mainnet';
    }
}

/**
 * Convert network name to RPC format (internal)
 * 
 * Mainnet uses 'mainnet-beta' in RPC URLs, while other networks don't have a suffix.
 * This is an internal implementation detail - consumers should use SolanaNetwork.
 *
 * @internal
 * @example
 * toRpcNetwork('mainnet') // Returns: 'mainnet-beta'
 * toRpcNetwork('devnet') // Returns: 'devnet'
 */
function toRpcNetwork(network: SolanaNetwork): string {
    return network === 'mainnet' ? 'mainnet-beta' : network;
}

/**
 * Convert network name to WalletUI cluster ID format
 * 
 * WalletUI uses the 'solana:network' format for cluster identification.
 *
 * @example
 * toClusterId('mainnet') // Returns: 'solana:mainnet'
 * toClusterId('mainnet-beta') // Returns: 'solana:mainnet' (normalized)
 */
export function toClusterId(network: string): SolanaClusterId {
    const normalized = normalizeNetwork(network);
    return `solana:${normalized}` as SolanaClusterId;
}

/**
 * Get the public RPC URL for a network
 * 
 * ⚠️ Returns public, rate-limited endpoints. For production, use a dedicated RPC provider.
 *
 * @example
 * getDefaultRpcUrl('mainnet') // Returns: 'https://api.mainnet-beta.solana.com'
 * getDefaultRpcUrl('devnet') // Returns: 'https://api.devnet.solana.com'
 */
export function getDefaultRpcUrl(network: string): string {
    const normalized = normalizeNetwork(network);
    return PUBLIC_RPC_ENDPOINTS[normalized] ?? PUBLIC_RPC_ENDPOINTS.mainnet;
}

/**
 * Check if a network is mainnet
 *
 * @example
 * isMainnet('mainnet') // Returns: true
 * isMainnet('mainnet-beta') // Returns: true
 * isMainnet('devnet') // Returns: false
 */
export function isMainnet(network: string): boolean {
    const normalized = normalizeNetwork(network);
    return normalized === 'mainnet';
}

/**
 * Check if a network is devnet
 *
 * @example
 * isDevnet('devnet') // Returns: true
 * isDevnet('mainnet') // Returns: false
 */
export function isDevnet(network: string): boolean {
    const normalized = normalizeNetwork(network);
    return normalized === 'devnet';
}

/**
 * Check if a network is testnet
 *
 * @example
 * isTestnet('testnet') // Returns: true
 * isTestnet('mainnet') // Returns: false
 */
export function isTestnet(network: string): boolean {
    const normalized = normalizeNetwork(network);
    return normalized === 'testnet';
}

/**
 * Check if a network is localnet
 *
 * @example
 * isLocalnet('localnet') // Returns: true
 * isLocalnet('mainnet') // Returns: false
 */
export function isLocalnet(network: string): boolean {
    const normalized = normalizeNetwork(network);
    return normalized === 'localnet';
}

/**
 * Get a user-friendly display name for a network
 *
 * @example
 * getNetworkDisplayName('mainnet-beta') // Returns: 'Mainnet'
 * getNetworkDisplayName('devnet') // Returns: 'Devnet'
 */
export function getNetworkDisplayName(network: string): string {
    const normalized = normalizeNetwork(network);
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
