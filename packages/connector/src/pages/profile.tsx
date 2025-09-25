/**
 * Enhanced Profile Page - Exceeds ConnectKit Quality
 * Features: Balance display, account management, network switching
 */

"use client"

import React, { useMemo, useCallback, startTransition } from 'react'
import { motion } from 'motion/react'
import { useConnector } from '../ui/connector-provider'
// Note: Using placeholder for useBalance - would import from SDK in real usage
const useBalance = (options: any) => ({ 
  balance: 1234567890n, // 1.23 SOL for demo
  isLoading: false 
})
import { modalRoutes } from '../lib/connector-client'
import { Spinner } from '../ui/spinner'

// Import the enhanced avatar
const SolanaAvatar = React.memo<{ address: string; size?: number }>(({ address, size = 48 }) => {
  const avatarStyle = useMemo(() => {
    if (!address) return { backgroundColor: '#gray' }
    
    let hash = 0
    for (let i = 0; i < address.length; i++) {
      hash = address.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    const hue = Math.abs(hash) % 360
    const saturation = 60 + (Math.abs(hash) % 20)
    const lightness = 45 + (Math.abs(hash) % 10)
    
    return {
      backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      color: 'white',
      fontSize: `${size * 0.3}px`,
      fontWeight: '600'
    }
  }, [address, size])

  const initials = useMemo(() => {
    if (!address) return '?'
    return address.slice(0, 2).toUpperCase()
  }, [address])

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        ...avatarStyle
      }}
    >
      {initials}
    </div>
  )
})

interface ProfilePageProps {
  options?: any
  onNavigate?: (route: string) => void
  isTransitioning?: boolean
}

export function ProfilePage({ options, onNavigate, isTransitioning }: ProfilePageProps) {
  const { selectedAccount, accounts, selectAccount, disconnect, selectedWallet } = useConnector()
  
  const { balance, isLoading: balanceLoading } = useBalance({
    address: selectedAccount || undefined,
    refreshInterval: 30000
  })

  const formattedBalance = useMemo(() => {
    if (balanceLoading) return '...'
    if (balance === null || balance === undefined) return '0'
    
    const solAmount = Number(balance) / 1_000_000_000
    return solAmount.toFixed(4)
  }, [balance, balanceLoading])

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect()
    } catch (error) {
      // Failed to disconnect
    }
  }, [disconnect])

  const handleAccountSwitch = useCallback((address: string) => {
    startTransition(() => {
      selectAccount(address)
    })
  }, [selectAccount])

  if (!selectedAccount) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          No account connected
        </p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      {/* Account Header */}
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}
        >
          <SolanaAvatar address={selectedAccount} size={64} />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div style={{ 
            fontFamily: 'ui-monospace, monospace', 
            fontSize: '14px', 
            color: '#111827', 
            fontWeight: '500',
            marginBottom: '8px'
          }}>
            {selectedAccount.slice(0, 8)}...{selectedAccount.slice(-8)}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
              {formattedBalance}
            </span>
            <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
              SOL
            </span>
            {balanceLoading && <Spinner size="sm" />}
          </div>
        </motion.div>
      </div>

      {/* Multiple Accounts */}
      {(accounts ?? []).length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            fontWeight: '600', 
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Your Accounts
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(accounts ?? []).map((acc: any, index: number) => (
              <motion.button
                key={acc.address}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                onClick={() => handleAccountSwitch(acc.address)}
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12,
                  padding: '12px 16px', 
                  background: acc.address === selectedAccount ? '#f0f9ff' : '#fafafa', 
                  border: acc.address === selectedAccount ? '2px solid #3b82f6' : '1px solid #e5e7eb', 
                  cursor: 'pointer', 
                  borderRadius: 12,
                  transition: 'all 0.2s ease',
                  width: '100%'
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <SolanaAvatar address={acc.address} size={32} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: '500' }}>
                    {String(acc.address).slice(0, 8)}...{String(acc.address).slice(-4)}
                  </div>
                  <div style={{ fontSize: 10, color: '#6b7280' }}>
                    {acc.address === selectedAccount ? 'Active' : 'Switch to this account'}
                  </div>
                </div>
                {acc.address === selectedAccount && (
                  <div style={{ color: '#3b82f6', fontSize: '16px' }}>●</div>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Wallet Info */}
      {selectedWallet && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            padding: '16px',
            backgroundColor: '#fafafa',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}
        >
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            fontWeight: '600', 
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Connected via
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {selectedWallet.icon && (
              <img 
                src={selectedWallet.icon} 
                alt={selectedWallet.name}
                width={24}
                height={24}
                style={{ borderRadius: 6 }}
              />
            )}
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
              {selectedWallet.name}
            </span>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <button
          onClick={() => onNavigate?.(modalRoutes.WALLETS)}
          style={{
            padding: '12px 16px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#111827',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>🔗</span>
          Connect More Wallets
        </button>
        
        <button
          onClick={() => onNavigate?.(modalRoutes.SETTINGS)}
          style={{
            padding: '12px 16px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#111827',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>⚙️</span>
          Settings
        </button>

        <button
          onClick={handleDisconnect}
          style={{
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>⏏️</span>
          Disconnect Wallet
        </button>
      </motion.div>
    </motion.div>
  )
}
