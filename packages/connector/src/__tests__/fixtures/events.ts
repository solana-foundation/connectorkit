import type { ConnectorEvent } from '../../types/events';
import type { WalletName } from '../../types/wallets';
import { TEST_ADDRESSES } from './accounts';
import { TEST_SIGNATURES } from './transactions';

export function createWalletsDetectedEvent(count: number = 1): ConnectorEvent {
    return {
        type: 'wallets:detected',
        count,
        timestamp: new Date().toISOString(),
    };
}

export function createConnectingEvent(walletName: string = 'Phantom'): ConnectorEvent {
    return {
        type: 'connecting',
        wallet: walletName as WalletName,
        timestamp: new Date().toISOString(),
    };
}

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

export function createDisconnectedEvent(): ConnectorEvent {
    return {
        type: 'wallet:disconnected',
        timestamp: new Date().toISOString(),
    };
}

export function createAccountChangedEvent(account: string = TEST_ADDRESSES.ACCOUNT_1): ConnectorEvent {
    return {
        type: 'account:changed',
        account: account as any,
        timestamp: new Date().toISOString(),
    };
}

export function createWalletChangedEvent(walletName: string = 'Phantom'): ConnectorEvent {
    return {
        type: 'wallet:changed',
        wallet: walletName as WalletName,
        timestamp: new Date().toISOString(),
    };
}

export function createTransactionTrackedEvent(signature: string = TEST_SIGNATURES.TX_1): ConnectorEvent {
    return {
        type: 'transaction:tracked',
        signature: signature as any,
        status: 'pending',
        timestamp: new Date().toISOString(),
    };
}

export function createErrorEvent(error: Error = new Error('Test error'), context: string = 'test'): ConnectorEvent {
    return {
        type: 'error',
        error,
        context,
        timestamp: new Date().toISOString(),
    };
}
