/**
 * Arc RPC Manager - Singleton Connection Pool
 */

import { 
  createSolanaRpc,
  createSolanaRpcSubscriptions
} from '@solana/kit'

// Type aliases for RPC clients
type SolanaRpc = ReturnType<typeof createSolanaRpc>
type SolanaRpcSubscriptions = ReturnType<typeof createSolanaRpcSubscriptions>

export interface RpcConnectionConfig {
  rpcUrl: string
  commitment?: 'processed' | 'confirmed' | 'finalized'
}

/**
 * Singleton RPC connection manager
 */
class ArcRpcManager {
  private static instance: ArcRpcManager
  
  // Connection pools
  private rpcPool = new Map<string, SolanaRpc>()
  private wsPool = new Map<string, SolanaRpcSubscriptions>()
  
  // Connection tracking
  private connectionCount = new Map<string, number>()
  private cleanupTimers = new Map<string, NodeJS.Timeout>()
  
  // Cleanup config
  private readonly CLEANUP_DELAY = 30000 // 30s after last usage
  private readonly MAX_CONNECTIONS = 5   // Safety limit
  
  private constructor() {
    // Singleton pattern
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      // Browser cleanup on page unload
      (globalThis as any).window.addEventListener('beforeunload', () => this.cleanup())
    }
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): ArcRpcManager {
    if (!ArcRpcManager.instance) {
      ArcRpcManager.instance = new ArcRpcManager()
    }
    return ArcRpcManager.instance
  }
  
  /**
   * Get or create RPC connection
   * 
   * @param config - RPC configuration
   * @returns Shared RPC client
   */
  getRpc(config: RpcConnectionConfig): SolanaRpc {
    const key = this.getConnectionKey(config)
    
    // Return existing connection if available
    if (this.rpcPool.has(key)) {
      this.incrementUsage(key)
      return this.rpcPool.get(key)!
    }
    
    // Check connection limit
    if (this.rpcPool.size >= this.MAX_CONNECTIONS) {
      const oldestKey = this.rpcPool.keys().next().value!
      this.incrementUsage(oldestKey)
      return this.rpcPool.get(oldestKey)!
    }
    
    // Create new connection
    const rpc = createSolanaRpc(config.rpcUrl!)
    this.rpcPool.set(key, rpc)
    this.incrementUsage(key)
    
    return rpc
  }
  
  /**
   * Get or create WebSocket connection
   * 
   * @param config - RPC configuration
   * @returns Shared WebSocket client
   */
  getWebSocket(config: RpcConnectionConfig): SolanaRpcSubscriptions {
    const key = this.getConnectionKey(config)
    
    // Return existing connection if available
    if (this.wsPool.has(key)) {
      this.incrementUsage(key)
      return this.wsPool.get(key)!
    }
    
    // Check connection limit
    if (this.wsPool.size >= this.MAX_CONNECTIONS) {
      const oldestKey = this.wsPool.keys().next().value!
      this.incrementUsage(oldestKey)
      return this.wsPool.get(oldestKey)!
    }
    
    // Create new WebSocket connection
    const wsUrl = config.rpcUrl!.replace('https://', 'wss://').replace('http://', 'ws://')
    const ws = createSolanaRpcSubscriptions(wsUrl)
    this.wsPool.set(key, ws)
    this.incrementUsage(key)
    
    return ws
  }
  
  /**
   * Release connection (decrement usage)
   * Schedules cleanup if no more users
   */
  releaseConnection(config: RpcConnectionConfig): void {
    const key = this.getConnectionKey(config)
    const currentCount = this.connectionCount.get(key) || 0
    
    if (currentCount > 1) {
      this.connectionCount.set(key, currentCount - 1)
    } else {
      // Schedule cleanup after delay
      this.scheduleCleanup(key)
    }
  }
  
  /**
   * Force cleanup all connections
   */
  cleanup(): void {
    // Clear all timers
    this.cleanupTimers.forEach(timer => clearTimeout(timer))
    this.cleanupTimers.clear()
    
    // Close all connections
    this.rpcPool.clear()
    this.wsPool.clear()
    this.connectionCount.clear()
  }
  
  /**
   * Get connection statistics
   */
  getStats() {
    return {
      rpcConnections: this.rpcPool.size,
      wsConnections: this.wsPool.size,
      activeUsage: Array.from(this.connectionCount.entries()),
      totalMemoryFootprint: this.rpcPool.size + this.wsPool.size
    }
  }
  
  // Private methods
  
  private getConnectionKey(config: RpcConnectionConfig): string {
    return `${config.rpcUrl}:${config.commitment || 'confirmed'}`
  }
  
  private incrementUsage(key: string): void {
    const current = this.connectionCount.get(key) || 0
    this.connectionCount.set(key, current + 1)
    
    // Cancel any pending cleanup
    const timer = this.cleanupTimers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.cleanupTimers.delete(key)
    }
  }
  
  private scheduleCleanup(key: string): void {
    const timer = setTimeout(() => {
      this.rpcPool.delete(key)
      this.wsPool.delete(key)
      this.connectionCount.delete(key)
      this.cleanupTimers.delete(key)
    }, this.CLEANUP_DELAY)
    
    this.cleanupTimers.set(key, timer)
  }
}

// Export singleton instance and convenience functions
export const rpcManager = ArcRpcManager.getInstance()

/**
 * Get shared RPC connection
 * 
 * USE THIS instead of createSolanaRpc() in hooks!
 * 
 * @param rpcUrl - RPC endpoint URL
 * @param commitment - Transaction confirmation level
 * @returns Shared, pooled RPC client
 */
export function getSharedRpc(rpcUrl: string, commitment?: 'processed' | 'confirmed' | 'finalized'): SolanaRpc {
  return rpcManager.getRpc({ rpcUrl, commitment: commitment || 'confirmed' })
}

/**
 * Get shared WebSocket connection
 * 
 * USE THIS instead of createSolanaRpcSubscriptions() in hooks!
 * 
 * @param rpcUrl - RPC endpoint URL (will be converted to WebSocket URL)
 * @param commitment - Transaction confirmation level
 * @returns Shared, pooled WebSocket client
 */
export function getSharedWebSocket(rpcUrl: string, commitment?: 'processed' | 'confirmed' | 'finalized'): SolanaRpcSubscriptions {
  return rpcManager.getWebSocket({ rpcUrl, commitment: commitment || 'confirmed' })
}

/**
 * Release RPC connection when component unmounts
 * 
 * Call this in useEffect cleanup to properly manage connection lifecycle
 * 
 * @param rpcUrl - RPC endpoint URL
 * @param commitment - Transaction confirmation level
 */
export function releaseRpcConnection(rpcUrl: string, commitment?: 'processed' | 'confirmed' | 'finalized'): void {
  rpcManager.releaseConnection({ rpcUrl, commitment: commitment || 'confirmed' })
}

/**
 * Get RPC connection statistics
 * Useful for debugging and performance monitoring
 */
export function getRpcStats() {
  return rpcManager.getStats()
}

/**
 * Force cleanup all RPC connections
 * Use sparingly - mainly for testing or app shutdown
 */
export function cleanupAllRpcConnections() {
  rpcManager.cleanup()
}