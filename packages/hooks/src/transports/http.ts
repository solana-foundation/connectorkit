import { computeBackoffDelay, type RetryConfig, type Transport, type TransportRequestOptions, type JsonRpcRequest } from './types'

export interface HttpTransportInit {
  url: string
  headers?: Record<string, string>
  timeoutMs?: number
  retry?: RetryConfig
}

export function createHttpTransport(init: HttpTransportInit): Transport {
  const transportId = `http:${new URL(init.url).host}`
  const defaultHeaders = {
    'content-type': 'application/json',
    ...init.headers,
  }

  async function request<T>(req: JsonRpcRequest, opts?: TransportRequestOptions): Promise<T> {
    const genId = () => {
      try {
        const g = (globalThis as any).crypto
        if (g?.randomUUID) return g.randomUUID()
      } catch {}
      return `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }
    const id = String(req.id ?? genId())
    const started = performance.now()
    const method = req.method
    const url = init.url
    const doFetch = async (): Promise<T> => {
      opts?.onRequest?.({ id, method, url })
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? 15_000)
      const signal = opts?.signal
      if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: defaultHeaders,
          body: JSON.stringify({ jsonrpc: '2.0', id, method, params: req.params ?? [] }),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (json.error) throw new Error(json.error.message || 'RPC Error')
        return json.result as T
      } finally {
        clearTimeout(timeout)
      }
    }

    const retryCfg = init.retry
    let attempt = 0
    while (true) {
      try {
        const result = await doFetch()
        opts?.onResponse?.({ id, ms: performance.now() - started, url })
        return result
      } catch (error) {
        opts?.onError?.({ id, error, url })
        if (!retryCfg || attempt >= retryCfg.attempts) throw error
        const delay = computeBackoffDelay(attempt, retryCfg)
        attempt++
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }

  return {
    id: transportId,
    url: init.url,
    request,
  }
}


