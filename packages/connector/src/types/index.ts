import type { ReactNode } from 'react'

/**
 * Configuration options for the connector kit, inspired by ConnectKit's comprehensive options
 */
export interface ConnectorOptions {
  /** Hide tooltips throughout the UI */
  hideTooltips?: boolean
  
  /** Reduce motion and animations for accessibility */
  reduceMotion?: boolean
  
  /** Automatically close modal when wallet connects successfully */
  autoCloseOnConnect?: boolean
  
  /** Display a disclaimer message in the modal */
  disclaimer?: ReactNode | string
  
  /** Background blur amount when modal is open (in pixels) */
  overlayBlur?: number
  
  /** Show QR codes for wallet connection when available */
  showQRCode?: boolean
  
  /** Number of characters to show when truncating addresses (default: 4) */
  truncateAddress?: number
  
  /** Hide wallet icons in the connection list */
  hideWalletIcons?: boolean
  
  /** Custom wallet connection CTA style */
  walletCTA?: 'modal' | 'direct' | 'both'
  
  /** Avoid layout shift by adding padding when modal opens */
  avoidLayoutShift?: boolean
  
  /** Hide the "Not installed" badge on wallets */
  hideNotInstalledBadge?: boolean
  
  /** Custom onboarding URL for users without wallets */
  walletOnboardingUrl?: string
  
  /** Disable automatic route switching after connection */
  disableAutoRoute?: boolean
  
  /** Debug mode for additional console logging */
  debugMode?: boolean
}

/**
 * Mobile-specific configuration options
 */
export interface MobileConnectorOptions {
  /** Enable mobile wallet adapter features */
  enabled?: boolean
  
  /** Cluster to use for mobile connections */
  cluster?: string
  
  /** App identity for mobile wallet adapter */
  appIdentity?: {
    name: string
    uri?: string
    icon?: string
  }
}

