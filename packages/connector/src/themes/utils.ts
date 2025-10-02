import type { ConnectorTheme, LegacyConnectorTheme } from './types'

// Utility functions for theme values
function getValue(value: string | number, fallback: string): string {
  if (typeof value === 'number') return `${value}px`
  return (typeof value === 'string' && value.trim()) ? value : fallback
}

// Essential theme utilities
export function getBorderRadius(theme: ConnectorTheme, size: 'sm' | 'md' | 'lg' | 'full' = 'md'): string {
  return getValue(theme.borderRadius[size], '8px')
}

export function getSpacing(theme: ConnectorTheme, size: 'sm' | 'md' | 'lg' = 'md'): string {
  return getValue(theme.spacing[size], '16px')
}

export function getButtonHeight(theme: ConnectorTheme): string {
  return getValue(theme.button.height, '44px')
}

export function getButtonShadow(theme: ConnectorTheme): string {
  const shadow = theme.button.shadow
  if (shadow === 'none') return 'none'
  if (shadow === 'sm') return theme.shadows.sm
  if (shadow === 'md') return theme.shadows.md
  if (shadow === 'lg') return theme.shadows.lg
  return String(shadow)
}

export function getButtonBorder(theme: ConnectorTheme): string {
  return theme.button.border === 'none' ? '1px solid transparent' : String(theme.button.border)
}

// Simplified accessible text color utility
export function getAccessibleTextColor(hexColor: string): string {
  try {
    // Simple approach - return white for dark colors, black for light colors
    const c = hexColor.replace('#', '')
    const rgb = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16)
    const r = (rgb >> 16) & 255
    const g = (rgb >> 8) & 255
    const b = rgb & 255
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 128 ? '#000000' : '#FFFFFF'
  } catch {
    return '#000000' // Default to black
  }
}

// Legacy compatibility (simplified)
export function legacyToModernTheme(legacy: LegacyConnectorTheme): ConnectorTheme {
  return {
    colors: {
      primary: legacy.primaryColor,
      secondary: '#6B7280',
      background: legacy.backgroundColor,
      surface: '#F9FAFB',
      text: legacy.textColor,
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      error: '#DC2626',
    },
    fonts: {
      body: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    },
    borderRadius: {
      sm: 4,
      md: typeof legacy.borderRadius === 'number' ? legacy.borderRadius : 8,
      lg: 12,
      full: 9999,
    },
    spacing: { 
      sm: 8, 
      md: 16, 
      lg: 24 
    },
    shadows: { 
      sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
      md: '0 4px 8px rgba(0, 0, 0, 0.1)',
      lg: '0 8px 16px rgba(0, 0, 0, 0.15)',
    },
    button: {
      height: 44,
      shadow: 'sm',
      border: '1px solid #E5E7EB',
    },
    mode: 'light',
    name: 'Legacy',
  }
}