/**
 * @solana/connector/server - Route Handlers
 *
 * Creates Next.js Route Handler compatible GET/POST handlers for remote signing.
 * Designed for Node.js runtime (not Edge) to support crypto operations.
 */

import type {
    RemoteSignerMetadata,
    RemoteSignerCapabilities,
    RemoteSignerRequest,
    SignTransactionResponse,
    SignAllTransactionsResponse,
    SignMessageResponse,
    SignAndSendTransactionResponse,
    RemoteSignerErrorCode,
    RemoteSignerErrorResponse,
} from '../remote/protocol';
import { decodeBase64, encodeBase64 } from '../remote/protocol';

// ============================================================================
// Types
// ============================================================================

/**
 * Signer interface that providers must implement
 */
export interface RemoteSigner {
    /** Signer's Solana address (base58) */
    readonly address: string;

    /** Sign transaction bytes, return signed transaction bytes */
    signTransaction(transactionBytes: Uint8Array): Promise<Uint8Array>;

    /** Sign multiple transactions */
    signAllTransactions(transactions: Uint8Array[]): Promise<Uint8Array[]>;

    /** Sign a message, return 64-byte signature */
    signMessage(message: Uint8Array): Promise<Uint8Array>;

    /** Check if signer is available/healthy */
    isAvailable(): Promise<boolean>;
}

/**
 * Provider configuration
 */
export type ProviderType = 'fireblocks' | 'privy' | 'custom';

export interface FireblocksProviderConfig {
    type: 'fireblocks';
    /** Fireblocks API key */
    apiKey: string;
    /** RSA private key PEM for JWT signing */
    privateKeyPem: string;
    /** Vault account ID */
    vaultAccountId: string;
    /** Asset ID (default: 'SOL') */
    assetId?: string;
    /** API base URL (default: https://api.fireblocks.io) */
    apiBaseUrl?: string;
}

export interface PrivyProviderConfig {
    type: 'privy';
    /** Privy app ID */
    appId: string;
    /** Privy app secret */
    appSecret: string;
    /** Privy wallet ID */
    walletId: string;
    /** API base URL (default: https://api.privy.io/v1) */
    apiBaseUrl?: string;
}

export interface CustomProviderConfig {
    type: 'custom';
    /** Custom signer implementation */
    signer: RemoteSigner;
}

export type ProviderConfig = FireblocksProviderConfig | PrivyProviderConfig | CustomProviderConfig;

/**
 * Authorization callback
 */
export type AuthorizeCallback = (request: Request) => Promise<boolean> | boolean;

/**
 * Policy validation callback
 */
export interface PolicyHooks {
    /** Validate a transaction before signing (return false to reject) */
    validateTransaction?: (transactionBytes: Uint8Array, request: Request) => Promise<boolean> | boolean;
    /** Validate a message before signing (return false to reject) */
    validateMessage?: (messageBytes: Uint8Array, request: Request) => Promise<boolean> | boolean;
}

/**
 * RPC configuration for sign+send operations
 */
export interface RpcConfig {
    /** Solana RPC endpoint URL */
    url: string;
    /** Commitment level for confirmations */
    commitment?: 'processed' | 'confirmed' | 'finalized';
}

/**
 * Route handler configuration
 */
export interface RemoteSignerRouteHandlersConfig {
    /** Provider configuration */
    provider: ProviderConfig;
    /**
     * Authorization callback. Default: checks for Authorization header matching CONNECTOR_SIGNER_TOKEN env var.
     * Return true to allow, false to reject.
     */
    authorize?: AuthorizeCallback;
    /** Policy hooks for transaction/message validation */
    policy?: PolicyHooks;
    /** RPC configuration (required for signAndSendTransaction) */
    rpc?: RpcConfig;
    /** Supported chains (default: ['solana:mainnet', 'solana:devnet']) */
    chains?: string[];
    /** Wallet name shown in metadata */
    name?: string;
    /** Wallet icon URL */
    icon?: string;
}

/**
 * Next.js compatible request/response types
 */
export interface NextRequest extends Request {
    // Next.js adds extra properties, but we only need standard Request
}

export type NextResponse = Response;

/**
 * Route handlers object returned by the factory
 */
