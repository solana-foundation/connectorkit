/**
 * 🛡️ Arc Error Handler - Enterprise-Grade Error Management
 * 
 * Provides comprehensive error classification, retry logic, and recovery strategies
 * for production Solana applications. Handles network failures, rate limiting,
 * transaction errors, and wallet issues with intelligent retry mechanisms.
 */

import { type Address } from '@solana/kit'

// ===== ERROR CLASSIFICATION =====

export enum ArcErrorCode {
  // Network & RPC Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  TIMEOUT = 'TIMEOUT',
  BLOCKHASH_EXPIRED = 'BLOCKHASH_EXPIRED',
  
  // Wallet Errors
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_LOCKED = 'WALLET_LOCKED',
  USER_REJECTED = 'USER_REJECTED',
  
  // Transaction Errors
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  SIMULATION_FAILED = 'SIMULATION_FAILED',
  INVALID_INSTRUCTION = 'INVALID_INSTRUCTION',
  
  // Account Errors
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  ACCOUNT_ALREADY_EXISTS = 'ACCOUNT_ALREADY_EXISTS',
  
  // Token Errors
  TOKEN_ACCOUNT_NOT_FOUND = 'TOKEN_ACCOUNT_NOT_FOUND',
  INSUFFICIENT_TOKEN_BALANCE = 'INSUFFICIENT_TOKEN_BALANCE',
  INVALID_MINT = 'INVALID_MINT',
  TOKEN_FROZEN = 'TOKEN_FROZEN',
  
  // Program Errors
  PROGRAM_ERROR = 'PROGRAM_ERROR',
  CUSTOM_PROGRAM_ERROR = 'CUSTOM_PROGRAM_ERROR',
  
  // System Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}

export enum ArcErrorSeverity {
  LOW = 'LOW',           // Minor issues, user can continue
  MEDIUM = 'MEDIUM',     // Significant issues, but recoverable
  HIGH = 'HIGH',         // Critical issues, requires user action
  CRITICAL = 'CRITICAL'  // System failure, requires developer attention
}

export enum ArcRetryStrategy {
  NONE = 'NONE',                    // Don't retry
  IMMEDIATE = 'IMMEDIATE',          // Retry immediately
  LINEAR_BACKOFF = 'LINEAR_BACKOFF', // Linear delay increase
  EXPONENTIAL_BACKOFF = 'EXPONENTIAL_BACKOFF', // Exponential delay increase
  CUSTOM = 'CUSTOM'                 // Use custom retry function
}

// ===== ERROR INTERFACES =====

export interface ArcErrorContext {
  operation: string
  address?: Address | string
  signature?: string
  mint?: Address | string
  amount?: bigint | number
  timestamp: number
  userAgent?: string
  network?: string
  rpcUrl?: string
}

export interface ArcRetryConfig {
  strategy: ArcRetryStrategy
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  jitter: boolean
  customRetryFn?: (attempt: number, error: ArcError) => number | false
}

export interface ArcErrorRecovery {
  canRecover: boolean
  recoveryAction?: () => Promise<void>
  userMessage: string
  developerMessage: string
}

// ===== MAIN ERROR CLASS =====

export class ArcError extends Error {
  public readonly code: ArcErrorCode
  public readonly severity: ArcErrorSeverity
  public readonly context: ArcErrorContext
  public readonly originalError?: Error
  public readonly retryable: boolean
  public readonly recovery: ArcErrorRecovery

