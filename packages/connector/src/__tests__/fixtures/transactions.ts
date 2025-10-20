/**
 * Transaction test fixtures
 * 
 * Pre-configured transaction data for testing
 */

import type { TransactionActivity, TransactionMethod } from '../../types/transactions';
import type { SolanaClusterId } from '@wallet-ui/core';

/**
 * Test transaction signatures
 */
export const TEST_SIGNATURES = {
    TX_1: '5j7s6NiJS3JAkvgkoc18WVAsiSaci2pxB2A6ueCJP4tprA2TFg9wSyTLeYouxPBJEMzJinENTkpA52YStRW5Dia7',
    TX_2: '2nBhEBYYvfaAe16UMNqRHre4YNSskvuYgx3M6E4JP1oDYvZEJHvoPzyUidNgNX5r9sTyN1J9UxtbCXy2rqYcuyuv',
    TX_3: '3yMKiZKLN3aB8XZFSwLEzHKJ2mHzJLLJqE7FYnBaWYFQ7wT9SsCkshEMvApCPNKrQ9p2BYmXGqHv9KiYuAXnQCDD',
} as const;

/**
 * Create a mock transaction activity
 */
export function createMockTransaction(
    signature: string = TEST_SIGNATURES.TX_1,
    options: {
        status?: 'pending' | 'confirmed' | 'failed';
        timestamp?: string;
        error?: string;
        cluster?: SolanaClusterId;
        method?: TransactionMethod;
    } = {},
): TransactionActivity {
    return {
        signature: signature as any,
        status: options.status ?? 'pending',
        timestamp: options.timestamp ?? new Date().toISOString(),
        error: options.error,
        cluster: (options.cluster ?? 'solana:devnet') as SolanaClusterId,
        method: options.method ?? 'signAndSendTransaction',
    };
}

/**
 * Create a pending transaction
 */
export function createPendingTransaction(signature?: string): TransactionActivity {
    return createMockTransaction(signature, { status: 'pending' });
}

/**
 * Create a confirmed transaction
 */
export function createConfirmedTransaction(signature?: string): TransactionActivity {
    return createMockTransaction(signature, { status: 'confirmed' });
}

/**
 * Create a failed transaction
 */
export function createFailedTransaction(signature?: string, error?: string): TransactionActivity {
    return createMockTransaction(signature, {
        status: 'failed',
        error: error ?? 'Transaction failed',
    });
}

/**
 * Create multiple test transactions
 */
export function createTestTransactions(count: number = 3): TransactionActivity[] {
    const signatures = Object.values(TEST_SIGNATURES);
    const statuses: Array<'pending' | 'confirmed' | 'failed'> = ['pending', 'confirmed', 'failed'];
    
    return Array.from({ length: Math.min(count, signatures.length) }, (_, i) =>
        createMockTransaction(signatures[i], {
            status: statuses[i % statuses.length],
        }),
    );
}

