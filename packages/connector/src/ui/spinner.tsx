import { injectConnectorGlobalStyles } from './global-styles'

injectConnectorGlobalStyles()

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'white' | 'dark'
  variant?: 'spin' | 'pulse' | 'dots'
}

export const Spinner = ({ 
  size = 'md', 
  className = '', 
  color = 'primary', 
  variant = 'spin' 
}: SpinnerProps) => {
  const spinnerClasses = [
    'connector-spinner',
    `connector-spinner--${size}`,
    `connector-spinner--${color}`,
    variant === 'pulse' && 'connector-spinner--pulse',
    variant === 'dots' && 'connector-spinner--dots',
    className
  ].filter(Boolean).join(' ')

  if (variant === 'dots') {
    return (
      <span 
        className={spinnerClasses} 
        role="progressbar"
        aria-label="Loading"
      />
    )
  }

  return (
    <span 
      className={spinnerClasses}
      role="progressbar"
      aria-label="Loading"
    />
  )
}
