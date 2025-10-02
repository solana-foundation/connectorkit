/**
 * @connector-kit/connector - useAccount hook
 * 
 * React hook for working with the connected wallet account
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import { useConnector } from '../ui/connector-provider'
import { copyAddressToClipboard, formatAddress } from '../utils'
import type { AccountInfo } from '../lib/connector-client'

export interface UseAccountReturn {
  /** The connected wallet address */
  address: string | null
  /** Full account info object */
  account: AccountInfo | null
  /** Whether a wallet is connected */
  connected: boolean
  /** Shortened formatted address for display */
  formatted: string
  /** Copy the address to clipboard */
  copy: () => Promise<boolean>
  /** Whether the address was recently copied */
  copied: boolean
  /** All available accounts from the connected wallet */
  accounts: AccountInfo[]
  /** Select a different account from the connected wallet */
  selectAccount: (address: string) => Promise<void>
}

/**
 * Hook for working with the connected wallet account
 * Provides formatted address, clipboard copying, and account selection
 * 
 * @example
 * ```tsx
 * function AccountDisplay() {
 *   const { address, formatted, copy, copied, connected } = useAccount()
 *   
 *   if (!connected) return <p>Not connected</p>
 *   
 *   return (
 *     <button onClick={copy}>
 *       {formatted} {copied && '✓'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useAccount(): UseAccountReturn {
  const { selectedAccount, accounts, connected, selectAccount } = useConnector()
  const [copied, setCopied] = useState(false)
  
  // Find the full account object for the selected address
  const account = useMemo(
    () => accounts.find(a => a.address === selectedAccount) ?? null,
    [accounts, selectedAccount]
  )
  
  // Format the address for display
  const formatted = useMemo(
    () => selectedAccount ? formatAddress(selectedAccount) : '',
    [selectedAccount]
  )
  
  // Copy address to clipboard with feedback
  const copy = useCallback(async () => {
    if (!selectedAccount) return false
    
    const success = await copyAddressToClipboard(selectedAccount)
    if (success) {
      setCopied(true)
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    }
    return success
  }, [selectedAccount])
  
  return useMemo(() => ({
    address: selectedAccount,
    account,
    connected,
    formatted,
    copy,
    copied,
    accounts,
    selectAccount,
  }), [selectedAccount, account, connected, formatted, copy, copied, accounts, selectAccount])
}

