/**
 * @connector-kit/connector - Transaction Signing Abstraction Layer
 * 
 * Provides a clean, unified interface for transaction operations that works
 * across both Wallet Standard and legacy wallet implementations.
 * 
 * Inspired by wallet-adapter-compat's transaction signer pattern, this
 * abstraction layer makes it easy to integrate with transaction libraries
 * and provides consistent error handling and capability detection.
 */

import type { Wallet, WalletAccount } from './wallet-standard-shim'
import type { SolanaCluster } from '@wallet-ui/core'

/**
 * Configuration for creating a transaction signer
 */
export interface TransactionSignerConfig {
	/** The Wallet Standard wallet instance */
	wallet: Wallet
	/** The specific account to sign with */
	account: WalletAccount
	/** Optional cluster/network context for chain-specific operations */
	cluster?: SolanaCluster
}

/**
 * Result of a signed transaction operation
 */
export interface SignedTransaction {
	/** The transaction signature/hash */
	signature: string
	/** The signed transaction data */
	transaction: any
}

/**
 * Capabilities that a transaction signer supports
 * Useful for conditionally enabling/disabling UI features
 */
export interface TransactionSignerCapabilities {
	/** Can sign transactions without sending */
	canSign: boolean
	/** Can sign and send transactions in one operation */
	canSend: boolean
	/** Can sign arbitrary messages */
	canSignMessage: boolean
	/** Can sign multiple transactions at once */
	supportsBatchSigning: boolean
}

/**
 * Unified transaction signer interface
 * 
 * This interface abstracts wallet-specific transaction signing methods
 * into a consistent API that works across all Wallet Standard wallets.
 * 
 * @example
 * ```ts
 * const signer = createTransactionSigner({
 *   wallet: connectedWallet,
 *   account: selectedAccount,
 *   cluster: currentCluster
 * })
 * 
 * // Check capabilities before using
 * const caps = signer.getCapabilities()
 * if (!caps.canSend) {
 *   console.warn('Wallet cannot send transactions directly')
 * }
 * 
 * // Sign and send a transaction
 * const signature = await signer.signAndSendTransaction(transaction)
 * console.log('Transaction sent:', signature)
 * ```
 */
export interface TransactionSigner {
	/** The wallet address that will sign transactions */
	readonly address: string
	
	/**
	 * Sign a single transaction without sending it
	 * The wallet prompts the user to approve the transaction
	 * 
	 * @param transaction - The transaction to sign
	 * @returns The signed transaction
	 * @throws {TransactionSignerError} If wallet doesn't support signing or user rejects
	 */
	signTransaction(transaction: any): Promise<any>
	
	/**
	 * Sign multiple transactions at once
	 * More efficient than signing one-by-one for batch operations
	 * Falls back to sequential signing if batch not supported
	 * 
	 * @param transactions - Array of transactions to sign
	 * @returns Array of signed transactions in the same order
	 * @throws {TransactionSignerError} If signing fails for any transaction
	 */
	signAllTransactions(transactions: any[]): Promise<any[]>
	
	/**
	 * Sign and send a transaction in one operation
	 * The wallet handles both signing and broadcasting to the network
	 * 
	 * @param transaction - The transaction to sign and send
	 * @param options - Optional send options (e.g., skipPreflight)
	 * @returns The transaction signature/hash
	 * @throws {TransactionSignerError} If sending fails or user rejects
	 */
	signAndSendTransaction(
		transaction: any,
		options?: { skipPreflight?: boolean; maxRetries?: number }
	): Promise<string>
	
	/**
	 * Sign and send multiple transactions sequentially
	 * Waits for each transaction to be sent before sending the next
	 * 
	 * @param transactions - Array of transactions to sign and send
	 * @param options - Optional send options
	 * @returns Array of transaction signatures in the same order
	 * @throws {TransactionSignerError} If any transaction fails
	 */
	signAndSendTransactions(
		transactions: any[],
		options?: { skipPreflight?: boolean; maxRetries?: number }
	): Promise<string[]>
	
	/**
	 * Sign an arbitrary message (for authentication, verification, etc.)
	 * Optional: not all wallets support message signing
	 * 
	 * @param message - The message to sign (as Uint8Array)
	 * @returns The signature bytes
	 * @throws {TransactionSignerError} If wallet doesn't support message signing
	 */
	signMessage?(message: Uint8Array): Promise<Uint8Array>
	
