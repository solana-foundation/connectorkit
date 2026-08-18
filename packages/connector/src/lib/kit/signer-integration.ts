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
import { ConfigurationError } from '../errors';

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
 * Networks and chain identifiers accepted as an explicit chain override.
 */
export type KitSignerNetwork = 'mainnet' | 'devnet' | 'testnet' | 'localnet' | `solana:${string}`;

const LOCAL_RPC_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];

/**
 * Map an RPC endpoint to a Wallet Standard chain identifier, or null when the
 * endpoint does not identify a cluster.
 */
function chainFromRpcEndpoint(rpcUrl: string): `solana:${string}` | null {
    if (rpcUrl.includes('mainnet')) return 'solana:mainnet';
    if (rpcUrl.includes('testnet')) return 'solana:testnet';
    if (rpcUrl.includes('devnet')) return 'solana:devnet';

    let host: string;
    try {
        host = new URL(rpcUrl).hostname.toLowerCase();
    } catch {
        return null;
    }

    return LOCAL_RPC_HOSTS.includes(host) ? 'solana:localnet' : null;
}

/**
 * Create Kit-compatible signers from a Wallet Standard wallet
 *
 * Bridges a Wallet Standard wallet to modern Kit signers using
 * `@solana/wallet-account-signer`. Framework-agnostic and usable in any
 * JavaScript environment.
 *
 * Chain resolution rules, in order:
 * 1. An explicit `network` takes precedence. Short names (`'mainnet'`,
 *    `'devnet'`, `'testnet'`, `'localnet'`) are expanded to `solana:<name>`;
 *    a full `solana:*` identifier is used as given.
 * 2. Otherwise, a `connection` endpoint is matched against the well-known
 *    clusters (a `mainnet`/`testnet`/`devnet` substring) and local hosts
 *    (`localhost`, `127.0.0.1`, `0.0.0.0`, `[::1]` map to `solana:localnet`).
 *    An endpoint that matches nothing throws: signing against a guessed chain
 *    makes a wallet prompt and simulate on a different network than the dapp
 *    is using.
 * 3. With neither an explicit network nor a connection the chain is unknown,
 *    so no transaction signer is returned. Message signing is not chain-scoped
 *    and is still available.
 *
 * @param wallet - The Wallet Standard wallet instance
 * @param account - The wallet account to use
 * @param connection - Optional connection whose RPC endpoint identifies the chain
 * @param network - Optional explicit network or `solana:*` chain identifier
 * @returns Kit signers object with address and signer instances
 * @throws {ConfigurationError} `INVALID_CLUSTER` when a connection is supplied
 * whose RPC endpoint does not identify a known cluster
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
    network?: KitSignerNetwork,
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
    // (solana:mainnet/devnet/testnet/localnet); the signer factories validate
    // the chain against the account's advertised chains at construction time.
    let chain: `solana:${string}` | null = null;

    if (network) {
        chain = network.startsWith('solana:') ? (network as `solana:${string}`) : `solana:${network}`;
    } else if (connection) {
        const rpcUrl = connection.rpcEndpoint || '';
        chain = chainFromRpcEndpoint(rpcUrl);
        if (!chain) {
            throw new ConfigurationError(
                'INVALID_CLUSTER',
                `Cannot determine the Solana chain from RPC endpoint "${rpcUrl}". Pass an explicit network to createKitSignersFromWallet.`,
                { rpcEndpoint: rpcUrl },
            );
        }
    }

    const uiWalletAccount = getOrCreateUiWalletAccountForStandardWalletAccount(wallet, account);

    // The signer factories require the feature on the account (not just the
    // wallet) and throw when it is missing, so gate on the account's features.
    const accountFeatures: readonly string[] = uiWalletAccount.features;
    const hasSignMessage = accountFeatures.includes('solana:signMessage');
    const hasSendTransaction =
        chain !== null &&
        accountFeatures.includes('solana:signAndSendTransaction') &&
        uiWalletAccount.chains.includes(chain);

    return {
        address: walletAddress,
        addressString: account.address,
        messageSigner: hasSignMessage ? createMessageSignerFromWalletAccount(uiWalletAccount) : null,
        transactionSigner:
            hasSendTransaction && chain
                ? createTransactionSendingSignerFromWalletAccount(uiWalletAccount, chain)
                : null,
    };
}
