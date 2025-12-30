/**
 * Wallet Errors Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { WalletErrorType, isWalletError, createWalletError } from '../wallet-errors';
import type { WalletError } from '../wallet-errors';

describe('WalletErrorType', () => {
    it('should have all expected error types', () => {
        expect(WalletErrorType.CONNECTION_FAILED).toBe('CONNECTION_FAILED');
        expect(WalletErrorType.TRANSACTION_FAILED).toBe('TRANSACTION_FAILED');
        expect(WalletErrorType.NETWORK_ERROR).toBe('NETWORK_ERROR');
        expect(WalletErrorType.WALLET_NOT_FOUND).toBe('WALLET_NOT_FOUND');
        expect(WalletErrorType.USER_REJECTED).toBe('USER_REJECTED');
        expect(WalletErrorType.INSUFFICIENT_FUNDS).toBe('INSUFFICIENT_FUNDS');
        expect(WalletErrorType.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    });
});

describe('isWalletError', () => {
    it('should return true for wallet errors', () => {
        const walletError = new Error('Test') as WalletError;
        walletError.type = WalletErrorType.CONNECTION_FAILED;
        walletError.recoverable = true;

        expect(isWalletError(walletError)).toBe(true);
    });

    it('should return false for regular errors', () => {
        const error = new Error('Test');
        expect(isWalletError(error)).toBe(false);
    });

    it('should return false for non-errors', () => {
        expect(isWalletError(null)).toBe(false);
        expect(isWalletError(undefined)).toBe(false);
        expect(isWalletError('error')).toBe(false);
        expect(isWalletError({ type: 'CONNECTION_FAILED' })).toBe(false);
    });

    it('should return false for invalid error types', () => {
        const error = new Error('Test') as WalletError;
        error.type = 'INVALID_TYPE' as WalletErrorType;
        error.recoverable = true;

        expect(isWalletError(error)).toBe(false);
    });
});

describe('createWalletError', () => {
    it('should create a wallet error with all properties', () => {
        const baseError = new Error('Test message');
        const walletError = createWalletError(
            baseError,
            WalletErrorType.CONNECTION_FAILED,
            true,
            { walletName: 'Phantom' },
        );

        expect(walletError.message).toBe('Test message');
        expect(walletError.type).toBe(WalletErrorType.CONNECTION_FAILED);
        expect(walletError.recoverable).toBe(true);
        expect(walletError.context).toEqual({ walletName: 'Phantom' });
    });

    it('should create a non-recoverable error', () => {
        const baseError = new Error('Test');
        const walletError = createWalletError(
            baseError,
            WalletErrorType.INSUFFICIENT_FUNDS,
            false,
        );

        expect(walletError.recoverable).toBe(false);
    });

    it('should be recognized by isWalletError', () => {
        const baseError = new Error('Test');
        const walletError = createWalletError(
            baseError,
            WalletErrorType.USER_REJECTED,
            true,
        );

        expect(isWalletError(walletError)).toBe(true);
    });
});