  constructor(
    message: string,
    code: ArcErrorCode,
    context: Partial<ArcErrorContext> = {},
    originalError?: Error
  ) {
    super(message)
    this.name = 'ArcError'
    this.code = code
    this.originalError = originalError
    
    // Set context with defaults
    this.context = {
      operation: 'unknown',
      timestamp: Date.now(),
      ...context
    }
    
    // Determine severity and retryability
    const classification = this.classifyError(code)
    this.severity = classification.severity
    this.retryable = classification.retryable
    this.recovery = this.buildRecovery(code, message)
    
    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ArcError)
    }
  }

  private classifyError(code: ArcErrorCode): { severity: ArcErrorSeverity; retryable: boolean } {
    switch (code) {
      // Retryable network errors
      case ArcErrorCode.NETWORK_ERROR:
      case ArcErrorCode.RPC_ERROR:
      case ArcErrorCode.TIMEOUT:
        return { severity: ArcErrorSeverity.MEDIUM, retryable: true }
      
      case ArcErrorCode.RATE_LIMITED:
        return { severity: ArcErrorSeverity.LOW, retryable: true }
      
      case ArcErrorCode.BLOCKHASH_EXPIRED:
        return { severity: ArcErrorSeverity.LOW, retryable: true }
      
      // Non-retryable wallet errors
      case ArcErrorCode.WALLET_NOT_CONNECTED:
      case ArcErrorCode.WALLET_LOCKED:
      case ArcErrorCode.USER_REJECTED:
        return { severity: ArcErrorSeverity.HIGH, retryable: false }
      
      // Transaction errors (some retryable)
      case ArcErrorCode.INSUFFICIENT_FUNDS:
      case ArcErrorCode.INSUFFICIENT_TOKEN_BALANCE:
        return { severity: ArcErrorSeverity.HIGH, retryable: false }
      
      case ArcErrorCode.TRANSACTION_FAILED:
      case ArcErrorCode.SIMULATION_FAILED:
        return { severity: ArcErrorSeverity.MEDIUM, retryable: true }
      
      // Account errors (mostly non-retryable)
      case ArcErrorCode.ACCOUNT_NOT_FOUND:
      case ArcErrorCode.TOKEN_ACCOUNT_NOT_FOUND:
        return { severity: ArcErrorSeverity.MEDIUM, retryable: false }
      
      case ArcErrorCode.INVALID_ADDRESS:
      case ArcErrorCode.INVALID_MINT:
        return { severity: ArcErrorSeverity.HIGH, retryable: false }
      
      // System errors
      case ArcErrorCode.UNKNOWN_ERROR:
        return { severity: ArcErrorSeverity.CRITICAL, retryable: true }
      
      default:
        return { severity: ArcErrorSeverity.MEDIUM, retryable: false }
    }
  }

  private buildRecovery(code: ArcErrorCode, message: string): ArcErrorRecovery {
    switch (code) {
      case ArcErrorCode.WALLET_NOT_CONNECTED:
        return {
          canRecover: true,
          userMessage: 'Please connect your wallet to continue.',
          developerMessage: 'Wallet connection required for this operation.'
        }
      
      case ArcErrorCode.INSUFFICIENT_FUNDS:
        return {
          canRecover: true,
          userMessage: 'Insufficient SOL balance. Please add funds to your wallet.',
          developerMessage: 'Transaction requires more SOL than available in wallet.'
        }
      
      case ArcErrorCode.RATE_LIMITED:
        return {
          canRecover: true,
          userMessage: 'Request rate limit exceeded. Please wait a moment and try again.',
          developerMessage: 'RPC rate limit hit. Consider implementing backoff or using multiple endpoints.'
        }
      
      case ArcErrorCode.USER_REJECTED:
        return {
          canRecover: true,
          userMessage: 'Transaction was cancelled.',
          developerMessage: 'User rejected transaction in wallet.'
        }
      
      case ArcErrorCode.BLOCKHASH_EXPIRED:
        return {
          canRecover: true,
          userMessage: 'Transaction expired. Please try again.',
          developerMessage: 'Blockhash expired, transaction needs to be rebuilt.'
        }
      
      default:
        return {
          canRecover: false,
          userMessage: 'An unexpected error occurred. Please try again.',
          developerMessage: message
        }
    }
  }

  // Utility methods
  public isRetryable(): boolean {
    return this.retryable
  }

  public isCritical(): boolean {
    return this.severity === ArcErrorSeverity.CRITICAL
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      context: this.context,
      retryable: this.retryable,
      recovery: this.recovery,
      stack: this.stack
    }
  }
}

// ===== ERROR FACTORY FUNCTIONS =====

export const createNetworkError = (message: string, context?: Partial<ArcErrorContext>, original?: Error) =>
  new ArcError(message, ArcErrorCode.NETWORK_ERROR, context, original)

export const createWalletError = (message: string, context?: Partial<ArcErrorContext>) =>
  new ArcError(message, ArcErrorCode.WALLET_NOT_CONNECTED, context)

export const createTransactionError = (message: string, context?: Partial<ArcErrorContext>, original?: Error) =>
  new ArcError(message, ArcErrorCode.TRANSACTION_FAILED, context, original)

export const createInsufficientFundsError = (required: bigint, available: bigint, context?: Partial<ArcErrorContext>) =>
  new ArcError(
    `Insufficient funds: required ${required} lamports, available ${available} lamports`,
    ArcErrorCode.INSUFFICIENT_FUNDS,
    { ...context, amount: required }
  )

export const createRateLimitError = (context?: Partial<ArcErrorContext>) =>
  new ArcError('Rate limit exceeded', ArcErrorCode.RATE_LIMITED, context)

// ===== RETRY MANAGER =====

export class ArcRetryManager {
  private defaultConfig: ArcRetryConfig = {
    strategy: ArcRetryStrategy.EXPONENTIAL_BACKOFF,
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    jitter: true
  }

