/**
 * @solana/connector - Kit Client Factory
 *
 * Creates a Solana RPC and WebSocket subscriptions client on top of kit's
 * plugin architecture (`createClient` + `@solana/kit-plugin-rpc`).
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
import { createClient } from '@solana/kit';
import { solanaRpcConnection } from '@solana/kit-plugin-rpc';

import type { LocalnetUrl, ModifiedClusterUrl, SolanaClientUrlOrMoniker } from './rpc';
import { getPublicSolanaRpcUrl, getWebSocketUrl } from './rpc';

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
 * Resolve a URL or cluster moniker to a validated HTTP(S) RPC URL.
 */
function resolveRpcUrl(urlOrMoniker: SolanaClientUrlOrMoniker, port?: number): URL {
    let parsedUrl: URL;

    if (urlOrMoniker instanceof URL) {
        parsedUrl = urlOrMoniker;
    } else {
        try {
            parsedUrl = new URL(urlOrMoniker.toString());
        } catch {
            try {
                parsedUrl = new URL(
                    getPublicSolanaRpcUrl(urlOrMoniker.toString() as 'mainnet' | 'devnet' | 'testnet' | 'localnet'),
                );
            } catch {
                throw new Error('Invalid URL or cluster moniker');
            }
        }
    }

    if (!parsedUrl.protocol.match(/^https?:/i)) {
        throw new Error('Unsupported protocol. Only HTTP and HTTPS are supported');
    }

    if (port) {
        parsedUrl.port = port.toString();
    }

    return parsedUrl;
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

    const rpcUrl = resolveRpcUrl(urlOrMoniker, rpcConfig?.port).toString();

    let rpcSubscriptionsUrl = getWebSocketUrl(rpcUrl);
    if (rpcSubscriptionsConfig?.port) {
        const wsUrl = new URL(rpcSubscriptionsUrl);
        wsUrl.port = rpcSubscriptionsConfig.port.toString();
        rpcSubscriptionsUrl = wsUrl.toString();
    }

    const { rpc, rpcSubscriptions } = createClient().use(solanaRpcConnection({ rpcUrl, rpcSubscriptionsUrl }));

    return {
        rpc: rpc as Rpc<SolanaRpcApi>,
        rpcSubscriptions: rpcSubscriptions as RpcSubscriptions<SolanaRpcSubscriptionsApi>,
        urlOrMoniker: rpcUrl as TCluster,
    };
}
