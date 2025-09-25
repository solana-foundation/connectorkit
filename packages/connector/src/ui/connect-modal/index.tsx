"use client"

import React, { useEffect, useMemo, useCallback, useId, useState } from 'react'
import { useModal } from '../../hooks'
import { useConnector } from '../connector-provider'
import { 
  Dialog, 
  DialogContent, 
  DialogBackdrop, 
  DialogClose
} from '../../primitives'
import { modalRoutes } from '../../lib/connector-client'
import type { ConnectorOptions } from '../../types'

// Import all pages
import { WalletsPage } from '../../pages/wallets'

// Temporary simplified pages for testing
const ProfilePage = ({ options, onNavigate }: any) => {
  return (
    <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f0f9ff', border: '2px solid #3b82f6' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1e40af' }}>🎉 Profile Page Working!</h3>
      <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
        This is the profile page with wallet information.
      </p>
      <button 
        onClick={() => onNavigate?.('wallets')}
        style={{
          padding: '8px 16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        Back to Wallets
      </button>
    </div>
  )
}

const SettingsPage = ({ options, onNavigate }: any) => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Settings Page</h3>
    <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
      This is the settings page with preferences and configuration.
    </p>
    <button 
      onClick={() => onNavigate?.('wallets')}
      style={{
        padding: '8px 16px',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
      }}
    >
      Back to Wallets
    </button>
  </div>
)

const AboutPage = ({ options, onNavigate }: any) => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>About ConnectorKit</h3>
    <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
      Next-generation Solana wallet connection library built with React 19.
    </p>
    <button 
      onClick={() => onNavigate?.('wallets')}
      style={{
        padding: '8px 16px',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
      }}
    >
      Back to Wallets
    </button>
  </div>
)

interface ConnectModalProps {
  options?: Partial<ConnectorOptions>
  className?: string
  style?: React.CSSProperties
  'data-testid'?: string
}

