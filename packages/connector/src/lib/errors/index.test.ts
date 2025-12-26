/**
 * Error System tests
 *
 * Tests unified error classes, type guards, factory functions, and error conversion
 */

import { describe, it, expect } from 'vitest';
import {
    ConnectorError,
    ConnectionError,
    ValidationError,
    ConfigurationError,
    NetworkError,
    TransactionError,
    isConnectorError,
    isConnectionError,
    isValidationError,
    isConfigurationError,
    isNetworkError,
    isTransactionError,
    Errors,
    toConnectorError,
    getUserFriendlyMessage,
} from './index';

describe('Error System', () => {
    describe('ConnectionError', () => {
        it('should create connection error with correct properties', () => {
            const error = new ConnectionError('WALLET_NOT_CONNECTED', 'No wallet connected');

            expect(error).toBeInstanceOf(ConnectorError);
            expect(error).toBeInstanceOf(ConnectionError);
            expect(error.code).toBe('WALLET_NOT_CONNECTED');
            expect(error.message).toBe('No wallet connected');
            expect(error.recoverable).toBe(true);
            expect(error.timestamp).toBeDefined();
        });

        it('should include context data', () => {
            const context = { walletName: 'Phantom' };
            const error = new ConnectionError('WALLET_NOT_FOUND', 'Wallet not found', context);

            expect(error.context).toEqual(context);
        });

        it('should preserve original error', () => {
            const originalError = new Error('Network timeout');
            const error = new ConnectionError('CONNECTION_FAILED', 'Failed to connect', undefined, originalError);

            expect(error.originalError).toBe(originalError);
        });

        it('should serialize to JSON', () => {
            const error = new ConnectionError('CONNECTION_FAILED', 'Failed to connect', { retry: true });
            const json = error.toJSON();

            expect(json.name).toBe('ConnectionError');
            expect(json.code).toBe('CONNECTION_FAILED');
            expect(json.message).toBe('Failed to connect');
            expect(json.recoverable).toBe(true);
            expect(json.context).toEqual({ retry: true });
            expect(json.timestamp).toBeDefined();
        });
    });

    describe('ValidationError', () => {
        it('should create validation error', () => {
            const error = new ValidationError('INVALID_TRANSACTION', 'Transaction is invalid');

            expect(error).toBeInstanceOf(ValidationError);
            expect(error.code).toBe('INVALID_TRANSACTION');
            expect(error.recoverable).toBe(false);
        });

        it('should handle different validation error codes', () => {
            const codes: Array<ValidationError['code']> = [
                'INVALID_TRANSACTION',
                'INVALID_MESSAGE',
                'INVALID_ADDRESS',
                'INVALID_SIGNATURE',
                'INVALID_FORMAT',
                'UNSUPPORTED_FORMAT',
                'VALIDATION_FAILED',
            ];

            codes.forEach(code => {
                const error = new ValidationError(code, 'Test error');
                expect(error.code).toBe(code);
                expect(error.recoverable).toBe(false);
            });
        });
    });

    describe('ConfigurationError', () => {
        it('should create configuration error', () => {
            const error = new ConfigurationError('MISSING_PROVIDER', 'Provider missing');

            expect(error).toBeInstanceOf(ConfigurationError);
            expect(error.code).toBe('MISSING_PROVIDER');
            expect(error.recoverable).toBe(false);
        });

        it('should handle all configuration error codes', () => {
            const codes: Array<ConfigurationError['code']> = [
                'MISSING_PROVIDER',
                'INVALID_CLUSTER',
                'CLUSTER_NOT_FOUND',
                'INVALID_CONFIG',
                'INITIALIZATION_FAILED',
            ];

            codes.forEach(code => {
                const error = new ConfigurationError(code, 'Test error');
                expect(error.code).toBe(code);
            });
        });
    });

    describe('NetworkError', () => {
        it('should create network error', () => {
            const error = new NetworkError('RPC_ERROR', 'RPC call failed');

            expect(error).toBeInstanceOf(NetworkError);
            expect(error.code).toBe('RPC_ERROR');
            expect(error.recoverable).toBe(true);
        });

        it('should handle network error codes', () => {
            const codes: Array<NetworkError['code']> = [
                'RPC_ERROR',
                'NETWORK_TIMEOUT',
                'NETWORK_UNAVAILABLE',
                'TRANSACTION_SIMULATION_FAILED',
            ];

            codes.forEach(code => {
                const error = new NetworkError(code, 'Test error');
                expect(error.code).toBe(code);
                expect(error.recoverable).toBe(true);
            });
        });
    });

    describe('TransactionError', () => {
        it('should create transaction error', () => {
            const error = new TransactionError('SIGNING_FAILED', 'Failed to sign');

            expect(error).toBeInstanceOf(TransactionError);
            expect(error.code).toBe('SIGNING_FAILED');
        });

        it('should mark some errors as recoverable', () => {
            const recoverableCodes: Array<TransactionError['code']> = [
                'USER_REJECTED',
                'SEND_FAILED',
                'SIMULATION_FAILED',
            ];

            recoverableCodes.forEach(code => {
                const error = new TransactionError(code, 'Test error');
                expect(error.recoverable).toBe(true);
            });
        });

        it('should mark some errors as non-recoverable', () => {
            const nonRecoverableCodes: Array<TransactionError['code']> = [
                'SIGNING_FAILED',
                'FEATURE_NOT_SUPPORTED',
                'INVALID_TRANSACTION',
                'TRANSACTION_EXPIRED',
            ];

            nonRecoverableCodes.forEach(code => {
                const error = new TransactionError(code, 'Test error');
                expect(error.recoverable).toBe(false);
            });
        });
    });

    describe('Type Guards', () => {
        it('should identify ConnectorError', () => {
            const error = new ConnectionError('WALLET_NOT_CONNECTED', 'Test');
            expect(isConnectorError(error)).toBe(true);
            expect(isConnectorError(new Error('Regular error'))).toBe(false);
            expect(isConnectorError('not an error')).toBe(false);
        });

        it('should identify ConnectionError', () => {
            const error = new ConnectionError('WALLET_NOT_CONNECTED', 'Test');
            expect(isConnectionError(error)).toBe(true);
            expect(isConnectionError(new ValidationError('INVALID_FORMAT', 'Test'))).toBe(false);
        });

        it('should identify ValidationError', () => {
            const error = new ValidationError('INVALID_FORMAT', 'Test');
            expect(isValidationError(error)).toBe(true);
            expect(isValidationError(new ConnectionError('WALLET_NOT_CONNECTED', 'Test'))).toBe(false);
        });

        it('should identify ConfigurationError', () => {
            const error = new ConfigurationError('MISSING_PROVIDER', 'Test');
            expect(isConfigurationError(error)).toBe(true);
            expect(isConfigurationError(new NetworkError('RPC_ERROR', 'Test'))).toBe(false);
        });

        it('should identify NetworkError', () => {
            const error = new NetworkError('RPC_ERROR', 'Test');
            expect(isNetworkError(error)).toBe(true);
            expect(isNetworkError(new TransactionError('SIGNING_FAILED', 'Test'))).toBe(false);
        });

        it('should identify TransactionError', () => {
            const error = new TransactionError('SIGNING_FAILED', 'Test');
            expect(isTransactionError(error)).toBe(true);
            expect(isTransactionError(new ConnectionError('WALLET_NOT_CONNECTED', 'Test'))).toBe(false);
        });
    });

    describe('Error Factory Functions', () => {
        it('should create walletNotConnected error', () => {
            const error = Errors.walletNotConnected();
            expect(error.code).toBe('WALLET_NOT_CONNECTED');
            expect(error.message).toBe('No wallet connected');
        });

        it('should create walletNotFound error', () => {
            const error = Errors.walletNotFound('Phantom');
            expect(error.code).toBe('WALLET_NOT_FOUND');
            expect(error.message).toContain('Phantom');
        });

        it('should create connectionFailed error', () => {
            const originalError = new Error('Network error');
            const error = Errors.connectionFailed(originalError);
            expect(error.code).toBe('CONNECTION_FAILED');
            expect(error.originalError).toBe(originalError);
        });

        it('should create accountNotAvailable error', () => {
            const error = Errors.accountNotAvailable('address123');
            expect(error.code).toBe('ACCOUNT_NOT_AVAILABLE');
            expect(error.context?.address).toBe('address123');
        });

        it('should create invalidTransaction error', () => {
            const error = Errors.invalidTransaction('missing signature');
            expect(error.code).toBe('INVALID_TRANSACTION');
            expect(error.message).toContain('missing signature');
        });

        it('should create invalidFormat error', () => {
            const error = Errors.invalidFormat('base58', 'hex');
            expect(error.code).toBe('INVALID_FORMAT');
            expect(error.context?.expectedFormat).toBe('base58');
        });

        it('should create unsupportedFormat error', () => {
            const error = Errors.unsupportedFormat('legacy');
            expect(error.code).toBe('UNSUPPORTED_FORMAT');
            expect(error.context?.format).toBe('legacy');
        });

        it('should create missingProvider error', () => {
            const error = Errors.missingProvider('useAccount');
            expect(error.code).toBe('MISSING_PROVIDER');
            expect(error.message).toContain('useAccount');
            expect(error.message).toContain('ConnectorProvider');
        });

        it('should create clusterNotFound error', () => {
            const error = Errors.clusterNotFound('custom', ['mainnet', 'devnet']);
            expect(error.code).toBe('CLUSTER_NOT_FOUND');
            expect(error.message).toContain('custom');
            expect(error.message).toContain('mainnet');
        });

        it('should create rpcError', () => {
            const error = Errors.rpcError('Connection timeout');
            expect(error.code).toBe('RPC_ERROR');
            expect(error.message).toBe('Connection timeout');
        });

        it('should create networkTimeout error', () => {
            const error = Errors.networkTimeout();
            expect(error.code).toBe('NETWORK_TIMEOUT');
        });

        it('should create signingFailed error', () => {
            const error = Errors.signingFailed();
            expect(error.code).toBe('SIGNING_FAILED');
        });

        it('should create featureNotSupported error', () => {
            const error = Errors.featureNotSupported('signAndSendTransaction');
            expect(error.code).toBe('FEATURE_NOT_SUPPORTED');
            expect(error.context?.feature).toBe('signAndSendTransaction');
        });

        it('should create userRejected error', () => {
            const error = Errors.userRejected('transaction');
            expect(error.code).toBe('USER_REJECTED');
            expect(error.context?.operation).toBe('transaction');
        });
    });

    describe('toConnectorError', () => {
        it('should pass through ConnectorError unchanged', () => {
            const originalError = new ConnectionError('WALLET_NOT_CONNECTED', 'Test');
            const converted = toConnectorError(originalError);
            expect(converted).toBe(originalError);
        });

        it('should detect user rejection from error message', () => {
            const error = new Error('User rejected the request');
            const converted = toConnectorError(error);
            expect(converted.code).toBe('USER_REJECTED');
        });

        it('should detect wallet not found from error message', () => {
            const error = new Error('Wallet not installed');
            const converted = toConnectorError(error);
            expect(converted.code).toBe('WALLET_NOT_FOUND');
        });

        it('should detect not connected from error message', () => {
            const error = new Error('Wallet not connected');
            const converted = toConnectorError(error);
            expect(converted.code).toBe('WALLET_NOT_CONNECTED');
        });

        it('should detect network errors', () => {
            const error = new Error('Network request failed');
            const converted = toConnectorError(error);
            expect(converted.code).toBe('RPC_ERROR');
        });

        it('should detect invalid errors', () => {
            const error = new Error('Invalid transaction format');
            const converted = toConnectorError(error);
            expect(converted.code).toBe('VALIDATION_FAILED');
        });

        it('should wrap generic errors as transaction errors', () => {
            const error = new Error('Something went wrong');
            const converted = toConnectorError(error);
            expect(converted.code).toBe('SIGNING_FAILED');
            expect(converted.message).toBe('Something went wrong');
        });

        it('should handle non-Error objects', () => {
            const converted = toConnectorError('string error');
            expect(converted).toBeInstanceOf(TransactionError);
            expect(converted.code).toBe('SIGNING_FAILED');
        });

        it('should use default message for unknown errors', () => {
            const converted = toConnectorError(null, 'Custom default message');
            expect(converted.message).toBe('Custom default message');
        });
    });

    describe('getUserFriendlyMessage', () => {
        it('should return friendly message for wallet not connected', () => {
            const error = new ConnectionError('WALLET_NOT_CONNECTED', 'Technical message');
            const message = getUserFriendlyMessage(error);
            expect(message).toBe('Please connect your wallet to continue.');
        });

        it('should return friendly message for wallet not found', () => {
            const error = new ConnectionError('WALLET_NOT_FOUND', 'Technical message');
            const message = getUserFriendlyMessage(error);
            expect(message).toBe('Wallet not found. Please install a supported wallet.');
        });

        it('should return friendly message for user rejection', () => {
            const error = new TransactionError('USER_REJECTED', 'Technical message');
            const message = getUserFriendlyMessage(error);
            expect(message).toBe('Transaction was cancelled.');
        });

        it('should return friendly message for feature not supported', () => {
            const error = new TransactionError('FEATURE_NOT_SUPPORTED', 'Technical message');
            const message = getUserFriendlyMessage(error);
            expect(message).toBe('This wallet does not support this feature.');
        });

        it('should return friendly message for network errors', () => {
            const error = new NetworkError('RPC_ERROR', 'Technical message');
            const message = getUserFriendlyMessage(error);
            expect(message).toBe('Network error. Please check your connection.');
        });

        it('should return generic message for unknown errors', () => {
            const error = new Error('Random error');
            const message = getUserFriendlyMessage(error);
            expect(message).toBe('An unexpected error occurred. Please try again.');
        });

        it('should fallback to error message for unknown codes', () => {
            const error = new ConnectionError('CONNECTION_FAILED', 'Specific error message');
            const message = getUserFriendlyMessage(error);
            expect(message).toBe('Failed to connect to wallet. Please try again.');
        });
    });

    describe('Error Stack Traces', () => {
        it('should capture stack trace', () => {
            const error = new ConnectionError('WALLET_NOT_CONNECTED', 'Test');
            expect(error.stack).toBeDefined();
            expect(error.stack).toContain('ConnectionError');
        });

        it('should have proper error name', () => {
            const connectionError = new ConnectionError('WALLET_NOT_CONNECTED', 'Test');
            const validationError = new ValidationError('INVALID_FORMAT', 'Test');

            expect(connectionError.name).toBe('ConnectionError');
            expect(validationError.name).toBe('ValidationError');
        });
    });
});
