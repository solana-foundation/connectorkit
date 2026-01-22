/**
 * @solana/connector/server
 *
 * Server-side route handlers for remote signing with Fireblocks, Privy, and custom providers.
 * Designed for Next.js Route Handlers (App Router) with Node.js runtime.
 *
 * @example
 * ```typescript
 * // app/api/connector-signer/route.ts
 * import { createRemoteSignerRouteHandlers } from '@solana/connector/server';
 *
 * const { GET, POST } = createRemoteSignerRouteHandlers({
 *   provider: {
 *     type: 'fireblocks',
 *     apiKey: process.env.FIREBLOCKS_API_KEY!,
 *     privateKeyPem: process.env.FIREBLOCKS_PRIVATE_KEY!,
 *     vaultAccountId: process.env.FIREBLOCKS_VAULT_ID!,
 *   },
 *   rpc: {
 *     url: process.env.SOLANA_RPC_URL!,
 *   },
 * });
 *
 * export { GET, POST };
 * export const runtime = 'nodejs';
 * ```
 */

// Main factory
export { createRemoteSignerRouteHandlers } from './route-handlers';

// Types
export type {
    RemoteSigner,
    ProviderType,
    ProviderConfig,
    FireblocksProviderConfig,
    PrivyProviderConfig,
    CustomProviderConfig,
    AuthorizeCallback,
    PolicyHooks,
    RpcConfig,
    RemoteSignerRouteHandlersConfig,
    RouteHandlers,
    NextRequest,
    NextResponse,
} from './route-handlers';

// Re-export protocol types that server implementations might need
export type {
    RemoteSignerMetadata,
    RemoteSignerCapabilities,
    RemoteSignerRequest,
    RemoteSignerErrorCode,
    RemoteSignerErrorResponse,
} from '../remote/protocol';
