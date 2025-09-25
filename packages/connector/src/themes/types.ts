// Theme interface
export interface ConnectorTheme {
  // Base colors
  colors: {
    primary: string
    secondary: string
    background: string
    surface: string
    text: string
    textSecondary: string
    border: string
    error: string
    warning: string
    success: string
    accent: string
    modalOverlay: string
  }
  
  // Typography
  fonts: {
    body: string
    mono: string
  }
  
  // Layout
  borderRadius: {
    sm: string | number
    md: string | number
    lg: string | number
  }
  
  // Shadows
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
  }
  
  // Spacing
  spacing: {
    xs: string | number
    sm: string | number
    md: string | number
    lg: string | number
    xl: string | number
  }
  
  // Button specific
  button: {
    height: string | number
    shadow: 'none' | 'sm' | 'md' | 'lg' | string
    border: 'none' | string
  }
  
  // Theme metadata
  mode: 'light' | 'dark'
  name: string
}

// Backwards compatibility with legacy theme interface
export interface LegacyConnectorTheme {
  primaryColor: string
  secondaryColor: string
  borderRadius: number | string
  fontFamily: string
  buttonShadow: 'none' | 'sm' | 'md' | 'lg' | string
  border: 'none' | string
  height: number | string
}

// Helper type for partial theme overrides
export type ConnectorThemeOverrides = Partial<ConnectorTheme>
export type LegacyConnectorThemeOverrides = Partial<LegacyConnectorTheme>
