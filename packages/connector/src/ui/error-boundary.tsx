/**
 * React 19 Error Boundary with Enhanced Recovery
 * Provides robust error handling and recovery mechanisms
 */

'use client'

import React, { 
  Component, 
  ErrorInfo, 
  ReactNode,
  useCallback,
  useState,
  useTransition,
  useMemo
} from 'react'

// Error types specific to wallet connections
export enum WalletErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED', 
  NETWORK_ERROR = 'NETWORK_ERROR',
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  USER_REJECTED = 'USER_REJECTED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface WalletError extends Error {
  type: WalletErrorType
  recoverable: boolean
  context?: Record<string, unknown>
  retryAction?: () => Promise<void>
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
  retryCount: number
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: WalletError, retry: () => void) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  maxRetries?: number
  enableRecovery?: boolean
}

// Error logging service
class ErrorLogger {
  static log(error: Error, errorInfo: ErrorInfo, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ConnectorErrorBoundary]', error.message, {
        error,
        errorInfo,
        context
      })
    }

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      // Example: Send to Sentry, LogRocket, etc.
      try {
        // Type-safe Google Analytics reporting
        const gtag = (window as any).gtag
        if (typeof gtag === 'function') {
          gtag('event', 'exception', {
            description: error.message,
            fatal: false,
            custom_map: { error_type: 'wallet_error', ...context }
          })
        }
      } catch (reportingError) {
        // Failed to report error to analytics (silent failure in production)
      }
    }
  }
}

// Error classification utility
function classifyError(error: Error): WalletError {
  const walletError = error as WalletError
  
  // Already classified
  if (walletError.type) return walletError

  // Classify based on message patterns
  let type = WalletErrorType.UNKNOWN_ERROR
  let recoverable = false

  if (error.message.includes('User rejected') || error.message.includes('User denied')) {
    type = WalletErrorType.USER_REJECTED
    recoverable = true
  } else if (error.message.includes('Insufficient funds')) {
    type = WalletErrorType.INSUFFICIENT_FUNDS  
    recoverable = false
  } else if (error.message.includes('Network') || error.message.includes('fetch')) {
    type = WalletErrorType.NETWORK_ERROR
    recoverable = true
  } else if (error.message.includes('Wallet not found') || error.message.includes('not installed')) {
    type = WalletErrorType.WALLET_NOT_FOUND
    recoverable = true
  } else if (error.message.includes('Failed to connect') || error.message.includes('Connection')) {
    type = WalletErrorType.CONNECTION_FAILED
    recoverable = true
  }

  return {
    ...error,
    type,
    recoverable,
    context: { originalMessage: error.message }
  }
}

// Enhanced Error Boundary with React 19 patterns
export class ConnectorErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts = new Set<NodeJS.Timeout>()

  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    
    // Log error with context
    ErrorLogger.log(error, errorInfo, {
      retryCount: this.state.retryCount,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString()
    })

    // Call custom error handler
    this.props.onError?.(error, errorInfo)
  }

  componentWillUnmount() {
    // Clean up retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
  }

  retry = () => {
    const { maxRetries = 3 } = this.props
    
    if (this.state.retryCount >= maxRetries) {
      return
    }

    // Clear error state with retry count increment
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }))
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const walletError = classifyError(this.state.error)
      
      if (this.props.fallback) {
        return this.props.fallback(walletError, this.retry)
      }

      return <DefaultErrorFallback error={walletError} onRetry={this.retry} />
    }

    return this.props.children
  }
}

// Default error fallback component with React 19 patterns
interface DefaultErrorFallbackProps {
  error: WalletError
  onRetry: () => void
}

function DefaultErrorFallback({ error, onRetry }: DefaultErrorFallbackProps) {
  const [isPending, startTransition] = useTransition()
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = useCallback(() => {
    setIsRetrying(true)
    startTransition(() => {
      setTimeout(() => {
        onRetry()
        setIsRetrying(false)
      }, 500) // Small delay for better UX
    })
  }, [onRetry])

  const { title, message, actionText, showRetry } = useMemo(() => {
    switch (error.type) {
      case WalletErrorType.USER_REJECTED:
        return {
          title: 'Transaction Cancelled',
          message: 'You cancelled the transaction. No problem!',
          actionText: 'Try Again',
          showRetry: true
        }
      
      case WalletErrorType.WALLET_NOT_FOUND:
        return {
          title: 'Wallet Not Found',
          message: 'Please install a supported Solana wallet to continue.',
          actionText: 'Check Wallets',
          showRetry: true
        }
      
      case WalletErrorType.NETWORK_ERROR:
        return {
          title: 'Network Error',
          message: 'Having trouble connecting. Please check your internet connection.',
          actionText: 'Retry',
          showRetry: true
        }
      
      case WalletErrorType.INSUFFICIENT_FUNDS:
        return {
          title: 'Insufficient Funds',
          message: 'You don\'t have enough SOL for this transaction.',
          actionText: 'Add Funds',
          showRetry: false
        }
      
      default:
        return {
          title: 'Something went wrong',
          message: 'An unexpected error occurred. Please try again.',
          actionText: 'Retry',
          showRetry: error.recoverable
        }
    }
  }, [error.type, error.recoverable])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      backgroundColor: '#fafafa',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      {/* Error Icon */}
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: '#fee2e2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1rem'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#dc2626">
          <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>

      {/* Error Content */}
      <h3 style={{ 
        margin: '0 0 0.5rem 0', 
        fontSize: '1.125rem', 
        fontWeight: '600',
        color: '#111827'
      }}>
        {title}
      </h3>
      
      <p style={{ 
        margin: '0 0 1.5rem 0', 
        fontSize: '0.875rem', 
        color: '#6b7280',
        lineHeight: '1.5'
      }}>
        {message}
      </p>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {showRetry && (
          <button
            onClick={handleRetry}
            disabled={isPending || isRetrying}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: isPending || isRetrying ? 'wait' : 'pointer',
              opacity: isPending || isRetrying ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            {isRetrying ? 'Retrying...' : actionText}
          </button>
        )}
        
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Refresh Page
        </button>
      </div>

      {/* Error Details (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <details style={{ 
          marginTop: '1rem', 
          fontSize: '0.75rem',
          color: '#6b7280',
          width: '100%'
        }}>
          <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
            Error Details
          </summary>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-all',
            backgroundColor: '#f3f4f6',
            padding: '0.5rem',
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '200px'
          }}>
            {error.message}
          </pre>
        </details>
      )}
    </div>
  )
}

// Higher-order component for easy error boundary wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ConnectorErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ConnectorErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

/**
 * React 19 Usage Examples:
 * 
 * ```tsx
 * // Wrap your entire connector
 * <ConnectorErrorBoundary
 *   maxRetries={3}
 *   onError={(error, info) => {
 *     console.error('Wallet error:', error, info)
 *   }}
 * >
 *   <ConnectorProvider>
 *     <App />
 *   </ConnectorProvider>
 * </ConnectorErrorBoundary>
 * 
 * // Custom error fallback
 * <ConnectorErrorBoundary
 *   fallback={(error, retry) => (
 *     <CustomErrorPage error={error} onRetry={retry} />
 *   )}
 * >
 *   <WalletComponents />
 * </ConnectorErrorBoundary>
 * 
 * // HOC usage
 * const SafeConnectButton = withErrorBoundary(ConnectButton, {
 *   maxRetries: 2,
 *   enableRecovery: true
 * })
 * ```
 */

