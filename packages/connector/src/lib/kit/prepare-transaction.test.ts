import { describe, it, expect, vi } from 'vitest';
import {
    address,
    createTransactionMessage,
    getTransactionMessageComputeUnitLimit,
    pipe,
    setTransactionMessageComputeUnitLimit,
    setTransactionMessageFeePayer,
    type GetLatestBlockhashApi,
    type Rpc,
    type SimulateTransactionApi,
} from '@solana/kit';

import { prepareTransaction } from './prepare-transaction';

const FEE_PAYER = address('HMJfh9P8FEF5eVHp3XypYWThUYCQ9sWNZZQQxVP2jjr1');
const BLOCKHASH = 'GK1nopeF3P8J46dGqq4KfaEWopZU7K65F6CKQXuUdr3z';

function createMockRpc(options: { unitsConsumed?: bigint } = {}) {
    const simulateSend = vi.fn().mockResolvedValue({
        value: { err: null, unitsConsumed: options.unitsConsumed ?? 1000n },
    });
    const blockhashSend = vi.fn().mockResolvedValue({
        value: { blockhash: BLOCKHASH, lastValidBlockHeight: 100n },
    });
    const rpc = {
        getLatestBlockhash: vi.fn(() => ({ send: blockhashSend })),
        simulateTransaction: vi.fn(() => ({ send: simulateSend })),
    };
    return { rpc: rpc as unknown as Rpc<GetLatestBlockhashApi & SimulateTransactionApi>, mocks: rpc };
}

function createBaseMessage() {
    return pipe(createTransactionMessage({ version: 0 }), m => setTransactionMessageFeePayer(FEE_PAYER, m));
}

describe('prepareTransaction', () => {
    it('estimates the compute unit limit from simulation and applies the default multiplier', async () => {
        const { rpc, mocks } = createMockRpc({ unitsConsumed: 1000n });

        const prepared = await prepareTransaction({ transaction: createBaseMessage(), rpc });

        expect(mocks.simulateTransaction).toHaveBeenCalledTimes(1);
        expect(getTransactionMessageComputeUnitLimit(prepared)).toBe(Math.ceil(1000 * 1.1));
        expect(prepared.lifetimeConstraint.blockhash).toBe(BLOCKHASH);
    });

    it('applies a custom compute unit limit multiplier', async () => {
        const { rpc } = createMockRpc({ unitsConsumed: 1000n });

        const prepared = await prepareTransaction({
            transaction: createBaseMessage(),
            rpc,
            computeUnitLimitMultiplier: 2,
        });

        expect(getTransactionMessageComputeUnitLimit(prepared)).toBe(2000);
    });

    it('keeps an explicit compute unit limit without simulating', async () => {
        const { rpc, mocks } = createMockRpc();
        const transaction = setTransactionMessageComputeUnitLimit(200_000, createBaseMessage());

        const prepared = await prepareTransaction({ transaction, rpc });

        expect(mocks.simulateTransaction).not.toHaveBeenCalled();
        expect(getTransactionMessageComputeUnitLimit(prepared)).toBe(200_000);
    });

    it('re-estimates an explicit compute unit limit when computeUnitLimitReset is set', async () => {
        const { rpc, mocks } = createMockRpc({ unitsConsumed: 5000n });
        const transaction = setTransactionMessageComputeUnitLimit(200_000, createBaseMessage());

        const prepared = await prepareTransaction({ transaction, rpc, computeUnitLimitReset: true });

        expect(mocks.simulateTransaction).toHaveBeenCalledTimes(1);
        expect(getTransactionMessageComputeUnitLimit(prepared)).toBe(Math.ceil(5000 * 1.1));
    });

    it('propagates simulation failures instead of defaulting', async () => {
        const rpc = {
            getLatestBlockhash: vi.fn(() => ({
                send: vi.fn().mockResolvedValue({ value: { blockhash: BLOCKHASH, lastValidBlockHeight: 100n } }),
            })),
            simulateTransaction: vi.fn(() => ({
                send: vi.fn().mockRejectedValue(new Error('simulation unavailable')),
            })),
        } as unknown as Rpc<GetLatestBlockhashApi & SimulateTransactionApi>;

        await expect(prepareTransaction({ transaction: createBaseMessage(), rpc })).rejects.toThrow();
    });
});
