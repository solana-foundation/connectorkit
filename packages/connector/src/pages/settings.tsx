/**
 * Settings Page
 * Features: Theme switching, preferences, developer options
 */

"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { motion } from 'motion/react'
import { themes, type ConnectorTheme } from '../themes'

interface SettingsPageProps {
  options?: any
  onNavigate?: (route: string) => void
  isTransitioning?: boolean
}

export function SettingsPage({ options, onNavigate }: SettingsPageProps) {
  const [selectedTheme, setSelectedTheme] = useState('minimal')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  const handleThemeChange = useCallback((themeName: string) => {
    setSelectedTheme(themeName)
    // Theme changed
  }, [])

  const availableThemes = useMemo(() => [
    { name: 'minimal', label: 'Minimal', color: '#f3f4f6' },
    { name: 'solana', label: 'Solana', color: '#9945FF' },
    { name: 'phantom', label: 'Phantom', color: '#AB9FF2' },
    { name: 'dark', label: 'Dark', color: '#1f2937' }
  ], [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      {/* Theme Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280', 
          fontWeight: '600', 
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Appearance
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {availableThemes.map((theme, index) => (
            <motion.button
              key={theme.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={() => handleThemeChange(theme.name)}
              style={{
                padding: '12px',
                backgroundColor: selectedTheme === theme.name ? '#f0f9ff' : '#fafafa',
                border: selectedTheme === theme.name ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: theme.color,
                  border: '2px solid #ffffff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
              <span style={{ 
                fontSize: '11px', 
                fontWeight: '500',
                color: selectedTheme === theme.name ? '#3b82f6' : '#6b7280'
              }}>
                {theme.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* User Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280', 
          fontWeight: '600', 
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Preferences
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Reduce Motion Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#fafafa',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                Reduce Motion
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                Minimize animations for accessibility
              </div>
            </div>
            <button
              onClick={() => setReduceMotion(!reduceMotion)}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: reduceMotion ? '#3b82f6' : '#e5e7eb',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  position: 'absolute',
                  top: '2px',
                  left: reduceMotion ? '22px' : '2px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              />
            </button>
          </div>

          {/* Auto-close on Connect */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#fafafa',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                Auto-close on Connect
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                Close modal after successful connection
              </div>
            </div>
            <button
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#3b82f6',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  position: 'absolute',
                  top: '2px',
                  left: '22px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Developer Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#6b7280',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '12px',
            padding: '4px 0'
          }}
        >
          <span style={{ 
            transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}>
            ▶
          </span>
          Developer Options
        </button>

        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '16px',
              backgroundColor: '#fef3c7',
              borderRadius: '8px',
              border: '1px solid #fbbf24'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span>⚠️</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#92400e' }}>
                  Developer Mode
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#92400e'
                }}>
                  <span>Debug Logging</span>
                  <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={(e) => setDebugMode(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                </label>
                
                <div style={{ fontSize: '10px', color: '#a16207', lineHeight: '1.4' }}>
                  Enables verbose console logging for debugging wallet connections and state changes.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Version & Build Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        style={{
          textAlign: 'center',
          padding: '16px 0',
          borderTop: '1px solid #e5e7eb',
          fontSize: '10px',
          color: '#9ca3af'
        }}
      >
        <div style={{ marginBottom: '4px' }}>
          Build: {process.env.NODE_ENV} • React 19 Enhanced
        </div>
        <div>
          Bundle: 21KB • Frameworks: React, Vue, Angular, JS
        </div>
      </motion.div>
    </motion.div>
  )
}
