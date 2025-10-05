/**
 * @connector-kit/connector - Armadura Integration
 * 
 * Automatic transaction tracking for @armadura/sdk
 * This provides a wrapper around Armadura's useTransaction hook that
 * automatically tracks transactions in the debug panel.
 */

'use client'

import { useCallback } from 'react'
import { useConnectorClient } from '../ui/connector-provider'

/**
 * Armadura transaction types (generic for compatibility)
 */
export interface ArmaduraUseTransactionReturn {
  sendTransaction: (params: any) => Promise<{ signature: string; confirmed: boolean }>
  sendPrebuilt: (tx: { wireTransaction: Uint8Array }, config?: any) => Promise<{ signature: string; confirmed: boolean }>
  buildTransaction: (instructions: any[], config?: any) => Promise<string>
  isLoading: boolean
  error: Error | null
  data: { signature: string; confirmed: boolean } | null
  reset: () => void
}

/**
 * Wrap Armadura's useTransaction hook with automatic debug panel tracking
 * 
 * @example
 * ```tsx
 * import { useTransaction } from '@armadura/sdk'
 * import { useArmaduraTransaction } from '@connector-kit/connector/react'
 * 
 * function MyComponent() {
 *   const armaduraTx = useTransaction()
 *   const { sendTransaction } = useArmaduraTransaction(armaduraTx)
 *   
 *   // Transactions are now automatically tracked in debug panel!
 *   await sendTransaction({ instructions: [...] })
 * }
 * ```
 */
export function useArmaduraTransaction(
  armaduraHook: ArmaduraUseTransactionReturn
): ArmaduraUseTransactionReturn {
  const client = useConnectorClient()

  const sendTransaction = useCallback(
    async (params: any): Promise<{ signature: string; confirmed: boolean }> => {
      let signature: string | undefined
      
      try {
        // Call original Armadura sendTransaction
        const result = await armaduraHook.sendTransaction(params)
        signature = result.signature

        // Track in debug panel immediately
        if (client?.trackTransaction) {
          console.log('[Connector] Tracking transaction:', signature)
          client.trackTransaction({
            signature,
            status: result.confirmed ? 'confirmed' : 'pending',
            method: 'sendTransaction',
            feePayer: params.config?.feePayer?.address || 'Unknown',
            metadata: {
              instructions: params.instructions?.length || 0,
              sdk: 'armadura',
              computeUnitLimit: params.config?.computeUnitLimit,
              computeUnitPrice: params.config?.computeUnitPrice
            }
          })
          
          // Update status if already confirmed
          if (result.confirmed && client.updateTransactionStatus) {
            console.log('[Connector] Transaction already confirmed:', signature)
            client.updateTransactionStatus(signature, 'confirmed')
          }
        } else {
          console.warn('[Connector] Client not available for tracking')
        }

        return result
      } catch (error) {
        console.error('[Connector] Transaction failed:', error)
        
        // Track failure
        if (signature && client?.updateTransactionStatus) {
          console.log('[Connector] Updating failed transaction:', signature)
          const errorMsg = error instanceof Error ? error.message : String(error)
          client.updateTransactionStatus(signature, 'failed', errorMsg)
        }
        throw error
      }
    },
    [armaduraHook.sendTransaction, client]
  )

  const sendPrebuilt = useCallback(
    async (
      tx: { wireTransaction: Uint8Array },
      config?: any
    ): Promise<{ signature: string; confirmed: boolean }> => {
      let signature: string | undefined
      
      try {
        // Call original Armadura sendPrebuilt
        const result = await armaduraHook.sendPrebuilt(tx, config)
        signature = result.signature

        // Track in debug panel
        if (client?.trackTransaction) {
          console.log('[Connector] Tracking prebuilt transaction:', signature)
          client.trackTransaction({
            signature,
            status: result.confirmed ? 'confirmed' : 'pending',
            method: 'sendPrebuilt',
            feePayer: config?.feePayer?.address || 'Unknown',
            metadata: {
              sdk: 'armadura',
              prebuilt: true
            }
          })
          
          // Update status if already confirmed
          if (result.confirmed && client.updateTransactionStatus) {
            client.updateTransactionStatus(signature, 'confirmed')
          }
        }

        return result
      } catch (error) {
        // Track failure
        if (signature && client?.updateTransactionStatus) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          client.updateTransactionStatus(signature, 'failed', errorMsg)
        }
        throw error
      }
    },
    [armaduraHook.sendPrebuilt, client]
  )

  // Return wrapped hook with same interface
  return {
    sendTransaction,
    sendPrebuilt,
    buildTransaction: armaduraHook.buildTransaction,
    isLoading: armaduraHook.isLoading,
    error: armaduraHook.error,
    data: armaduraHook.data,
    reset: armaduraHook.reset
  }
}

/**
 * Higher-order function to wrap any transaction-sending function with tracking
 * 
 * @example
 * ```tsx
 * import { useConnectorClient } from '@connector-kit/connector/react'
 * import { withTransactionTracking } from '@connector-kit/connector/react'
 * 
 * function MyComponent() {
 *   const client = useConnectorClient()
 *   const sendTx = useSomeTransactionHook()
 *   
 *   const trackedSendTx = withTransactionTracking(sendTx, client, {
 *     method: 'customMethod',
 *     sdk: 'my-sdk'
 *   })
 *   
 *   await trackedSendTx({ ...params })
 * }
 * ```
 */
export function withTransactionTracking<T extends (...args: any[]) => Promise<{ signature: string; confirmed?: boolean }>>(
  fn: T,
  client: ReturnType<typeof useConnectorClient>,
  options: {
    method: string
    sdk?: string
    getMetadata?: (...args: Parameters<T>) => Record<string, any>
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      const result = await fn(...args)

      // Track transaction
      if (client?.trackTransaction) {
        client.trackTransaction({
          signature: result.signature,
          status: result.confirmed ? 'confirmed' : 'pending',
          method: options.method,
          metadata: {
            sdk: options.sdk || 'unknown',
            ...(options.getMetadata ? options.getMetadata(...args) : {})
          }
        })
      }

      // Watch for confirmation if pending
      if (!result.confirmed && client?.updateTransactionStatus) {
        setTimeout(async () => {
          try {
            if (client.updateTransactionStatus) {
              client.updateTransactionStatus(result.signature, 'confirmed')
            }
          } catch (err) {
            console.warn('[Connector] Failed to update transaction status:', err)
          }
        }, 5000)
      }

      return result
    } catch (error) {
      // Track failure
      if (error instanceof Error && client?.trackTransaction) {
        const sig = (error as any).signature
        if (sig && client.updateTransactionStatus) {
          client.updateTransactionStatus(sig, 'failed', error.message)
        }
      }
      throw error
    }
  }) as T
}

/**
 * Hook version of withTransactionTracking
 */
export function useTrackedTransactionFunction<T extends (...args: any[]) => Promise<{ signature: string; confirmed?: boolean }>>(
  fn: T,
  options: {
    method: string
    sdk?: string
    getMetadata?: (...args: Parameters<T>) => Record<string, any>
  }
): T {
  const client = useConnectorClient()
  
  return useCallback(
    withTransactionTracking(fn, client, options),
    [fn, client, options.method, options.sdk]
  ) as T
}

