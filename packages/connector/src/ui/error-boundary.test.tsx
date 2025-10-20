import { describe, it, expect, vi } from 'vitest';
import { ConnectorErrorBoundary, withErrorBoundary, WalletErrorType } from './error-boundary';

// Mock logger
vi.mock('../lib/utils/secure-logger', () => ({
    createLogger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn() })),
}));

// Mock error utilities
vi.mock('../lib/errors', () => ({
    isConnectorError: vi.fn(() => false),
    getUserFriendlyMessage: vi.fn(error => error.message),
}));

describe('Error Boundary', () => {
    describe('Components', () => {
        it('should export ConnectorErrorBoundary', () => {
            expect(typeof ConnectorErrorBoundary).toBe('function');
        });

        it('should export withErrorBoundary HOC', () => {
            expect(typeof withErrorBoundary).toBe('function');
        });
    });

    describe('WalletErrorType enum', () => {
        it('should export error types', () => {
            expect(WalletErrorType.CONNECTION_FAILED).toBe('CONNECTION_FAILED');
            expect(WalletErrorType.TRANSACTION_FAILED).toBe('TRANSACTION_FAILED');
            expect(WalletErrorType.NETWORK_ERROR).toBe('NETWORK_ERROR');
            expect(WalletErrorType.WALLET_NOT_FOUND).toBe('WALLET_NOT_FOUND');
            expect(WalletErrorType.USER_REJECTED).toBe('USER_REJECTED');
            expect(WalletErrorType.INSUFFICIENT_FUNDS).toBe('INSUFFICIENT_FUNDS');
            expect(WalletErrorType.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
        });
    });

    describe('HOC functionality', () => {
        it('should create wrapped component with withErrorBoundary', () => {
            const TestComponent = () => null;
            const WrappedComponent = withErrorBoundary(TestComponent);

            expect(WrappedComponent).toBeTruthy();
            expect(typeof WrappedComponent).toBe('function');
        });
    });
});
