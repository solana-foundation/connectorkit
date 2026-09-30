/**
 * Tests for the kit entry point (kit.ts)
 *
 * Verifies that the kit-native surface is re-exported, and that the wildcard
 * re-exports it is built from resolve to the intended module where two of them
 * export the same name.
 */

import { describe, it, expect } from 'vitest';
import * as ConnectorKitKit from './kit';
import * as SolanaReact from '@solana/react';

describe('Kit Entry Point (kit.ts)', () => {
    describe('plugin client', () => {
        it('should export createClient and extendClient', () => {
            expect(typeof ConnectorKitKit.createClient).toBe('function');
            expect(typeof ConnectorKitKit.extendClient).toBe('function');
        });
    });

    describe('@solana/react bindings', () => {
        it('should export ClientProvider', () => {
            expect(typeof ConnectorKitKit.ClientProvider).toBe('function');
        });

        it.each(['useRequest', 'useSubscription', 'useTrackedData'] as const)('should export %s', name => {
            expect(typeof ConnectorKitKit[name]).toBe('function');
        });
    });

    describe('client capability hooks', () => {
        it.each(['usePayer', 'useIdentity'] as const)('should export %s', name => {
            expect(typeof ConnectorKitKit[name]).toBe('function');
        });

        it.each([
            'useAirdrop',
            'usePlanTransaction',
            'usePlanTransactions',
            'useSendTransaction',
            'useSendTransactions',
        ] as const)('should export %s', name => {
            expect(typeof ConnectorKitKit[name]).toBe('function');
        });
    });

    describe('kit plugins', () => {
        it.each(['solanaRpc', 'solanaDevnetRpc', 'solanaLocalRpc', 'solanaRpcConnection', 'rpcAirdrop'] as const)(
            'should export the %s RPC plugin',
            name => {
                expect(typeof ConnectorKitKit[name]).toBe('function');
            },
        );

        it.each(['walletSigner', 'walletPayer', 'walletIdentity', 'walletWithoutSigner'] as const)(
            'should export the %s wallet plugin',
            name => {
                expect(typeof ConnectorKitKit[name]).toBe('function');
            },
        );
    });

    describe('wallet store hooks', () => {
        it.each([
            'useConnect',
            'useConnectedWallet',
            'useDisconnect',
            'useIsWalletReady',
            'useSelectAccount',
            'useWallets',
            'useWalletStatus',
            'WalletReadyGate',
        ] as const)('should export %s', name => {
            expect(typeof ConnectorKitKit[name]).toBe('function');
        });
    });

    describe('name collisions', () => {
        // Both @solana/react and @solana/kit-plugin-wallet/react export these
        // names. kit.ts re-exports the wallet store hooks by an explicit list
        // that omits them, so the account-based hooks win.
        it.each(['useSignIn', 'useSignMessage'] as const)('should resolve %s to the @solana/react hook', name => {
            expect(ConnectorKitKit[name]).toBe(SolanaReact[name]);
        });
    });
});
