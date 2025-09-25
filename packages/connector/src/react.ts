/**
 * @connector-kit/connector/react
 * 
 * React-specific exports with hooks and components
 * Use this when you only need React functionality
 */

// React components and providers
export { ConnectorProvider, useConnector, useConnectorClient } from './ui/connector-provider'
export { UnifiedProvider, AppProvider, WalletProvider } from './ui/unified-provider'
export { ConnectButton } from './ui/connect-button'
export { ConnectModal } from './ui/connect-modal'

// React hooks
export { useModal } from './hooks'

// Pages for custom implementations
export { WalletsPage } from './pages/wallets'

// React-specific types
export type { 
  ConnectorSnapshot,
  MobileWalletAdapterConfig
} from './ui/connector-provider'

export type { ConnectButtonProps } from './ui/connect-button'
export type { UnifiedProviderProps } from './ui/unified-provider'
export type { UseModalReturn } from './hooks'

// Re-export headless core for convenience
export * from './headless'

/**
 * React 19 Usage Example:
 * 
 * ```tsx
 * import { AppProvider, ConnectButton, useConnector } from '@connector-kit/connector/react'
 * 
 * function App() {
 *   return (
 *     <AppProvider>
 *       <ConnectButton />
 *       <WalletInfo />
 *     </AppProvider>
 *   )
 * }
 * 
 * function WalletInfo() {
 *   const { connected, selectedAccount } = useConnector()
 *   
 *   if (!connected) return <p>Not connected</p>
 *   
 *   return <p>Connected: {selectedAccount}</p>
 * }
 * ```
 */
