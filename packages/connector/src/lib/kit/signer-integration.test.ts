import { describe, it, expect } from 'vitest';
import { createKitSignersFromWallet } from './signer-integration';
import { createMockPhantomWallet } from '../../__tests__/mocks/wallet-standard-mock';
import { createMockWalletAccount, TEST_ADDRESSES } from '../../__tests__/fixtures/accounts';

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
});
