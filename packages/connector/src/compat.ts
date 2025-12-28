/**
 * Wallet Adapter Compatibility Bridge
 */

import { useMemo } from 'react';
import type { TransactionSigner } from './lib/transaction/transaction-signer';
import type { SolanaTransaction } from './types/transactions';
import type { Connection, SendOptions } from '@solana/web3.js';
import { isWeb3jsTransaction } from './utils/transaction-format';
import { createLogger } from './lib/utils/secure-logger';
import { tryCatch } from './lib/core/try-catch';

const logger = createLogger('WalletAdapterCompat');

/**
 * Wallet adapter compatible interface that libraries expect
 */
export interface WalletAdapterCompatible {
    publicKey: string | null;
    connected: boolean;
    connecting: boolean;
    disconnecting: boolean;

    signTransaction: (transaction: SolanaTransaction) => Promise<SolanaTransaction>;
    signAllTransactions: (transactions: SolanaTransaction[]) => Promise<SolanaTransaction[]>;
    sendTransaction: (transaction: SolanaTransaction, connection: Connection, options?: SendOptions) => Promise<string>;

    connect: () => Promise<void>;
    disconnect: () => Promise<void>;

    signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}

/**
 * Options for creating wallet adapter compatibility
 */
export interface WalletAdapterCompatOptions {
    /** Function to handle disconnect */
    disconnect: () => Promise<void>;

    /** Optional function to transform transactions before signing */
    transformTransaction?: (tx: SolanaTransaction) => SolanaTransaction;

    /** Optional error handler */
    onError?: (error: Error, operation: string) => void;
}

export function createWalletAdapterCompat(
    signer: TransactionSigner | null,
    options: WalletAdapterCompatOptions,
): WalletAdapterCompatible {
    const { disconnect, transformTransaction, onError } = options;

    const handleError = (error: Error, operation: string) => {
        if (onError) {
            onError(error, operation);
        } else {
            logger.error('Wallet adapter compat error', { operation, error });
        }
    };

    return {
        publicKey: signer?.address || null,
        connected: !!signer,
        connecting: false,
        disconnecting: false,

        signTransaction: async (transaction: SolanaTransaction) => {
            if (!signer) {
                const error = new Error('Wallet not connected');
                handleError(error, 'signTransaction');
                throw error;
            }

            const tx = transformTransaction ? transformTransaction(transaction) : transaction;
            const { data: signed, error } = await tryCatch(signer.signTransaction(tx));

            if (error) {
                handleError(error, 'signTransaction');
                throw error;
            }

            return signed;
        },

        signAllTransactions: async (transactions: SolanaTransaction[]) => {
            if (!signer) {
                const error = new Error('Wallet not connected');
                handleError(error, 'signAllTransactions');
                throw error;
            }

            const txs = transformTransaction ? transactions.map(tx => transformTransaction(tx)) : transactions;
            const { data: signedTxs, error } = await tryCatch(Promise.all(txs.map(tx => signer.signTransaction(tx))));

            if (error) {
                handleError(error, 'signAllTransactions');
                throw error;
            }

            return signedTxs;
        },

        sendTransaction: async (transaction: SolanaTransaction, connection: Connection, sendOptions?: SendOptions) => {
            if (!signer) {
                const error = new Error('Wallet not connected');
                handleError(error, 'sendTransaction');
                throw error;
            }

            const tx = transformTransaction ? transformTransaction(transaction) : transaction;

            const capabilities = signer.getCapabilities();
            if (!capabilities.canSign) {
                const error = new Error('Wallet does not support transaction signing');
                handleError(error, 'sendTransaction');
                throw error;
            }

            const { data: signedTx, error: signError } = await tryCatch(signer.signTransaction(tx));
            if (signError) {
                handleError(signError, 'sendTransaction');
                throw signError;
            }

            // Serialize the signed transaction
            let rawTransaction: Uint8Array;
            if (isWeb3jsTransaction(signedTx)) {
                rawTransaction = signedTx.serialize();
            } else if (signedTx instanceof Uint8Array) {
                rawTransaction = signedTx;
            } else {
                const error = new Error('Unexpected signed transaction format');
                handleError(error, 'sendTransaction');
                throw error;
            }

            const { data: signature, error: sendError } = await tryCatch(
                connection.sendRawTransaction(rawTransaction, sendOptions),
            );

            if (sendError) {
                handleError(sendError, 'sendTransaction');
                throw sendError;
            }

            return signature;
        },

        connect: async () => {
            return Promise.resolve();
        },

        disconnect: async () => {
            const { error } = await tryCatch(disconnect());
            if (error) {
                handleError(error, 'disconnect');
                throw error;
            }
        },

        signMessage: signer?.signMessage
            ? async (message: Uint8Array) => {
                  if (!signer?.signMessage) {
                      const error = new Error('Message signing not supported');
                      handleError(error, 'signMessage');
                      throw error;
                  }

                  const { data, error } = await tryCatch(signer.signMessage(message));
                  if (error) {
                      handleError(error, 'signMessage');
                      throw error;
                  }

                  return data;
              }
            : undefined,
    };
}

export function useWalletAdapterCompat(
    signer: TransactionSigner | null,
    disconnect: () => Promise<void>,
    options?: Omit<WalletAdapterCompatOptions, 'disconnect'>,
): WalletAdapterCompatible {
    return useMemo(() => {
        return createWalletAdapterCompat(signer, {
            disconnect,
            ...options,
        });
    }, [signer, disconnect, options?.transformTransaction, options?.onError]);
}

/**
 * Type guard to check if an object implements WalletAdapterCompatible interface
 *
 * @param obj - Object to check
 * @returns True if object implements WalletAdapterCompatible
 */
export function isWalletAdapterCompatible(obj: unknown): obj is WalletAdapterCompatible {
    if (!obj || typeof obj !== 'object') return false;

    const wallet = obj as Record<string, unknown>;

    return (
        'publicKey' in wallet &&
        'connected' in wallet &&
        'connecting' in wallet &&
        'disconnecting' in wallet &&
        typeof wallet.signTransaction === 'function' &&
        typeof wallet.signAllTransactions === 'function' &&
        typeof wallet.sendTransaction === 'function' &&
        typeof wallet.connect === 'function' &&
        typeof wallet.disconnect === 'function'
    );
}