export function ConnectModal({ 
  options = {}, 
  className,
  style,
  'data-testid': testId 
}: ConnectModalProps) {
  const modal = useModal()
  const { connected } = useConnector()
  const modalId = useId()
  const titleId = useId()
  
  // State for help mode in wallets page
  const [helpMode, setHelpMode] = useState(false)

  const handleClose = useCallback(() => {
    modal.close()
  }, [modal])

  const handleNavigate = useCallback((route: string) => {
    // Navigate to different pages within the modal
    switch (route) {
      case modalRoutes.PROFILE:
        modal.openProfile()
        break
      case modalRoutes.SETTINGS:
        modal.setRoute(modalRoutes.SETTINGS)
        break
      case modalRoutes.ABOUT:
        modal.setRoute(modalRoutes.ABOUT)
        break
      case modalRoutes.WALLETS:
        modal.openWallets()
        break
      default:
        modal.openWallets()
    }
  }, [modal])

  // Enhanced modal styles with responsive design
  const modalStyles = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
    
    return {
      backgroundColor: '#ffffff',
      borderRadius: isMobile ? 16 : 20,
      border: '1px solid rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
      width: isMobile ? 'calc(100vw - 24px)' : 380,
      maxWidth: isMobile ? 'calc(100vw - 24px)' : '90vw',
      maxHeight: isMobile ? 'calc(100vh - 32px)' : 'calc(100vh - 64px)',
      boxShadow: isMobile 
        ? '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      // Mobile-first responsive positioning
      ...(isMobile ? {
        position: 'fixed' as const,
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        top: 'auto'
      } : {}),
      ...style
    }
  }, [style])

  // Handle escape key for better accessibility
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modal.isOpen) {
        event.preventDefault()
        handleClose()
      }
    }

    if (modal.isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [modal.isOpen, handleClose])

  // Determine which page to render based on current route
  const renderCurrentPage = () => {
    switch (modal.route) {
      case modalRoutes.PROFILE:
        return (
          <ProfilePage 
            options={options} 
            onNavigate={handleNavigate}
          />
        )
      case modalRoutes.SETTINGS:
        return (
          <SettingsPage 
            options={options} 
            onNavigate={handleNavigate}
          />
        )
      case modalRoutes.ABOUT:
        return (
          <AboutPage 
            options={options} 
            onNavigate={handleNavigate}
          />
        )
      case modalRoutes.WALLETS:
      default:
        return (
          <WalletsPage 
            options={options}
            onConnectError={(error: string) => {
              // Handle wallet connection error
            }}
            helpMode={helpMode}
            onHelpModeChange={setHelpMode}
          />
        )
    }
  }

  // Get page title for accessibility
  const getPageTitle = () => {
    switch (modal.route) {
      case modalRoutes.PROFILE:
        return 'Wallet Profile'
      case modalRoutes.SETTINGS:
        return 'Wallet Settings'
      case modalRoutes.ABOUT:
        return 'About ConnectorKit'
      case modalRoutes.WALLETS:
      default:
        return helpMode ? 'How to connect a wallet' : 'Connect Your Wallet'
    }
  }

  // Show back button for non-wallet pages or when in help mode
  const showBackButton = (modal.route !== modalRoutes.WALLETS && connected) || helpMode

  const isOpen = modal.isOpen

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open: boolean) => !open && handleClose()}
    >
        <DialogBackdrop 
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: isOpen && !options.reduceMotion ? 'fadeIn 0.2s ease-out' : 'none'
          }}
        />
        <DialogContent 
          className={className}
          style={modalStyles}
          data-testid={testId}
          aria-labelledby={titleId}
          aria-describedby={`${modalId}-description`}
        >
          {/* Modal Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            position: 'relative'
          }}>
            {/* Left Button - Back or Help */}
            {showBackButton ? (
              <button 
                onClick={() => {
                  if (helpMode) {
                    setHelpMode(false)
                  } else {
                    handleNavigate(modalRoutes.WALLETS)
                  }
                }}
                aria-label={helpMode ? "Go back to wallet list" : "Go back to wallet selection"} 
                type="button" 
                style={{ 
                  background: 'rgba(107, 114, 128, 0.1)', 
                  border: '1px solid transparent', 
                  width: 36, 
                  height: 36, 
                  borderRadius: 18, 
                  color: '#6b7280', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: 16,
                  transition: options.reduceMotion ? 'none' : 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!options.reduceMotion) {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.2)'
                    e.currentTarget.style.color = '#374151'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)'
                  e.currentTarget.style.color = '#6b7280'
                }}
              >
                {/* Chevron Back SVG */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : modal.route === modalRoutes.WALLETS ? (
              <button 
                aria-label="Help" 
                type="button" 
                onClick={() => setHelpMode(!helpMode)} 
                style={{ 
                  background: 'rgba(107, 114, 128, 0.1)', 
                  border: '1px solid transparent', 
                  width: 36, 
                  height: 36, 
                  borderRadius: 18, 
                  color: '#6b7280', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: 16,
                  transition: options.reduceMotion ? 'none' : 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!options.reduceMotion) {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.2)'
                    e.currentTarget.style.color = '#374151'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)'
                  e.currentTarget.style.color = '#6b7280'
                }}
              >
                ?
              </button>
            ) : (
              <div style={{ width: 36 }} /> // Spacer for other pages
            )}
            
            {/* Centered Title */}
            <h2 
              id={titleId}
              style={{ 
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                textAlign: 'center',
                flex: 1,
              }}
            >
              {getPageTitle()}
            </h2>
            
            {/* Close Button */}
            <DialogClose asChild>
              <button 
                aria-label="Close modal" 
                type="button" 
                style={{ 
                  background: 'rgba(107, 114, 128, 0.1)', 
                  border: '1px solid transparent', 
                  width: 36, 
                  height: 36, 
                  borderRadius: 18, 
                  color: '#6b7280', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: 20,
                  transition: options.reduceMotion ? 'none' : 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!options.reduceMotion) {
                    e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.2)'
                    e.currentTarget.style.color = '#374151'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)'
                  e.currentTarget.style.color = '#6b7280'
                }}
              >
                ×
              </button>
            </DialogClose>
          </div>
          
          {/* Modal Content */}
          <div 
            style={{ 
              padding: typeof window !== 'undefined' && window.innerWidth < 640 ? 20 : 24, 
              position: 'relative',
              minHeight: typeof window !== 'undefined' && window.innerWidth < 640 ? 180 : 200
            }}
          >
            {/* Hidden description for screen readers */}
            <div 
              id={`${modalId}-description`}
              style={{ 
                position: 'absolute',
                left: '-10000px',
                width: '1px',
                height: '1px',
                overflow: 'hidden'
              }}
            >
              {modal.route === modalRoutes.WALLETS 
                ? 'Choose from available Solana wallets to connect to this application'
                : `Navigate through wallet ${modal.route} options`
              }
            </div>
            
            {/* Page Content */}
            {renderCurrentPage()}
          </div>
        </DialogContent>
    </Dialog>
  )
}
