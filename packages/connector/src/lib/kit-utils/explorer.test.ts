import { describe, it, expect } from 'vitest';
import { getExplorerLink } from './explorer';

describe('getExplorerLink', () => {
    describe('base explorer URL', () => {
        it('returns the base explorer url when no args provided', () => {
            const link = getExplorerLink();
            expect(link).toBe('https://explorer.solana.com/');
        });

        it('returns the base explorer url for mainnet', () => {
            const link = getExplorerLink({ cluster: 'mainnet' });
            expect(link).toBe('https://explorer.solana.com/');
        });

        it('returns the base explorer url for mainnet-beta', () => {
            const link = getExplorerLink({ cluster: 'mainnet-beta' });
            expect(link).toBe('https://explorer.solana.com/');
        });

        it('returns the base explorer url for devnet', () => {
            const link = getExplorerLink({ cluster: 'devnet' });
            expect(link).toBe('https://explorer.solana.com/?cluster=devnet');
        });

        it('returns the base explorer url for testnet', () => {
            const link = getExplorerLink({ cluster: 'testnet' });
            expect(link).toBe('https://explorer.solana.com/?cluster=testnet');
        });

        it('returns the base explorer url for localnet', () => {
            const link = getExplorerLink({ cluster: 'localnet' });
            expect(link).toBe('https://explorer.solana.com/?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899');
        });

        it('returns the base explorer url for localhost', () => {
            const link = getExplorerLink({ cluster: 'localhost' });
            expect(link).toBe('https://explorer.solana.com/?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899');
        });
    });

    describe('block links', () => {
        it('works for a block on mainnet when no network is supplied', () => {
            const link = getExplorerLink({ block: '242233124' });
            expect(link).toBe('https://explorer.solana.com/block/242233124');
        });

        it('works for a block on mainnet-beta', () => {
            const link = getExplorerLink({ cluster: 'mainnet-beta', block: '242233124' });
            expect(link).toBe('https://explorer.solana.com/block/242233124');
        });

        it('works for a block on mainnet', () => {
            const link = getExplorerLink({ cluster: 'mainnet', block: '242233124' });
            expect(link).toBe('https://explorer.solana.com/block/242233124');
        });

        it('works for a numeric block', () => {
            const link = getExplorerLink({ block: 242233124 });
            expect(link).toBe('https://explorer.solana.com/block/242233124');
        });

        it('works for a block on devnet', () => {
            const link = getExplorerLink({ cluster: 'devnet', block: '242233124' });
            expect(link).toBe('https://explorer.solana.com/block/242233124?cluster=devnet');
        });
    });

    describe('address links', () => {
        it('works for an address on mainnet', () => {
            const link = getExplorerLink({
                cluster: 'mainnet-beta',
                address: 'dDCQNnDmNbFVi8cQhKAgXhyhXeJ625tvwsunRyRc7c8',
            });
            expect(link).toBe('https://explorer.solana.com/address/dDCQNnDmNbFVi8cQhKAgXhyhXeJ625tvwsunRyRc7c8');
        });

        it('works for an address on devnet', () => {
            const link = getExplorerLink({
                cluster: 'devnet',
                address: 'dDCQNnDmNbFVi8cQhKAgXhyhXeJ625tvwsunRyRc7c8',
            });
            expect(link).toBe(
                'https://explorer.solana.com/address/dDCQNnDmNbFVi8cQhKAgXhyhXeJ625tvwsunRyRc7c8?cluster=devnet',
            );
        });

        it('works for an address on testnet', () => {
            const link = getExplorerLink({
                cluster: 'testnet',
                address: 'dDCQNnDmNbFVi8cQhKAgXhyhXeJ625tvwsunRyRc7c8',
            });
            expect(link).toBe(
                'https://explorer.solana.com/address/dDCQNnDmNbFVi8cQhKAgXhyhXeJ625tvwsunRyRc7c8?cluster=testnet',
            );
        });

        it('works for an address on localnet', () => {
            const link = getExplorerLink({
                cluster: 'localnet',
                address: 'dDCQNnDmNbFVi8cQhKAgXhyhXeJ625tvwsunRyRc7c8',
            });
            expect(link).toBe(
                'https://explorer.solana.com/address/dDCQNnDmNbFVi8cQhKAgXhyhXeJ625tvwsunRyRc7c8?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899',
            );
        });
    });

    describe('transaction links', () => {
        const signature = '2YhzivV92fw9oT6RjTBWSdqR8Sc9FTWxzPMwAzeqiWutXfEgiwhXz3iCnayt9P8nmKwwGn2wDYsGRCSdeoxTJCDX';

        it('works for a transaction signature on mainnet', () => {
            const link = getExplorerLink({ transaction: signature });
            expect(link).toBe(`https://explorer.solana.com/tx/${signature}`);
        });

        it('works for a transaction on devnet', () => {
            const link = getExplorerLink({ cluster: 'devnet', transaction: signature });
            expect(link).toBe(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);
        });

        it('works for a transaction on testnet', () => {
            const link = getExplorerLink({ cluster: 'testnet', transaction: signature });
            expect(link).toBe(`https://explorer.solana.com/tx/${signature}?cluster=testnet`);
        });

        it('provides a localnet URL for transactions', () => {
            const localSig = '2QC8BkDVZgaPHUXG9HuPw7aE5d6kN5DTRXLe2inT1NzurkYTCFhraSEo883CPNe18BZ2peJC1x1nojZ5Jmhs94pL';
            const link = getExplorerLink({ cluster: 'localnet', transaction: localSig });
            expect(link).toBe(
                `https://explorer.solana.com/tx/${localSig}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`,
            );
        });
    });
});
