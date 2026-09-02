import { describe, it, expect, vi } from 'vitest';
import type { Connection } from '@solana/web3.js';
import { createKitSignersFromWallet } from './signer-integration';
import { createMockPhantomWallet } from '../../__tests__/mocks/wallet-standard-mock';
import { createMockWalletAccount, TEST_ADDRESSES } from '../../__tests__/fixtures/accounts';

const warnSpy = vi.hoisted(() => vi.fn());
vi.mock('../utils/secure-logger', () => ({
    createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: warnSpy, error: vi.fn() }),
}));

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

        it('omits the transaction signer (without throwing or defaulting to devnet) for an unrecognized endpoint', () => {
            const { account, wallet } = signingAccountAndWallet(['solana:devnet']);
            warnSpy.mockClear();

            const result = createKitSignersFromWallet(wallet, account, mockConnection('https://rpc.example.com'));

            expect(result.address).toBe(TEST_ADDRESSES.ACCOUNT_1);
            expect(result.messageSigner).not.toBeNull();
            expect(result.transactionSigner).toBeNull();
            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot determine the Solana chain'), {
                rpcEndpoint: 'https://rpc.example.com',
            });
        });

        it('treats an unparseable endpoint the same as an unrecognized one', () => {
            const { account, wallet } = signingAccountAndWallet(['solana:devnet']);
            warnSpy.mockClear();

            const result = createKitSignersFromWallet(wallet, account, mockConnection('not a url'));

            expect(result.messageSigner).not.toBeNull();
            expect(result.transactionSigner).toBeNull();
            expect(warnSpy).toHaveBeenCalledTimes(1);
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
