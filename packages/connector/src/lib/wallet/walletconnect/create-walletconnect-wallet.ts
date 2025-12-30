/**
 * WalletConnect Wallet Standard Shim
 *
 * Creates a Wallet Standard-compatible wallet that proxies all operations
 * to WalletConnect Solana JSON-RPC methods.
 *
 * @see https://docs.walletconnect.network/wallet-sdk/chain-support/solana
 */

import type { Wallet, WalletAccount, WalletIcon } from '@wallet-standard/base';
import type {
    WalletConnectConfig,
    WalletConnectTransport,
    WalletConnectSolanaAccount,
    WalletConnectSignMessageResult,
    WalletConnectSignTransactionResult,
    WalletConnectSignAllTransactionsResult,
    WalletConnectSignAndSendTransactionResult,
} from '../../../types/walletconnect';
import { getBase58Encoder, getBase58Decoder } from '@solana/codecs';

// WalletConnect icon (official WC logo as SVG data URI)
const WALLETCONNECT_ICON: WalletIcon =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzMzOTZGRiIvPgo8cGF0aCBkPSJNOS42IDEyLjRDMTMuMSA5IDE4LjkgOSAyMi40IDEyLjRMMjIuOSAxMi45QzIzLjEgMTMuMSAyMy4xIDEzLjQgMjIuOSAxMy42TDIxLjQgMTUuMUMyMS4zIDE1LjIgMjEuMSAxNS4yIDIxIDE1LjFMMjAuMyAxNC40QzE4IDEyLjIgMTQgMTIuMiAxMS43IDE0LjRMMTEgMTUuMUMxMC45IDE1LjIgMTAuNyAxNS4yIDEwLjYgMTUuMUw5LjEgMTMuNkM4LjkgMTMuNCA4LjkgMTMuMSA5LjEgMTIuOUw5LjYgMTIuNFpNMjUuMyAxNS4yTDI2LjYgMTYuNUMyNi44IDE2LjcgMjYuOCAxNyAyNi42IDE3LjJMMjAuNyAyMy4xQzIwLjUgMjMuMyAyMC4yIDIzLjMgMjAgMjMuMUwxNS45IDE5QzE1LjggMTguOSAxNS43IDE4LjkgMTUuNiAxOUwxMS41IDIzLjFDMTEuMyAyMy4zIDExIDIzLjMgMTAuOCAyMy4xTDQuOSAxNy4yQzQuNyAxNyA0LjcgMTYuNyA0LjkgMTYuNUw2LjIgMTUuMkM2LjQgMTUgNi43IDE1IDYuOSAxNS4yTDExIDE5LjNDMTEuMSAxOS40IDExLjIgMTkuNCAxMS4zIDE5LjNMMTUuNCAxNS4yQzE1LjYgMTUgMTUuOSAxNSAxNi4xIDE1LjJMMjAuMiAxOS4zQzIwLjMgMTkuNCAyMC40IDE5LjQgMjAuNSAxOS4zTDI0LjYgMTUuMkMyNC44IDE1IDI1LjEgMTUgMjUuMyAxNS4yWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==';

import { SOLANA_CAIP_CHAINS } from './universal-provider';

// Default supported chains
const DEFAULT_CHAINS = ['solana:mainnet', 'solana:devnet', 'solana:testnet'] as const;

function toCaipChainId(chainId: string): string {
    return SOLANA_CAIP_CHAINS[chainId as keyof typeof SOLANA_CAIP_CHAINS] || chainId;
}

/**
 * Encode bytes to base64
 */
function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Decode base64 to bytes
 */
function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Check if a string is likely base58 encoded (vs base64)
 * Base58 doesn't use: 0, O, I, l, +, /, =
 * If any of these are present, it's likely base64
 */
function isLikelyBase58(str: string): boolean {
    // Base64 characters that are NOT in base58
    return !/[0OIl+/=]/.test(str);
}

/**
 * Decode a transaction string that could be base58 or base64
 * Some wallets (like Backpack) return base58, others return base64
 */
