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

    let chain: `solana:${string}` = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';

    if (network) {
        const chainMap: Record<string, `solana:${string}`> = {
            mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            devnet: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
            testnet: 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
        };
        chain = chainMap[network] || chain;
    } else if (connection) {
        const rpcUrl = connection.rpcEndpoint || '';
        if (rpcUrl.includes('mainnet') || rpcUrl.includes('api.mainnet-beta')) {
            chain = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
        } else if (rpcUrl.includes('testnet')) {
            chain = 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z';
        }
    }

    const uiWalletAccount = getOrCreateUiWalletAccountForStandardWalletAccount(wallet, account);

    const features = wallet.features as Record<string, unknown>;
    const hasSignMessage = Boolean(features['solana:signMessage']);
    const hasSendTransaction = Boolean(features['solana:signAndSendTransaction'] || features['solana:sendTransaction']);

    return {
        address: walletAddress,
        addressString: account.address,
        messageSigner: hasSignMessage ? createMessageSignerFromWalletAccount(uiWalletAccount) : null,
        transactionSigner: hasSendTransaction
            ? createTransactionSendingSignerFromWalletAccount(uiWalletAccount, chain)
            : null,
    };
}
