/**
 * @solana/connector/server - Privy Provider
 *
 * Dynamically loads @solana/keychain and adapts the Privy signer to the RemoteSigner interface.
 * This file is only imported server-side when Privy is configured.
 */

import type { RemoteSigner, PrivyProviderConfig } from '../route-handlers';
import type { SignableMessage } from '@solana/signers';

interface KeychainSignerLike {
    address: string;
    isAvailable: () => Promise<boolean>;
    signMessages: (messages: SignableMessage[]) => Promise<Record<string, Uint8Array>[]>;
    signTransactions: (transactions: unknown[]) => Promise<Record<string, Uint8Array>[]>;
}

/**
 * Load and initialize a Privy signer
 *
 * @param config - Privy provider configuration
 * @returns RemoteSigner implementation backed by Privy
 */
export async function loadPrivySigner(config: PrivyProviderConfig): Promise<RemoteSigner> {
    // Dynamically import @solana/keychain
    // This keeps the dependency optional and only loaded when needed
    let PrivySigner: { create: (args: unknown) => Promise<KeychainSignerLike> } | undefined;

    try {
        const module = (await import('@solana/keychain-privy')) as unknown as { PrivySigner?: unknown };
        PrivySigner = module.PrivySigner as { create: (args: unknown) => Promise<KeychainSignerLike> } | undefined;
    } catch (error) {
        throw new Error(
            '@solana/keychain-privy is not installed. ' + 'Install it with: pnpm add @solana/keychain-privy',
        );
    }

    if (!PrivySigner) {
        throw new Error('@solana/keychain-privy does not export PrivySigner');
    }

    // Create the Privy signer (async factory)
    const signer = await PrivySigner.create({
        appId: config.appId,
        appSecret: config.appSecret,
        walletId: config.walletId,
        apiBaseUrl: config.apiBaseUrl,
    });

    // Adapt to RemoteSigner interface
    return {
        get address() {
            return signer.address;
        },

        async signTransaction(transactionBytes: Uint8Array): Promise<Uint8Array> {
            // Sign using the Privy signer
            const result = await signWithPrivy(signer, transactionBytes);
            return result;
        },

        async signAllTransactions(transactions: Uint8Array[]): Promise<Uint8Array[]> {
            // Sign each transaction sequentially
            const results: Uint8Array[] = [];
            for (const txBytes of transactions) {
                const signed = await signWithPrivy(signer, txBytes);
                results.push(signed);
            }
            return results;
        },

        async signMessage(message: Uint8Array): Promise<Uint8Array> {
            // Use the signer's signMessages method
            // Create a SignableMessage-like object
            const signableMessage = {
                content: message,
                signatures: {} as Record<string, Uint8Array>,
            };

            const results = await signer.signMessages([signableMessage as unknown as SignableMessage]);

            // Extract the signature from the first result
            const sigDict = results[0];
            const signature = sigDict[signer.address];

            if (!signature) {
                throw new Error('No signature returned from Privy');
            }

            return signature;
        },

        async isAvailable(): Promise<boolean> {
            return signer.isAvailable();
        },
    };
}

/**
 * Sign transaction bytes using the Privy signer
 */
async function signWithPrivy(
    signer: KeychainSignerLike,
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
        throw new Error('No signature returned from Privy');
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
