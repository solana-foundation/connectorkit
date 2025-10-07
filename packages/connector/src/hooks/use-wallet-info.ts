/**
 * @connector-kit/connector - useWalletInfo hook
 * 
 * React hook for getting information about the connected wallet
 */

'use client'

import { useMemo } from 'react'
import { useConnector } from '../ui/connector-provider'

export interface UseWalletInfoReturn {
  /** Name of the connected wallet (e.g., 'Phantom', 'Solflare') */
  name: string | null
  /** Wallet icon/logo URL if available */
  icon: string | null
  /** Whether the wallet extension is installed */
  installed: boolean
  /** Whether the wallet supports Solana connections */
  connectable: boolean
  /** Whether currently connected to the wallet */
  connected: boolean
  /** Whether a connection attempt is in progress */
  connecting: boolean
  /** All available wallets */
  wallets: Array<{
    name: string
    icon?: string
    installed: boolean
    connectable?: boolean
  }>
}

/**
 * Hook for getting information about the connected wallet
 * Provides wallet metadata, connection status, and capabilities
 * 
 * @example
 * ```tsx
 * function WalletBadge() {
 *   const { name, icon, connected, connecting } = useWalletInfo()
 *   
 *   if (connecting) return <p>Connecting...</p>
 *   if (!connected) return <p>No wallet connected</p>
 *   
 *   return (
 *     <div>
 *       {icon && <img src={icon} alt={name} />}
 *       <span>{name}</span>
 *     </div>
 *   )
 * }
 * ```
 */
export function useWalletInfo(): UseWalletInfoReturn {
  const { selectedWallet, wallets, connected, connecting } = useConnector()
  
  // Optimized: Only recreate when wallets array actually changes
  // Map wallets once to avoid duplication and provide stable reference
  const mappedWallets = useMemo(
    () => wallets.map(w => ({
      name: w.wallet.name,
      icon: w.wallet.icon,
      installed: w.installed,
      connectable: w.connectable,
    })),
    [wallets]
  )
  
  // Optimized: Compute wallet info only when selectedWallet changes
  // Avoid recomputing on every connecting/connected state change
  const walletInfo = useMemo(() => {
    if (!selectedWallet) {
      return {
        name: null,
        icon: null,
        installed: false,
        connectable: false,
      }
    }
    
    const info = wallets.find(w => w.wallet.name === selectedWallet.name)
    
    return {
      name: selectedWallet.name,
      icon: selectedWallet.icon ?? null,
      installed: info?.installed ?? false,
      connectable: info?.connectable ?? false,
    }
  }, [selectedWallet, wallets])
  
  // Return stable object with minimal dependencies
  return useMemo(() => ({
    ...walletInfo,
    connected,
    connecting,
    wallets: mappedWallets,
  }), [walletInfo, connected, connecting, mappedWallets])
}

