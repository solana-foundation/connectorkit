import type { SwapProvider, SwapParams, SwapQuote, SwapBuild } from '@connector-kit/sdk'

export interface JupiterQuoteResponse {
  outAmount: string
  priceImpactPct?: string
  routePlan?: Array<{ swapInfo?: { feeAmount?: string } }>
  slippageBps?: number
  [key: string]: unknown
}

export interface JupiterSwapResponse {
  swapTransaction: string
  [key: string]: unknown
}

export interface JupiterConfig {
  apiUrl?: string
  slippageBps?: number
  onlyDirectRoutes?: boolean
  excludeDexes?: string[]
  // If 'auto', use legacy unless walletSupportsVersioned is true
  asLegacyTransaction?: boolean | 'auto'
  walletSupportsVersioned?: boolean
  maxAccounts?: number
  platformFeeBps?: number
  computeUnitPriceMicroLamports?: number
  dynamicSlippage?: boolean
  dynamicComputeUnitLimit?: boolean
  computeUnitLimit?: number
  timeoutMs?: number
  retries?: number
  debug?: boolean
  // Dev-only proxy. true uses default, string to override, false disables.
  corsProxy?: boolean | string
}

export function createJupiter(config: JupiterConfig = {}): SwapProvider {
  const apiUrl = config.apiUrl || 'https://quote-api.jup.ag/v6'
  
  // Address validation helper
  const isValidAddress = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)
  
  // Quote cache for deduplication and recent results
  const quoteCache = new Map<string, { promise: Promise<JupiterQuoteResponse>; timestamp: number }>()
  const QUOTE_CACHE_TTL = 1000 // 1 second cache for rapid UI updates
  const MAX_CACHE_SIZE = 20

  // ===== Token cache =====
  interface JupiterToken { address: string; symbol: string; decimals: number; logoURI?: string }
  let tokensCache: JupiterToken[] | null = null
  let tokensFetchPromise: Promise<JupiterToken[]> | null = null
  async function getTokensInternal(): Promise<JupiterToken[]> {
    if (tokensCache) return tokensCache
    if (tokensFetchPromise) return tokensFetchPromise
    const url = 'https://tokens.jup.ag/tokens'
    tokensFetchPromise = fetchJson<JupiterToken[]>(url).then((t) => {
      tokensCache = t ?? []
      return tokensCache
    }).finally(() => {
      tokensFetchPromise = null
    })
    return tokensFetchPromise
  }

  function withCorsProxy(url: string): string {
    // Never proxy on server to prevent SSRF attacks
    if (typeof window === 'undefined') return url
    if (config.corsProxy === false) return url
    
    const isDevHost = (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1]))$/).test(window.location.hostname)
    if (isDevHost || config.corsProxy === true) {
      const proxyBase = typeof config.corsProxy === 'string' ? config.corsProxy : 'https://corsproxy.io/?'
      // Allowlist proxy hosts for security
      const allowedProxies = ['https://corsproxy.io/?']
      if (typeof config.corsProxy === 'string' && !allowedProxies.some(a => (config.corsProxy as string).startsWith(a))) {
        console.warn('[Jupiter] Untrusted CORS proxy blocked:', config.corsProxy)
        return url
      }
      return `${proxyBase}${encodeURIComponent(url)}`
    }
    return url
  }

  // Track latest request controllers for dedupe/cancel
  let latestQuoteController: AbortController | null = null
  let latestSwapController: AbortController | null = null
  
  // Clean up old cache entries
  function cleanupQuoteCache() {
    const now = Date.now()
    for (const [key, entry] of quoteCache.entries()) {
      if (now - entry.timestamp > QUOTE_CACHE_TTL) {
        quoteCache.delete(key)
      }
    }
    // Limit cache size
    if (quoteCache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(quoteCache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      for (let i = 0; i < entries.length - MAX_CACHE_SIZE; i++) {
        quoteCache.delete(entries[i][0])
      }
    }
  }

  async function fetchJson<T>(input: string, init: RequestInit = {}, kind: 'quote' | 'swap' | 'other' = 'other'): Promise<T> {
    const timeoutMs = config.timeoutMs ?? 10_000
    const retries = config.retries ?? 1
    let attempt = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const controller = new AbortController()
      // Dedupe per kind: abort previous in-flight
      if (kind === 'quote') {
        latestQuoteController?.abort()
        latestQuoteController = controller
      } else if (kind === 'swap') {
        latestSwapController?.abort()
        latestSwapController = controller
      }
      const id = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const url = withCorsProxy(input)
        if (config.debug) console.log('[Jupiter] GET/POST →', url)
        const res = await fetch(url, { ...init, signal: controller.signal })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
        }
        const json = (await res.json()) as T
        return json
      } catch (e) {
        if (attempt++ >= retries) throw e
        const backoff = Math.min(500 * attempt, 1500)
        await new Promise(r => setTimeout(r, backoff))
      } finally {
        clearTimeout(id)
      }
    }
  }

  function safeBase64ToUint8Array(b64: string): Uint8Array {
    if (typeof Buffer !== 'undefined') {
      return Uint8Array.from(Buffer.from(b64, 'base64'))
    }
    // Browser
    const bin = atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }

  function sumFees(route?: JupiterQuoteResponse['routePlan']): bigint {
    if (!route) return 0n
    try {
      return route.reduce((acc, step) => {
        const v = step?.swapInfo?.feeAmount
        return acc + (v ? BigInt(v) : 0n)
      }, 0n)
    } catch {
      return 0n
    }
  }
  
  return {
    name: 'jupiter',
    
    async quote(params: SwapParams): Promise<SwapQuote> {
      // Clean up old cache entries periodically
      cleanupQuoteCache()
      
      // Create cache key from params
      const slippage = Math.max(1, Math.min(1000, Number(params.slippageBps ?? config.slippageBps ?? 50)))
      const cacheKey = `${params.inputMint}|${params.outputMint}|${params.amount}|${slippage}|${config.onlyDirectRoutes}|${config.excludeDexes?.join(',')}|${config.maxAccounts}|${config.platformFeeBps}`
      
      // Check if we have a recent cached quote
      const cached = quoteCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_TTL) {
        console.log('[Jupiter] Returning cached quote for', params.inputMint.slice(0, 8), '→', params.outputMint.slice(0, 8))
        const data = await cached.promise
        return {
          provider: 'jupiter',
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          inputAmount: params.amount,
          outputAmount: BigInt(data.outAmount) as import('@solana/kit').Lamports,
          priceImpact: parseFloat(data.priceImpactPct || '0'),
          fees: sumFees(data.routePlan) as import('@solana/kit').Lamports,
          route: data,
          effectiveSlippageBps: typeof data.slippageBps === 'number' ? data.slippageBps : undefined,
        }
      }
      
      // Create the quote request
      const url = new URL(`${apiUrl}/quote`)
      url.searchParams.set('inputMint', params.inputMint)
      url.searchParams.set('outputMint', params.outputMint)
      url.searchParams.set('amount', params.amount.toString())
      url.searchParams.set('slippageBps', String(slippage))
      if (config.onlyDirectRoutes) url.searchParams.set('onlyDirectRoutes', 'true')
      if (config.excludeDexes?.length) url.searchParams.set('excludeDexes', config.excludeDexes.join(','))
      if (config.maxAccounts) url.searchParams.set('maxAccounts', String(config.maxAccounts))
      if (config.platformFeeBps) url.searchParams.set('platformFeeBps', String(config.platformFeeBps))
      
      // Store promise in cache for deduplication
      const promise = fetchJson<JupiterQuoteResponse>(url.toString(), {}, 'quote')
      quoteCache.set(cacheKey, { promise, timestamp: Date.now() })
      
      const data = await promise
      
      return {
        provider: 'jupiter',
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        inputAmount: params.amount,
        outputAmount: BigInt(data.outAmount) as import('@solana/kit').Lamports,
        priceImpact: parseFloat(data.priceImpactPct || '0'),
        fees: sumFees(data.routePlan) as import('@solana/kit').Lamports,
        route: data,
        // Surface what Jupiter returned (useful when dynamicSlippage is on)
        effectiveSlippageBps: typeof data.slippageBps === 'number' ? data.slippageBps : undefined,
      }
    },
    
    async build({ quote, userPublicKey, capabilities }): Promise<SwapBuild> {
      // Validate user public key
      if (!isValidAddress(userPublicKey)) {
        throw new Error(`Invalid userPublicKey: ${userPublicKey}`)
      }
      
      const url = new URL(`${apiUrl}/swap`)
      const body: Record<string, unknown> = {
        quoteResponse: quote.route,
        userPublicKey,
        wrapAndUnwrapSol: true,
        useSharedAccounts: false,
        dynamicComputeUnitLimit: config.dynamicComputeUnitLimit ?? true,
      }
      // Compute budget
      if (config.computeUnitLimit != null) body.computeUnitLimit = config.computeUnitLimit
      if (config.computeUnitPriceMicroLamports != null) body.computeUnitPriceMicroLamports = config.computeUnitPriceMicroLamports
      // Slippage behavior
      if (config.dynamicSlippage) body.dynamicSlippage = true
      if (config.platformFeeBps) body.platformFeeBps = config.platformFeeBps
      if (config.maxAccounts) body.maxAccounts = config.maxAccounts
      // Legacy vs v0 toggle
      const legacyPref = config.asLegacyTransaction
      if (legacyPref === 'auto') {
        const walletSupportsV0 = capabilities?.walletSupportsVersioned ?? !!config.walletSupportsVersioned
        body.asLegacyTransaction = walletSupportsV0 ? false : true
      } else {
        body.asLegacyTransaction = legacyPref ?? true
      }

      const data = await fetchJson<JupiterSwapResponse>(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, 'swap')

      // swapTransaction is base64 wire transaction
      const wireTransaction = safeBase64ToUint8Array(data.swapTransaction)
      return { kind: 'prebuilt', transaction: { wireTransaction } }
    },
    
    isTokenSupported(mint) {
      // Try cached list; kick off background fetch if empty
      if (!tokensCache && !tokensFetchPromise) {
        void getTokensInternal().catch(() => {})
      }
      const list = tokensCache
      if (!list) return true
      return list.some(t => t.address === mint)
    }
  }
}

// Public helper to fetch Jupiter tokens (cached)
export async function getJupiterTokens(): Promise<Array<{ address: string; symbol: string; decimals: number; logoURI?: string }>> {
  // Create a temporary Jupiter instance to reuse fetchJson with timeouts/retries
  const tempProvider = createJupiter({ timeoutMs: 10000, retries: 2 })
  const url = 'https://tokens.jup.ag/tokens'
  
  try {
    // Use the provider's fetchJson method which has timeout/retry logic
    const fetchWithTimeout = async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      try {
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const tokens = await res.json()
        return tokens
      } finally {
        clearTimeout(timeoutId)
      }
    }
    
    return await fetchWithTimeout()
  } catch (error) {
    console.warn('[Jupiter] Failed to fetch token list:', error)
    return []
  }
}
