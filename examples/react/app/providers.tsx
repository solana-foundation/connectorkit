"use client"

import { useMemo } from 'react'
import { 
  AppProvider, 
  getDefaultConfig, 
  getDefaultMobileConfig
} from '@connector-kit/connector/react'
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
    </AppProvider>
  )
}
