/**
 * @connector-kit/solana/react - MVP React Hooks Export
 * 
 * React-specific hooks and providers for Solana development.
 * MVP version with only the hooks used in demo components.
 * 
 * Bundle size: ~15KB (vs 90KB for full package)
 */

// Re-export everything from main index for backward compatibility
// This ensures apps using /react path continue working
export * from '../index'

// Additional React-specific exports if needed
// (Currently all exports are already React hooks)