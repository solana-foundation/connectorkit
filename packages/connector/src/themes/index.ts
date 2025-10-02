// Theme types
export type { 
  ConnectorTheme, 
  LegacyConnectorTheme, 
  ConnectorThemeOverrides, 
  LegacyConnectorThemeOverrides 
} from './types'

// Simple themes - light and dark only
export { lightTheme } from './light'
export { darkTheme } from './dark'

// Import themes for internal use
import { lightTheme } from './light'
import { darkTheme } from './dark'

// Theme utilities (keep essential ones for component compatibility)
export {
  getBorderRadius,
  getSpacing,
  getButtonHeight,
  getButtonShadow,
  getButtonBorder,
  getAccessibleTextColor,
  legacyToModernTheme,
} from './utils'

// Simple themes collection
export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const

// Default theme (light)
export const defaultConnectorTheme = lightTheme

// Aliases for backwards compatibility
export const minimalTheme = lightTheme  // Alias for existing usage

// Theme name type
export type ThemeName = keyof typeof themes