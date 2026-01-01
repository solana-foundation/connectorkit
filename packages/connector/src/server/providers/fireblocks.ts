/**
 * @solana/connector/server - Fireblocks Provider
 *
 * Dynamically loads @solana/keychain and adapts the Fireblocks signer to the RemoteSigner interface.
 * This file is only imported server-side when Fireblocks is configured.
 */

import type { RemoteSigner, FireblocksProviderConfig } from '../route-handlers';
import type { SignableMessage } from '@solana/signers';

interface KeychainSignerLike {
    address: string;
    isAvailable: () => Promise<boolean>;
    signMessages: (messages: SignableMessage[]) => Promise<Record<string, Uint8Array>[]>;
    signTransactions: (transactions: unknown[]) => Promise<Record<string, Uint8Array>[]>;
}

interface FireblocksSignerLike extends KeychainSignerLike {
    init: () => Promise<void>;
}

/**
 * Load and initialize a Fireblocks signer
 *
 * @param config - Fireblocks provider configuration
 * @returns RemoteSigner implementation backed by Fireblocks
 */
export async function loadFireblocksSigner(config: FireblocksProviderConfig): Promise<RemoteSigner> {
    // Dynamically import @solana/keychain
    // This keeps the dependency optional and only loaded when needed
    let FireblocksSigner: (new (args: unknown) => FireblocksSignerLike) | undefined;

    try {
        const module = (await import('@solana/keychain-fireblocks')) as unknown as { FireblocksSigner?: unknown };
        FireblocksSigner = module.FireblocksSigner as (new (args: unknown) => FireblocksSignerLike) | undefined;
    } catch (error) {
        throw new Error(
            '@solana/keychain-fireblocks is not installed. ' + 'Install it with: pnpm add @solana/keychain-fireblocks',
        );
    }

    if (!FireblocksSigner) {
        throw new Error('@solana/keychain-fireblocks does not export FireblocksSigner');
    }

    // Create and initialize the Fireblocks signer
    const signer = new FireblocksSigner({
        apiKey: config.apiKey,
        privateKeyPem: config.privateKeyPem,
        vaultAccountId: config.vaultAccountId,
        assetId: config.assetId,
        apiBaseUrl: config.apiBaseUrl,
    });

    // Initialize to fetch the public key
    await signer.init();

    // Adapt to RemoteSigner interface
    return {
        get address() {
            return signer.address;
        },

        async signTransaction(transactionBytes: Uint8Array): Promise<Uint8Array> {
            // Fireblocks signer expects Kit transactions, but we have raw bytes
            // We need to decode, sign, and re-encode
            // For now, use the raw signing approach

            // The keychain signer's signTransactions expects Transaction objects
            // We'll use a workaround: create a minimal transaction-like object
            const result = await signWithFireblocks(signer, transactionBytes);
            return result;
        },

        async signAllTransactions(transactions: Uint8Array[]): Promise<Uint8Array[]> {
            // Sign each transaction sequentially
            const results: Uint8Array[] = [];
            for (const txBytes of transactions) {
                const signed = await signWithFireblocks(signer, txBytes);
                results.push(signed);
            }
            return results;
        },

        async signMessage(message: Uint8Array): Promise<Uint8Array> {
            // Use the signer's signMessages method
            // Create a SignableMessage
            const signableMessage = {
                content: message,
                signatures: {} as Record<string, Uint8Array>,
            };

            const results = await signer.signMessages([signableMessage as unknown as SignableMessage]);

            // Extract the signature from the first result
            const sigDict = results[0];
            const signature = sigDict[signer.address];

            if (!signature) {
                throw new Error('No signature returned from Fireblocks');
            }

            return signature;
        },

        async isAvailable(): Promise<boolean> {
            return signer.isAvailable();
        },
    };
}

/**
 * Sign transaction bytes using the Fireblocks signer
 */
async function signWithFireblocks(
    signer: FireblocksSignerLike,
    transactionBytes: Uint8Array,
): Promise<Uint8Array> {
    // Import transaction utilities
    const { getTransactionDecoder, getTransactionEncoder } = await import('@solana/transactions');

    // Decode the transaction
    const decoder = getTransactionDecoder();
    const transaction = decoder.decode(transactionBytes);

    // Sign the transaction
    const results = await signer.signTransactions([transaction as unknown]);

    // Get the signature
    const sigDict = results[0];
    const signature = sigDict[signer.address];

    if (!signature) {
        throw new Error('No signature returned from Fireblocks');
    }

    // Re-encode the transaction with the signature
    const encoder = getTransactionEncoder();
    const signedTx = {
        ...transaction,
        signatures: {
            ...transaction.signatures,
            [signer.address]: signature,
        },
    };

    const encoded = encoder.encode(signedTx as Parameters<typeof encoder.encode>[0]);
    return new Uint8Array(encoded);
}
