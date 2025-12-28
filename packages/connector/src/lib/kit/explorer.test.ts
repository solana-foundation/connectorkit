import { describe, it, expect } from 'vitest';
import { getExplorerLink } from './explorer';

describe('Explorer Utilities', () => {
    describe('getExplorerLink', () => {
        it('should generate address link on mainnet by default', () => {
            const url = getExplorerLink({ address: 'abc123' });
            expect(url).toBe('https://explorer.solana.com/address/abc123');
        });

        it('should generate transaction link', () => {
            const url = getExplorerLink({ transaction: 'tx123' });
            expect(url).toBe('https://explorer.solana.com/tx/tx123');
        });

        it('should generate block link', () => {
            const url = getExplorerLink({ block: 12345 });
            expect(url).toBe('https://explorer.solana.com/block/12345');
        });

        it('should add devnet cluster parameter', () => {
            const url = getExplorerLink({ address: 'abc123', cluster: 'devnet' });
            expect(url).toBe('https://explorer.solana.com/address/abc123?cluster=devnet');
        });

        it('should add testnet cluster parameter', () => {
            const url = getExplorerLink({ address: 'abc123', cluster: 'testnet' });
            expect(url).toBe('https://explorer.solana.com/address/abc123?cluster=testnet');
        });

        it('should handle localnet with custom URL', () => {
            const url = getExplorerLink({ address: 'abc123', cluster: 'localnet' });
            expect(url).toContain('cluster=custom');
            expect(url).toContain('customUrl=http%3A%2F%2Flocalhost%3A8899');
        });

        it('should handle localhost same as localnet', () => {
            const url = getExplorerLink({ address: 'abc123', cluster: 'localhost' });
            expect(url).toContain('cluster=custom');
            expect(url).toContain('customUrl=http%3A%2F%2Flocalhost%3A8899');
        });

        it('should return base URL with no arguments', () => {
            const url = getExplorerLink();
            expect(url).toBe('https://explorer.solana.com/');
        });
    });
});
