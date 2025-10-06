/**
 * @connector-kit/connector - Wallet Adapter Compatibility Bridge
 * 
 * Provides a compatibility layer that allows @connector-kit/connector
 * to work with libraries and code that expect @solana/wallet-adapter.
 * 
 * This enables connector to be used as a drop-in replacement for
 * wallet-adapter in existing codebases, facilitating gradual migration.
 */

import React from 'react'
import type { TransactionSigner } from '../lib/transaction-signer'

/**
 * Wallet adapter compatible interface
 * Matches the core interface expected by @solana/wallet-adapter consumers
 */
export interface WalletAdapterCompatible {
	/** 
	 * The connected wallet's public key as a base58 string
	 * null if no wallet is connected
	 */
	publicKey: string | null
	
	/** Whether a wallet is currently connected */
	connected: boolean
	
	/**
	 * Sign a transaction without sending it
	 * @param transaction - The transaction to sign
	 * @returns The signed transaction
	 */
	signTransaction(transaction: any): Promise<any>
	
	/**
	 * Sign multiple transactions
	 * @param transactions - Array of transactions to sign
	 * @returns Array of signed transactions
	 */
	signAllTransactions(transactions: any[]): Promise<any[]>
	
	/**
	 * Sign and send a transaction
	 * @param transaction - The transaction to sign and send
	 * @param options - Optional send options
	 * @returns The transaction signature
	 */
	sendTransaction(transaction: any, options?: any): Promise<string>
	
	/**
	 * Disconnect the wallet
	 */
	disconnect(): Promise<void>
}

/**
 * Options for creating a wallet adapter compatible interface
 */
export interface WalletAdapterCompatOptions {
	/**
	 * Function to call when disconnect is requested
	 * Should handle disconnecting the wallet in your app
	 */
	disconnect: () => Promise<void>
	
	/**
	 * Optional: transform transaction before signing
	 * Use this if you need to modify transactions for compatibility
	 */
	transformTransaction?: (tx: any) => any
	
	/**
	 * Optional: custom error handler
	 * Called when operations fail
	 */
	onError?: (error: Error, operation: string) => void
}

/**
 * Create a wallet-adapter compatible interface from a transaction signer
 * 
 * This enables using @connector-kit/connector with libraries that expect
 * @solana/wallet-adapter, such as:
 * - Solana dApp Scaffold
 * - Jupiter Aggregator integration
 * - Serum DEX integration
 * - Various DeFi protocols
 * 
 * **Important**: This creates a lightweight compatibility layer, not a full
 * wallet adapter implementation. Some advanced features may not be available.
 * 
 * @param signer - The transaction signer from useTransactionSigner()
 * @param options - Configuration options including disconnect handler
 * @returns Wallet adapter compatible interface
 * 
 * @example
 * ```tsx
 * import { useTransactionSigner, useConnector } from '@connector-kit/connector/react'
 * import { createWalletAdapterCompat } from '@connector-kit/connector/compat'
 * 
 * function MyComponent() {
 *   const { signer } = useTransactionSigner()
 *   const { disconnect } = useConnector()
 *   
 *   // Create wallet adapter compatible interface
 *   const walletAdapter = createWalletAdapterCompat(signer, {
 *     disconnect: async () => {
 *       await disconnect()
 *     }
 *   })
 *   
 *   // Use with Jupiter
 *   const jupiter = await Jupiter.load({
 *     connection,
 *     cluster: 'mainnet-beta',
 *     user: walletAdapter  // Pass the compat interface
 *   })
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Use with any library expecting wallet-adapter
 * import { useJupiter } from '@jup-ag/react-hook'
 * 
 * function SwapComponent() {
 *   const { signer } = useTransactionSigner()
 *   const { disconnect } = useConnector()
 *   
 *   const walletAdapter = createWalletAdapterCompat(signer, {
 *     disconnect,
 *     onError: (error, operation) => {
 *       console.error(`Wallet adapter error in ${operation}:`, error)
 *       toast.error(`Transaction ${operation} failed`)
 *     }
 *   })
 *   
 *   // Pass to Jupiter or other libraries
 *   const jupiter = useJupiter({
 *     wallet: walletAdapter,
 *     // ... other options
 *   })
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Transform transactions for compatibility
 * const walletAdapter = createWalletAdapterCompat(signer, {
 *   disconnect,
 *   transformTransaction: (tx) => {
 *     // Add priority fees or modify transaction
 *     // before signing
 *     return modifyTransaction(tx)
 *   }
 * })
 * ```
 */
