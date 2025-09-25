"use client"

import React, { 
  memo, 
  useEffect, 
  useMemo, 
  useState, 
  useTransition,
  useDeferredValue,
  useCallback,
  startTransition,
  useSyncExternalStore,
  useId
} from 'react'
import { useConnector } from './connector-provider'
import { useModal } from '../hooks'
import {
  DropdownRoot,
  DropdownTrigger,
  DropdownContent,
  DropdownItem
} from '../primitives'
import { ConnectModal } from './connect-modal'
import { modalRoutes } from '../lib/connector-client'

import {
  type ConnectorTheme,
  type LegacyConnectorTheme as LegacyThemeInterface,
  legacyToModernTheme,
  getButtonHeight,
  getButtonShadow,
  getButtonBorder,
  getBorderRadius,
  getAccessibleTextColor,
  minimalTheme
} from '../themes'
import type { ConnectorOptions } from '../types'
import { Spinner } from './spinner'

export interface ConnectButtonProps {
  className?: string
  style?: React.CSSProperties
  variant?: 'default' | 'icon-only' | 'minimal' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  theme?: ConnectorTheme | Partial<ConnectorTheme> | Partial<LegacyThemeInterface>
  label?: string
  options?: Partial<ConnectorOptions>
  disabled?: boolean
  loading?: boolean
  'aria-label'?: string
  'data-testid'?: string
}

