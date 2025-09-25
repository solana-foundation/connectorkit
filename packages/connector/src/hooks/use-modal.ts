import { useCallback } from 'react'
import { useConnector, useConnectorClient } from '../ui/connector-provider'
import { modalRoutes, type ModalRoute } from '../lib/connector-client'

export interface UseModalReturn {
  /** Whether the modal is currently open */
  isOpen: boolean
  /** Current modal route */
  route: ModalRoute
  /** Open the modal with optional route */
  setOpen: (open: boolean, route?: ModalRoute) => void
  /** Set the modal route without changing open state */
  setRoute: (route: ModalRoute) => void
  /** Open modal (defaults to appropriate route based on connection state) */
  open: (route?: ModalRoute) => void
  /** Close the modal */
  close: () => void
  
  // Convenience methods for specific routes
  /** Open wallet selection modal */
  openWallets: () => void
  /** Open user profile modal (requires connection) */
  openProfile: () => void
  /** Open account settings modal (requires connection) */
  openAccountSettings: () => void
  /** Open network settings modal */
  openNetworkSettings: () => void
  /** Open settings modal */
  openSettings: () => void
  /** Open about modal */
  openAbout: () => void
}

/**
 * Hook for managing the connector modal state and navigation
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const modal = useModal()
 *   
 *   return (
 *     <div>
 *       <button onClick={modal.openWallets}>
 *         Connect Wallet
 *       </button>
 *       <button onClick={modal.openProfile}>
 *         Profile
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useModal(): UseModalReturn {
  // Read snapshot for reactive state
  const snapshot = useConnector()
  // Use stable client instance for actions to keep callbacks stable across state changes
  const client = useConnectorClient()
  
  const setOpen = useCallback((open: boolean, route?: ModalRoute) => {
    client?.setModalOpen(open, route)
  }, [client])
  
  const setRoute = useCallback((route: ModalRoute) => {
    client?.setModalRoute(route)
  }, [client])
  
  const open = useCallback((route?: ModalRoute) => {
    client?.openModal(route)
  }, [client])
  
  const close = useCallback(() => {
    client?.closeModal()
  }, [client])
  
  // Route-specific convenience methods
  const openWallets = useCallback(() => {
    client?.openModal(modalRoutes.WALLETS)
  }, [client])
  
  const openProfile = useCallback(() => {
    if (!snapshot.connected) {
      return
    }
    client?.openModal(modalRoutes.PROFILE)
  }, [client, snapshot.connected])
  
  const openAccountSettings = useCallback(() => {
    if (!snapshot.connected) {
      return
    }
    client?.openModal(modalRoutes.ACCOUNT_SETTINGS)
  }, [client, snapshot.connected])
  
  const openNetworkSettings = useCallback(() => {
    client?.openModal(modalRoutes.NETWORK_SETTINGS)
  }, [client])
  
  const openSettings = useCallback(() => {
    client?.openModal(modalRoutes.SETTINGS)
  }, [client])
  
  const openAbout = useCallback(() => {
    client?.openModal(modalRoutes.ABOUT)
  }, [client])
  
  return {
    isOpen: snapshot.modalOpen,
    route: snapshot.modalRoute as ModalRoute,
    setOpen,
    setRoute,
    open,
    close,
    openWallets,
    openProfile,
    openAccountSettings,
    openNetworkSettings,
    openSettings,
    openAbout,
  }
}
