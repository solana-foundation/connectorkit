/**
 * @solana/connector/remote
 *
 * Browser-side remote wallet adapter for server-backed signing.
 * Creates a Wallet Standard compatible wallet that delegates to a signer API.
 *
 * @example
 * ```typescript
 * import { createRemoteSignerWallet } from '@solana/connector/remote';
 *
 * const remoteWallet = createRemoteSignerWallet({
 *   endpoint: '/api/connector-signer',
 *   name: 'Treasury Signer',
 *   getAuthHeaders: () => ({
 *     'Authorization': `Bearer ${getSessionToken()}`
 *   })
 * });
 *
 * // Pass to Connector via additionalWallets
 * <ConnectorProvider config={{ additionalWallets: [remoteWallet] }}>
 *   <App />
 * </ConnectorProvider>
 * ```
 */

// Main factory
export { createRemoteSignerWallet, RemoteWalletError } from './remote-wallet';

// Protocol types (for advanced usage / custom implementations)
export type {
    RemoteWalletConfig,
    RemoteSignerMetadata,
    RemoteSignerCapabilities,
    RemoteSignerRequest,
    SignTransactionRequest,
    SignAllTransactionsRequest,
    SignMessageRequest,
    SignAndSendTransactionRequest,
    SignTransactionResponse,
    SignAllTransactionsResponse,
    SignMessageResponse,
    SignAndSendTransactionResponse,
    RemoteSignerErrorResponse,
    RemoteSignerErrorCode,
} from './protocol';

// Protocol utilities
export { encodeBase64, decodeBase64, isErrorResponse } from './protocol';
