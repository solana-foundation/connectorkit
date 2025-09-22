import React from 'react'
import { WalletUiClusterDropdown } from '@wallet-ui/react'
import { useEnhancedCluster } from '@connectorkit/sdk'

export function EnhancedClusterSwitcher() {
  const { canSwitch } = useEnhancedCluster()
  
  // Only render if multiple clusters available
  if (!canSwitch) return null
  
  return <WalletUiClusterDropdown />
}

export default EnhancedClusterSwitcher
