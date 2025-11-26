/**
 * @solana/connector - Kit Client Factory
 *
 * Creates a Solana RPC and WebSocket subscriptions client.
 * Replaces gill's createSolanaClient with a kit-based implementation.
 */

import type {
    DevnetUrl,
    MainnetUrl,
    TestnetUrl,
    Rpc,
    RpcSubscriptions,
    SolanaRpcApi,
    SolanaRpcSubscriptionsApi,
} from '@solana/kit';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';

import type { LocalnetUrl, ModifiedClusterUrl, SolanaClientUrlOrMoniker } from './rpc';
import { getPublicSolanaRpcUrl } from './rpc';

/**
 * Configuration for creating a Solana RPC client
 */
export interface CreateSolanaClientRpcConfig {
    /** Custom port for the RPC endpoint */
    port?: number;
}

/**
 * Configuration for creating a Solana RPC subscriptions client
 */
export interface CreateSolanaClientRpcSubscriptionsConfig {
    /** Custom port for the WebSocket endpoint */
    port?: number;
}

/**
 * Arguments for creating a Solana client
 */
export interface CreateSolanaClientArgs<TClusterUrl extends SolanaClientUrlOrMoniker = string> {
    /** Full RPC URL (for a private RPC endpoint) or the Solana moniker (for a public RPC endpoint) */
    urlOrMoniker: SolanaClientUrlOrMoniker | TClusterUrl;
    /** Configuration used to create the `rpc` client */
    rpcConfig?: CreateSolanaClientRpcConfig;
    /** Configuration used to create the `rpcSubscriptions` client */
    rpcSubscriptionsConfig?: CreateSolanaClientRpcSubscriptionsConfig;
}

/**
 * A Solana client with RPC and WebSocket subscription capabilities
 */
export interface SolanaClient<TClusterUrl extends ModifiedClusterUrl | string = string> {
    /** Used to make RPC calls to your RPC provider */
    rpc: Rpc<SolanaRpcApi>;
    /** Used to make RPC websocket calls to your RPC provider */
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
    /** Full RPC URL that was used to create this client */
    urlOrMoniker: SolanaClientUrlOrMoniker | TClusterUrl;
}

/**
 * Create a Solana `rpc` and `rpcSubscriptions` client
 *
 * @param props - Configuration for the client
 * @returns Solana client with RPC and WebSocket subscription capabilities
 *
 * @example
 * ```ts
 * // Using a cluster moniker
 * const client = createSolanaClient({ urlOrMoniker: 'devnet' });
 *
 * // Using a custom RPC URL
 * const client = createSolanaClient({ urlOrMoniker: 'https://my-rpc.example.com' });
 *
 * // Making RPC calls
 * const balance = await client.rpc.getBalance(address).send();
 * ```
 */
export function createSolanaClient(
    props: Omit<CreateSolanaClientArgs<MainnetUrl | 'mainnet'>, 'urlOrMoniker'> & {
        urlOrMoniker: 'mainnet';
    },
): SolanaClient<MainnetUrl>;
export function createSolanaClient(
    props: Omit<CreateSolanaClientArgs<DevnetUrl | 'devnet'>, 'urlOrMoniker'> & {
        urlOrMoniker: 'devnet';
    },
): SolanaClient<DevnetUrl>;
export function createSolanaClient(
    props: Omit<CreateSolanaClientArgs<TestnetUrl | 'testnet'>, 'urlOrMoniker'> & {
        urlOrMoniker: 'testnet';
    },
): SolanaClient<TestnetUrl>;
export function createSolanaClient(
    props: Omit<CreateSolanaClientArgs<LocalnetUrl | 'localnet'>, 'urlOrMoniker'> & {
        urlOrMoniker: 'localnet';
    },
): SolanaClient<LocalnetUrl>;
export function createSolanaClient<TClusterUrl extends ModifiedClusterUrl>(
    props: CreateSolanaClientArgs<TClusterUrl>,
): SolanaClient<TClusterUrl>;
export function createSolanaClient<TCluster extends ModifiedClusterUrl>({
    urlOrMoniker,
    rpcConfig,
    rpcSubscriptionsConfig,
}: CreateSolanaClientArgs<TCluster>): SolanaClient<TCluster> {
    if (!urlOrMoniker) throw new Error('Cluster url or moniker is required');

    let parsedUrl: URL;

    // Try to parse as URL first
    if (urlOrMoniker instanceof URL) {
        parsedUrl = urlOrMoniker;
    } else {
        try {
            parsedUrl = new URL(urlOrMoniker.toString());
        } catch {
            // Not a valid URL, try as moniker
            try {
                parsedUrl = new URL(getPublicSolanaRpcUrl(urlOrMoniker.toString() as 'mainnet' | 'devnet' | 'testnet' | 'localnet'));
            } catch {
                throw new Error('Invalid URL or cluster moniker');
            }
        }
    }

    if (!parsedUrl.protocol.match(/^https?:/i)) {
        throw new Error('Unsupported protocol. Only HTTP and HTTPS are supported');
    }

    // Apply custom port if specified
    if (rpcConfig?.port) {
        parsedUrl.port = rpcConfig.port.toString();
    }

    const rpcUrl = parsedUrl.toString();
    const rpc = createSolanaRpc(rpcUrl) as Rpc<SolanaRpcApi>;

    // Convert HTTP to WS for subscriptions
    parsedUrl.protocol = parsedUrl.protocol.replace('http', 'ws');

    // Apply WebSocket port if specified, or use default 8900 for localhost
    if (rpcSubscriptionsConfig?.port) {
        parsedUrl.port = rpcSubscriptionsConfig.port.toString();
    } else if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname.startsWith('127')) {
        parsedUrl.port = '8900';
    }

    const rpcSubscriptions = createSolanaRpcSubscriptions(parsedUrl.toString()) as RpcSubscriptions<SolanaRpcSubscriptionsApi>;

    return {
        rpc,
        rpcSubscriptions,
        urlOrMoniker: rpcUrl as TCluster,
    };
}