function decodeTransaction(encoded: string): Uint8Array {
    if (isLikelyBase58(encoded)) {
        // Note: getBase58Encoder().encode() takes a base58 string and returns bytes
        // Convert ReadonlyUint8Array to Uint8Array
        const readonlyBytes = getBase58Encoder().encode(encoded);
        return new Uint8Array(readonlyBytes);
    } else {
        return base64ToBytes(encoded);
    }
}

/**
 * Decode shortvec-encoded length prefix from serialized transaction
 */
function decodeShortVecLength(data: Uint8Array): { length: number; bytesConsumed: number } {
    let length = 0;
    let size = 0;

    for (;;) {
        if (size >= data.length) {
            throw new Error('Invalid shortvec encoding: unexpected end of data');
        }
        const byte = data[size];
        length |= (byte & 0x7f) << (size * 7);
        size += 1;

        if ((byte & 0x80) === 0) {
            break;
        }
        if (size > 10) {
            throw new Error('Invalid shortvec encoding: length prefix too long');
        }
    }

    return { length, bytesConsumed: size };
}

/**
 * Parse transaction message to find the index of a signer
 */
function findSignerIndex(txBytes: Uint8Array, signerPubkeyBase58: string): number {
    const { length: numSignatures, bytesConsumed: sigCountSize } = decodeShortVecLength(txBytes);
    const messageOffset = sigCountSize + numSignatures * 64;
    const messageBytes = txBytes.subarray(messageOffset);

    // Parse message header
    let offset = 0;

    // Check for version byte (0x80 = version 0)
    if (messageBytes[0] === 0x80) {
        offset = 1;
    }

    // Read header (3 bytes)
    const numSignerAccounts = messageBytes[offset];
    offset += 3;

    // Read static accounts array
    const { length: numStaticAccounts, bytesConsumed } = decodeShortVecLength(messageBytes.subarray(offset));
    offset += bytesConsumed;

    // Search for the signer pubkey in the static accounts
    const base58Decoder = getBase58Decoder();
    for (let i = 0; i < Math.min(numStaticAccounts, numSignerAccounts); i++) {
        const accountBytes = messageBytes.subarray(offset + i * 32, offset + (i + 1) * 32);
        const accountAddress = base58Decoder.decode(accountBytes);
        if (accountAddress === signerPubkeyBase58) {
            return i;
        }
    }

    return -1;
}

/**
 * Inject a signature into a serialized transaction at the specified signer index
 */
function injectSignature(txBytes: Uint8Array, signerIndex: number, signatureBase58: string): Uint8Array {
    const { bytesConsumed: sigCountSize } = decodeShortVecLength(txBytes);

    // Decode signature from base58 to bytes
    const signatureBytes = getBase58Encoder().encode(signatureBase58);
    if (signatureBytes.length !== 64) {
        throw new Error(`Invalid signature length: expected 64 bytes, got ${signatureBytes.length}`);
    }

    // Create a copy and inject the signature
    const result = new Uint8Array(txBytes);
    const signatureOffset = sigCountSize + signerIndex * 64;
    result.set(signatureBytes, signatureOffset);

    return result;
}

/**
 * Convert WalletConnect account response to Wallet Standard account
 */
function toWalletAccount(account: WalletConnectSolanaAccount, chains: readonly string[]): WalletAccount {
    const base58Encoder = getBase58Encoder();
    return {
        address: account.pubkey,
        publicKey: base58Encoder.encode(account.pubkey),
        chains: chains as `${string}:${string}`[],
        features: [],
    };
}

/**
 * Create a Wallet Standard-compatible wallet that uses WalletConnect
 */
