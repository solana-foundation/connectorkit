/**
 * @solana/connector - Unified Error System
 */

// Re-export wallet-specific error types (React-free)
export * from './wallet-errors';

export abstract class ConnectorError extends Error {
    abstract readonly code: string;
    abstract readonly recoverable: boolean;
    readonly context?: Record<string, unknown>;
    readonly originalError?: Error;
    readonly timestamp: string;

    constructor(message: string, context?: Record<string, unknown>, originalError?: Error) {
        // Set the standard ES `cause` as well as `.originalError`. Only `cause`
        // is walked by console/`util.inspect` and by most error-reporting tools,
        // so without it the wallet's own diagnostic never reaches the developer.
        super(message, originalError ? { cause: originalError } : undefined);
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
            // `originalError` stays the message string it has always been - this payload
            // is public and consumers store, validate and forward it as such. The name
            // rides alongside in its own field instead of restructuring the old one.
            //
            // Deliberately no `stack`: `toJSON()` is what consumers hand to telemetry,
            // and a wallet extension's stack leaks its internal paths and extension ID.
            // The stack stays on the live error object for local debugging.
            originalError: this.originalError?.message,
            originalErrorName: this.originalError?.name,
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

    constructor(
        code: ConfigurationErrorCode,
        message: string,
        context?: Record<string, unknown>,
        originalError?: Error,
    ) {
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
        new ConnectionError('WALLET_NOT_FOUND', `Wallet not found${walletName ? `: ${walletName}` : ''}`, {
            walletName,
        }),

    connectionFailed: (originalError?: Error) =>
        new ConnectionError('CONNECTION_FAILED', 'Failed to connect to wallet', undefined, originalError),

    accountNotAvailable: (address?: string) =>
        new ConnectionError('ACCOUNT_NOT_AVAILABLE', 'Requested account not available', { address }),

    invalidTransaction: (reason: string, context?: Record<string, unknown>) =>
        new ValidationError('INVALID_TRANSACTION', `Invalid transaction: ${reason}`, context),

    invalidFormat: (expectedFormat: string, actualFormat?: string) =>
        new ValidationError('INVALID_FORMAT', `Invalid format: expected ${expectedFormat}`, {
            expectedFormat,
            actualFormat,
        }),

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

    networkTimeout: () => new NetworkError('NETWORK_TIMEOUT', 'Network request timed out'),

    signingFailed: (originalError?: Error) =>
        new TransactionError('SIGNING_FAILED', 'Failed to sign transaction', undefined, originalError),

    featureNotSupported: (feature: string) =>
        new TransactionError('FEATURE_NOT_SUPPORTED', `Wallet does not support ${feature}`, { feature }),

    userRejected: (operation: string) =>
        new TransactionError('USER_REJECTED', `User rejected ${operation}`, { operation }),
} as const;

/** Marks an `Error` whose message is only a stringification of the thrown value. */
const SYNTHESIZED_MESSAGE = Symbol('connector.synthesizedMessage');

/**
 * Coerce an unknown thrown value into an `Error` so it can always be carried as
 * a `cause`. Wallets throw strings and plain objects as often as they throw
 * `Error`s, and those used to be dropped entirely.
 */
export function toError(value: unknown): Error {
    if (value instanceof Error) {
        return value;
    }

    if (typeof value === 'string') {
        return new Error(value);
    }

    // Injected providers reject with plain objects far more often than with `Error`s -
    // `{ code: 4001, message: 'User rejected the request.' }` is the shape every
    // EIP-1193-style provider uses. `String(value)` renders that as '[object Object]',
    // which loses the message and, with it, the user-rejection classification that
    // every caller downstream derives from the message text.
    if (value !== null && typeof value === 'object') {
        const record = value as { message?: unknown; reason?: unknown; code?: unknown };
        const text = typeof record.message === 'string' ? record.message : record.reason;

        if (typeof text === 'string' && text.length > 0) {
            const error = new Error(text, { cause: value });
            if (record.code !== undefined) {
                (error as Error & { code?: unknown }).code = record.code;
            }
            return error;
        }
    }

    // Nothing here carries a diagnostic of its own - the message is only a
    // stringification ('null', 'undefined', '[object Object]'). Mark it so
    // `withCauseMessage` does not paste that onto a user-facing summary.
    const synthesized = new Error(String(value), { cause: value });
    Object.defineProperty(synthesized, SYNTHESIZED_MESSAGE, { value: true });
    return synthesized;
}

/**
 * Build a wrapper message that keeps the underlying error's own text visible.
 *
 * A bare 'Failed to sign message' hides every wallet-specific diagnostic behind
 * one generic string, which makes these failures very hard to triage. An error
 * `toError` synthesized from a value with no message of its own is skipped:
 * 'Failed to sign message: [object Object]' is noise, not a diagnostic.
 */
export function withCauseMessage(summary: string, cause: Error): string {
    if (!cause.message || SYNTHESIZED_MESSAGE in cause) {
        return summary;
    }

    return `${summary}: ${cause.message}`;
}

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

    const cause = toError(error);
    return new TransactionError('SIGNING_FAILED', withCauseMessage(defaultMessage, cause), undefined, cause);
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
