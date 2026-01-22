/**
 * Session Types Unit Tests
 *
 * Tests for the vNext session/connector types and utilities.
 */

import { describe, it, expect } from 'vitest';
import {
    createConnectorId,
    isWalletConnectorId,
    getWalletNameFromConnectorId,
    isDisconnected,
    isConnecting,
    isConnected,
    isStatusError,
    INITIAL_WALLET_STATUS,
    toLegacyWalletState,
} from '../session';
import type {
    WalletConnectorId,
    WalletStatus,
    WalletStatusDisconnected,
    WalletStatusConnecting,
    WalletStatusConnected,
    WalletStatusError,
    SessionAccount,
    WalletSession,
} from '../session';
import type { Address } from '@solana/addresses';

describe('createConnectorId', () => {
    it('should create connector ID from simple wallet name', () => {
        const id = createConnectorId('Phantom');
        expect(id).toBe('wallet-standard:phantom');
    });

    it('should handle wallet names with spaces', () => {
        const id = createConnectorId('Trust Wallet');
        expect(id).toBe('wallet-standard:trust-wallet');
    });

    it('should handle wallet names with special characters', () => {
        const id = createConnectorId('Wallet@123');
        expect(id).toBe('wallet-standard:wallet-123');
    });

    it('should handle uppercase names', () => {
        const id = createConnectorId('PHANTOM');
        expect(id).toBe('wallet-standard:phantom');
    });
});

describe('isWalletConnectorId', () => {
    it('should return true for wallet-standard IDs', () => {
        expect(isWalletConnectorId('wallet-standard:phantom')).toBe(true);
        expect(isWalletConnectorId('wallet-standard:solflare')).toBe(true);
    });

    it('should return true for walletconnect ID', () => {
        expect(isWalletConnectorId('walletconnect')).toBe(true);
    });

    it('should return true for mwa IDs', () => {
        expect(isWalletConnectorId('mwa:phantom')).toBe(true);
    });

    it('should return false for invalid IDs', () => {
        expect(isWalletConnectorId('phantom')).toBe(false);
        expect(isWalletConnectorId('invalid:prefix:phantom')).toBe(false);
        expect(isWalletConnectorId('')).toBe(false);
    });
});

describe('getWalletNameFromConnectorId', () => {
    it('should extract name from wallet-standard ID', () => {
        const name = getWalletNameFromConnectorId('wallet-standard:phantom' as WalletConnectorId);
        expect(name).toBe('Phantom');
    });

    it('should handle multi-word wallet names', () => {
        const name = getWalletNameFromConnectorId('wallet-standard:trust-wallet' as WalletConnectorId);
        expect(name).toBe('Trust Wallet');
    });

    it('should return WalletConnect for walletconnect ID', () => {
        const name = getWalletNameFromConnectorId('walletconnect' as WalletConnectorId);
        expect(name).toBe('WalletConnect');
    });

    it('should handle mwa IDs', () => {
        const name = getWalletNameFromConnectorId('mwa:phantom' as WalletConnectorId);
        expect(name).toBe('phantom');
    });
});

describe('INITIAL_WALLET_STATUS', () => {
    it('should be disconnected', () => {
        expect(INITIAL_WALLET_STATUS.status).toBe('disconnected');
    });
});

describe('wallet status type guards', () => {
    const disconnected: WalletStatusDisconnected = { status: 'disconnected' };
    const connecting: WalletStatusConnecting = {
        status: 'connecting',
        connectorId: 'wallet-standard:phantom' as WalletConnectorId,
    };

    const mockAccount: SessionAccount = {
        address: 'test-address' as Address,
        account: {} as import('@wallet-standard/base').WalletAccount,
    };

    const mockSession: WalletSession = {
        connectorId: 'wallet-standard:phantom' as WalletConnectorId,
        accounts: [mockAccount],
        selectedAccount: mockAccount,
        onAccountsChanged: () => () => {},
        selectAccount: () => {},
    };

    const connected: WalletStatusConnected = {
        status: 'connected',
        session: mockSession,
    };

    const error: WalletStatusError = {
        status: 'error',
        error: new Error('Test error'),
        recoverable: true,
    };

    it('isDisconnected should work correctly', () => {
        expect(isDisconnected(disconnected)).toBe(true);
        expect(isDisconnected(connecting)).toBe(false);
        expect(isDisconnected(connected)).toBe(false);
        expect(isDisconnected(error)).toBe(false);
    });

    it('isConnecting should work correctly', () => {
        expect(isConnecting(disconnected)).toBe(false);
        expect(isConnecting(connecting)).toBe(true);
        expect(isConnecting(connected)).toBe(false);
        expect(isConnecting(error)).toBe(false);
    });

    it('isConnected should work correctly', () => {
        expect(isConnected(disconnected)).toBe(false);
        expect(isConnected(connecting)).toBe(false);
        expect(isConnected(connected)).toBe(true);
        expect(isConnected(error)).toBe(false);
    });

    it('isStatusError should work correctly', () => {
        expect(isStatusError(disconnected)).toBe(false);
        expect(isStatusError(connecting)).toBe(false);
        expect(isStatusError(connected)).toBe(false);
        expect(isStatusError(error)).toBe(true);
    });
});

describe('toLegacyWalletState', () => {
    const mockAccount: SessionAccount = {
        address: 'test-address' as Address,
        label: 'Test Account',
        account: {} as import('@wallet-standard/base').WalletAccount,
    };

    const mockSession: WalletSession = {
        connectorId: 'wallet-standard:phantom' as WalletConnectorId,
        accounts: [mockAccount],
        selectedAccount: mockAccount,
        onAccountsChanged: () => () => {},
        selectAccount: () => {},
    };

    it('should convert disconnected status', () => {
        const legacy = toLegacyWalletState({ status: 'disconnected' });
        expect(legacy.connected).toBe(false);
        expect(legacy.connecting).toBe(false);
        expect(legacy.selectedAccount).toBe(null);
        expect(legacy.accounts).toEqual([]);
    });

    it('should convert connecting status', () => {
        const legacy = toLegacyWalletState({
            status: 'connecting',
            connectorId: 'wallet-standard:phantom' as WalletConnectorId,
        });
        expect(legacy.connected).toBe(false);
        expect(legacy.connecting).toBe(true);
        expect(legacy.selectedAccount).toBe(null);
        expect(legacy.accounts).toEqual([]);
    });

    it('should convert connected status', () => {
        const legacy = toLegacyWalletState({
            status: 'connected',
            session: mockSession,
        });
        expect(legacy.connected).toBe(true);
        expect(legacy.connecting).toBe(false);
        expect(legacy.selectedAccount).toBe('test-address');
        expect(legacy.accounts).toEqual([{ address: 'test-address', label: 'Test Account' }]);
    });

    it('should convert error status', () => {
        const legacy = toLegacyWalletState({
            status: 'error',
            error: new Error('Test'),
            recoverable: true,
        });
        expect(legacy.connected).toBe(false);
        expect(legacy.connecting).toBe(false);
        expect(legacy.selectedAccount).toBe(null);
        expect(legacy.accounts).toEqual([]);
    });
});