  constructor(private config: Partial<ArcRetryConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config }
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: Partial<ArcErrorContext> = {},
    customConfig?: Partial<ArcRetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.config, ...customConfig }
    let lastError: ArcError | undefined
    let attempt = 0

    while (attempt < retryConfig.maxAttempts!) {
      try {
        return await operation()
      } catch (error) {
        attempt++
        lastError = this.normalizeError(error, context)

        // Don't retry if error is not retryable
        if (!lastError.isRetryable()) {
          throw lastError
        }

        // Don't retry if we've reached max attempts
        if (attempt >= retryConfig.maxAttempts!) {
          throw lastError
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt, retryConfig as ArcRetryConfig, lastError)
        if (delay === false) {
          throw lastError
        }

        console.warn(`[Arc] Operation failed (attempt ${attempt}/${retryConfig.maxAttempts}), retrying in ${delay}ms:`, lastError.message)
        await this.sleep(delay)
      }
    }

    throw lastError!
  }

  private normalizeError(error: unknown, context: Partial<ArcErrorContext>): ArcError {
    if (error instanceof ArcError) {
      return error
    }

    if (error instanceof Error) {
      // Classify common error types
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return createRateLimitError(context)
      }
      
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return createNetworkError(error.message, context, error)
      }
      
      if (error.message.includes('insufficient funds')) {
        return new ArcError(error.message, ArcErrorCode.INSUFFICIENT_FUNDS, context, error)
      }
      
      if (error.message.includes('user rejected') || error.message.includes('cancelled')) {
        return new ArcError(error.message, ArcErrorCode.USER_REJECTED, context, error)
      }

      return new ArcError(error.message, ArcErrorCode.UNKNOWN_ERROR, context, error)
    }

    return new ArcError(
      'Unknown error occurred',
      ArcErrorCode.UNKNOWN_ERROR,
      context,
      error instanceof Error ? error : new Error(String(error))
    )
  }

  private calculateDelay(
    attempt: number,
    config: ArcRetryConfig,
    error: ArcError
  ): number | false {
    switch (config.strategy) {
      case ArcRetryStrategy.NONE:
        return false
      
      case ArcRetryStrategy.IMMEDIATE:
        return 0
      
      case ArcRetryStrategy.LINEAR_BACKOFF:
        let linearDelay = config.baseDelay! * attempt
        break
      
      case ArcRetryStrategy.EXPONENTIAL_BACKOFF:
        let exponentialDelay = config.baseDelay! * Math.pow(2, attempt - 1)
        break
      
      case ArcRetryStrategy.CUSTOM:
        if (config.customRetryFn) {
          return config.customRetryFn(attempt, error)
        }
        return false
      
      default:
        let defaultDelay = config.baseDelay!
    }

    // Apply delay calculation
    let delay: number
    switch (config.strategy) {
      case ArcRetryStrategy.LINEAR_BACKOFF:
        delay = config.baseDelay! * attempt
        break
      case ArcRetryStrategy.EXPONENTIAL_BACKOFF:
        delay = config.baseDelay! * Math.pow(2, attempt - 1)
        break
      default:
        delay = config.baseDelay!
    }

    // Apply jitter if enabled
    if (config.jitter) {
      delay *= (0.5 + Math.random() * 0.5) // Random between 50% and 100% of calculated delay
    }

    // Cap at max delay
    return Math.min(delay, config.maxDelay!)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ===== GLOBAL RETRY MANAGER =====

export const defaultRetryManager = new ArcRetryManager()

// ===== UTILITY FUNCTIONS =====

export const isArcError = (error: unknown): error is ArcError => {
  return error instanceof ArcError
}

export const classifyError = (error: unknown): ArcErrorCode => {
  if (isArcError(error)) {
    return error.code
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return ArcErrorCode.NETWORK_ERROR
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return ArcErrorCode.RATE_LIMITED
    }
    if (message.includes('insufficient')) {
      return ArcErrorCode.INSUFFICIENT_FUNDS
    }
    if (message.includes('user rejected') || message.includes('cancelled')) {
      return ArcErrorCode.USER_REJECTED
    }
  }
  
  return ArcErrorCode.UNKNOWN_ERROR
}

export const formatErrorForUser = (error: unknown): string => {
  if (isArcError(error)) {
    return error.recovery.userMessage
  }
  
  if (error instanceof Error) {
    // Provide user-friendly messages for common errors
    const message = error.message.toLowerCase()
    if (message.includes('network')) {
      return 'Network connection issue. Please check your internet and try again.'
    }
    if (message.includes('insufficient')) {
      return 'Insufficient balance for this transaction.'
    }
    if (message.includes('user rejected')) {
      return 'Transaction was cancelled.'
    }
  }
  
  return 'An unexpected error occurred. Please try again.'
}