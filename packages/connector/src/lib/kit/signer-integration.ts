/**
 * @solana/connector - Kit Integration Helper
 *
 * High-level helper to create Kit signers from Wallet Standard wallets.
 * Framework-agnostic and works in any JavaScript environment.
 */

import type { Wallet, WalletAccount } from '@wallet-standard/base';
import type { Address } from '@solana/addresses';
import type { MessageModifyingSigner, TransactionSendingSigner } from '@solana/signers';
import { address } from '@solana/addresses';
import type { Connection } from '@solana/web3.js';
import {
    createMessageSignerFromWalletAccount,
    createTransactionSendingSignerFromWalletAccount,
} from '@solana/wallet-account-signer';
import { getOrCreateUiWalletAccountForStandardWalletAccount } from '@wallet-standard/ui-registry';

/**
 * Result of creating Kit signers from a Wallet Standard wallet
 */
export interface KitSignersFromWallet {
    /** Kit Address type (null if wallet not connected) */
    address: Address<string> | null;

    /** Plain address string (null if wallet not connected) */
    addressString: string | null;

    /** Message signer (null if wallet doesn't support signing or not connected) */
    messageSigner: MessageModifyingSigner<string> | null;

    /** Transaction sending signer (null if wallet doesn't support or not connected) */
    transactionSigner: TransactionSendingSigner<string> | null;
}

/**
 * Create Kit-compatible signers from a Wallet Standard wallet
 *
 * Bridges a Wallet Standard wallet to modern Kit signers using
 * `@solana/wallet-account-signer`. Framework-agnostic and usable in any
 * JavaScript environment.
 *
 * The chain is derived from the connection's RPC endpoint, or overridden with the
 * optional `network` parameter.
 *
 * @param wallet - The Wallet Standard wallet instance
 * @param account - The wallet account to use
 * @param connection - Optional connection for chain detection
 * @param network - Optional network override ('mainnet' | 'devnet' | 'testnet')
 * @returns Kit signers object with address and signer instances
 *
 * @example
 * ```typescript
 * import { Connection } from '@solana/web3.js';
 * import { createKitSignersFromWallet } from '@solana/connector/headless';
 *
 * const connection = new Connection('https://api.devnet.solana.com');
 * const { address, messageSigner, transactionSigner } = createKitSignersFromWallet(
 *   wallet,
 *   account,
 *   connection
 * );
 * ```
 */
export function createKitSignersFromWallet(
    wallet: Wallet | null,
    account?: WalletAccount | null,
    connection?: Connection | null,
    network?: 'mainnet' | 'devnet' | 'testnet',
): KitSignersFromWallet {
    const empty: KitSignersFromWallet = {
        address: null,
        addressString: null,
        messageSigner: null,
        transactionSigner: null,
    };

    if (!wallet || !account) {
        return empty;
    }

    let walletAddress: Address<string>;
    try {
        walletAddress = address(account.address) as Address<string>;
    } catch {
        return empty;
    }

    // Wallet Standard wallets advertise the standard chain identifiers
    // (solana:mainnet/devnet/testnet); the signer factories validate the
    // chain against the account's advertised chains at construction time.
    let chain: `solana:${string}` = 'solana:devnet';

    if (network) {
        chain = `solana:${network}`;
    } else if (connection) {
        const rpcUrl = connection.rpcEndpoint || '';
        if (rpcUrl.includes('mainnet')) {
            chain = 'solana:mainnet';
        } else if (rpcUrl.includes('testnet')) {
            chain = 'solana:testnet';
        }
    }

    const uiWalletAccount = getOrCreateUiWalletAccountForStandardWalletAccount(wallet, account);

    // The signer factories require the feature on the account (not just the
    // wallet) and throw when it is missing, so gate on the account's features.
    const accountFeatures: readonly string[] = uiWalletAccount.features;
    const hasSignMessage = accountFeatures.includes('solana:signMessage');
    const hasSendTransaction =
        accountFeatures.includes('solana:signAndSendTransaction') && uiWalletAccount.chains.includes(chain);

    return {
        address: walletAddress,
        addressString: account.address,
        messageSigner: hasSignMessage ? createMessageSignerFromWalletAccount(uiWalletAccount) : null,
        transactionSigner: hasSendTransaction
            ? createTransactionSendingSignerFromWalletAccount(uiWalletAccount, chain)
            : null,
    };
}
