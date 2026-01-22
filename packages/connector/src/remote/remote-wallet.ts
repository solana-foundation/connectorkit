/**
 * @solana/connector/remote - Remote Wallet Standard Adapter
 *
 * Creates a Wallet Standard compatible wallet that delegates signing
 * operations to a remote signer API endpoint.
 *
 * This keeps the browser bundle lean - no signing SDKs needed client-side.
 */

import type { Wallet, WalletAccount } from '@wallet-standard/base';
import type {
    StandardConnectFeature,
    StandardDisconnectFeature,
    StandardEventsFeature,
    StandardEventsListeners,
    StandardEventsNames,
} from '@wallet-standard/features';
import type {
    RemoteWalletConfig,
    RemoteSignerMetadata,
    SignTransactionRequest,
    SignAllTransactionsRequest,
    SignMessageRequest,
    SignAndSendTransactionRequest,
    SignTransactionResponse,
    SignAllTransactionsResponse,
    SignMessageResponse,
    SignAndSendTransactionResponse,
} from './protocol';
import { encodeBase64, decodeBase64, isErrorResponse } from './protocol';

// Default icon for remote wallets (data URI)
const DEFAULT_ICON =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAzMCAyOC4zMzE5IiBmaWxsPSJjdXJyZW50Q29sb3IiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGc+PHJlY3QgaGVpZ2h0PSIyNS4wODU1IiBvcGFjaXR5PSIwIiB3aWR0aD0iMjYuNTYyNSIgeD0iMCIgeT0iMCIvPjxwYXRoIGQ9Ik0xNy42NzgzIDE1LjEyNzdDMTcuNzc2MSAxNi41MzcgMTguNTE0NyAxNy43NzA5IDE5LjY1ODIgMTguNTI0MkwxOS42NTgyIDIxLjMxNjlDMTkuNjU1MSAyMS4zMTcxIDE5LjY1MTggMjEuMzE3MSAxOS42NDg0IDIxLjMxNzFMNi41NTI3MyAyMS4zMTcxQzUuNTA3ODEgMjEuMzE3MSA0Ljg4MjgxIDIwLjgyODkgNC44ODI4MSAyMC4wMTgzQzQuODgyODEgMTcuNDk4OCA4LjAzNzExIDE0LjAyMjIgMTMuMDk1NyAxNC4wMjIyQzE0Ljg4MDkgMTQuMDIyMiAxNi40Mjg2IDE0LjQ1MzUgMTcuNjc4MyAxNS4xMjc3Wk0xNy4wMTE3IDcuOTU3NzdDMTcuMDExNyAxMC4zOTkyIDE1LjE5NTMgMTIuMjc0MiAxMy4xMDU1IDEyLjI3NDJDMTEuMDA1OSAxMi4yNzQyIDkuMTk5MjIgMTAuMzk5MiA5LjE5OTIyIDcuOTc3M0M5LjE5OTIyIDUuNTg0NzIgMTEuMDE1NiAzLjc1ODU1IDEzLjEwNTUgMy43NTg1NUMxNS4xOTUzIDMuNzU4NTUgMTcuMDExNyA1LjU0NTY2IDE3LjAxMTcgNy45NTc3N1oiIGZpbGwtb3BhY2l0eT0iMC44NSIvPjxwYXRoIGQ9Ik0yMi4xMTkxIDExLjY5OEMyMC4zODA5IDExLjY5OCAxOS4wMDM5IDEzLjA5NDUgMTkuMDAzOSAxNC44MDM1QzE5LjAwMzkgMTYuMTMxNiAxOS43ODUyIDE3LjI1NDYgMjAuOTg2MyAxNy43MjM0TDIwLjk4NjMgMjIuNTU3NEMyMC45ODYzIDIyLjY3NDYgMjEuMDQ0OSAyMi43NjI1IDIxLjEyMyAyMi44NjAxTDIxLjk0MzQgMjMuNjgwNEMyMi4wNDEgMjMuNzc4MSAyMi4xNzc3IDIzLjc4NzggMjIuMjg1MiAyMy42ODA0TDIzLjgzNzkgMjIuMTM3NUMyMy45MzU1IDIyLjAzIDIzLjkzNTUgMjEuODkzMyAyMy44Mzc5IDIxLjc5NTdMMjIuODcxMSAyMC44Mjg5TDI0LjIwOSAxOS41MjAzQzI0LjMwNjYgMTkuNDMyNCAyNC4zMDY2IDE5LjI4NTkgMjQuMTg5NSAxOS4xNjg3TDIyLjg4MDkgMTcuODY5OUMyNC4zODQ4IDE3LjI1NDYgMjUuMjI0NiAxNi4xNjA5IDI1LjIyNDYgMTQuODAzNUMyNS4yMjQ2IDEzLjA5NDUgMjMuODM3OSAxMS42OTggMjIuMTE5MSAxMS42OThaTTIyLjEwOTQgMTMuMTUzMUMyMi42MzY3IDEzLjE1MzEgMjMuMDY2NCAxMy41ODI4IDIzLjA2NjQgMTQuMTEwMUMyMy4wNjY0IDE0LjY1NyAyMi42MzY3IDE1LjA4NjcgMjIuMTA5NCAxNS4wODY3QzIxLjU4MiAxNS4wODY3IDIxLjE0MjYgMTQuNjU3IDIxLjE0MjYgMTQuMTEwMUMyMS4xNDI2IDEzLjU4MjggMjEuNTcyMyAxMy4xNTMxIDIyLjEwOTQgMTMuMTUzMVoiIGZpbGwtb3BhY2l0eT0iMC44NSIvPjwvZz48L3N2Zz4=' as const;

