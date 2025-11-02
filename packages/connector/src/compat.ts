/**
 * Wallet Adapter Compatibility Bridge
 */

import { useMemo } from 'react';
import type { TransactionSigner } from './lib/transaction/transaction-signer';
import type { SolanaTransaction } from './types/transactions';
import type { Connection, SendOptions } from '@solana/web3.js';
import { isWeb3jsTransaction } from './utils/transaction-format';
import { createLogger } from './lib/utils/secure-logger';

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

            try {
                const tx = transformTransaction ? transformTransaction(transaction) : transaction;

                // Use the signer's sign method
                const signed = await signer.signTransaction(tx);
                return signed;
            } catch (error) {
                handleError(error as Error, 'signTransaction');
                throw error;
            }
        },

        signAllTransactions: async (transactions: SolanaTransaction[]) => {
            if (!signer) {
                const error = new Error('Wallet not connected');
                handleError(error, 'signAllTransactions');
                throw error;
            }

            try {
                const txs = transformTransaction ? transactions.map(tx => transformTransaction(tx)) : transactions;

                // Sign each transaction
                const signedTxs = await Promise.all(txs.map(tx => signer.signTransaction(tx)));

                return signedTxs;
            } catch (error) {
                handleError(error as Error, 'signAllTransactions');
                throw error;
            }
        },

        sendTransaction: async (transaction: SolanaTransaction, connection: Connection, sendOptions?: SendOptions) => {
            if (!signer) {
                const error = new Error('Wallet not connected');
                handleError(error, 'sendTransaction');
                throw error;
            }

            try {
                const tx = transformTransaction ? transformTransaction(transaction) : transaction;

                const capabilities = signer.getCapabilities();

                if (!capabilities.canSign) {
                    throw new Error('Wallet does not support transaction signing');
                }

                const signedTx = await signer.signTransaction(tx);

                // Serialize the signed transaction
                let rawTransaction: Uint8Array;
                if (isWeb3jsTransaction(signedTx)) {
                    rawTransaction = signedTx.serialize();
                } else if (signedTx instanceof Uint8Array) {
                    rawTransaction = signedTx;
                } else {
                    throw new Error('Unexpected signed transaction format');
                }

                const signature = await connection.sendRawTransaction(rawTransaction, sendOptions);

                return signature;
            } catch (error) {
                handleError(error as Error, 'sendTransaction');
                throw error;
            }
        },

        connect: async () => {
            return Promise.resolve();
        },

        disconnect: async () => {
            try {
                await disconnect();
            } catch (error) {
                handleError(error as Error, 'disconnect');
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

                  try {
                      return await signer.signMessage(message);
                  } catch (error) {
                      handleError(error as Error, 'signMessage');
                      throw error;
                  }
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