export interface RouteHandlers {
    GET: (request: NextRequest) => Promise<NextResponse>;
    POST: (request: NextRequest) => Promise<NextResponse>;
}

// ============================================================================
// Helper functions
// ============================================================================

function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function errorResponse(code: RemoteSignerErrorCode, message: string, status = 400, details?: unknown): Response {
    const body: RemoteSignerErrorResponse = {
        error: { code, message, details },
    };
    return jsonResponse(body, status);
}

/**
 * Default authorization: check Authorization header against CONNECTOR_SIGNER_TOKEN env var
 */
function defaultAuthorize(request: Request): boolean {
    const token = process.env.CONNECTOR_SIGNER_TOKEN;
    if (!token) {
        // No token configured = reject all (safe default)
        console.warn('[connector/server] CONNECTOR_SIGNER_TOKEN not set - rejecting all requests');
        return false;
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return false;
    }

    // Support "Bearer <token>" format
    const parts = authHeader.split(' ');
    const providedToken = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : authHeader;

    return providedToken === token;
}

/**
 * Send a signed transaction to Solana RPC
 */
async function sendTransaction(rpc: RpcConfig, signedTxBytes: Uint8Array): Promise<string> {
    const base64Tx = encodeBase64(signedTxBytes);

    const response = await fetch(rpc.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'sendTransaction',
            params: [
                base64Tx,
                {
                    encoding: 'base64',
                    skipPreflight: false,
                    preflightCommitment: rpc.commitment || 'confirmed',
                },
            ],
        }),
    });

    const result = await response.json();

    if (result.error) {
        throw new Error(result.error.message || 'RPC error');
    }

    return result.result as string;
}

// ============================================================================
// Provider loader
// ============================================================================

let cachedSigner: RemoteSigner | null = null;

async function loadSigner(config: ProviderConfig): Promise<RemoteSigner> {
    if (cachedSigner) {
        return cachedSigner;
    }

    if (config.type === 'custom') {
        cachedSigner = config.signer;
        return cachedSigner;
    }

    if (config.type === 'fireblocks') {
        const { loadFireblocksSigner } = await import('./providers/fireblocks');
        cachedSigner = await loadFireblocksSigner(config);
        return cachedSigner;
    }

    if (config.type === 'privy') {
        const { loadPrivySigner } = await import('./providers/privy');
        cachedSigner = await loadPrivySigner(config);
        return cachedSigner;
    }

    throw new Error(`Unknown provider type: ${(config as ProviderConfig).type}`);
}

// ============================================================================
// Route Handler Factory
// ============================================================================