// Default chains if none specified
const DEFAULT_CHAINS: `solana:${string}`[] = ['solana:mainnet', 'solana:devnet'];

// Types for Solana wallet standard features (inline to avoid dependency)
interface SignTransactionInput {
    transaction: Uint8Array;
    account?: WalletAccount;
    chain?: string;
}

interface SignMessageInput {
    message: Uint8Array;
    account?: WalletAccount;
}

interface SignAndSendTransactionInput {
    transaction: Uint8Array;
    account?: WalletAccount;
    chain?: string;
    options?: {
        skipPreflight?: boolean;
        maxRetries?: number;
        preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
    };
}

/**
 * Error thrown by remote wallet operations
 */
export class RemoteWalletError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: unknown,
    ) {
        super(message);
        this.name = 'RemoteWalletError';
    }
}

/**
 * Create a Wallet Standard compatible wallet that delegates to a remote signer API
 *
 * @param config - Configuration for the remote wallet
 * @returns A Wallet Standard wallet object
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
 * // Pass to Connector
 * <ConnectorProvider config={{ additionalWallets: [remoteWallet] }}>
 * ```
 */
export function createRemoteSignerWallet(config: RemoteWalletConfig): Wallet {
    const { endpoint, name, icon = DEFAULT_ICON, chains = DEFAULT_CHAINS, getAuthHeaders } = config;

    // Internal state
    let connected = false;
    let metadata: RemoteSignerMetadata | null = null;
    let accounts: WalletAccount[] = [];
    const eventListeners: Map<StandardEventsNames, Set<StandardEventsListeners[StandardEventsNames]>> = new Map();

    // Helper: make authenticated request
    async function request<T>(method: 'GET' | 'POST', body?: unknown): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (getAuthHeaders) {
            const authHeaders = await getAuthHeaders();
            Object.assign(headers, authHeaders);
        }

        const response = await fetch(endpoint, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await response.json();

        if (!response.ok || isErrorResponse(data)) {
            const errorData = isErrorResponse(data)
                ? data.error
                : { code: 'UNKNOWN', message: 'Request failed', details: undefined };
            throw new RemoteWalletError(errorData.message, errorData.code, errorData.details);
        }

        return data as T;
    }

    // Helper: emit event to listeners
    function emit<E extends StandardEventsNames>(event: E, ...args: Parameters<StandardEventsListeners[E]>) {
        const listeners = eventListeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    (listener as (...args: unknown[]) => void)(...args);
                } catch {
                    // Ignore listener errors
                }
            }
        }
    }

    // Build features object
    const features: Wallet['features'] = {
        // Standard connect
        'standard:connect': {
            version: '1.0.0',
            connect: async () => {
                if (connected && accounts.length > 0) {
                    return { accounts };
                }

                // Fetch metadata from server
                metadata = await request<RemoteSignerMetadata>('GET');

                // Create account from metadata
                const account: WalletAccount = {
                    address: metadata.address,
                    publicKey: new Uint8Array(32), // Placeholder - not needed for signing
                    chains: (metadata.chains || chains) as `${string}:${string}`[],
                    features: [
                        'solana:signTransaction',
                        ...(metadata.capabilities.signAllTransactions ? ['solana:signAllTransactions'] : []),
                        ...(metadata.capabilities.signMessage ? ['solana:signMessage'] : []),
                        ...(metadata.capabilities.signAndSendTransaction ? ['solana:signAndSendTransaction'] : []),
                    ] as `${string}:${string}`[],
                };

                accounts = [account];
                connected = true;

                emit('change', { accounts });

                return { accounts };
            },
        } satisfies StandardConnectFeature['standard:connect'],

        // Standard disconnect
        'standard:disconnect': {
            version: '1.0.0',
            disconnect: async () => {
                connected = false;
                accounts = [];
                metadata = null;
                emit('change', { accounts: [] });
            },
        } satisfies StandardDisconnectFeature['standard:disconnect'],

        // Standard events
        'standard:events': {
            version: '1.0.0',
            on: <E extends StandardEventsNames>(event: E, listener: StandardEventsListeners[E]) => {
                let listeners = eventListeners.get(event);
                if (!listeners) {
                    listeners = new Set();
                    eventListeners.set(event, listeners);
                }
                listeners.add(listener);

                return () => {
                    listeners?.delete(listener);
                    if (listeners?.size === 0) {
                        eventListeners.delete(event);
                    }
                };
            },
        } satisfies StandardEventsFeature['standard:events'],

        // Solana sign transaction
        'solana:signTransaction': {
            version: '1.0.0',
            supportedTransactionVersions: ['legacy', 0],
            signTransaction: async (...inputs: SignTransactionInput[]) => {
                if (!connected) {
                    throw new RemoteWalletError('Wallet not connected', 'NOT_CONNECTED');
                }

                const results: { signedTransaction: Uint8Array }[] = [];

                for (const input of inputs) {
                    const txBytes = input.transaction;
                    const req: SignTransactionRequest = {
                        operation: 'signTransaction',
                        transaction: encodeBase64(txBytes),
                    };

                    const response = await request<SignTransactionResponse>('POST', req);
                    results.push({
                        signedTransaction: decodeBase64(response.signedTransaction),
                    });
                }

                return results;
            },
        },

        // Solana sign all transactions (batch)
        'solana:signAllTransactions': {
            version: '1.0.0',
            supportedTransactionVersions: ['legacy', 0],
            signAllTransactions: async (...inputs: SignTransactionInput[]) => {
                if (!connected) {
                    throw new RemoteWalletError('Wallet not connected', 'NOT_CONNECTED');
                }

                // Collect all transactions from all inputs
                const allTxBytes: Uint8Array[] = [];
                for (const input of inputs) {
                    allTxBytes.push(input.transaction);
                }

                const req: SignAllTransactionsRequest = {
                    operation: 'signAllTransactions',
                    transactions: allTxBytes.map(tx => encodeBase64(tx)),
                };

                const response = await request<SignAllTransactionsResponse>('POST', req);

                return response.signedTransactions.map(signedTx => ({
                    signedTransaction: decodeBase64(signedTx),
                }));
            },
        },

        // Solana sign message
        'solana:signMessage': {
            version: '1.0.0',
            signMessage: async (...inputs: SignMessageInput[]) => {
                if (!connected) {
                    throw new RemoteWalletError('Wallet not connected', 'NOT_CONNECTED');
                }

                const results: { signedMessage: Uint8Array; signature: Uint8Array }[] = [];

                for (const input of inputs) {
                    const req: SignMessageRequest = {
                        operation: 'signMessage',
                        message: encodeBase64(input.message),
                    };

                    const response = await request<SignMessageResponse>('POST', req);
                    results.push({
                        signedMessage: input.message,
                        signature: decodeBase64(response.signature),
                    });
                }

                return results;
            },
        },

        // Solana sign and send transaction (optional)
        'solana:signAndSendTransaction': {
            version: '1.0.0',
            supportedTransactionVersions: ['legacy', 0],
            signAndSendTransaction: async (...inputs: SignAndSendTransactionInput[]) => {
                if (!connected) {
                    throw new RemoteWalletError('Wallet not connected', 'NOT_CONNECTED');
                }

                // Check if server supports this operation
                if (metadata && !metadata.capabilities.signAndSendTransaction) {
                    throw new RemoteWalletError(
                        'Server does not support signAndSendTransaction',
                        'UNSUPPORTED_OPERATION',
                    );
                }

                const results: { signature: Uint8Array }[] = [];

                for (const input of inputs) {
                    const req: SignAndSendTransactionRequest = {
                        operation: 'signAndSendTransaction',
                        transaction: encodeBase64(input.transaction),
                        options: input.options,
                    };

                    const response = await request<SignAndSendTransactionResponse>('POST', req);

                    // Convert base58 signature to bytes
                    // Signature is 64 bytes, base58 encoded
                    const sigBytes = base58ToBytes(response.signature);
                    results.push({ signature: sigBytes });
                }

                return results;
            },
        },
    };

    // Build the wallet object
    const wallet: Wallet = {
        version: '1.0.0',
        name,
        icon: icon as `data:image/${'svg+xml' | 'webp' | 'png' | 'gif'};base64,${string}`,
        chains,
        features,
        accounts: [],
    };

    // Make accounts reactive via getter
    Object.defineProperty(wallet, 'accounts', {
        get: () => accounts,
        enumerable: true,
    });

    return wallet;
}

/**
 * Convert base58 string to bytes
 * Simple implementation for signature conversion
 */
function base58ToBytes(base58: string): Uint8Array {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const ALPHABET_MAP = new Map<string, number>();
    for (let i = 0; i < ALPHABET.length; i++) {
        ALPHABET_MAP.set(ALPHABET[i], i);
    }

    const bytes: number[] = [0];
    for (const char of base58) {
        const value = ALPHABET_MAP.get(char);
        if (value === undefined) {
            throw new Error(`Invalid base58 character: ${char}`);
        }

        let carry = value;
        for (let i = 0; i < bytes.length; i++) {
            carry += bytes[i] * 58;
            bytes[i] = carry & 0xff;
            carry >>= 8;
        }
        while (carry > 0) {
            bytes.push(carry & 0xff);
            carry >>= 8;
        }
    }

    // Handle leading zeros
    for (const char of base58) {
        if (char === '1') {
            bytes.push(0);
        } else {
            break;
        }
    }

    return new Uint8Array(bytes.reverse());
}
