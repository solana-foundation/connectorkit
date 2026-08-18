import { describe, it, expect } from 'vitest';
import type { Connection } from '@solana/web3.js';
import { createKitSignersFromWallet } from './signer-integration';
import { ConfigurationError } from '../errors';
import { createMockPhantomWallet } from '../../__tests__/mocks/wallet-standard-mock';
import { createMockWalletAccount, TEST_ADDRESSES } from '../../__tests__/fixtures/accounts';

function mockConnection(rpcEndpoint: string): Connection {
    return { rpcEndpoint } as Connection;
}

function signingAccountAndWallet(chains: `${string}:${string}`[]) {
    const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1, {
        chains,
        features: ['solana:signMessage', 'solana:signAndSendTransaction'],
    });
    const wallet = createMockPhantomWallet({
        accounts: [account],
        features: ['solana:signMessage', 'solana:signAndSendTransaction'],
    });
    return { account, wallet };
}

describe('createKitSignersFromWallet', () => {
    it('returns empty signers when wallet or account is missing', () => {
        expect(createKitSignersFromWallet(null)).toEqual({
            address: null,
            addressString: null,
            messageSigner: null,
            transactionSigner: null,
        });
        expect(createKitSignersFromWallet(createMockPhantomWallet(), null).address).toBeNull();
    });

    it('builds signers for accounts advertising signing features', () => {
        const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1, {
            features: ['solana:signMessage', 'solana:signAndSendTransaction'],
        });
        const wallet = createMockPhantomWallet({
            accounts: [account],
            features: ['solana:signMessage', 'solana:signAndSendTransaction'],
        });

        const result = createKitSignersFromWallet(wallet, account, null, 'devnet');

        expect(result.address).toBe(TEST_ADDRESSES.ACCOUNT_1);
        expect(result.addressString).toBe(TEST_ADDRESSES.ACCOUNT_1);
        expect(result.messageSigner).not.toBeNull();
        expect(result.messageSigner!.address).toBe(TEST_ADDRESSES.ACCOUNT_1);
        expect(result.transactionSigner).not.toBeNull();
        expect(result.transactionSigner!.address).toBe(TEST_ADDRESSES.ACCOUNT_1);
    });

    it('returns null signers when the account advertises no signing features', () => {
        const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1, { features: [] });
        const wallet = createMockPhantomWallet({ accounts: [account] });

        const result = createKitSignersFromWallet(wallet, account, null, 'devnet');

        expect(result.address).toBe(TEST_ADDRESSES.ACCOUNT_1);
        expect(result.messageSigner).toBeNull();
        expect(result.transactionSigner).toBeNull();
    });

    it('returns a null transaction signer when the account does not support the chain', () => {
        const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1, {
            chains: ['solana:mainnet'],
            features: ['solana:signMessage', 'solana:signAndSendTransaction'],
        });
        const wallet = createMockPhantomWallet({ accounts: [account] });

        const result = createKitSignersFromWallet(wallet, account, null, 'testnet');

        expect(result.messageSigner).not.toBeNull();
        expect(result.transactionSigner).toBeNull();
    });

    describe('chain resolution', () => {
        it('prefers an explicit network over the connection endpoint', () => {
            const { account, wallet } = signingAccountAndWallet(['solana:mainnet']);

            const result = createKitSignersFromWallet(
                wallet,
                account,
                mockConnection('https://api.devnet.solana.com'),
                'mainnet',
            );

            expect(result.transactionSigner).not.toBeNull();
        });

        it('accepts a full solana:* chain identifier as the explicit network', () => {
            const { account, wallet } = signingAccountAndWallet(['solana:mainnet']);

            const result = createKitSignersFromWallet(wallet, account, null, 'solana:mainnet');

            expect(result.transactionSigner).not.toBeNull();
        });

        it.each([
            ['https://api.mainnet-beta.solana.com', 'solana:mainnet'],
            ['https://api.devnet.solana.com', 'solana:devnet'],
            ['https://api.testnet.solana.com', 'solana:testnet'],
            ['http://localhost:8899', 'solana:localnet'],
            ['http://127.0.0.1:8899', 'solana:localnet'],
        ] as const)('derives %s as %s', (endpoint, chain) => {
            const { account, wallet } = signingAccountAndWallet([chain]);

            const result = createKitSignersFromWallet(wallet, account, mockConnection(endpoint));

            expect(result.transactionSigner).not.toBeNull();
        });

        it('does not fall back to devnet for an unrecognized endpoint', () => {
            const { account, wallet } = signingAccountAndWallet(['solana:devnet']);

            expect(() =>
                createKitSignersFromWallet(wallet, account, mockConnection('https://rpc.example.com')),
            ).toThrow(ConfigurationError);
            expect(() =>
                createKitSignersFromWallet(wallet, account, mockConnection('https://rpc.example.com')),
            ).toThrow(/Cannot determine the Solana chain/);
        });

        it('throws with the INVALID_CLUSTER code and the endpoint in context', () => {
            const { account, wallet } = signingAccountAndWallet(['solana:devnet']);

            try {
                createKitSignersFromWallet(wallet, account, mockConnection('not a url'));
                expect.unreachable('expected a ConfigurationError');
            } catch (error) {
                expect(error).toBeInstanceOf(ConfigurationError);
                expect((error as ConfigurationError).code).toBe('INVALID_CLUSTER');
                expect((error as ConfigurationError).context).toEqual({ rpcEndpoint: 'not a url' });
            }
        });

        it('omits the transaction signer when neither a network nor a connection is given', () => {
            const { account, wallet } = signingAccountAndWallet(['solana:mainnet', 'solana:devnet']);

            const result = createKitSignersFromWallet(wallet, account);

            expect(result.address).toBe(TEST_ADDRESSES.ACCOUNT_1);
            expect(result.messageSigner).not.toBeNull();
            expect(result.transactionSigner).toBeNull();
        });
    });
});
