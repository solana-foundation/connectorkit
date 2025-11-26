/**
 * @solana/connector - Connection Helpers
 *
 * Abstraction layer for working with both legacy @solana/web3.js Connection
 * and modern Kit/gill Rpc objects.
 */

import type { SendOptions } from '@solana/web3.js';
import type { DualConnection, Commitment, KitRpc } from './types';
import { isLegacyConnection, isKitConnection } from './types';

/**
 * Get latest blockhash from either legacy Connection or Kit Rpc
 *
 * Abstracts the differences between web3.js 1.x and Kit/gill APIs.
 *
 * @param connection - Legacy Connection or Kit Rpc
 * @param commitment - Optional commitment level (default: 'confirmed')
 * @returns Latest blockhash and last valid block height
 *
 * @example
 * ```typescript
 * // Works with both Connection and Rpc
 * const { blockhash, lastValidBlockHeight } = await getLatestBlockhash(connection);
 * ```
 */
export async function getLatestBlockhash(
    connection: DualConnection,
    commitment: Commitment = 'confirmed',
): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    if (isLegacyConnection(connection)) {
        // Legacy Connection API
        return await connection.getLatestBlockhash(commitment);
    }

    if (isKitConnection(connection)) {
        // Kit/gill Rpc API - returns { value: { blockhash, lastValidBlockHeight } }
        const rpc = connection as KitRpc;
        const result = await rpc.getLatestBlockhash({ commitment }).send();
        return result.value;
    }

    throw new Error('Unsupported connection type');
}

/**
 * Send raw transaction bytes to either legacy Connection or Kit Rpc
 *
 * Abstracts the differences between web3.js 1.x and Kit/gill APIs.
 *
 * @param connection - Legacy Connection or Kit Rpc
 * @param bytes - Raw transaction bytes
 * @param options - Optional send options (skipPreflight, maxRetries, etc.)
 * @returns Transaction signature string
 *
 * @example
 * ```typescript
 * // Works with both Connection and Rpc
 * const signature = await sendRawTransaction(connection, transactionBytes, {
 *   skipPreflight: false,
 *   maxRetries: 3
 * });
 * ```
 */
export async function sendRawTransaction(
    connection: DualConnection,
    bytes: Uint8Array,
    options?: SendOptions & { commitment?: Commitment },
): Promise<string> {
    if (isLegacyConnection(connection)) {
        // Legacy Connection API
        return await connection.sendRawTransaction(bytes, options);
    }

    if (isKitConnection(connection)) {
        // Kit/gill Rpc API
        // Note: gill's sendTransaction expects different options format
        const rpc = connection as KitRpc;
        // Convert Uint8Array to base64 string
        const base64String = Buffer.from(bytes).toString('base64');
        const result = await rpc
            .sendTransaction(base64String as Uint8Array | string, {
                ...(options?.commitment ? { commitment: options.commitment } : {}),
                ...(options?.skipPreflight !== undefined ? { skipPreflight: options.skipPreflight } : {}),
                ...(options?.maxRetries !== undefined ? { maxRetries: options.maxRetries } : {}),
            })
            .send();

        // Kit Rpc returns signature string directly
        return result;
    }

    throw new Error('Unsupported connection type');
}
