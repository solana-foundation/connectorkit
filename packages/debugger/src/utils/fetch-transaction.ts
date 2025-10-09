/**
 * Fetch transaction details from RPC
 */

import { createSolanaRpc, signature as createSignature, GetTransactionApi } from '@solana/kit';

export type FetchTransactionResponse = ReturnType<GetTransactionApi["getTransaction"]>;

export interface FetchTransactionResult {
    transaction: FetchTransactionResponse | null;
    error?: string;
}

/**
 * Fetch full transaction details from RPC
 * Returns parsed transaction with metadata including logs
 */
export async function fetchTransactionDetails(
    signature: string,
    rpcUrl: string
): Promise<FetchTransactionResult> {
    try {
        const rpc = createSolanaRpc(rpcUrl);
        
        // Convert signature string to Signature type
        const txSignature = createSignature(signature);
        
        // Try with 'confirmed' commitment first
        const transaction = await rpc
            .getTransaction(txSignature, {
                encoding: 'json',
                maxSupportedTransactionVersion: 0,
                commitment: 'confirmed',
            })
            .send();
                
        console.log('Transaction response for', signature.slice(0, 8) + '...:', transaction);

        if (!transaction) {
            console.warn('Transaction not found for signature:', signature);
            return {
                transaction: null,
                error: 'Transaction not found. It may not be confirmed yet or the RPC endpoint may be rate-limited.',
            };
        }

        // TypeScript needs help narrowing the union type here
        return { transaction };
    } catch (error) {
        console.error('Error fetching transaction:', error);
        return {
            transaction: null,
            error: error instanceof Error ? error.message : 'Failed to fetch transaction',
        };
    }
}