export const ConnectButton = memo<ConnectButtonProps>(({ 
  className, 
  style, 
  variant = 'default', 
  size = 'md',
  theme = {}, 
  label, 
  options = {},
  disabled = false,
  loading = false,
  'aria-label': ariaLabel,
  'data-testid': testId
}) => {
  const buttonId = useId()
  const dropdownId = useId()
  
  const [isPending, startConnectTransition] = useTransition()
  const isLoading = loading || isPending
  
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const stableOptions = useMemo(() => options, [
    options.autoCloseOnConnect,
    options.truncateAddress,
    options.reduceMotion,
    options.hideTooltips,
    options.showQRCode,
    options.hideWalletIcons,
    options.walletCTA,
    options.avoidLayoutShift,
    options.hideNotInstalledBadge,
    options.walletOnboardingUrl,
    options.disableAutoRoute,
    options.debugMode,
    options.disclaimer,
    options.overlayBlur
  ])

  const normalizedTheme = useMemo(() => {
    if (!theme || Object.keys(theme).length === 0) {
      return minimalTheme
    }
    
    if ('primaryColor' in theme || 'secondaryColor' in theme || 'fontFamily' in theme) {
      const legacyTheme = {
        primaryColor: '#111827',
        secondaryColor: '#374151',
        borderRadius: 8,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        buttonShadow: 'md' as const,
        border: '1px solid #e5e7eb',
        height: 44,
        ...theme
      } as LegacyThemeInterface
      return legacyToModernTheme(legacyTheme)
    }
    
    if ('colors' in theme && 'fonts' in theme) {
      return theme as ConnectorTheme
    }
    
    return {
      ...minimalTheme,
      ...theme,
      colors: { ...minimalTheme.colors, ...((theme as any).colors || {}) },
      fonts: { ...minimalTheme.fonts, ...((theme as any).fonts || {}) },
      borderRadius: { ...minimalTheme.borderRadius, ...((theme as any).borderRadius || {}) },
      shadows: { ...minimalTheme.shadows, ...((theme as any).shadows || {}) },
      spacing: { ...minimalTheme.spacing, ...((theme as any).spacing || {}) },
      button: { ...minimalTheme.button, ...((theme as any).button || {}) },
    } as ConnectorTheme
  }, [theme])
  
  const t = normalizedTheme
  const connectorState = useConnector()
  const { wallets, connected, disconnect, selectedAccount, accounts, selectAccount, selectedWallet } = connectorState
  
  const deferredConnected = useDeferredValue(connected)
  const deferredSelectedAccount = useDeferredValue(selectedAccount)
  
  const modal = useModal()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleAutoClose = useCallback(() => {
    // Temporarily disabled to test navigation
    // if (deferredConnected && stableOptions.autoCloseOnConnect !== false) {
    //   startTransition(() => {
    //     modal.close()
    //   })
    // }
  }, [deferredConnected, stableOptions.autoCloseOnConnect, modal.close])
  
  useEffect(() => {
    handleAutoClose()
  }, [handleAutoClose])

  const selectedDisplay = useMemo(() => {
    if (!deferredSelectedAccount) return null
    const truncateLength = stableOptions.truncateAddress ?? 4
    return `${String(deferredSelectedAccount).slice(0, truncateLength)}...${String(deferredSelectedAccount).slice(-truncateLength)}`
  }, [deferredSelectedAccount, stableOptions.truncateAddress])

  const isIconOnly = variant === 'icon-only'
  const isMinimal = variant === 'minimal'
  const isOutline = variant === 'outline'

  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  // Size configurations
  const sizeConfig = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
    const configs = {
      sm: { 
        height: isMobile ? 40 : 36, 
        padding: isIconOnly ? (isMobile ? '0.625rem' : '0.5rem') : (isMobile ? '0.625rem 1.25rem' : '0.5rem 1rem'), 
        fontSize: isMobile ? '0.9375rem' : '0.875rem', 
        iconSize: isMobile ? 18 : 16 
      },
      md: { 
        height: isMobile ? 48 : 44, 
        padding: isIconOnly ? (isMobile ? '0.875rem' : '0.75rem') : (isMobile ? '0.875rem 1.75rem' : '0.75rem 1.5rem'), 
        fontSize: isMobile ? '1.0625rem' : '1rem', 
        iconSize: isMobile ? 20 : 18 
      },
      lg: { 
        height: isMobile ? 56 : 52, 
        padding: isIconOnly ? (isMobile ? '1.125rem' : '1rem') : (isMobile ? '1.125rem 2.25rem' : '1rem 2rem'), 
        fontSize: isMobile ? '1.1875rem' : '1.125rem', 
        iconSize: isMobile ? 22 : 20 
      }
    }
    return configs[size]
  }, [size, isIconOnly])

  const buttonStyles: React.CSSProperties = useMemo(() => {
    const baseStyles: React.CSSProperties = {
      padding: sizeConfig.padding,
      height: sizeConfig.height,
      fontSize: sizeConfig.fontSize,
      fontWeight: 600,
      cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: isIconOnly ? 0 : '0.5rem',
      borderRadius: getBorderRadius(t),
      fontFamily: t.fonts.body,
      minWidth: isIconOnly ? sizeConfig.height : 'auto',
      aspectRatio: isIconOnly ? '1' : 'auto',
      outlineOffset: 2,
      outline: isFocused ? `2px solid ${t.colors.primary}40` : 'none',
      opacity: disabled ? 0.6 : isLoading ? 0.8 : 1,
      position: 'relative',
      overflow: 'hidden',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
    }

    // Variant-specific styles
    if (isMinimal) {
      return {
        ...baseStyles,
        backgroundColor: 'transparent',
        color: t.colors.primary,
        border: 'none',
        boxShadow: 'none',
        transform: isPressed && !stableOptions.reduceMotion ? 'scale(0.95)' : 'scale(1)',
        transition: stableOptions.reduceMotion ? 'none' : 'all 0.15s ease',
        ...style,
      }
    }

    if (isOutline) {
      return {
        ...baseStyles,
        backgroundColor: isHovered ? `${t.colors.primary}10` : 'transparent',
        color: t.colors.primary,
        border: `2px solid ${t.colors.primary}`,
        boxShadow: isFocused ? `0 0 0 2px ${t.colors.primary}40` : 'none',
        transform: isPressed && !stableOptions.reduceMotion ? 'scale(0.97)' : 'scale(1)',
        transition: stableOptions.reduceMotion ? 'none' : 'all 0.2s ease',
        ...style,
      }
    }

    return {
      ...baseStyles,
      backgroundColor: isHovered ? t.colors.secondary : t.colors.primary,
      color: getAccessibleTextColor(isHovered ? t.colors.secondary : t.colors.primary),
      border: getButtonBorder(t),
      boxShadow: isHovered
        ? `${getButtonShadow(t)}, 0 0 0 4px ${t.colors.primary}20`
        : getButtonShadow(t),
      transform: isPressed && !stableOptions.reduceMotion ? 'scale(0.97)' : 'scale(1)',
      transition: stableOptions.reduceMotion ? 'none' : 'all 0.2s ease',
      ...style,
    }
  }, [isIconOnly, isMinimal, isOutline, isHovered, isPressed, isFocused, t, style, stableOptions.reduceMotion, sizeConfig, disabled, isLoading])

  // Removed connectableWallets and unconnectableWallets - now handled in WalletsPage

  const selectedAccountInfo = useMemo(() => {
    if (!selectedAccount) return null
    return (accounts ?? []).find((a: any) => a.address === selectedAccount) ?? null
  }, [accounts, selectedAccount])

  const walletMap = useMemo(() => {
    const map = new Map()
    wallets?.forEach(w => map.set(w.wallet, w.icon))
    return map
  }, [wallets])

  const selectedWalletIcon = useMemo(() => {
    // Early return for most common case
    if (selectedAccountInfo?.icon) return selectedAccountInfo.icon
    if (!selectedWallet) return null
    
    return walletMap.get(selectedWallet) ?? null
  }, [selectedAccountInfo, selectedWallet, walletMap])

  const LoadingSpinner = useMemo(() => (
    <div
      style={{
        width: sizeConfig.iconSize,
        height: sizeConfig.iconSize,
        border: `2px solid transparent`,
        borderTop: `2px solid currentColor`,
        borderRight: `2px solid currentColor`,
        borderRadius: '50%',
        animation: stableOptions.reduceMotion ? 'none' : 'spin 0.8s linear infinite',
        opacity: 0.8
      }}
      aria-hidden
      role="status"
      aria-label="Loading"
    />
  ), [sizeConfig.iconSize, stableOptions.reduceMotion])

  const walletIcon = useMemo(() => (
    <svg 
      width={sizeConfig.iconSize} 
      height={Math.floor(sizeConfig.iconSize * 0.8)} 
      viewBox="0 0 21 16" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      aria-hidden
    >
      <path d="M3.98967 11.7879C4.10222 11.6755 4.25481 11.6123 4.41392 11.6123H19.0941C19.3615 11.6123 19.4954 11.9357 19.3062 12.1247L16.4054 15.0232C16.2929 15.1356 16.1403 15.1988 15.9812 15.1988H1.30102C1.03359 15.1988 0.899716 14.8754 1.08889 14.6864L3.98967 11.7879Z" fill="currentColor"/>
      <path d="M3.98937 0.959506C4.10191 0.847047 4.25451 0.783875 4.41361 0.783875H19.0938C19.3612 0.783875 19.4951 1.10726 19.3059 1.29628L16.4051 4.19475C16.2926 4.30721 16.14 4.37038 15.9809 4.37038H1.30071C1.03329 4.37038 0.899411 4.047 1.08859 3.85797L3.98937 0.959506Z" fill="currentColor"/>
      <path d="M16.4054 6.33924C16.2929 6.22675 16.1403 6.16362 15.9812 6.16362H1.30102C1.03359 6.16362 0.899717 6.48697 1.08889 6.676L3.98967 9.57445C4.10222 9.68694 4.25481 9.75012 4.41392 9.75012H19.0941C19.3615 9.75012 19.4954 9.42673 19.3062 9.23769L16.4054 6.33924Z" fill="currentColor"/>
    </svg>
  ), [sizeConfig.iconSize])

  if (!isMounted) {
    return (
      <button
        className={className}
        style={{
          padding: sizeConfig.padding,
          height: sizeConfig.height,
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          fontSize: sizeConfig.fontSize,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isIconOnly ? 0 : '0.5rem',
          minWidth: isIconOnly ? sizeConfig.height : 'auto',
          aspectRatio: isIconOnly ? '1' : 'auto',
          ...style,
        }}
        disabled
        aria-label={ariaLabel || (isIconOnly ? (label || 'Connect Wallet') : undefined)}
        data-testid={testId}
      >
        {isIconOnly ? null : (label || 'Connect Wallet')}
      </button>
    )
  }

  // getUnconnectableReason function moved to WalletsPage

  if (connected) {
    return (
      <DropdownRoot open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownTrigger asChild>
            <button
              id={buttonId}
              className={className}
              style={buttonStyles}
              onMouseEnter={() => !disabled && !isLoading && setIsHovered(true)}
              onMouseLeave={() => { setIsHovered(false); setIsPressed(false); setIsFocused(false) }}
              onMouseDown={() => !disabled && !isLoading && setIsPressed(true)}
              onMouseUp={() => setIsPressed(false)}
              onFocus={() => !disabled && !isLoading && setIsFocused(true)}
              onBlur={() => { setIsFocused(false); setIsHovered(false) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIsPressed(true)
                }
              }}
              onKeyUp={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setIsPressed(false)
                }
              }}
              type="button"
              disabled={disabled || isLoading}
              aria-label={ariaLabel || (isIconOnly ? (selectedDisplay || label || 'Wallet') : undefined)}
              aria-describedby={dropdownOpen ? dropdownId : undefined}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
              data-testid={testId}
            >
            {selectedWalletIcon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={selectedWalletIcon} 
                alt="" 
                width={sizeConfig.iconSize} 
                height={sizeConfig.iconSize} 
                style={{ borderRadius: sizeConfig.iconSize / 2 }} 
              />
            ) : (
              isLoading ? LoadingSpinner : walletIcon
            )}
            {!isIconOnly && (
              <span style={{ 
                opacity: isLoading ? 0.8 : 1,
                transition: stableOptions.reduceMotion ? 'none' : 'opacity 0.2s ease'
              }}>
                {isLoading ? 'Connecting...' : (selectedDisplay || label || 'Wallet')}
              </span>
            )}
          </button>
        </DropdownTrigger>
        <DropdownContent align="end" className="connector-account-dropdown">
          <div
            role="menu"
            aria-labelledby={buttonId}
          >
            <div className="connector-account-dropdown__label">Account</div>
            <div className="connector-account-dropdown__address">{selectedDisplay}</div>
            {(accounts ?? []).length > 1 ? (
              <div className="connector-account-dropdown__accounts-section">
                <div className="connector-account-dropdown__label">Accounts</div>
                <div className="connector-account-dropdown__accounts-list">
                  {(accounts ?? []).map((acc: any) => (
                    <button
                      key={acc.address}
                      onClick={() => selectAccount(acc.address)}
                      className={`connector-account-dropdown__account-item ${
                        acc.address === selectedAccount ? 'connector-account-dropdown__account-item--selected' : ''
                      }`}
                    >
                      <span className="connector-account-dropdown__account-content">
                        {acc.icon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={acc.icon} 
                            alt="" 
                            className="connector-account-dropdown__account-icon"
                          />
                        ) : null}
                        <span className="connector-account-dropdown__account-address">
                          {String(acc.address).slice(0, 8)}...{String(acc.address).slice(-4)}
                        </span>
                      </span>
                      <span 
                        className="connector-account-dropdown__account-indicator" 
                        aria-hidden
                      >
                        {acc.address === selectedAccount ? '●' : '○'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedWallet?.name && (
              <DropdownItem onSelect={() => modal.openWallets()} className="">
                <div className="connector-account-dropdown__nav-item">
                  <span className="connector-account-dropdown__nav-icon">🔗</span>
                  <span className="connector-account-dropdown__nav-text">Connect More</span>
                </div>
              </DropdownItem>
            )}
            
            {/* Navigation Options */}
            <DropdownItem onSelect={() => {
              setDropdownOpen(false) // Close dropdown first
              setTimeout(() => {
                modal.open(modalRoutes.PROFILE)
              }, 100) // Small delay to ensure dropdown closes
            }} className="">
              <div className="connector-account-dropdown__nav-item">
                <span className="connector-account-dropdown__nav-icon">👤</span>
                <span className="connector-account-dropdown__nav-text">Profile</span>
              </div>
            </DropdownItem>
            
            <DropdownItem onSelect={() => {
              setDropdownOpen(false) // Close dropdown first
              setTimeout(() => {
                modal.open(modalRoutes.SETTINGS)
              }, 100) // Small delay to ensure dropdown closes
            }} className="">
              <div className="connector-account-dropdown__nav-item">
                <span className="connector-account-dropdown__nav-icon">⚙️</span>
                <span className="connector-account-dropdown__nav-text">Settings</span>
              </div>
            </DropdownItem>
            
            <DropdownItem onSelect={() => {
              setDropdownOpen(false) // Close dropdown first
              setTimeout(() => {
                modal.open(modalRoutes.ABOUT)
              }, 100) // Small delay to ensure dropdown closes
            }} className="">
              <div className="connector-account-dropdown__nav-item">
                <span className="connector-account-dropdown__nav-icon">ℹ️</span>
                <span className="connector-account-dropdown__nav-text">About</span>
              </div>
            </DropdownItem>
            
            {/* Separator before disconnect */}
            <hr className="connector-account-dropdown__separator" />
            
            <DropdownItem onSelect={async () => { 
                try {
                    modal.close();
                    await disconnect()
                } catch (error) {
                    // Reset state to ensure clean disconnection flow
                    modal.close();
                    // Failed to disconnect wallet
                }
            }} className="">
              <div className="connector-account-dropdown__nav-item connector-account-dropdown__nav-item--danger">
                <span className="connector-account-dropdown__nav-icon">⏏️</span>
                <span className="connector-account-dropdown__nav-text">Disconnect</span>
              </div>
            </DropdownItem>
          </div>
        </DropdownContent>
      </DropdownRoot>
    )
  }

  return (
    <>
        <button
        id={buttonId}
        className={className}
        style={buttonStyles}
        onClick={() => {
          if (disabled || isLoading) return
          // React 19: Use transition for smooth UX
          startConnectTransition(() => {
            modal.openWallets()
          })
        }}
        onMouseEnter={() => !disabled && !isLoading && setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setIsPressed(false); setIsFocused(false) }}
        onMouseDown={() => !disabled && !isLoading && setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onFocus={() => !disabled && !isLoading && setIsFocused(true)}
        onBlur={() => { setIsFocused(false); setIsHovered(false) }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isLoading) {
            e.preventDefault()
            setIsPressed(true)
            startConnectTransition(() => {
              modal.openWallets()
            })
          }
        }}
        onKeyUp={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsPressed(false)
          }
        }}
        type="button"
        disabled={disabled || isLoading}
        aria-label={ariaLabel || (isIconOnly ? (label || 'Connect Wallet') : undefined)}
        data-testid={testId}
      >
        {isLoading ? LoadingSpinner : walletIcon}
        {!isIconOnly && (
          <span style={{ 
            opacity: isLoading ? 0.8 : 1,
            transition: stableOptions.reduceMotion ? 'none' : 'opacity 0.2s ease'
          }}>
            {isLoading ? 'Connecting...' : (label || 'Connect Wallet')}
          </span>
        )}
      </button>
      
      <ConnectModal options={stableOptions} />
    </>
  )
})

ConnectButton.displayName = 'ConnectButton'


