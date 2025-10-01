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

// Wallet registry
export { 
  solanaWallets,
  getPopularWallets,
  getMobileWallets, 
  getWalletByIdentifier,
  getAllWallets
} from './wallets'

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

export type { SolanaWalletConfig } from './wallets'

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