	/**
	 * Get the signer's capabilities
	 * Use this to conditionally enable/disable features in your UI
	 * 
	 * @returns Object describing what this signer can do
	 */
	getCapabilities(): TransactionSignerCapabilities
}

/**
 * Create a transaction signer from a Wallet Standard wallet
 * 
 * This factory function creates a TransactionSigner instance that bridges
 * Wallet Standard features to a clean, consistent API.
 * 
 * @param config - Configuration including wallet, account, and optional cluster
 * @returns TransactionSigner instance, or null if wallet/account invalid
 * 
 * @example
 * ```ts
 * // Basic usage
 * const signer = createTransactionSigner({
 *   wallet: connectedWallet,
 *   account: selectedAccount
 * })
 * 
 * if (!signer) {
 *   console.error('Failed to create signer - wallet or account missing')
 *   return
 * }
 * 
 * // Use the signer
 * try {
 *   const sig = await signer.signAndSendTransaction(tx)
 *   console.log('Success:', sig)
 * } catch (error) {
 *   if (error instanceof TransactionSignerError) {
 *     console.error('Signing error:', error.code, error.message)
 *   }
 * }
 * ```
 */
export function createTransactionSigner(
	config: TransactionSignerConfig
): TransactionSigner | null {
	const { wallet, account, cluster } = config
	
	// Validate inputs
	if (!wallet || !account) {
		return null
	}
	
	const features = wallet.features as any
	const address = account.address as string
	
	// Detect wallet capabilities
	const capabilities: TransactionSignerCapabilities = {
		canSign: Boolean(features['solana:signTransaction']),
		canSend: Boolean(features['solana:signAndSendTransaction']),
		canSignMessage: Boolean(features['solana:signMessage']),
		supportsBatchSigning: Boolean(features['solana:signAllTransactions'])
	}
	
	// Build the signer interface
	const signer: TransactionSigner = {
		address,
		
		async signTransaction(transaction: any): Promise<any> {
			if (!capabilities.canSign) {
				throw new TransactionSignerError(
					'Wallet does not support transaction signing',
					'FEATURE_NOT_SUPPORTED'
				)
			}
			
			try {
				const signFeature = features['solana:signTransaction']
				const result = await signFeature.signTransaction(transaction)
				return result.signedTransaction
			} catch (error) {
				throw new TransactionSignerError(
					`Failed to sign transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
					'SIGNING_FAILED',
					error as Error
				)
			}
		},
		
		async signAllTransactions(transactions: any[]): Promise<any[]> {
			if (transactions.length === 0) {
				return []
			}
			
			// If wallet supports batch signing, use it
			if (capabilities.supportsBatchSigning) {
				try {
					const signFeature = features['solana:signAllTransactions']
					const result = await signFeature.signAllTransactions(transactions)
					return result.signedTransactions
				} catch (error) {
					throw new TransactionSignerError(
						`Failed to sign transactions in batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
						'SIGNING_FAILED',
						error as Error
					)
				}
			}
			
			// Fallback: sign one by one
			if (!capabilities.canSign) {
				throw new TransactionSignerError(
					'Wallet does not support transaction signing',
					'FEATURE_NOT_SUPPORTED'
				)
			}
			
			const signed: any[] = []
			for (let i = 0; i < transactions.length; i++) {
				try {
					const signedTx = await signer.signTransaction(transactions[i])
					signed.push(signedTx)
				} catch (error) {
					throw new TransactionSignerError(
						`Failed to sign transaction ${i + 1} of ${transactions.length}: ${error instanceof Error ? error.message : 'Unknown error'}`,
						'SIGNING_FAILED',
						error as Error
					)
				}
			}
			
			return signed
		},
		
		async signAndSendTransaction(
			transaction: any,
			options?: { skipPreflight?: boolean; maxRetries?: number }
		): Promise<string> {
			if (!capabilities.canSend) {
				throw new TransactionSignerError(
					'Wallet does not support sending transactions',
					'FEATURE_NOT_SUPPORTED'
				)
			}
			
			try {
				const sendFeature = features['solana:signAndSendTransaction']
				const sendOptions: any = {
					...(options || {}),
					// Include chain context if cluster is provided
					...(cluster ? { chain: cluster.id } : {})
				}
				
				const result = await sendFeature.signAndSendTransaction(
					transaction,
					sendOptions
				)
				
				// Extract signature from result
				return result.signature || result
			} catch (error) {
				throw new TransactionSignerError(
					`Failed to send transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
					'SEND_FAILED',
					error as Error
				)
			}
		},
		
		async signAndSendTransactions(
			transactions: any[],
			options?: { skipPreflight?: boolean; maxRetries?: number }
		): Promise<string[]> {
			if (transactions.length === 0) {
				return []
			}
			
			if (!capabilities.canSend) {
				throw new TransactionSignerError(
					'Wallet does not support sending transactions',
					'FEATURE_NOT_SUPPORTED'
				)
			}
			
			// Send transactions sequentially
			// Note: Some wallets may support batch send in the future
			const signatures: string[] = []
			
			for (let i = 0; i < transactions.length; i++) {
				try {
					const sig = await signer.signAndSendTransaction(transactions[i], options)
					signatures.push(sig)
				} catch (error) {
					throw new TransactionSignerError(
						`Failed to send transaction ${i + 1} of ${transactions.length}: ${error instanceof Error ? error.message : 'Unknown error'}`,
						'SEND_FAILED',
						error as Error
					)
				}
			}
			
			return signatures
		},
		
		// Optional: message signing
		...(capabilities.canSignMessage && {
			async signMessage(message: Uint8Array): Promise<Uint8Array> {
				if (!capabilities.canSignMessage) {
					throw new TransactionSignerError(
						'Wallet does not support message signing',
						'FEATURE_NOT_SUPPORTED'
					)
				}
				
				try {
					const signFeature = features['solana:signMessage']
					const result = await signFeature.signMessage(message)
					return result.signature
				} catch (error) {
					throw new TransactionSignerError(
						`Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`,
						'SIGNING_FAILED',
						error as Error
					)
				}
			}
		}),
		
		getCapabilities(): TransactionSignerCapabilities {
			// Return a copy to prevent external mutation
			return { ...capabilities }
		}
	}
	
	return signer
}

/**
 * Custom error class for transaction signer operations
 * Provides structured error information for better error handling
 * 
 * @example
 * ```ts
 * try {
 *   await signer.signTransaction(tx)
 * } catch (error) {
 *   if (error instanceof TransactionSignerError) {
 *     switch (error.code) {
 *       case 'WALLET_NOT_CONNECTED':
 *         showConnectWalletPrompt()
 *         break
 *       case 'FEATURE_NOT_SUPPORTED':
 *         showUnsupportedFeatureMessage()
 *         break
 *       case 'SIGNING_FAILED':
 *         showSigningErrorMessage(error.message)
 *         break
 *       case 'SEND_FAILED':
 *         showSendErrorMessage(error.message)
 *         break
 *     }
 *   }
 * }
 * ```
 */
export class TransactionSignerError extends Error {
	/**
	 * @param message - Human-readable error message
	 * @param code - Error code for programmatic handling
	 * @param originalError - The underlying error that caused this failure
	 */
	constructor(
		message: string,
		public readonly code: 
			| 'WALLET_NOT_CONNECTED' 
			| 'FEATURE_NOT_SUPPORTED' 
			| 'SIGNING_FAILED' 
			| 'SEND_FAILED',
		public readonly originalError?: Error
	) {
		super(message)
		this.name = 'TransactionSignerError'
		
		// Maintain proper stack trace for where error was thrown
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, TransactionSignerError)
		}
	}
}

/**
 * Type guard to check if an error is a TransactionSignerError
 * 
 * @param error - The error to check
 * @returns True if error is a TransactionSignerError
 * 
 * @example
 * ```ts
 * try {
 *   await signer.signTransaction(tx)
 * } catch (error) {
 *   if (isTransactionSignerError(error)) {
 *     console.error('Signing error code:', error.code)
 *   }
 * }
 * ```
 */
export function isTransactionSignerError(error: unknown): error is TransactionSignerError {
	return error instanceof TransactionSignerError
}

