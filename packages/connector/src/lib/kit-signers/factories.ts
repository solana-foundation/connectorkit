/**
 * @solana/connector - Kit Signer Factories
 *
 * Framework-agnostic factory functions to create Kit-compatible signers from wallet functions.
 * These factories enable pure Kit integration without React or framework dependencies.
 */

import type { Address } from '@solana/addresses';
import type {
    MessageModifyingSigner,
    TransactionSendingSigner,
    SignableMessage,
    MessageModifyingSignerConfig,
    TransactionSendingSignerConfig,
} from '@solana/signers';
import type { SignatureBytes } from '@solana/keys';
import type { Transaction } from '@solana/transactions';
import { ValidationError, TransactionError, Errors } from '../errors';
import { updateSignatureDictionary, freezeSigner, base58ToSignatureBytes } from './utils';

/**
 * Create a MessageModifyingSigner from a wallet's sign message function
 *
 * This is a pure, framework-agnostic factory function that can be used anywhere.
 * Enables message signing (SIWS, auth) without React.
 *
 * @param walletAddress - The address of the wallet
 * @param signMessageFn - Function to sign a message (from wallet adapter)
 * @returns A frozen MessageModifyingSigner object
 *
 * @example
 * ```typescript
 * import { address } from '@solana/addresses';
 * import { createMessageSignerFromWallet } from '@solana/connector/headless';
 *
 * const signer = createMessageSignerFromWallet(
 *   address('...'),
 *   async (msg) => await wallet.signMessage(msg)
 * );
 *
 * // Use with Kit message signing
 * import { createSignableMessage } from '@solana/signers';
 * const signed = await signer.modifyAndSignMessages([createSignableMessage(messageBytes)]);
 * ```
 */
export function createMessageSignerFromWallet(
    walletAddress: Address<string>,
    signMessageFn: (message: Uint8Array) => Promise<Uint8Array>,
): MessageModifyingSigner<string> {
    const signer: MessageModifyingSigner<string> = {
        address: walletAddress,

        async modifyAndSignMessages(
            messages: readonly SignableMessage[],
            config?: MessageModifyingSignerConfig,
        ): Promise<readonly SignableMessage[]> {
            // Most wallets only support signing one message at a time
            if (messages.length !== 1) {
                throw new ValidationError('INVALID_FORMAT', 'Wallets only support signing one message at a time', {
                    receivedCount: messages.length,
                    expectedCount: 1,
                });
            }

            const [message] = messages;
            const { content, signatures: originalSignatures } = message;

            // Handle abort signal if provided
            if (config?.abortSignal?.aborted) {
                throw Errors.userRejected('message signing');
            }

            try {
                // Sign the message
                const signature = await signMessageFn(content);

                // Update signatures (handle potential message modification)
                // Note: Message content doesn't change in signMessage operations
                const signatures = updateSignatureDictionary(
                    content,
                    content, // Message content doesn't change in signMessage
                    originalSignatures,
                    walletAddress,
                    signature,
                );

                // Return signed message
                return [
                    {
                        content,
                        signatures,
                    },
                ];
            } catch (error) {
                // Convert wallet errors to ConnectorKit errors
                if (error instanceof Error) {
                    const message = error.message.toLowerCase();
                    if (message.includes('user rejected') || message.includes('user denied')) {
                        throw Errors.userRejected('message signing');
                    }
                    throw new TransactionError('SIGNING_FAILED', 'Failed to sign message', undefined, error);
                }
                throw new TransactionError('SIGNING_FAILED', 'Failed to sign message', {
                    originalError: String(error),
                });
            }
        },
    };

    return freezeSigner(signer);
}

/**
 * Create a TransactionSendingSigner from a wallet's send transaction function
 *
 * This is a pure, framework-agnostic factory function that can be used anywhere.
 * Enables sign + send in one operation (wallets like Phantom support this).
 *
 * @param walletAddress - The address of the wallet
 * @param chain - The Solana chain identifier (e.g., 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1')
 * @param sendTransactionFn - Function to send a transaction (from wallet adapter)
 * @returns A frozen TransactionSendingSigner object
 *
 * @example
 * ```typescript
 * import { address } from '@solana/addresses';
 * import { createTransactionSendingSignerFromWallet } from '@solana/connector/headless';
 *
 * const signer = createTransactionSendingSignerFromWallet(
 *   address('...'),
 *   'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
 *   async (tx) => await wallet.sendTransaction(tx, connection)
 * );
 *
 * // Use with Kit transaction sending
 * const signatures = await signer.signAndSendTransactions([transaction]);
 * ```
 */
export function createTransactionSendingSignerFromWallet(
    walletAddress: Address<string>,
    chain: `solana:${string}`,
    sendTransactionFn: (transaction: Transaction) => Promise<string>,
): TransactionSendingSigner<string> {
    const signer: TransactionSendingSigner<string> = {
        address: walletAddress,

        async signAndSendTransactions(
            transactions: readonly Transaction[],
            config?: TransactionSendingSignerConfig,
        ): Promise<readonly SignatureBytes[]> {
            // Most wallets only support signing one transaction at a time
            if (transactions.length !== 1) {
                throw new ValidationError('INVALID_FORMAT', 'Wallets only support sending one transaction at a time', {
                    receivedCount: transactions.length,
                    expectedCount: 1,
                });
            }

            const [transaction] = transactions;

            // Handle abort signal if provided
            if (config?.abortSignal?.aborted) {
                throw Errors.userRejected('transaction sending');
            }

            try {
                // Send the transaction and get signature string (base58)
                const signatureString = await sendTransactionFn(transaction);

                // Convert base58 signature string to SignatureBytes
                const signatureBytes = base58ToSignatureBytes(signatureString);

                return [signatureBytes];
            } catch (error) {
                // Convert wallet errors to ConnectorKit errors
                if (error instanceof Error) {
                    const message = error.message.toLowerCase();
                    if (message.includes('user rejected') || message.includes('user denied')) {
                        throw Errors.userRejected('transaction sending');
                    }
                    if (message.includes('network') || message.includes('rpc')) {
                        throw new TransactionError('SEND_FAILED', 'Failed to send transaction', undefined, error);
                    }
                    throw new TransactionError('SEND_FAILED', 'Failed to send transaction', undefined, error);
                }
                throw new TransactionError('SEND_FAILED', 'Failed to send transaction', {
                    originalError: String(error),
                });
            }
        },
    };

    return freezeSigner(signer);
}
