'use client'

import type { ReactNode, ComponentType } from 'react'
import { ConnectorProvider } from './connector-provider'
import type { MobileWalletAdapterConfig } from './connector-provider'
import type { ConnectorConfig } from '../lib/connector-client'

export interface UnifiedProviderProps {
  children: ReactNode
  connectorConfig?: ConnectorConfig
  mobile?: MobileWalletAdapterConfig
  // Optional additional providers to wrap around children
  providers?: Array<{
    component: ComponentType<any>
    props?: any
  }>
}

export function UnifiedProvider({
  children,
  connectorConfig,
  mobile,
  providers = [],
}: UnifiedProviderProps) {
  // Start with connector provider as the base
  let content = (
    <ConnectorProvider config={connectorConfig} mobile={mobile}>
      {children}
    </ConnectorProvider>
  )
  
  // Wrap with additional providers in reverse order
  // so they nest properly (first provider is outermost)
  for (let i = providers.length - 1; i >= 0; i--) {
    const { component: Provider, props = {} } = providers[i]
    content = <Provider {...props}>{content}</Provider>
  }
  
  return content
}

// Export with practical names
export { UnifiedProvider as AppProvider }
export { UnifiedProvider as WalletProvider }
