/**
 * Event test fixtures
 * 
 * Pre-configured event payloads for testing
 */

import type { ConnectorEvent } from '../../types/events';
import type { WalletName } from '../../types/wallets';
import { TEST_ADDRESSES } from './accounts';
import { TEST_SIGNATURES } from './transactions';

/**
 * Create a mock wallets detected event
 */
export function createWalletsDetectedEvent(count: number = 1): ConnectorEvent {
    return {
        type: 'wallets:detected',
        count,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Create a mock connecting event
 */
export function createConnectingEvent(walletName: string = 'Phantom'): ConnectorEvent {
    return {
        type: 'connecting',
        wallet: walletName as WalletName,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Create a mock wallet connected event
 */
export function createConnectedEvent(
    walletName: string = 'Phantom',
    account: string = TEST_ADDRESSES.ACCOUNT_1,
): ConnectorEvent {
    return {
        type: 'wallet:connected',
        wallet: walletName as WalletName,
        account: account as any,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Create a mock wallet disconnected event
 */
export function createDisconnectedEvent(): ConnectorEvent {
    return {
        type: 'wallet:disconnected',
        timestamp: new Date().toISOString(),
    };
}

/**
 * Create a mock account changed event
 */
export function createAccountChangedEvent(account: string = TEST_ADDRESSES.ACCOUNT_1): ConnectorEvent {
    return {
        type: 'account:changed',
        account: account as any,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Create a mock wallet changed event
 */
export function createWalletChangedEvent(walletName: string = 'Phantom'): ConnectorEvent {
    return {
        type: 'wallet:changed',
        wallet: walletName as WalletName,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Create a mock transaction tracked event
 */
export function createTransactionTrackedEvent(signature: string = TEST_SIGNATURES.TX_1): ConnectorEvent {
    return {
        type: 'transaction:tracked',
        signature: signature as any,
        status: 'pending',
        timestamp: new Date().toISOString(),
    };
}

/**
 * Create a mock error event
 */
export function createErrorEvent(error: Error = new Error('Test error'), context: string = 'test'): ConnectorEvent {
    return {
        type: 'error',
        error,
        context,
        timestamp: new Date().toISOString(),
    };
}

