/**
 * @connector-kit/connector/compat
 * 
 * Compatibility layer exports for wallet-adapter and other integrations
 */

export {
	createWalletAdapterCompat,
	isWalletAdapterCompatible,
	useWalletAdapterCompat
} from './wallet-adapter-bridge'

export type {
	WalletAdapterCompatible,
	WalletAdapterCompatOptions
} from './wallet-adapter-bridge'

