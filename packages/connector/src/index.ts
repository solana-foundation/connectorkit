// Initialize UI global styles (e.g., spinner keyframes) once per app
export { injectConnectorGlobalStyles, injectArcConnectorGlobalStyles } from './ui/global-styles'

// Configuration helpers
export { getDefaultConfig, getDefaultMobileConfig } from './config'
export type { DefaultConfigOptions, ExtendedConnectorConfig } from './config'

// Core exports
export { ConnectorClient, modalRoutes, validateRoute, safeRoutes } from './lib/connector-client'
export type { 
  ConnectorState, 
  ConnectorConfig, 
  WalletInfo, 
  AccountInfo,
  ModalRoute
} from './lib/connector-client'

export { ConnectorProvider, useConnector, useConnectorClient } from './ui/connector-provider'
export type { ConnectorSnapshot } from './ui/connector-provider'
export type { MobileWalletAdapterConfig } from './ui/connector-provider'
export { UnifiedProvider, AppProvider, WalletProvider } from './ui/unified-provider'
export type { UnifiedProviderProps } from './ui/unified-provider'

export { useModal } from './hooks'
export type { UseModalReturn } from './hooks'

export { ConnectButton } from './ui/connect-button'
export type { ConnectButtonProps } from './ui/connect-button'
export { ConnectModal } from './ui/connect-modal'

// Error handling utilities - useful for both pre-built and headless usage
export { 
  ConnectorErrorBoundary, 
  withErrorBoundary,
  WalletErrorType 
} from './components/ErrorBoundary'
export type { WalletError } from './components/ErrorBoundary'

export { ProfilePage } from './pages/profile'
export { AboutPage } from './pages/about'
export { SettingsPage } from './pages/settings'

export { ModalRouter, defaultModalRouter } from './lib/modal-router'
export type { ModalState } from './lib/modal-router'

export { WalletsPage } from './pages/wallets'

// Theming system
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
  mergeThemeOverrides,
  // Legacy compatibility
  getBorderRadiusLegacy,
  getButtonHeightLegacy,
  getButtonShadowLegacy,
  getButtonBorderLegacy,
  legacyToModernTheme,
} from './themes'
export type { 
  ConnectorTheme,
  LegacyConnectorTheme,
  ConnectorThemeOverrides,
  LegacyConnectorThemeOverrides,
  ThemeName
} from './themes'

// Configuration types
export type { 
  ConnectorOptions, 
  MobileConnectorOptions, 
  ConnectorThemeExtended 
} from './types'


// Optional programmatic registration helper
export async function registerMobileWalletAdapter(config: import('./ui/connector-provider').MobileWalletAdapterConfig) {
  const {
    registerMwa,
    createDefaultAuthorizationCache,
    createDefaultChainSelector,
    createDefaultWalletNotFoundHandler,
    MWA_SOLANA_CHAINS,
  } = (await import('@solana-mobile/wallet-standard-mobile')) as any
  registerMwa({
    appIdentity: config.appIdentity,
    authorizationCache: config.authorizationCache ?? createDefaultAuthorizationCache(),
    chains: (config.chains ?? MWA_SOLANA_CHAINS) as any,
    chainSelector: config.chainSelector ?? createDefaultChainSelector(),
    remoteHostAuthority: config.remoteHostAuthority,
    onWalletNotFound: config.onWalletNotFound ?? createDefaultWalletNotFoundHandler(),
  })
}