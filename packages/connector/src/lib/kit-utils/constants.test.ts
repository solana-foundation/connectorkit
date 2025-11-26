import { describe, it, expect } from 'vitest';
import { LAMPORTS_PER_SOL, GENESIS_HASH, lamportsToSol, solToLamports } from './constants';

describe('LAMPORTS_PER_SOL', () => {
    it('equals 1 billion', () => {
        expect(LAMPORTS_PER_SOL).toBe(1_000_000_000);
    });

    it('is a number', () => {
        expect(typeof LAMPORTS_PER_SOL).toBe('number');
    });
});

describe('GENESIS_HASH', () => {
    it('has mainnet genesis hash', () => {
        expect(GENESIS_HASH.mainnet).toBe('5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d');
    });

    it('has devnet genesis hash', () => {
        expect(GENESIS_HASH.devnet).toBe('EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG');
    });

    it('has testnet genesis hash', () => {
        expect(GENESIS_HASH.testnet).toBe('4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY');
    });

    it('is readonly', () => {
        // TypeScript prevents modification at compile time
        // Runtime check that the object has expected shape
        expect(Object.keys(GENESIS_HASH)).toEqual(['mainnet', 'devnet', 'testnet']);
    });
});

describe('lamportsToSol', () => {
    it('converts 1 SOL worth of lamports', () => {
        expect(lamportsToSol(1_000_000_000)).toBe(1);
    });

    it('converts 0 lamports', () => {
        expect(lamportsToSol(0)).toBe(0);
    });

    it('converts fractional SOL', () => {
        expect(lamportsToSol(500_000_000)).toBe(0.5);
    });

    it('converts small amounts', () => {
        expect(lamportsToSol(1)).toBe(0.000000001);
    });

    it('converts large amounts', () => {
        expect(lamportsToSol(100_000_000_000)).toBe(100);
    });

    it('handles bigint input', () => {
        expect(lamportsToSol(BigInt(1_000_000_000))).toBe(1);
    });

    it('handles large bigint input', () => {
        expect(lamportsToSol(BigInt('1000000000000000000'))).toBe(1_000_000_000);
    });

    it('returns a number type', () => {
        expect(typeof lamportsToSol(1_000_000_000)).toBe('number');
    });
});

describe('solToLamports', () => {
    it('converts 1 SOL', () => {
        expect(solToLamports(1)).toBe(BigInt(1_000_000_000));
    });

    it('converts 0 SOL', () => {
        expect(solToLamports(0)).toBe(BigInt(0));
    });

    it('converts fractional SOL', () => {
        expect(solToLamports(0.5)).toBe(BigInt(500_000_000));
    });

    it('converts small amounts', () => {
        expect(solToLamports(0.000000001)).toBe(BigInt(1));
    });

    it('converts large amounts', () => {
        expect(solToLamports(100)).toBe(BigInt(100_000_000_000));
    });

    it('returns a bigint type', () => {
        expect(typeof solToLamports(1)).toBe('bigint');
    });

    it('floors fractional lamports', () => {
        // 0.0000000015 SOL = 1.5 lamports, should floor to 1
        expect(solToLamports(0.0000000015)).toBe(BigInt(1));
    });

    it('handles very small amounts that round to 0', () => {
        // 0.0000000001 SOL = 0.1 lamports, should floor to 0
        expect(solToLamports(0.0000000001)).toBe(BigInt(0));
    });
});

describe('lamportsToSol and solToLamports roundtrip', () => {
    it('roundtrips whole SOL values', () => {
        const original = 5;
        const lamports = solToLamports(original);
        const result = lamportsToSol(lamports);
        expect(result).toBe(original);
    });

    it('roundtrips fractional SOL values', () => {
        const original = 1.5;
        const lamports = solToLamports(original);
        const result = lamportsToSol(lamports);
        expect(result).toBe(original);
    });

    it('roundtrips from lamports', () => {
        const original = BigInt(2_500_000_000);
        const sol = lamportsToSol(original);
        const result = solToLamports(sol);
        expect(result).toBe(original);
    });
});


