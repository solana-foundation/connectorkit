import type { TransactionActivity, TransactionMethod } from '../../types/transactions';
import type { SolanaClusterId } from '@wallet-ui/core';
import type { Signature } from '@solana/keys';
import { signature as toSignature } from '@solana/keys';
import { address } from '@solana/addresses';
import {
    appendTransactionMessageInstruction,
    blockhash,
    compileTransaction,
    createTransactionMessage,
    getTransactionEncoder,
    pipe,
    setTransactionMessageConfig,
    setTransactionMessageFeePayer,
    setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';

/** Fee payer used by the wire-format transaction fixtures. */
export const WIRE_FIXTURE_FEE_PAYER = '11111111111111111111111111111112';
const WIRE_FIXTURE_PROGRAM = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const WIRE_FIXTURE_BLOCKHASH = 'GfVcyD4kkTrj4bKc7WA9sZCin9JDbdT4Zkd3EittNR1W';

/**
 * Build wire-correct serialized transaction bytes for a given version using
 * kit's compiler and codecs (unsigned: signature slots are zero-filled).
 *
 * Legacy/v0 encode as: shortvec signature count, 64-byte signatures, message
 * (v0 message prefixed with 0x80). v1 encodes with the 0x81 discriminator at
 * byte 0 and signatures at the tail (SIMD-0385).
 *
 * @param version - Transaction version to compile
 * @param options.instructionDataBytes - Pads the transaction with an
 *   instruction carrying this many data bytes, to control the wire size.
 */
export function createWireTransactionBytes(
    version: 'legacy' | 0 | 1,
    options: { instructionDataBytes?: number } = {},
): Uint8Array {
    const lifetime = { blockhash: blockhash(WIRE_FIXTURE_BLOCKHASH), lastValidBlockHeight: 0n };
    let message = pipe(
        createTransactionMessage({ version }),
        m => setTransactionMessageFeePayer(address(WIRE_FIXTURE_FEE_PAYER), m),
        m => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
    );
    if (options.instructionDataBytes !== undefined) {
        message = appendTransactionMessageInstruction(
            {
                data: new Uint8Array(options.instructionDataBytes).fill(1),
                programAddress: address(WIRE_FIXTURE_PROGRAM),
            },
            message,
        );
    }
    if (message.version === 1) {
        message = setTransactionMessageConfig(
            { computeUnitLimit: 200_000, loadedAccountsDataSizeLimit: 1_024, priorityFeeLamports: 5_000n },
            message,
        );
    }
    return new Uint8Array(getTransactionEncoder().encode(compileTransaction(message)));
}

export const TEST_SIGNATURES = {
    TX_1: '5j7s6NiJS3JAkvgkoc18WVAsiSaci2pxB2A6ueCJP4tprA2TFg9wSyTLeYouxPBJEMzJinENTkpA52YStRW5Dia7',
    TX_2: '2nBhEBYYvfaAe16UMNqRHre4YNSskvuYgx3M6E4JP1oDYvZEJHvoPzyUidNgNX5r9sTyN1J9UxtbCXy2rqYcuyuv',
    TX_3: '3yMKiZKLN3aB8XZFSwLEzHKJ2mHzJLLJqE7FYnBaWYFQ7wT9SsCkshEMvApCPNKrQ9p2BYmXGqHv9KiYuAXnQCDD',
} as const;

export const TEST_SIGNATURES_TYPED: Record<keyof typeof TEST_SIGNATURES, Signature> = {
    TX_1: toSignature(TEST_SIGNATURES.TX_1),
    TX_2: toSignature(TEST_SIGNATURES.TX_2),
    TX_3: toSignature(TEST_SIGNATURES.TX_3),
};

export function createMockTransaction(
    signatureString: string = TEST_SIGNATURES.TX_1,
    options: {
        status?: 'pending' | 'confirmed' | 'failed';
        timestamp?: string;
        error?: string;
        cluster?: SolanaClusterId;
        method?: TransactionMethod;
    } = {},
): TransactionActivity {
    return {
        signature: toSignature(signatureString),
        status: options.status ?? 'pending',
        timestamp: options.timestamp ?? new Date().toISOString(),
        error: options.error,
        cluster: (options.cluster ?? 'solana:devnet') as SolanaClusterId,
        method: options.method ?? 'signAndSendTransaction',
    };
}

export function createPendingTransaction(signature?: string): TransactionActivity {
    return createMockTransaction(signature, { status: 'pending' });
}

export function createConfirmedTransaction(signature?: string): TransactionActivity {
    return createMockTransaction(signature, { status: 'confirmed' });
}

export function createFailedTransaction(signature?: string, error?: string): TransactionActivity {
    return createMockTransaction(signature, {
        status: 'failed',
        error: error ?? 'Transaction failed',
    });
}

export function createTestTransactions(count: number = 3): TransactionActivity[] {
    const signatures = Object.values(TEST_SIGNATURES);
    const statuses: Array<'pending' | 'confirmed' | 'failed'> = ['pending', 'confirmed', 'failed'];

    return Array.from({ length: Math.min(count, signatures.length) }, (_, i) =>
        createMockTransaction(signatures[i], {
            status: statuses[i % statuses.length],
        }),
    );
}
