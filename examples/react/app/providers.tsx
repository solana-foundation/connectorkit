"use client"

import { useMemo } from 'react'
import { AppProvider, ConnectorDebugPanel } from '@connector-kit/connector/react'
import { getDefaultConfig, getDefaultMobileConfig } from '@connector-kit/connector/headless'
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  const connectorConfig = useMemo(() => getDefaultConfig({
    appName: 'ConnectorKit Example', 
    appUrl: 'http://localhost:3000',
    autoConnect: true,
    enableMobile: true,
  }), [])

  const mobile = useMemo(() => getDefaultMobileConfig({
    appName: 'ConnectorKit Example',
    appUrl: 'http://localhost:3000',
  }), [])

  return (
    <AppProvider connectorConfig={connectorConfig} mobile={mobile}>
      {children}
      {/* Debug panel - only visible in development */}
      {process.env.NODE_ENV === 'development' && <ConnectorDebugPanel />}
    </AppProvider>
  )
}
