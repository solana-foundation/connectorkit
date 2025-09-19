'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useArcClient } from '../core/arc-client-provider'
import type { SwapParams, SwapQuote } from '../core/provider'
import type { SwapState } from '../types'
import { useTransaction, type TransactionConfig, type Instruction } from './use-transaction'
import type { SwapBuild } from '../core/provider'

export interface UseSwapReturn extends SwapState {
  getQuotes: (params: SwapParams) => Promise<SwapQuote[]>
  executeSwap: (quote: SwapQuote) => Promise<{ signature: string; confirmed: boolean }>
  selectQuote: (quote: SwapQuote) => void
}

export interface UseSwapOptions {
  providers?: string[]
  strategy?: 'best-price' | 'fastest' | 'lowest-fees'
  maxSlippage?: number
}

export function useSwap(options: UseSwapOptions = {}): UseSwapReturn {
  const { config, wallet } = useArcClient()
  const { sendTransaction, sendPrebuilt } = useTransaction({
    confirmationStrategy: 'confirmed',
    skipPreflight: false
  })
  
  const [selectedQuote, setSelectedQuote] = useState<SwapQuote | null>(null)
  
  const quoteMutation = useMutation({
    mutationFn: async (params: SwapParams): Promise<SwapQuote[]> => {
      const swapProviders = config.providers?.flatMap(p => p.swap || []) || []
      const filteredProviders = options.providers 
        ? swapProviders.filter(p => options.providers!.includes(p.name))
        : swapProviders
      
      const quotePromises = filteredProviders.map(provider => 
        provider.quote(params).catch(err => {
          console.warn(`Quote failed for ${provider.name}:`, err)
          return null
        })
      )
      
      const quotes = await Promise.all(quotePromises)
      return quotes.filter(Boolean) as SwapQuote[]
    },
  })

  const swapMutation = useMutation({
    mutationFn: async (quote: SwapQuote) => {
      const swapProviders = config.providers?.flatMap(p => p.swap || []) || []
      const provider = swapProviders.find(p => p.name === quote.provider)
      
      if (!provider) {
        throw new Error(`Provider ${quote.provider} not found`)
      }
      
      const build = await provider.build({ 
        quote, 
        userPublicKey: wallet.address as string,
        capabilities: wallet.capabilities
      }) as SwapBuild
      let result
      if (build.kind === 'instructions') {
        result = await sendTransaction({ 
          instructions: build.instructions as Instruction[],
          config: {
            skipPreflight: false,
            maxRetries: 3
          }
        })
      } else {
        result = await sendPrebuilt(build.transaction, {
          skipPreflight: false,
          maxRetries: 3
        })
      }
      
      return result
    },
  })

  const selectBestQuote = (quotes: SwapQuote[], strategy: string): SwapQuote => {
    switch (strategy) {
      case 'best-price':
        return quotes.reduce((best, current) => 
          current.outputAmount > best.outputAmount ? current : best
        )
      case 'fastest':
        return quotes.reduce((best, current) => 
          current.priceImpact < best.priceImpact ? current : best
        )
      case 'lowest-fees':
        return quotes.reduce((best, current) => 
          current.fees < best.fees ? current : best
        )
      default:
        return quotes[0]
    }
  }

  return {
    isLoading: quoteMutation.isPending || swapMutation.isPending,
    error: quoteMutation.error || swapMutation.error,
    quotes: quoteMutation.data || [],
    selectedQuote,
    getQuotes: async (params: SwapParams) => {
      const quotes = await quoteMutation.mutateAsync(params)
      if (quotes.length > 0 && options.strategy) {
        const bestQuote = selectBestQuote(quotes, options.strategy)
        setSelectedQuote(bestQuote)
      }
      return quotes
    },
    executeSwap: async (quote: SwapQuote) => {
      const result = await swapMutation.mutateAsync(quote)
      setSelectedQuote(null)
      return result
    },
    selectQuote: (quote: SwapQuote) => {
      setSelectedQuote(quote)
    }
  }
}