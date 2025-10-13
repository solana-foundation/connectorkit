/**
 * Transaction and signer-related types
 */

import type { Wallet, WalletAccount } from './wallets';
import type { SolanaCluster } from '@wallet-ui/core';
import type { Address, Signature, TransactionMessage } from 'gill';
import type { Transaction, VersionedTransaction } from '@solana/web3.js';

/**
 * Union type for all supported Solana transaction formats
 * Supports both legacy (@solana/web3.js) and modern (gill) transaction types
 */
export type SolanaTransaction = Transaction | VersionedTransaction | TransactionMessage | Uint8Array;

/**
 * Configuration for creating a transaction signer
 */
export interface TransactionSignerConfig {
    /** The Wallet Standard wallet instance */
    wallet: Wallet;
    /** The specific account to sign with */
    account: WalletAccount;
    /** Optional cluster/network context for chain-specific operations */
    cluster?: SolanaCluster;
    /** Optional event emitter for transaction lifecycle events */
    eventEmitter?: {
        emit: (event: unknown) => void;
    };
}

/**
 * Result of a signed transaction operation
 */
export interface SignedTransaction {
    /** The transaction signature/hash */
    signature: string;
    /** The signed transaction data */
    transaction: SolanaTransaction;
}

/**
 * Capabilities that a transaction signer supports
 * Useful for conditionally enabling/disabling UI features
 */
export interface TransactionSignerCapabilities {
    /** Can sign transactions without sending */
    canSign: boolean;
    /** Can sign and send transactions in one operation */
    canSend: boolean;
    /** Can sign arbitrary messages */
    canSignMessage: boolean;
    /** Can sign multiple transactions at once */
    supportsBatchSigning: boolean;
}

/**
 * Transaction activity record for debugging and monitoring
 */
export interface TransactionActivity {
    /** Transaction signature */
    signature: Signature;
    /** When the transaction was sent */
    timestamp: string;
    /** Transaction status */
    status: 'pending' | 'confirmed' | 'failed';
    /** Error message if failed */
    error?: string;
    /** Cluster where transaction was sent */
    cluster: string;
    /** Fee payer address */
    feePayer?: Address;
    /** Method used (signAndSendTransaction, sendTransaction, etc) */
    method: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
