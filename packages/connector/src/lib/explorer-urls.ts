/**
 * @connector-kit/connector - Explorer URL Utilities
 * 
 * Generate URLs for various Solana block explorers to view transactions,
 * accounts, and other on-chain data.
 */

export type ExplorerType = 'solana-explorer' | 'solscan' | 'xray' | 'solana-fm'

export interface ExplorerOptions {
	/** Cluster to use for the explorer link */
	cluster?: 'mainnet' | 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet' | string
	/** Custom RPC URL for localnet */
	customUrl?: string
}

/**
 * Generate Solana Explorer URL for a transaction signature
 */
export function getSolanaExplorerUrl(
	signature: string,
	options: ExplorerOptions = {}
): string {
	const { cluster = 'mainnet', customUrl } = options
	const normalizedCluster = cluster === 'mainnet-beta' ? 'mainnet' : cluster

	if (normalizedCluster === 'localnet') {
		const url = customUrl || 'http://localhost:8899'
		return `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${encodeURIComponent(url)}`
	}

	if (normalizedCluster === 'mainnet') {
		return `https://explorer.solana.com/tx/${signature}`
	}

	return `https://explorer.solana.com/tx/${signature}?cluster=${normalizedCluster}`
}

/**
 * Generate Solscan URL for a transaction signature
 */
export function getSolscanUrl(
	signature: string,
	options: ExplorerOptions = {}
): string {
	const { cluster = 'mainnet' } = options
	const normalizedCluster = cluster === 'mainnet-beta' ? 'mainnet' : cluster

	if (normalizedCluster === 'mainnet') {
		return `https://solscan.io/tx/${signature}`
	}

	if (normalizedCluster === 'localnet') {
		return `https://solscan.io/tx/${signature}?cluster=custom`
	}

	return `https://solscan.io/tx/${signature}?cluster=${normalizedCluster}`
}

/**
 * Generate XRAY (Helius) URL for a transaction signature
 * Note: XRAY works best with mainnet transactions
 */
export function getXrayUrl(signature: string): string {
	return `https://xray.helius.xyz/tx/${signature}`
}

/**
 * Generate SolanaFM URL for a transaction signature
 */
export function getSolanaFmUrl(
	signature: string,
	options: ExplorerOptions = {}
): string {
	const { cluster = 'mainnet' } = options
	const normalizedCluster = cluster === 'mainnet-beta' ? 'mainnet' : cluster

	if (normalizedCluster === 'mainnet') {
		return `https://solana.fm/tx/${signature}`
	}

	return `https://solana.fm/tx/${signature}?cluster=${normalizedCluster}-solana`
}

/**
 * Get all explorer URLs for a transaction
 */
export function getAllExplorerUrls(
	signature: string,
	options: ExplorerOptions = {}
): Record<ExplorerType, string> {
	return {
		'solana-explorer': getSolanaExplorerUrl(signature, options),
		'solscan': getSolscanUrl(signature, options),
		'xray': getXrayUrl(signature),
		'solana-fm': getSolanaFmUrl(signature, options)
	}
}

/**
 * Format a transaction signature for display (truncated)
 */
export function formatSignature(signature: string, chars = 8): string {
	if (signature.length <= chars * 2) return signature
	return `${signature.slice(0, chars)}...${signature.slice(-chars)}`
}

/**
 * Copy signature to clipboard
 */
export async function copySignature(signature: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(signature)
		return true
	} catch {
		return false
	}
}

