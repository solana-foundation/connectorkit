/**
 * @solana/connector/remote - Protocol Types
 *
 * Defines the HTTP protocol for communication between the browser-side
 * remote wallet adapter and the server-side signer endpoint.
 *
 * All byte payloads use base64 encoding for JSON transport.
 */

// ============================================================================
// Metadata (GET response)
// ============================================================================

/**
 * Capabilities advertised by the remote signer
 */
export interface RemoteSignerCapabilities {
    /** Supports signing individual transactions */
    signTransaction: boolean;
    /** Supports batch signing multiple transactions */
    signAllTransactions: boolean;
    /** Supports signing arbitrary messages */
    signMessage: boolean;
    /** Supports sign + send in one operation (server broadcasts) */
    signAndSendTransaction: boolean;
}

/**
 * Response from GET /signer endpoint
 * Returns signer metadata and capabilities
 */
export interface RemoteSignerMetadata {
    /** Signer's Solana address (base58) */
    address: string;
    /** Supported Solana chains (e.g., ['solana:mainnet', 'solana:devnet']) */
    chains: string[];
    /** Signer capabilities */
    capabilities: RemoteSignerCapabilities;
    /** Optional human-readable name */
    name?: string;
    /** Optional icon URL (data URI or https) */
    icon?: string;
}

// ============================================================================
// Operations (POST request/response)
// ============================================================================

/**
 * Base request structure for all POST operations
 */
export interface RemoteSignerRequestBase {
    /** Operation type */
    operation: 'signTransaction' | 'signAllTransactions' | 'signMessage' | 'signAndSendTransaction';
}

/**
 * Sign a single transaction
 */
export interface SignTransactionRequest extends RemoteSignerRequestBase {
    operation: 'signTransaction';
    /** Base64-encoded transaction bytes */
    transaction: string;
}

/**
 * Sign multiple transactions
 */
export interface SignAllTransactionsRequest extends RemoteSignerRequestBase {
    operation: 'signAllTransactions';
    /** Array of base64-encoded transaction bytes */
    transactions: string[];
}

/**
 * Sign an arbitrary message
 */
export interface SignMessageRequest extends RemoteSignerRequestBase {
    operation: 'signMessage';
    /** Base64-encoded message bytes */
    message: string;
}

/**
 * Sign and send a transaction (server broadcasts to RPC)
 */
export interface SignAndSendTransactionRequest extends RemoteSignerRequestBase {
    operation: 'signAndSendTransaction';
    /** Base64-encoded transaction bytes */
    transaction: string;
    /** Optional send options */
    options?: {
        /** Skip preflight simulation */
        skipPreflight?: boolean;
        /** Maximum retries */
        maxRetries?: number;
        /** Preflight commitment level */
        preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
    };
}

/**
 * Union type for all POST request bodies
 */
export type RemoteSignerRequest =
    | SignTransactionRequest
    | SignAllTransactionsRequest
    | SignMessageRequest
    | SignAndSendTransactionRequest;

// ============================================================================
// Responses
// ============================================================================

/**
 * Successful response for signTransaction
 */
export interface SignTransactionResponse {
    /** Base64-encoded signed transaction bytes */
    signedTransaction: string;
}

/**
 * Successful response for signAllTransactions
 */
export interface SignAllTransactionsResponse {
    /** Array of base64-encoded signed transaction bytes */
    signedTransactions: string[];
}

/**
 * Successful response for signMessage
 */
export interface SignMessageResponse {
    /** Base64-encoded signature bytes (64 bytes) */
    signature: string;
}

/**
 * Successful response for signAndSendTransaction
 */
export interface SignAndSendTransactionResponse {
    /** Transaction signature (base58) */
    signature: string;
}

/**
 * Error response structure
 */
export interface RemoteSignerErrorResponse {
    error: {
        /** Error code for programmatic handling */
        code: RemoteSignerErrorCode;
        /** Human-readable error message */
        message: string;
        /** Optional additional details */
        details?: unknown;
    };
}

/**
 * Error codes returned by the signer endpoint
 */
export type RemoteSignerErrorCode =
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'INVALID_REQUEST'
    | 'INVALID_OPERATION'
    | 'SIGNING_FAILED'
    | 'SEND_FAILED'
    | 'POLICY_VIOLATION'
    | 'PROVIDER_ERROR'
    | 'INTERNAL_ERROR';

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type guard for checking if a response is an error
 */
export function isErrorResponse(response: unknown): response is RemoteSignerErrorResponse {
    return (
        typeof response === 'object' &&
        response !== null &&
        'error' in response &&
        typeof (response as RemoteSignerErrorResponse).error === 'object'
    );
}

/**
 * Configuration for creating a remote wallet
 */
export interface RemoteWalletConfig {
    /** Signer API endpoint URL */
    endpoint: string;
    /** Wallet name shown in UI */
    name: string;
    /** Wallet icon (data URI or URL) */
    icon?: string;
    /** Supported chains (defaults to mainnet + devnet) */
    chains?: `solana:${string}`[];
    /**
     * Function to get auth headers for requests
     * Called before each request to allow dynamic tokens
     */
    getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
}

// ============================================================================
// Base64 Helpers (for protocol encoding)
// ============================================================================

/**
 * Encode Uint8Array to base64 string
 */
export function encodeBase64(bytes: Uint8Array): string {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(bytes).toString('base64');
    }
    // Browser fallback
    const binary = Array.from(bytes)
        .map(b => String.fromCharCode(b))
        .join('');
    return btoa(binary);
}

/**
 * Decode base64 string to Uint8Array
 */
export function decodeBase64(base64: string): Uint8Array {
    if (typeof Buffer !== 'undefined') {
        return new Uint8Array(Buffer.from(base64, 'base64'));
    }
    // Browser fallback
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
