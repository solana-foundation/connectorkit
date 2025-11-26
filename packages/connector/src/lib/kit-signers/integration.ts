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
import { createMessageSignerFromWallet, createTransactionSendingSignerFromWallet } from './factories';
import { Errors } from '../errors';

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
 * This function bridges Wallet Standard wallets with modern Kit architecture.
 * It's framework-agnostic and can be used in any JavaScript environment.
 *
 * The network is automatically detected from the connection's RPC endpoint.
 * For custom RPC URLs, you can override detection with the optional `network` parameter.
 *
 * @param wallet - The Wallet Standard wallet instance
 * @param account - The wallet account to use (first account if not provided)
 * @param connection - Optional connection for network detection and transaction sending
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
    // If no wallet or account, return null values
    if (!wallet || !account) {
        return {
            address: null,
            addressString: null,
            messageSigner: null,
            transactionSigner: null,
        };
    }

    // Convert account address to Kit Address type
    let walletAddress: Address<string> | null = null;
    let walletAddressString: string | null = null;

    try {
        walletAddress = address(account.address) as Address<string>;
        walletAddressString = account.address;
    } catch (error) {
        // Invalid address format
        return {
            address: null,
            addressString: null,
            messageSigner: null,
            transactionSigner: null,
        };
    }

    // Detect network from connection or use provided override
    // Note: Will be enhanced in Phase 2 with chain utilities
    let chain: `solana:${string}` = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'; // Default to devnet

    if (network) {
        // Map network to Wallet Standard chain ID
        const chainMap: Record<string, `solana:${string}`> = {
            mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            devnet: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
            testnet: 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
        };
        chain = chainMap[network] || chain;
    } else if (connection) {
        // Detect from connection RPC URL
        const rpcUrl = connection.rpcEndpoint || '';
        if (rpcUrl.includes('mainnet') || rpcUrl.includes('api.mainnet-beta')) {
            chain = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
        } else if (rpcUrl.includes('testnet')) {
            chain = 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z';
        } else {
            // Default to devnet
            chain = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
        }
    }

    // Check wallet features for capabilities
    const features = wallet.features as Record<string, Record<string, (...args: unknown[]) => unknown>>;
    const hasSignMessage = Boolean(features['solana:signMessage']);
    const hasSignAndSendTransaction = Boolean(features['solana:signAndSendTransaction']);
    const hasSendTransaction = Boolean(features['solana:sendTransaction']);

    // Create message signer if wallet supports message signing
    const messageSigner: MessageModifyingSigner<string> | null = hasSignMessage
        ? createMessageSignerFromWallet(walletAddress, async (message: Uint8Array) => {
              if (!hasSignMessage) {
                  throw Errors.featureNotSupported('message signing');
              }

              try {
                  const signFeature = features['solana:signMessage'];

                  // Ensure message is a Uint8Array
                  const messageBytes = message instanceof Uint8Array ? message : new Uint8Array(message);

                  // Wallet Standard returns an array of signed messages
                  const results = (await signFeature.signMessage({
                      account,
                      message: messageBytes,
                      ...(chain ? { chain } : {}),
                  })) as Array<{ signature: Uint8Array; signedMessage?: Uint8Array }>;

                  if (!Array.isArray(results) || results.length === 0) {
                      throw new Error('Wallet returned empty results array');
                  }

                  const firstResult = results[0];
                  if (!firstResult?.signature) {
                      throw new Error('Wallet returned no signature in first result');
                  }

                  return firstResult.signature;
              } catch (error) {
                  console.error('signMessage error:', error);
                  throw error instanceof Error ? error : new Error(String(error));
              }
          })
        : null;

    // Create transaction sending signer if wallet supports sending transactions
    // Prefer signAndSendTransaction over sendTransaction as it's more efficient
    const transactionSigner: TransactionSendingSigner<string> | null =
        hasSignAndSendTransaction || hasSendTransaction
            ? createTransactionSendingSignerFromWallet(walletAddress, chain, async (transaction: any) => {
                  // Prefer signAndSendTransaction (sign + send in one call)
                  if (hasSignAndSendTransaction) {
                      try {
                          const signAndSendFeature = features['solana:signAndSendTransaction'];
                          const result = (await signAndSendFeature.signAndSendTransaction({
                              account,
                              transactions: [transaction],
                              ...(chain ? { chain } : {}),
                              ...(connection ? { connection } : {}),
                          })) as { signatures: string[] };

                          // Return first signature (wallet limitation: single transaction)
                          return result.signatures[0] || '';
                      } catch (error) {
                          throw error instanceof Error ? error : new Error(String(error));
                      }
                  }

                  // Fallback to sendTransaction (if wallet supports it but not signAndSendTransaction)
                  // Note: sendTransaction in Wallet Standard typically just signs, but some wallets
                  // may implement it to also send if connection is available
                  if (hasSendTransaction) {
                      try {
                          const sendFeature = features['solana:sendTransaction'];
                          const result = (await sendFeature.sendTransaction({
                              account,
                              transactions: [transaction],
                              ...(chain ? { chain } : {}),
                          })) as { signatures: string[] };

                          // Return first signature
                          // Note: Actual sending should be handled by the caller or wallet implementation
                          return result.signatures[0] || '';
                      } catch (error) {
                          throw error instanceof Error ? error : new Error(String(error));
                      }
                  }

                  throw Errors.featureNotSupported('transaction sending');
              })
            : null;

    return {
        address: walletAddress,
        addressString: walletAddressString,
        messageSigner,
        transactionSigner,
    };
}
