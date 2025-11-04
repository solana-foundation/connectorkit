/**
 * @solana/connector - Unified Error System
 */

export abstract class ConnectorError extends Error {
    abstract readonly code: string;
    abstract readonly recoverable: boolean;
    readonly context?: Record<string, unknown>;
    readonly originalError?: Error;
    readonly timestamp: string;

    constructor(message: string, context?: Record<string, unknown>, originalError?: Error) {
        super(message);
        this.name = this.constructor.name;
        this.context = context;
        this.originalError = originalError;
        this.timestamp = new Date().toISOString();

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            recoverable: this.recoverable,
            context: this.context,
            timestamp: this.timestamp,
            originalError: this.originalError?.message,
        };
    }
}

export class ConnectionError extends ConnectorError {
    readonly code: ConnectionErrorCode;
    readonly recoverable = true;

    constructor(code: ConnectionErrorCode, message: string, context?: Record<string, unknown>, originalError?: Error) {
        super(message, context, originalError);
        this.code = code;
    }
}

export type ConnectionErrorCode =
    | 'WALLET_NOT_CONNECTED'
    | 'WALLET_NOT_FOUND'
    | 'CONNECTION_FAILED'
    | 'CONNECTION_REJECTED'
    | 'DISCONNECTION_FAILED'
    | 'ACCOUNT_NOT_AVAILABLE'
    | 'RECONNECTION_FAILED';

export class ValidationError extends ConnectorError {
    readonly code: ValidationErrorCode;
    readonly recoverable = false;

    constructor(code: ValidationErrorCode, message: string, context?: Record<string, unknown>, originalError?: Error) {
        super(message, context, originalError);
        this.code = code;
    }
}

export type ValidationErrorCode =
    | 'INVALID_TRANSACTION'
    | 'INVALID_MESSAGE'
    | 'INVALID_ADDRESS'
    | 'INVALID_SIGNATURE'
    | 'INVALID_FORMAT'
    | 'UNSUPPORTED_FORMAT'
    | 'VALIDATION_FAILED';

export class ConfigurationError extends ConnectorError {
    readonly code: ConfigurationErrorCode;
    readonly recoverable = false;

    constructor(code: ConfigurationErrorCode, message: string, context?: Record<string, unknown>, originalError?: Error) {
        super(message, context, originalError);
        this.code = code;
    }
}

export type ConfigurationErrorCode =
    | 'MISSING_PROVIDER'
    | 'INVALID_CLUSTER'
    | 'CLUSTER_NOT_FOUND'
    | 'INVALID_CONFIG'
    | 'INITIALIZATION_FAILED';

export class NetworkError extends ConnectorError {
    readonly code: NetworkErrorCode;
    readonly recoverable = true;

    constructor(code: NetworkErrorCode, message: string, context?: Record<string, unknown>, originalError?: Error) {
        super(message, context, originalError);
        this.code = code;
    }
}

export type NetworkErrorCode =
    | 'RPC_ERROR'
    | 'NETWORK_TIMEOUT'
    | 'NETWORK_UNAVAILABLE'
    | 'TRANSACTION_SIMULATION_FAILED';

export class TransactionError extends ConnectorError {
    readonly code: TransactionErrorCode;
    readonly recoverable: boolean;

    constructor(code: TransactionErrorCode, message: string, context?: Record<string, unknown>, originalError?: Error) {
        super(message, context, originalError);
        this.code = code;
        this.recoverable = ['USER_REJECTED', 'SEND_FAILED', 'SIMULATION_FAILED'].includes(code);
    }
}

export type TransactionErrorCode =
    | 'SIGNING_FAILED'
    | 'SEND_FAILED'
    | 'FEATURE_NOT_SUPPORTED'
    | 'USER_REJECTED'
    | 'SIMULATION_FAILED'
    | 'INVALID_TRANSACTION'
    | 'TRANSACTION_EXPIRED';

export function isConnectorError(error: unknown): error is ConnectorError {
    return error instanceof ConnectorError;
}

export function isConnectionError(error: unknown): error is ConnectionError {
    return error instanceof ConnectionError;
}

export function isValidationError(error: unknown): error is ValidationError {
    return error instanceof ValidationError;
}

export function isConfigurationError(error: unknown): error is ConfigurationError {
    return error instanceof ConfigurationError;
}

export function isNetworkError(error: unknown): error is NetworkError {
    return error instanceof NetworkError;
}

export function isTransactionError(error: unknown): error is TransactionError {
    return error instanceof TransactionError;
}

