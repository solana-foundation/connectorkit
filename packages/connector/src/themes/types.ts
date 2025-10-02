// Simplified theme interface - utilitarian design tokens
export interface ConnectorTheme {
  // Essential colors only
  colors: {
    primary: string        // Primary action color
    secondary: string      // Secondary color (keep for button states)
    background: string     // Main background
    surface: string        // Card/modal surfaces  
    text: string          // Primary text
    textSecondary: string // Secondary text
    border: string        // Border color
    error: string         // Error state
  }
  
  // Basic typography (simplified)
  fonts: {
    body: string          // Body font stack
  }
  
  // Basic border radius tokens
  borderRadius: {
    sm: string | number    // Small rounded (4px)
    md: string | number    // Medium rounded (8px) 
    lg: string | number    // Large rounded (12px)
    full: string | number  // Fully rounded (9999px)
  }
  
  // Simple spacing system
  spacing: {
    sm: string | number    // Small spacing (8px)
    md: string | number    // Medium spacing (16px)  
    lg: string | number    // Large spacing (24px)
  }
  
  // Basic shadows
  shadows: {
    sm: string            // Small shadow
    md: string            // Medium shadow
    lg: string            // Large shadow
  }
  
  // Button styling (simplified)
  button: {
    height: string | number
    shadow: 'none' | 'sm' | 'md' | 'lg' | string
    border: 'none' | string
  }
  
  // Theme metadata
  mode: 'light' | 'dark'
  name: string
}

// Theme overrides for customization
export type ConnectorThemeOverrides = Partial<ConnectorTheme>

// Backwards compatibility with legacy themes (include secondaryColor for connect-button compatibility)
export interface LegacyConnectorTheme {
  primaryColor: string
  secondaryColor: string    // Added for connect-button compatibility
  backgroundColor: string  
  borderRadius: number | string
  textColor: string
  fontFamily: string        // Added for connect-button compatibility
  buttonShadow: 'none' | 'sm' | 'md' | 'lg' | string  // Added for connect-button compatibility
  border: string            // Added for connect-button compatibility
  height: number | string   // Added for connect-button compatibility
}

export type LegacyConnectorThemeOverrides = Partial<LegacyConnectorTheme>