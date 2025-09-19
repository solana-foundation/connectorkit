import type { Address } from '@solana/kit'

export interface JsonRpcRequest {
  id?: string | number
  method: string
  params?: unknown[] | Record<string, unknown>
}

export interface TransportRequestOptions {
  signal?: AbortSignal
  commitment?: 'processed' | 'confirmed' | 'finalized'
  onRequest?: (info: { id: string; method: string; url?: string }) => void
  onResponse?: (info: { id: string; ms: number; url?: string }) => void
  onError?: (info: { id: string; error: unknown; url?: string }) => void
  debug?: boolean
}

export interface Transport {
  /** Unique identifier for debugging/metrics */
  id: string
  /** Optional current URL (for HTTP/WebSocket transports) */
  url?: string
  request<T = unknown>(
    req: JsonRpcRequest,
    opts?: TransportRequestOptions
  ): Promise<T>
}

export interface RetryConfig {
  attempts: number
  strategy: 'exponential' | 'linear'
  baseDelayMs?: number
  maxDelayMs?: number
  jitter?: boolean
}

export function computeBackoffDelay(
  attempt: number,
  cfg: RetryConfig
): number {
  const base = cfg.baseDelayMs ?? 500
  const max = cfg.maxDelayMs ?? 30_000
  let delay =
    cfg.strategy === 'exponential' ? base * Math.pow(2, attempt) : base * (attempt + 1)
  if (cfg.jitter) delay = delay * (0.5 + Math.random())
  return Math.min(delay, max)
}


