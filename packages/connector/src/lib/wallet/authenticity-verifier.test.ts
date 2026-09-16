import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalletAuthenticityVerifier } from './authenticity-verifier';
import type { DirectWallet } from './detector';

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

        it('should reject a spoofed legacy provider that implements no features', () => {
            // A fake `window.<name>` with just connect/disconnect and a mismatched
            // identity. Scoring it 0 on Wallet Standard compliance is what keeps it
            // under the 0.6 threshold - renormalizing that weight away would push the
            // same object to 0.77 and mark it authentic.
            const spoofed = {
                connect: vi.fn(),
                disconnect: vi.fn(),
            } as unknown as DirectWallet;

            const result = WalletAuthenticityVerifier.verify(spoofed, 'Phantom');

            expect(result.confidence).toBeLessThan(0.6);
            expect(result.authentic).toBe(false);
        });

        it('should reject a bare class-instance shell impersonating a wallet', () => {
            // The one trait a minimal impersonation shell shares with a real provider is
            // a custom prototype, so that alone is not penalized. What gives it away is
            // the combination: a custom prototype, no `features`, no `chains`, and a
            // method surface of nothing but connect/disconnect. Without the deduction
            // for that combination this object rides its name match to 0.625 and clears
            // the 0.6 threshold, after which direct detection hands it to auto-connect.
            class FakePhantom {
                name = 'Phantom';
                connect() {
                    return Promise.resolve();
                }
                disconnect() {
                    return Promise.resolve();
                }
            }

            const result = WalletAuthenticityVerifier.verify(new FakePhantom() as unknown as DirectWallet, 'Phantom');

            expect(result.confidence).toBeLessThan(0.6);
            expect(result.authentic).toBe(false);
        });

        it('should accept a genuine class-instance provider with a broad method surface', () => {
            // Real wallets expose their provider as a class instance too - Phantom
            // included - so the check above must not catch them. A genuine provider
            // fails the emptiness test on every count: it declares chains and carries
            // far more than the two lifecycle methods.
            class RealPhantom {
                isPhantom = true;
                chains = ['solana:mainnet'];
                connect() {
                    return Promise.resolve();
                }
                disconnect() {
                    return Promise.resolve();
                }
                signTransaction() {
                    return Promise.resolve();
                }
                signAllTransactions() {
                    return Promise.resolve();
                }
                signMessage() {
                    return Promise.resolve();
                }
                request() {
                    return Promise.resolve();
                }
                on() {}
                off() {}
            }

            const result = WalletAuthenticityVerifier.verify(new RealPhantom() as unknown as DirectWallet, 'Phantom');

            expect(result.authentic).toBe(true);
            expect(result.confidence).toBeGreaterThanOrEqual(0.6);
        });

        it('should accept a genuine legacy provider despite having no features object', () => {
            const legacy = {
                connect: vi.fn(),
                disconnect: vi.fn(),
                isPhantom: true,
                chains: ['solana:mainnet'],
            } as unknown as DirectWallet;

            const result = WalletAuthenticityVerifier.verify(legacy, 'Phantom');

            expect(result.authentic).toBe(true);
            expect(result.confidence).toBeLessThanOrEqual(1);
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
