import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalletAuthenticityVerifier } from './wallet-authenticity-verifier';
import type { DirectWallet } from './wallet-detector';

// Mock logger
vi.mock('../utils/secure-logger', () => ({
    createLogger: vi.fn(() => ({ debug: vi.fn(), warn: vi.fn() })),
}));

describe('WalletAuthenticityVerifier', () => {
    let mockWallet: DirectWallet;

    beforeEach(() => {
        mockWallet = {
            connect: vi.fn(),
            disconnect: vi.fn(),
            signTransaction: vi.fn(),
            signMessage: vi.fn(),
            publicKey: { toString: () => '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKucSFTa2KSTu8' },
            features: {
                'standard:connect': { version: '1.0.0' },
                'standard:disconnect': { version: '1.0.0' },
            },
            chains: ['solana:mainnet'],
        };
    });

    describe('verify', () => {
        it('should verify authentic wallet', () => {
            const result = WalletAuthenticityVerifier.verify(mockWallet, 'Phantom');

            expect(result).toHaveProperty('authentic');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('reason');
            expect(result).toHaveProperty('warnings');
            expect(result).toHaveProperty('securityScore');
            expect(typeof result.confidence).toBe('number');
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });

        it('should handle missing wallet methods', () => {
            const incompleteWallet = { publicKey: mockWallet.publicKey } as unknown as DirectWallet;
            const result = WalletAuthenticityVerifier.verify(incompleteWallet, 'Test');

            expect(result.authentic).toBe(false);
            expect(result.confidence).toBeLessThan(1);
        });

        it('should handle empty wallet object', () => {
            const result = WalletAuthenticityVerifier.verify({} as unknown as DirectWallet, 'Test');
            expect(result.authentic).toBe(false);
        });

        it('should verify batch of wallets', () => {
            const wallets = [{ wallet: mockWallet, name: 'Phantom' }];
            const results = WalletAuthenticityVerifier.verifyBatch(wallets);

            expect(results instanceof Map).toBe(true);
            expect(results.has('Phantom')).toBe(true);
        });

        it('should generate security report', () => {
            const result = WalletAuthenticityVerifier.verify(mockWallet, 'Phantom');
            const report = WalletAuthenticityVerifier.getSecurityReport(result);

            expect(typeof report).toBe('string');
            expect(report.length).toBeGreaterThan(0);
        });
    });
});