export function createWalletConnectWallet(
    config: WalletConnectConfig,
    transport: WalletConnectTransport,
): Wallet {
    const chains = (config.defaultChain ? [config.defaultChain] : DEFAULT_CHAINS) as readonly `${string}:${string}`[];
    
    // Function to get the current CAIP chain ID dynamically
    function getCurrentCaipChainId(): string {
        const currentChain = config.getCurrentChain?.() || config.defaultChain || 'solana:mainnet';
        return toCaipChainId(currentChain);
    }

    let accounts: WalletAccount[] = [];
    const changeListeners = new Set<(props: { accounts?: readonly WalletAccount[] }) => void>();

    function emitChange() {
        changeListeners.forEach(fn => fn({ accounts }));
    }

    const wallet: Wallet = {
        version: '1.0.0',
        name: 'WalletConnect',
        icon: WALLETCONNECT_ICON,
        chains,
        get accounts() {
            return accounts;
        },
        features: {
            // Standard connect feature
            'standard:connect': {
                version: '1.0.0',
                connect: async (input?: { silent?: boolean }) => {
                    await transport.connect();

                    // First, try to get accounts from the session namespaces (most reliable)
                    const sessionAccounts = transport.getSessionAccounts();
                    
                    if (sessionAccounts.length > 0) {
                        accounts = sessionAccounts.map(pubkey => toWalletAccount({ pubkey }, chains));
                        emitChange();
                        return { accounts };
                    }

                    // Fallback: Try RPC methods if session doesn't have accounts
                    const method = input?.silent ? 'solana_getAccounts' : 'solana_requestAccounts';
                    let result: WalletConnectSolanaAccount[];
                    let firstError: unknown;

                    try {
                        result = await transport.request<WalletConnectSolanaAccount[]>({
                            method,
                            params: {},
                            chainId: getCurrentCaipChainId(),
                        });
                    } catch (error) {
                        firstError = error;
                        // Fallback to the other method
                        try {
                            const fallbackMethod = method === 'solana_getAccounts' 
                                ? 'solana_requestAccounts' 
                                : 'solana_getAccounts';
                            result = await transport.request<WalletConnectSolanaAccount[]>({
                                method: fallbackMethod,
                                params: {},
                                chainId: getCurrentCaipChainId(),
                            });
                        } catch (fallbackError) {
                            const firstMessage = firstError instanceof Error ? firstError.message : String(firstError);
                            const fallbackMessage =
                                fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                            const details = [firstMessage, fallbackMessage].filter(Boolean).join(' | ');
                            throw new Error(
                                `Failed to get accounts from WalletConnect. The wallet may not support Solana accounts.${
                                    details ? ` (Details: ${details})` : ''
                                }`,
                            );
                        }
                    }

                    // Map to Wallet Standard accounts
                    accounts = Array.isArray(result) ? result.map(acc => toWalletAccount(acc, chains)) : [];
                    emitChange();

                    return { accounts };
                },
            },

            // Standard disconnect feature
            'standard:disconnect': {
                version: '1.0.0',
                disconnect: async () => {
                    await transport.disconnect();
                    accounts = [];
                    emitChange();
                },
            },

            // Standard events feature
            'standard:events': {
                version: '1.0.0',
                on: (event: string, listener: (props: { accounts?: readonly WalletAccount[] }) => void) => {
                    if (event !== 'change') return () => {};
                    changeListeners.add(listener);
                    return () => changeListeners.delete(listener);
                },
            },

            // Solana sign message feature
            'solana:signMessage': {
                version: '1.0.0',
                signMessage: async ({ account, message }: { account: WalletAccount; message: Uint8Array }) => {
                    // WalletConnect expects message as base58 string
                    const base58Decoder = getBase58Decoder();
                    const messageBase58 = base58Decoder.decode(message);

                    const result = await transport.request<WalletConnectSignMessageResult>({
                        method: 'solana_signMessage',
                        params: {
                            message: messageBase58,
                            pubkey: account.address,
                        },
                        chainId: getCurrentCaipChainId(),
                    });

                    // WalletConnect returns signature as base58 string, convert to bytes
                    const signatureBytes = getBase58Encoder().encode(result.signature);

                    return [{ signature: signatureBytes, signedMessage: message }];
                },
            },

            // Solana sign transaction feature
            'solana:signTransaction': {
                version: '1.0.0',
                signTransaction: async ({
                    account,
                    transaction,
                }: {
                    account: WalletAccount;
                    transaction: Uint8Array;
                }) => {
                    // WalletConnect expects transaction as base64 string
                    const transactionBase64 = bytesToBase64(transaction);

                    const requestChainId = getCurrentCaipChainId();

                    const result = await transport.request<WalletConnectSignTransactionResult>({
                        method: 'solana_signTransaction',
                        params: {
                            transaction: transactionBase64,
                        },
                        chainId: requestChainId,
                    });

                    let signedTransaction: Uint8Array;

                    if (result.transaction) {
                        // Wallet returned the full signed transaction
                        signedTransaction = decodeTransaction(result.transaction);
                    } else if (result.signature) {
                        // Wallet returned only the signature, inject it into the original transaction
                        const signerIndex = findSignerIndex(transaction, account.address);
                        if (signerIndex < 0) {
                            throw new Error('Signer pubkey not found in transaction');
                        }
                        signedTransaction = injectSignature(transaction, signerIndex, result.signature);
                    } else {
                        throw new Error('Invalid solana_signTransaction response: no signature or transaction');
                    }

                    return [{ signedTransaction }];
                },
            },

            // Solana sign all transactions feature
            'solana:signAllTransactions': {
                version: '1.0.0',
                signAllTransactions: async ({
                    account,
                    transactions,
                }: {
                    account: WalletAccount;
                    transactions: Uint8Array[];
                }) => {
                    // WalletConnect expects transactions as base64 strings
                    const transactionsBase64 = transactions.map(bytesToBase64);

                    try {
                        const result = await transport.request<WalletConnectSignAllTransactionsResult>({
                            method: 'solana_signAllTransactions',
                            params: {
                                transactions: transactionsBase64,
                            },
                            chainId: getCurrentCaipChainId(),
                        });

                        // Map back to bytes - could be base58 or base64 depending on wallet
                        return result.transactions.map(txEncoded => ({
                            signedTransaction: decodeTransaction(txEncoded),
                        }));
                    } catch (error) {
                        // Fallback: sign transactions one by one
                        
                        const signFeature = wallet.features['solana:signTransaction'] as {
                            signTransaction: (args: {
                                account: WalletAccount;
                                transaction: Uint8Array;
                            }) => Promise<{ signedTransaction: Uint8Array }[]>;
                        };

                        const results = await Promise.all(
                            transactions.map(tx => signFeature.signTransaction({ account, transaction: tx })),
                        );

                        return results.map(r => ({ signedTransaction: r[0].signedTransaction }));
                    }
                },
            },

            // Solana sign and send transaction feature
            'solana:signAndSendTransaction': {
                version: '1.0.0',
                signAndSendTransaction: async ({
                    transaction,
                    options,
                }: {
                    account: WalletAccount;
                    transaction: Uint8Array;
                    options?: {
                        skipPreflight?: boolean;
                        preflightCommitment?: string;
                        maxRetries?: number;
                        minContextSlot?: number;
                    };
                }) => {
                    // WalletConnect expects transaction as base64 string
                    const transactionBase64 = bytesToBase64(transaction);

                    const result = await transport.request<WalletConnectSignAndSendTransactionResult>({
                        method: 'solana_signAndSendTransaction',
                        params: {
                            transaction: transactionBase64,
                            sendOptions: options
                                ? {
                                      skipPreflight: options.skipPreflight,
                                      preflightCommitment: options.preflightCommitment as
                                          | 'processed'
                                          | 'confirmed'
                                          | 'finalized'
                                          | undefined,
                                      maxRetries: options.maxRetries,
                                      minContextSlot: options.minContextSlot,
                                  }
                                : undefined,
                        },
                        chainId: getCurrentCaipChainId(),
                    });

                    // Return signature bytes (convert from base58)
                    const signatureBytes = getBase58Encoder().encode(result.signature);

                    return [{ signature: signatureBytes }];
                },
            },
        },
    };

    return wallet;
}