export const Errors = {
    walletNotConnected: (context?: Record<string, unknown>) =>
        new ConnectionError('WALLET_NOT_CONNECTED', 'No wallet connected', context),

    walletNotFound: (walletName?: string) =>
        new ConnectionError('WALLET_NOT_FOUND', `Wallet not found${walletName ? `: ${walletName}` : ''}`, { walletName }),

    connectionFailed: (originalError?: Error) =>
        new ConnectionError('CONNECTION_FAILED', 'Failed to connect to wallet', undefined, originalError),

    accountNotAvailable: (address?: string) =>
        new ConnectionError('ACCOUNT_NOT_AVAILABLE', 'Requested account not available', { address }),

    invalidTransaction: (reason: string, context?: Record<string, unknown>) =>
        new ValidationError('INVALID_TRANSACTION', `Invalid transaction: ${reason}`, context),

    invalidFormat: (expectedFormat: string, actualFormat?: string) =>
        new ValidationError('INVALID_FORMAT', `Invalid format: expected ${expectedFormat}`, { expectedFormat, actualFormat }),

    unsupportedFormat: (format: string) =>
        new ValidationError('UNSUPPORTED_FORMAT', `Unsupported format: ${format}`, { format }),

    missingProvider: (hookName: string) =>
        new ConfigurationError(
            'MISSING_PROVIDER',
            `${hookName} must be used within ConnectorProvider. Wrap your app with <ConnectorProvider> or <UnifiedProvider>.`,
            { hookName },
        ),

    clusterNotFound: (clusterId: string, availableClusters: string[]) =>
        new ConfigurationError(
            'CLUSTER_NOT_FOUND',
            `Cluster ${clusterId} not found. Available clusters: ${availableClusters.join(', ')}`,
            { clusterId, availableClusters },
        ),

    rpcError: (message: string, originalError?: Error) =>
        new NetworkError('RPC_ERROR', message, undefined, originalError),

    networkTimeout: () =>
        new NetworkError('NETWORK_TIMEOUT', 'Network request timed out'),

    signingFailed: (originalError?: Error) =>
        new TransactionError('SIGNING_FAILED', 'Failed to sign transaction', undefined, originalError),

    featureNotSupported: (feature: string) =>
        new TransactionError('FEATURE_NOT_SUPPORTED', `Wallet does not support ${feature}`, { feature }),

    userRejected: (operation: string) =>
        new TransactionError('USER_REJECTED', `User rejected ${operation}`, { operation }),
} as const;

export function toConnectorError(error: unknown, defaultMessage = 'An unexpected error occurred'): ConnectorError {
    if (isConnectorError(error)) {
        return error;
    }

    if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('user rejected') || message.includes('user denied')) {
            return Errors.userRejected('transaction');
        }

        if (message.includes('wallet not found') || message.includes('not installed')) {
            return Errors.walletNotFound();
        }

        if (message.includes('not connected')) {
            return Errors.walletNotConnected();
        }

        if (message.includes('network') || message.includes('fetch')) {
            return Errors.rpcError(error.message, error);
        }

        if (message.includes('invalid')) {
            return new ValidationError('VALIDATION_FAILED', error.message, undefined, error);
        }

        return new TransactionError('SIGNING_FAILED', error.message, undefined, error);
    }

    return new TransactionError('SIGNING_FAILED', defaultMessage, { originalError: String(error) });
}

export function getUserFriendlyMessage(error: unknown): string {
    if (!isConnectorError(error)) {
        return 'An unexpected error occurred. Please try again.';
    }

    const messages: Record<string, string> = {
        WALLET_NOT_CONNECTED: 'Please connect your wallet to continue.',
        WALLET_NOT_FOUND: 'Wallet not found. Please install a supported wallet.',
        CONNECTION_FAILED: 'Failed to connect to wallet. Please try again.',
        USER_REJECTED: 'Transaction was cancelled.',
        FEATURE_NOT_SUPPORTED: 'This wallet does not support this feature.',
        SIGNING_FAILED: 'Failed to sign transaction. Please try again.',
        SEND_FAILED: 'Failed to send transaction. Please try again.',
        INVALID_CLUSTER: 'Invalid network configuration.',
        CLUSTER_NOT_FOUND: 'Network not found.',
        MISSING_PROVIDER: 'Application not properly configured.',
        RPC_ERROR: 'Network error. Please check your connection.',
        NETWORK_TIMEOUT: 'Request timed out. Please try again.',
    };

    return messages[error.code] || error.message || 'An error occurred.';
}
