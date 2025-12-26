/**
 * Tests for Explorer URL Utilities
 *
 * Comprehensive tests for generating block explorer URLs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getSolanaExplorerUrl,
    getSolscanUrl,
    getXrayUrl,
    getSolanaFmUrl,
    getAllExplorerUrls,
    formatSignature,
    copySignature,
} from './explorer-urls';

describe('Explorer URL Utilities', () => {
    const mockSignature = '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';

    describe('getSolanaExplorerUrl', () => {
        it('should generate mainnet URL by default', () => {
            const url = getSolanaExplorerUrl(mockSignature);
            expect(url).toContain(mockSignature);
            expect(url).toContain('explorer.solana.com');
        });

        it('should generate mainnet URL explicitly', () => {
            const url = getSolanaExplorerUrl(mockSignature, { cluster: 'mainnet' });
            expect(url).toContain(mockSignature);
            expect(url).toContain('explorer.solana.com');
        });

        it('should normalize mainnet-beta to mainnet', () => {
            const url = getSolanaExplorerUrl(mockSignature, { cluster: 'mainnet-beta' });
            expect(url).toContain(mockSignature);
            expect(url).toContain('explorer.solana.com');
        });

        it('should generate devnet URL', () => {
            const url = getSolanaExplorerUrl(mockSignature, { cluster: 'devnet' });
            expect(url).toContain(mockSignature);
            expect(url).toContain('explorer.solana.com');
            expect(url).toContain('devnet');
        });

        it('should generate testnet URL', () => {
            const url = getSolanaExplorerUrl(mockSignature, { cluster: 'testnet' });
            expect(url).toContain(mockSignature);
            expect(url).toContain('explorer.solana.com');
            expect(url).toContain('testnet');
        });

        it('should handle localnet with default URL', () => {
            const url = getSolanaExplorerUrl(mockSignature, { cluster: 'localnet' });
            expect(url).toContain(mockSignature);
            expect(url).toContain('explorer.solana.com');
            expect(url).toContain('cluster=custom');
            expect(url).toContain(encodeURIComponent('http://localhost:8899'));
        });

        it('should handle localnet with custom URL', () => {
            const customUrl = 'http://127.0.0.1:8899';
            const url = getSolanaExplorerUrl(mockSignature, { cluster: 'localnet', customUrl });
            expect(url).toContain(mockSignature);
            expect(url).toContain('cluster=custom');
            expect(url).toContain(encodeURIComponent(customUrl));
        });

        it('should handle unknown clusters as devnet', () => {
            // @ts-expect-error - Testing unknown cluster fallback
            const url = getSolanaExplorerUrl(mockSignature, { cluster: 'unknown-cluster' });
            expect(url).toContain(mockSignature);
            expect(url).toContain('explorer.solana.com');
        });
    });

    describe('getSolscanUrl', () => {
        it('should generate mainnet URL by default', () => {
            const url = getSolscanUrl(mockSignature);
            expect(url).toBe(`https://solscan.io/tx/${mockSignature}`);
        });

        it('should generate mainnet URL explicitly', () => {
            const url = getSolscanUrl(mockSignature, { cluster: 'mainnet' });
            expect(url).toBe(`https://solscan.io/tx/${mockSignature}`);
        });

        it('should normalize mainnet-beta to mainnet', () => {
            const url = getSolscanUrl(mockSignature, { cluster: 'mainnet-beta' });
            expect(url).toBe(`https://solscan.io/tx/${mockSignature}`);
        });

        it('should generate devnet URL', () => {
            const url = getSolscanUrl(mockSignature, { cluster: 'devnet' });
            expect(url).toBe(`https://solscan.io/tx/${mockSignature}?cluster=devnet`);
        });

        it('should generate testnet URL', () => {
            const url = getSolscanUrl(mockSignature, { cluster: 'testnet' });
            expect(url).toBe(`https://solscan.io/tx/${mockSignature}?cluster=testnet`);
        });

        it('should handle localnet', () => {
            const url = getSolscanUrl(mockSignature, { cluster: 'localnet' });
            expect(url).toBe(`https://solscan.io/tx/${mockSignature}?cluster=custom`);
        });

        it('should handle custom clusters', () => {
            const url = getSolscanUrl(mockSignature, { cluster: 'custom' });
            expect(url).toBe(`https://solscan.io/tx/${mockSignature}?cluster=custom`);
        });
    });

    describe('getXrayUrl', () => {
        it('should generate XRAY URL', () => {
            const url = getXrayUrl(mockSignature);
            expect(url).toBe(`https://xray.helius.xyz/tx/${mockSignature}`);
        });

        it('should work with any signature format', () => {
            const shortSig = 'abc123';
            const url = getXrayUrl(shortSig);
            expect(url).toBe(`https://xray.helius.xyz/tx/${shortSig}`);
        });
    });

    describe('getSolanaFmUrl', () => {
        it('should generate mainnet URL by default', () => {
            const url = getSolanaFmUrl(mockSignature);
            expect(url).toBe(`https://solana.fm/tx/${mockSignature}`);
        });

        it('should generate mainnet URL explicitly', () => {
            const url = getSolanaFmUrl(mockSignature, { cluster: 'mainnet' });
            expect(url).toBe(`https://solana.fm/tx/${mockSignature}`);
        });

        it('should normalize mainnet-beta to mainnet', () => {
            const url = getSolanaFmUrl(mockSignature, { cluster: 'mainnet-beta' });
            expect(url).toBe(`https://solana.fm/tx/${mockSignature}`);
        });

        it('should generate devnet URL', () => {
            const url = getSolanaFmUrl(mockSignature, { cluster: 'devnet' });
            expect(url).toBe(`https://solana.fm/tx/${mockSignature}?cluster=devnet`);
        });

        it('should generate testnet URL', () => {
            const url = getSolanaFmUrl(mockSignature, { cluster: 'testnet' });
            expect(url).toBe(`https://solana.fm/tx/${mockSignature}?cluster=testnet`);
        });

        it('should handle localnet', () => {
            const url = getSolanaFmUrl(mockSignature, { cluster: 'localnet' });
            expect(url).toBe(`https://solana.fm/tx/${mockSignature}?cluster=localnet`);
        });
    });

    describe('getAllExplorerUrls', () => {
        it('should return all explorer URLs', () => {
            const urls = getAllExplorerUrls(mockSignature);

            expect(urls).toHaveProperty('solana-explorer');
            expect(urls).toHaveProperty('solscan');
            expect(urls).toHaveProperty('xray');
            expect(urls).toHaveProperty('solana-fm');
        });

        it('should generate URLs for mainnet by default', () => {
            const urls = getAllExplorerUrls(mockSignature);

            expect(urls['solana-explorer']).toContain(mockSignature);
            expect(urls['solscan']).toContain('solscan.io');
            expect(urls['xray']).toContain('xray.helius.xyz');
            expect(urls['solana-fm']).toContain('solana.fm');
        });

        it('should respect cluster option for all explorers', () => {
            const urls = getAllExplorerUrls(mockSignature, { cluster: 'devnet' });

            expect(urls['solana-explorer']).toContain('devnet');
            expect(urls['solscan']).toContain('cluster=devnet');
            expect(urls['solana-fm']).toContain('cluster=devnet');
        });

        it('should include all 4 explorer types', () => {
            const urls = getAllExplorerUrls(mockSignature);
            const keys = Object.keys(urls);

            expect(keys).toHaveLength(4);
            expect(keys).toContain('solana-explorer');
            expect(keys).toContain('solscan');
            expect(keys).toContain('xray');
            expect(keys).toContain('solana-fm');
        });
    });

    describe('formatSignature', () => {
        it('should truncate long signatures by default (8 chars)', () => {
            const formatted = formatSignature(mockSignature);
            expect(formatted).toBe('5VERv8NM...diSZkQUW');
            expect(formatted.length).toBe(8 + 3 + 8); // 8 + '...' + 8
        });

        it('should use custom char count', () => {
            const formatted = formatSignature(mockSignature, 4);
            expect(formatted).toBe('5VER...kQUW');
            expect(formatted.length).toBe(4 + 3 + 4);
        });

        it('should return full signature if short enough', () => {
            const shortSig = 'abc123';
            const formatted = formatSignature(shortSig, 8);
            expect(formatted).toBe('abc123');
        });

        it('should handle exact length', () => {
            const sig = 'abcd1234efgh5678';
            const formatted = formatSignature(sig, 8);
            expect(formatted).toBe(sig);
        });

        it('should handle zero chars', () => {
            const formatted = formatSignature(mockSignature, 0);
            // With 0 chars, it shows "..." followed by the full end
            expect(formatted).toContain('...');
            expect(formatted.length).toBeGreaterThan(3);
        });

        it('should handle large char counts', () => {
            const formatted = formatSignature(mockSignature, 50);
            expect(formatted).toBe(mockSignature);
        });
    });

    describe('copySignature', () => {
        let originalClipboard: Clipboard;

        beforeEach(() => {
            // Save original clipboard
            originalClipboard = navigator.clipboard;

            // Mock clipboard with a simple object
            const mockClipboard = {
                writeText: vi.fn().mockResolvedValue(undefined),
            } as unknown as Clipboard;

            Object.defineProperty(navigator, 'clipboard', {
                value: mockClipboard,
                writable: true,
                configurable: true,
            });
        });

        afterEach(() => {
            // Restore original clipboard
            Object.defineProperty(navigator, 'clipboard', {
                value: originalClipboard,
                writable: true,
                configurable: true,
            });
            vi.restoreAllMocks();
        });

        it('should copy signature to clipboard', async () => {
            const result = await copySignature(mockSignature);

            expect(result).toBe(true);
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockSignature);
        });

        it('should return true on success', async () => {
            const result = await copySignature(mockSignature);

            expect(result).toBe(true);
        });

        it('should return false on error', async () => {
            vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Clipboard error'));

            const result = await copySignature(mockSignature);

            expect(result).toBe(false);
        });

        it('should handle clipboard permission denial', async () => {
            vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new DOMException('Permission denied'));

            const result = await copySignature(mockSignature);

            expect(result).toBe(false);
        });

        it('should handle missing clipboard API gracefully', async () => {
            Object.defineProperty(navigator, 'clipboard', {
                value: undefined,
                writable: true,
                configurable: true,
            });

            const result = await copySignature(mockSignature);

            expect(result).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('should handle empty signature', () => {
            const url = getSolanaExplorerUrl('');
            expect(url).toContain('explorer.solana.com');
        });

        it('should handle special characters in signature', () => {
            const specialSig = 'abc%20def';
            const url = getSolscanUrl(specialSig);
            expect(url).toContain(specialSig);
        });

        it('should handle undefined options', () => {
            const url = getSolanaExplorerUrl(mockSignature);
            expect(url).toContain(mockSignature);
        });

        it('should handle null cluster', () => {
            // @ts-expect-error - Testing null cluster handling
            const url = getSolscanUrl(mockSignature, { cluster: null });
            expect(url).toContain(mockSignature);
        });
    });

    describe('URL encoding', () => {
        it('should properly encode custom URLs', () => {
            const customUrl = 'http://localhost:8899?param=value';
            const url = getSolanaExplorerUrl(mockSignature, { cluster: 'localnet', customUrl });
            expect(url).toContain(encodeURIComponent(customUrl));
        });

        it('should handle URLs with special characters', () => {
            const customUrl = 'http://127.0.0.1:8899/rpc?token=abc&key=xyz';
            const url = getSolanaExplorerUrl(mockSignature, { cluster: 'localnet', customUrl });
            expect(url).toContain(encodeURIComponent(customUrl));
        });
    });
});