/**
 * Create Next.js Route Handlers for remote signing
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
export function createRemoteSignerRouteHandlers(config: RemoteSignerRouteHandlersConfig): RouteHandlers {
    const {
        provider,
        authorize = defaultAuthorize,
        policy,
        rpc,
        chains = ['solana:mainnet', 'solana:devnet'],
        name = 'Remote Signer',
        icon,
    } = config;

    // GET handler: return signer metadata
    async function GET(request: NextRequest): Promise<NextResponse> {
        try {
            // Check authorization
            const authorized = await authorize(request);
            if (!authorized) {
                return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
            }

            // Load signer
            const signer = await loadSigner(provider);

            // Check availability
            const available = await signer.isAvailable();
            if (!available) {
                return errorResponse('PROVIDER_ERROR', 'Signer not available', 503);
            }

            // Build capabilities
            const capabilities: RemoteSignerCapabilities = {
                signTransaction: true,
                signAllTransactions: true,
                signMessage: true,
                signAndSendTransaction: Boolean(rpc),
            };

            // Build metadata response
            const metadata: RemoteSignerMetadata = {
                address: signer.address,
                chains,
                capabilities,
                name,
                icon,
            };

            return jsonResponse(metadata);
        } catch (error) {
            console.error('[connector/server] GET error:', error);
            return errorResponse(
                'INTERNAL_ERROR',
                error instanceof Error ? error.message : 'Internal server error',
                500,
            );
        }
    }

    // POST handler: handle signing operations
    async function POST(request: NextRequest): Promise<NextResponse> {
        try {
            // Check authorization
            const authorized = await authorize(request);
            if (!authorized) {
                return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
            }

            // Parse request body
            let body: RemoteSignerRequest;
            try {
                body = await request.json();
            } catch {
                return errorResponse('INVALID_REQUEST', 'Invalid JSON body', 400);
            }

            if (!body.operation) {
                return errorResponse('INVALID_REQUEST', 'Missing operation field', 400);
            }

            // Load signer
            const signer = await loadSigner(provider);

            // Handle operations
            switch (body.operation) {
                case 'signTransaction': {
                    if (!body.transaction) {
                        return errorResponse('INVALID_REQUEST', 'Missing transaction field', 400);
                    }

                    const txBytes = decodeBase64(body.transaction);

                    // Policy check
                    if (policy?.validateTransaction) {
                        const allowed = await policy.validateTransaction(txBytes, request);
                        if (!allowed) {
                            return errorResponse('POLICY_VIOLATION', 'Transaction rejected by policy', 403);
                        }
                    }

                    const signedTx = await signer.signTransaction(txBytes);
                    const response: SignTransactionResponse = {
                        signedTransaction: encodeBase64(signedTx),
                    };
                    return jsonResponse(response);
                }

                case 'signAllTransactions': {
                    if (!body.transactions || !Array.isArray(body.transactions)) {
                        return errorResponse('INVALID_REQUEST', 'Missing transactions array', 400);
                    }

                    const txBytesArray = body.transactions.map(tx => decodeBase64(tx));

                    // Policy check for each transaction
                    if (policy?.validateTransaction) {
                        for (const txBytes of txBytesArray) {
                            const allowed = await policy.validateTransaction(txBytes, request);
                            if (!allowed) {
                                return errorResponse('POLICY_VIOLATION', 'Transaction rejected by policy', 403);
                            }
                        }
                    }

                    const signedTxs = await signer.signAllTransactions(txBytesArray);
                    const response: SignAllTransactionsResponse = {
                        signedTransactions: signedTxs.map(tx => encodeBase64(tx)),
                    };
                    return jsonResponse(response);
                }

                case 'signMessage': {
                    if (!body.message) {
                        return errorResponse('INVALID_REQUEST', 'Missing message field', 400);
                    }

                    const messageBytes = decodeBase64(body.message);

                    // Policy check
                    if (policy?.validateMessage) {
                        const allowed = await policy.validateMessage(messageBytes, request);
                        if (!allowed) {
                            return errorResponse('POLICY_VIOLATION', 'Message rejected by policy', 403);
                        }
                    }

                    const signature = await signer.signMessage(messageBytes);
                    const response: SignMessageResponse = {
                        signature: encodeBase64(signature),
                    };
                    return jsonResponse(response);
                }

                case 'signAndSendTransaction': {
                    if (!rpc) {
                        return errorResponse('INVALID_OPERATION', 'signAndSendTransaction not enabled', 400);
                    }

                    if (!body.transaction) {
                        return errorResponse('INVALID_REQUEST', 'Missing transaction field', 400);
                    }

                    const txBytes = decodeBase64(body.transaction);

                    // Policy check
                    if (policy?.validateTransaction) {
                        const allowed = await policy.validateTransaction(txBytes, request);
                        if (!allowed) {
                            return errorResponse('POLICY_VIOLATION', 'Transaction rejected by policy', 403);
                        }
                    }

                    // Sign
                    const signedTx = await signer.signTransaction(txBytes);

                    // Send
                    try {
                        const signature = await sendTransaction(rpc, signedTx);
                        const response: SignAndSendTransactionResponse = { signature };
                        return jsonResponse(response);
                    } catch (error) {
                        return errorResponse(
                            'SEND_FAILED',
                            error instanceof Error ? error.message : 'Failed to send transaction',
                            500,
                        );
                    }
                }

                default:
                    return errorResponse('INVALID_OPERATION', `Unknown operation: ${(body as { operation: string }).operation}`, 400);
            }
        } catch (error) {
            console.error('[connector/server] POST error:', error);

            // Check for known signer errors
            if (error instanceof Error) {
                if (error.message.includes('rate limit') || error.message.includes('429')) {
                    return errorResponse('PROVIDER_ERROR', 'Rate limited, please retry', 429);
                }
            }

            return errorResponse(
                'SIGNING_FAILED',
                error instanceof Error ? error.message : 'Signing failed',
                500,
            );
        }
    }

    return { GET, POST };
}
