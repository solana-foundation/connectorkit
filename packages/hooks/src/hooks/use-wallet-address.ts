'use client'

import { useMemo } from 'react'
import { useArcClient } from '../core/arc-client-provider'
import { address as parseAddress, type Address } from '@solana/kit'

export interface UseWalletAddressReturn {
  address: string | null
  addressParsed: Address | null
  connected: boolean
  connecting: boolean
}

export function useWalletAddress(): UseWalletAddressReturn {
  const { wallet } = useArcClient()

  const addressString = wallet.address ?? null
  const addressParsed = useMemo(() => {
    if (!addressString) return null
    try {
      return parseAddress(addressString)
    } catch {
      return null
    }
  }, [addressString])

  return {
    address: addressString,
    addressParsed,
    connected: wallet.connected,
    connecting: wallet.connecting,
  }
}


