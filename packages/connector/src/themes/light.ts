import type { ConnectorTheme } from './types'

// Clean, utilitarian light theme
export const lightTheme: ConnectorTheme = {
  colors: {
    primary: '#111827',      // Dark gray for actions
    secondary: '#6B7280',    // Medium gray for secondary actions
    background: '#FFFFFF',   // Pure white
    surface: '#F9FAFB',     // Light gray surface
    text: '#111827',        // Dark text
    textSecondary: '#6B7280', // Medium gray
    border: '#E5E7EB',      // Light border
    error: '#DC2626',       // Red for errors
  },
  
  fonts: {
    body: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
  },
  
  borderRadius: {
    sm: 4,    // Small rounded corners
    md: 8,    // Standard rounded 
    lg: 12,   // Large rounded
    full: 9999, // Fully rounded (pills, circles)
  },
  
  spacing: {
    sm: 8,    // Tight spacing
    md: 16,   // Standard spacing  
    lg: 24,   // Loose spacing
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
  name: 'Light',
}