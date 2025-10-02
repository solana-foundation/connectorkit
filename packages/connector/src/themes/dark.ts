import type { ConnectorTheme } from './types'

// Clean, utilitarian dark theme
export const darkTheme: ConnectorTheme = {
  colors: {
    primary: '#FFFFFF',      // White for dark mode actions
    secondary: '#9CA3AF',    // Gray for secondary actions
    background: '#111827',   // Dark background
    surface: '#1F2937',     // Dark surface
    text: '#FFFFFF',        // White text
    textSecondary: '#9CA3AF', // Gray text
    border: '#374151',      // Dark border
    error: '#EF4444',       // Red for errors
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
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 8px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
  },
  
  button: {
    height: 44,
    shadow: 'sm',
    border: '1px solid #374151',
  },
  
  mode: 'dark',
  name: 'Dark',
}