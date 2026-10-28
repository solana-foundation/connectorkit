/**
 * Tests for connection helpers: legacy web3.js Connection (1.x and 3.x) and
 * Kit Rpc abstraction.
 */

import { describe, it, expect, vi } from 'vitest';
import { getLatestBlockhash, sendRawTransaction } from './helpers';
import type { DualConnection, KitRpc } from './types';

const bytes = new Uint8Array([1, 2, 3]);

function legacyConnection(overrides: Record<string, unknown> = {}) {
    return {
        rpcEndpoint: 'https://api.devnet.solana.com',
        getLatestBlockhash: vi.fn().mockResolvedValue({ blockhash: 'abc', lastValidBlockHeight: 10 }),
        sendRawTransaction: vi.fn().mockResolvedValue('sig'),
        ...overrides,
    } as unknown as DualConnection;
}

function kitRpc() {
    const send = vi.fn().mockResolvedValue('sig');
    const sendTransaction = vi.fn(() => ({ send }));
    const getLatestBlockhash = vi.fn(() => ({
        send: vi.fn().mockResolvedValue({ value: { blockhash: 'abc', lastValidBlockHeight: 10 } }),
    }));
    return { rpc: { getLatestBlockhash, sendTransaction } as unknown as KitRpc, sendTransaction };
}

describe('getLatestBlockhash', () => {
    it('should pass through a numeric lastValidBlockHeight (web3.js 1.x)', async () => {
        const result = await getLatestBlockhash(legacyConnection());
        expect(result).toEqual({ blockhash: 'abc', lastValidBlockHeight: 10 });
    });

    it('should normalize a bigint lastValidBlockHeight to number (web3.js 3.x)', async () => {
        const connection = legacyConnection({
            getLatestBlockhash: vi.fn().mockResolvedValue({ blockhash: 'abc', lastValidBlockHeight: 10n }),
        });

        const result = await getLatestBlockhash(connection);

        expect(result.lastValidBlockHeight).toBe(10);
        expect(typeof result.lastValidBlockHeight).toBe('number');
    });

    it('should forward the commitment to the legacy connection', async () => {
        const connection = legacyConnection();
        await getLatestBlockhash(connection, 'finalized');
        expect(
            (connection as { getLatestBlockhash: ReturnType<typeof vi.fn> }).getLatestBlockhash,
        ).toHaveBeenCalledWith('finalized');
    });

    it('should read the Kit Rpc response value', async () => {
        const { rpc } = kitRpc();
        const result = await getLatestBlockhash(rpc);
        expect(result).toEqual({ blockhash: 'abc', lastValidBlockHeight: 10 });
    });
});

describe('sendRawTransaction', () => {
    it('should forward options to the legacy connection without the connector-only commitment key', async () => {
        const connection = legacyConnection();

        await sendRawTransaction(connection, bytes, { skipPreflight: true, maxRetries: 3, commitment: 'confirmed' });

        const send = (connection as { sendRawTransaction: ReturnType<typeof vi.fn> }).sendRawTransaction;
        expect(send).toHaveBeenCalledWith(bytes, { skipPreflight: true, maxRetries: 3 });
    });

    it('should call the legacy connection without options when none are given', async () => {
        const connection = legacyConnection();
        await sendRawTransaction(connection, bytes);
        const send = (connection as { sendRawTransaction: ReturnType<typeof vi.fn> }).sendRawTransaction;
        expect(send).toHaveBeenCalledWith(bytes);
    });

    it('should base64-encode bytes and normalize a bigint maxRetries for Kit Rpc', async () => {
        const { rpc, sendTransaction } = kitRpc();

        const signature = await sendRawTransaction(rpc, bytes, {
            skipPreflight: false,
            maxRetries: 3n as unknown as number,
            commitment: 'processed',
        });

        expect(signature).toBe('sig');
        expect(sendTransaction).toHaveBeenCalledWith(Buffer.from(bytes).toString('base64'), {
            commitment: 'processed',
            skipPreflight: false,
            maxRetries: 3,
        });
    });
});