export function createWalletAdapterCompat(
	signer: TransactionSigner | null,
	options: WalletAdapterCompatOptions
): WalletAdapterCompatible {
	const { disconnect, transformTransaction, onError } = options
	
	/**
	 * Helper to handle errors consistently
	 */
	const handleError = (error: Error, operation: string): never => {
		if (onError) {
			onError(error, operation)
		}
		throw error
	}
	
	return {
		/**
		 * Get the public key as a string
		 * Returns null if no signer is available
		 */
		get publicKey() {
			return signer?.address || null
		},
		
		/**
		 * Check if wallet is connected
		 * Returns true if signer is available
		 */
		get connected() {
			return Boolean(signer)
		},
		
		/**
		 * Sign a single transaction
		 */
		async signTransaction(transaction: any): Promise<any> {
			if (!signer) {
				const error = new Error('Wallet not connected')
				return handleError(error, 'signTransaction')
			}
			
			try {
				// Apply transformation if provided
				const tx = transformTransaction ? transformTransaction(transaction) : transaction
				return await signer.signTransaction(tx)
			} catch (error) {
				return handleError(error as Error, 'signTransaction')
			}
		},
		
		/**
		 * Sign multiple transactions
		 */
		async signAllTransactions(transactions: any[]): Promise<any[]> {
			if (!signer) {
				const error = new Error('Wallet not connected')
				return handleError(error, 'signAllTransactions')
			}
			
			try {
				// Apply transformation if provided
				const txs = transformTransaction
					? transactions.map(tx => transformTransaction(tx))
					: transactions
				
				return await signer.signAllTransactions(txs)
			} catch (error) {
				return handleError(error as Error, 'signAllTransactions')
			}
		},
		
		/**
		 * Sign and send a transaction
		 * Note: wallet-adapter calls this "sendTransaction" but it signs + sends
		 */
		async sendTransaction(transaction: any, options?: any): Promise<string> {
			if (!signer) {
				const error = new Error('Wallet not connected')
				return handleError(error, 'sendTransaction')
			}
			
			try {
				// Apply transformation if provided
				const tx = transformTransaction ? transformTransaction(transaction) : transaction
				
				// Extract options
				const sendOptions = {
					skipPreflight: options?.skipPreflight,
					maxRetries: options?.maxRetries
				}
				
				return await signer.signAndSendTransaction(tx, sendOptions)
			} catch (error) {
				return handleError(error as Error, 'sendTransaction')
			}
		},
		
		/**
		 * Disconnect the wallet
		 * Calls the disconnect function provided in options
		 */
		async disconnect(): Promise<void> {
			try {
				await disconnect()
			} catch (error) {
				return handleError(error as Error, 'disconnect')
			}
		}
	}
}

/**
 * Type guard to check if an object is a wallet adapter compatible interface
 * Useful for conditional logic when working with multiple wallet systems
 * 
 * @param obj - Object to check
 * @returns True if object implements WalletAdapterCompatible interface
 * 
 * @example
 * ```ts
 * if (isWalletAdapterCompatible(wallet)) {
 *   const signature = await wallet.sendTransaction(tx)
 * }
 * ```
 */
export function isWalletAdapterCompatible(obj: any): obj is WalletAdapterCompatible {
	return (
		obj &&
		typeof obj === 'object' &&
		'publicKey' in obj &&
		typeof obj.connected === 'boolean' &&
		typeof obj.signTransaction === 'function' &&
		typeof obj.signAllTransactions === 'function' &&
		typeof obj.sendTransaction === 'function' &&
		typeof obj.disconnect === 'function'
	)
}

/**
 * React hook that creates a wallet adapter compatible interface
 * Automatically recreates when signer, disconnect, or options change
 * 
 * This hook memoizes the adapter instance to ensure stability across renders,
 * preventing unnecessary re-renders in components that consume the adapter.
 * 
 * @param signer - Transaction signer from useTransactionSigner()
 * @param disconnect - Disconnect function from useConnector()
 * @param options - Optional configuration
 * @returns Wallet adapter compatible interface (stable across renders)
 * 
 * @example
 * ```tsx
 * import { useTransactionSigner, useConnector } from '@connector-kit/connector/react'
 * import { useWalletAdapterCompat } from '@connector-kit/connector/compat'
 * 
 * function MyComponent() {
 *   const { signer } = useTransactionSigner()
 *   const { disconnect } = useConnector()
 *   
 *   const walletAdapter = useWalletAdapterCompat(signer, disconnect)
 *   
 *   // Use with any wallet-adapter expecting library
 *   return <JupiterIntegration wallet={walletAdapter} />
 * }
 * ```
 */
export function useWalletAdapterCompat(
	signer: TransactionSigner | null,
	disconnect: () => Promise<void>,
	options?: Omit<WalletAdapterCompatOptions, 'disconnect'>
): WalletAdapterCompatible {
	return React.useMemo(
		() => createWalletAdapterCompat(signer, {
			disconnect,
			...options
		}),
		[signer, disconnect, options]
	)
}

