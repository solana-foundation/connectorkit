import { describe, it, expect } from 'vitest';
import { LAMPORTS_PER_SOL, lamportsToSol, solToLamports } from './constants';

describe('Kit Constants', () => {
    describe('LAMPORTS_PER_SOL', () => {
        it('should equal 1 billion', () => {
            expect(LAMPORTS_PER_SOL).toBe(1_000_000_000);
        });
    });

    describe('lamportsToSol', () => {
        it('should convert lamports to SOL', () => {
            expect(lamportsToSol(1_000_000_000)).toBe(1);
            expect(lamportsToSol(500_000_000)).toBe(0.5);
            expect(lamportsToSol(1_500_000_000)).toBe(1.5);
        });

        it('should handle bigint input', () => {
            expect(lamportsToSol(BigInt(2_000_000_000))).toBe(2);
        });
    });

    describe('solToLamports', () => {
        it('should convert SOL to lamports', () => {
            expect(solToLamports(1)).toBe(BigInt(1_000_000_000));
            expect(solToLamports(0.5)).toBe(BigInt(500_000_000));
            expect(solToLamports(1.5)).toBe(BigInt(1_500_000_000));
        });
    });
});
