/**
 * @connector-kit/connector/react
 * 
 * React-specific exports with hooks and components
 * Use this when you only need React functionality
 */

// React-specific components and providers (not in headless)
export { ConnectorProvider, useConnector, useConnectorClient } from './ui/connector-provider'
export { UnifiedProvider, AppProvider, WalletProvider } from './ui/unified-provider'
export { ConnectButton } from './ui/connect-button'
export { ConnectModal } from './ui/connect-modal'

// React-specific hooks
export { useModal } from './hooks'

// React-specific pages and error boundaries
export { WalletsPage } from './pages/wallets'
export { ProfilePage } from './pages/profile'
export { AboutPage } from './pages/about'
export { SettingsPage } from './pages/settings'
export { ConnectorErrorBoundary, withErrorBoundary } from './components/ErrorBoundary'

// React-specific global styles
export { injectConnectorGlobalStyles, injectArcConnectorGlobalStyles } from './ui/global-styles'

// React-specific types
export type { 
  ConnectorSnapshot,
  MobileWalletAdapterConfig
} from './ui/connector-provider'

export type { ConnectButtonProps } from './ui/connect-button'
export type { UnifiedProviderProps } from './ui/unified-provider'
export type { UseModalReturn } from './hooks'

// Re-export headless core for convenience
// This includes: ConnectorClient, themes, config, utilities, etc.
export * from './headless'