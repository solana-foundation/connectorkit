/**
 * @connector-kit/connector/headless
 * 
 * Framework-agnostic core - works with Vue, Angular, Vanilla JS
 * Zero React dependencies for maximum compatibility
 */

// Core client logic
export { ConnectorClient, modalRoutes, validateRoute } from './lib/connector-client'

// Configuration helpers
export { getDefaultConfig, getDefaultMobileConfig } from './config'
export type { DefaultConfigOptions, ExtendedConnectorConfig } from './config'


// Theme system (works without React)
export {
  themes,
  solanaTheme,
  minimalTheme,
  darkTheme,
  phantomTheme,
  defaultConnectorTheme,
  // Theme utilities
  getBorderRadius,
  getSpacing,
  getButtonHeight,
  getButtonShadow,
  getButtonBorder,
  getAccessibleTextColor,
  mergeThemeOverrides
} from './themes'

// Essential types for non-React usage
export type { 
  ConnectorConfig,
  ConnectorState,
  WalletInfo,
  AccountInfo,
  ModalRoute
} from './lib/connector-client'

export type {
  ConnectorTheme,
  LegacyConnectorTheme,
  ConnectorThemeOverrides
} from './themes/types'


// Error handling utilities for headless users
export { WalletErrorType } from './components/ErrorBoundary'
export type { WalletError } from './components/ErrorBoundary'
import { WalletErrorType, type WalletError } from './components/ErrorBoundary'

/**
 * Classify error utility for headless error handling
 * @example
 * ```javascript
 * import { classifyWalletError, WalletErrorType } from '@connector-kit/connector/headless'
 * 
 * try {
 *   await client.select('phantom')
 * } catch (error) {
 *   const classified = classifyWalletError(error)
 *   if (classified.type === WalletErrorType.USER_REJECTED) {
 *     // Handle user rejection gracefully
 *   }
 * }
 * ```
 */
export function classifyWalletError(error: Error): WalletError {
  const walletError = error as WalletError
  
  // Already classified
  if (walletError.type) return walletError

  // Classify based on message patterns
  let type = WalletErrorType.UNKNOWN_ERROR
  let recoverable = false

  if (error.message.includes('User rejected') || error.message.includes('User denied')) {
    type = WalletErrorType.USER_REJECTED
    recoverable = true
  } else if (error.message.includes('Insufficient funds')) {
    type = WalletErrorType.INSUFFICIENT_FUNDS  
    recoverable = false
  } else if (error.message.includes('Network') || error.message.includes('fetch')) {
    type = WalletErrorType.NETWORK_ERROR
    recoverable = true
  } else if (error.message.includes('Wallet not found') || error.message.includes('not installed')) {
    type = WalletErrorType.WALLET_NOT_FOUND
    recoverable = true
  } else if (error.message.includes('Failed to connect') || error.message.includes('Connection')) {
    type = WalletErrorType.CONNECTION_FAILED
    recoverable = true
  }

  return {
    ...error,
    name: error.name,
    message: error.message,
    type,
    recoverable,
    context: { originalMessage: error.message }
  }
}

/**
 * Vanilla JS Usage Example:
 * 
 * ```javascript
 * import { ConnectorClient, getDefaultConfig, solanaTheme } from '@connector-kit/connector/headless'
 * 
 * const config = getDefaultConfig({
 *   appName: 'My App',
 *   appUrl: 'https://myapp.com'
 * })
 * 
 * const client = new ConnectorClient(config)
 * 
 * // Connect to wallet
 * await client.select('phantom')
 * 
 * // Listen to state changes
 * client.subscribe((state) => {
 *   console.log('Wallet state:', state)
 *   updateUI(state)
 * })
 * ```
 */

/**
 * Vue 3 Usage Example:
 * 
 * ```javascript
 * import { ref, onMounted, onUnmounted } from 'vue'
 * import { ConnectorClient, getDefaultConfig } from '@connector-kit/connector/headless'
 * 
 * export function useConnector() {
 *   const state = ref(null)
 *   let client = null
 *   let unsubscribe = null
 * 
 *   onMounted(() => {
 *     client = new ConnectorClient(getDefaultConfig({ appName: 'Vue App' }))
 *     unsubscribe = client.subscribe((newState) => {
 *       state.value = newState
 *     })
 *   })
 * 
 *   onUnmounted(() => {
 *     unsubscribe?.()
 *   })
 * 
 *   return { state, connect: (wallet) => client.select(wallet) }
 * }
 * ```
 */
