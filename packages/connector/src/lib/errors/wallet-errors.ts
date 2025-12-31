/**
 * Wallet Error Types - Framework-agnostic error definitions
 *
 * These types are shared between headless and React implementations.
 * They do NOT import React or any TSX modules.
 */

/**
 * Error types specific to wallet connections.
 * Used by error boundaries and headless error handling.
 */
export const WalletErrorType = {
    CONNECTION_FAILED: 'CONNECTION_FAILED',
    TRANSACTION_FAILED: 'TRANSACTION_FAILED',
    NETWORK_ERROR: 'NETWORK_ERROR',
    WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
    USER_REJECTED: 'USER_REJECTED',
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type WalletErrorType = (typeof WalletErrorType)[keyof typeof WalletErrorType];

/**
 * Extended error interface for wallet-specific errors.
 * Extends the standard Error with wallet context.
 */
export interface WalletError extends Error {
    type: WalletErrorType;
    recoverable: boolean;
    context?: Record<string, unknown>;
    retryAction?: () => Promise<void>;
}

/**
 * Type guard to check if an error is a WalletError
 */
export function isWalletError(error: unknown): error is WalletError {
    return (
        error instanceof Error &&
        'type' in error &&
        typeof (error as WalletError).type === 'string' &&
        Object.values(WalletErrorType).includes((error as WalletError).type as WalletErrorType)
    );
}

/**
 * Create a WalletError from a standard Error
 */
export function createWalletError(
    error: Error,
    type: WalletErrorType,
    recoverable: boolean,
    context?: Record<string, unknown>,
): WalletError {
    const walletError = error as WalletError;
    walletError.type = type;
    walletError.recoverable = recoverable;
    walletError.context = context;
    return walletError;
}
