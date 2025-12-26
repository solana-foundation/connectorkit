import type { TransactionActivity, TransactionMethod } from '../../types/transactions';
import type { SolanaClusterId } from '@wallet-ui/core';
import type { Signature } from '@solana/keys';
import { signature as toSignature } from '@solana/keys';

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
