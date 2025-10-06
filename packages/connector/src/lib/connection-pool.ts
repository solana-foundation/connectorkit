/**
 * @connector-kit/connector - RPC Connection Pooling
 * 
 * Connection pooling for RPC endpoints to improve performance by reusing
 * connection instances when the cluster hasn't changed.
 * 
 * This prevents creating new Connection objects on every render or state update,
 * which can be expensive in terms of memory and initialization time.
 */

import type { SolanaCluster } from '@wallet-ui/core'
import { getClusterRpcUrl } from '../utils/cluster'

/**
 * Minimal connection interface
 * Represents any connection-like object with an RPC endpoint
 */
export interface ConnectionLike {
	/** The RPC endpoint URL */
	rpcEndpoint: string
	/** Optional: additional connection metadata */
	[key: string]: any
}

/**
 * Options for configuring the connection pool
 */
export interface ConnectionPoolOptions {
	/** 
	 * Maximum number of connections to cache
	 * Older connections are evicted when limit is reached
	 * @default 10
	 */
	maxSize?: number
	
	/**
	 * Custom connection factory function
	 * Use this to create your own connection instances (e.g., @solana/web3.js Connection)
	 * 
	 * @example
	 * ```ts
	 * import { Connection } from '@solana/web3.js'
	 * 
	 * const pool = new ConnectionPool({
	 *   createConnection: (cluster) => new Connection(cluster.endpoint)
	 * })
	 * ```
	 */
	createConnection?: (cluster: SolanaCluster) => ConnectionLike
}

/**
 * Pool statistics for monitoring and debugging
 */
export interface ConnectionPoolStats {
	/** Current number of cached connections */
	size: number
	/** Maximum pool capacity */
	maxSize: number
	/** List of cluster IDs currently cached */
	keys: string[]
	/** Total number of cache hits (connections reused) */
	hits?: number
	/** Total number of cache misses (new connections created) */
	misses?: number
}

/**
 * Simple connection pool for RPC endpoints
 * 
 * Prevents creating new Connection objects on every render by caching
 * connections per cluster ID. Automatically evicts oldest connections
 * when the pool reaches capacity.
 * 
 * @example
 * ```ts
 * import { ConnectionPool } from '@connector-kit/connector/headless'
 * import { Connection } from '@solana/web3.js'
 * 
 * // Create pool with custom factory
 * const pool = new ConnectionPool({
 *   maxSize: 5,
 *   createConnection: (cluster) => new Connection(cluster.endpoint, 'confirmed')
 * })
 * 
 * // Get or create connection for a cluster
 * const connection = pool.get(currentCluster)
 * 
 * // Clear specific connection when cluster settings change
 * pool.clear('solana:mainnet')
 * 
 * // Get pool statistics
 * const stats = pool.getStats()
 * console.log(`Pool has ${stats.size}/${stats.maxSize} connections`)
 * ```
 */
export class ConnectionPool {
	private pool = new Map<string, ConnectionLike>()
	private accessTimes = new Map<string, number>()
	private maxSize: number
	private createConnection: (cluster: SolanaCluster) => ConnectionLike
	
	// Statistics
	private hits = 0
	private misses = 0
	
	constructor(options: ConnectionPoolOptions = {}) {
		this.maxSize = options.maxSize ?? 10
		this.createConnection = options.createConnection ?? this.defaultFactory
		
		// Validate maxSize
		if (this.maxSize < 1) {
			throw new Error('ConnectionPool maxSize must be at least 1')
		}
	}
	
	/**
	 * Get or create a connection for a cluster
	 * Returns cached connection if available, otherwise creates new one
	 * 
	 * @param cluster - The Solana cluster to get a connection for
	 * @returns Connection instance for the cluster
	 * 
	 * @example
	 * ```ts
	 * const connection = pool.get(cluster)
	 * const balance = await connection.getBalance(publicKey)
	 * ```
	 */
	get(cluster: SolanaCluster): ConnectionLike {
		const key = cluster.id
		
		// Return cached connection if available (cache hit)
		if (this.pool.has(key)) {
			this.accessTimes.set(key, Date.now())
			this.hits++
			return this.pool.get(key)!
		}
		
		// Cache miss - create new connection
		this.misses++
		const connection = this.createConnection(cluster)
		
		// Evict oldest connection if pool is full
		if (this.pool.size >= this.maxSize) {
			this.evictOldest()
		}
		
		// Cache the new connection
		this.pool.set(key, connection)
		this.accessTimes.set(key, Date.now())
		
		return connection
	}
	
	/**
	 * Check if a connection exists in the pool
	 * Does not create a connection if it doesn't exist
	 * 
	 * @param clusterId - The cluster ID to check
	 * @returns True if connection is cached, false otherwise
	 */
	has(clusterId: string): boolean {
		return this.pool.has(clusterId)
	}
	
	/**
	 * Clear a specific connection from pool
	 * Use this when cluster configuration changes (e.g., custom RPC URL updated)
	 * 
	 * @param clusterId - The cluster ID to clear
	 * 
	 * @example
	 * ```ts
	 * // User changed mainnet RPC URL in settings
	 * pool.clear('solana:mainnet')
	 * // Next get() will create a new connection with updated settings
	 * ```
	 */
	clear(clusterId: string): void {
		this.pool.delete(clusterId)
		this.accessTimes.delete(clusterId)
	}
	
	/**
	 * Clear all cached connections
	 * Use this when resetting application state or on logout
	 * 
	 * @example
	 * ```ts
	 * // Clear all connections on logout
	 * function handleLogout() {
	 *   pool.clearAll()
	 *   // ... other logout logic
	 * }
	 * ```
	 */
	clearAll(): void {
		this.pool.clear()
		this.accessTimes.clear()
	}
	
	/**
	 * Get pool statistics for monitoring and debugging
	 * Includes cache hit/miss rates for performance analysis
	 * 
	 * @returns Object with pool statistics
	 * 
	 * @example
	 * ```ts
	 * const stats = pool.getStats()
	 * console.log(`Cache hit rate: ${stats.hits / (stats.hits + stats.misses) * 100}%`)
	 * console.log(`Pool utilization: ${stats.size}/${stats.maxSize}`)
	 * ```
	 */
	getStats(): ConnectionPoolStats {
		return {
			size: this.pool.size,
			maxSize: this.maxSize,
			keys: Array.from(this.pool.keys()),
			hits: this.hits,
			misses: this.misses
		}
	}
	
	/**
	 * Reset pool statistics
	 * Useful for benchmarking or monitoring specific time periods
	 */
	resetStats(): void {
		this.hits = 0
		this.misses = 0
	}
	
	/**
	 * Evict the oldest (least recently accessed) connection from the pool
	 * Called automatically when pool reaches capacity
	 */
	private evictOldest(): void {
		let oldestKey: string | null = null
		let oldestTime = Infinity
		
		// Find the connection with the oldest access time
		for (const [key, time] of this.accessTimes) {
			if (time < oldestTime) {
				oldestTime = time
				oldestKey = key
			}
		}
		
		// Remove the oldest connection
		if (oldestKey) {
			this.pool.delete(oldestKey)
			this.accessTimes.delete(oldestKey)
		}
	}
	
	/**
	 * Default connection factory
	 * Creates a minimal connection object with just the RPC endpoint
	 */
	private defaultFactory(cluster: SolanaCluster): ConnectionLike {
		return {
			rpcEndpoint: getClusterRpcUrl(cluster)
		}
	}
}

/**
 * Global connection pool singleton
 * Used by getConnectionPool() for convenience
 */
let globalPool: ConnectionPool | null = null

/**
 * Get the global connection pool instance
 * Creates it on first access with default settings
 * 
 * Use this for simple cases where you don't need custom pool configuration
 * 
 * @returns The global ConnectionPool instance
 * 
 * @example
 * ```ts
 * import { getConnectionPool } from '@connector-kit/connector/headless'
 * 
 * const pool = getConnectionPool()
 * const connection = pool.get(cluster)
 * ```
 */
export function getConnectionPool(): ConnectionPool {
	if (!globalPool) {
		globalPool = new ConnectionPool()
	}
	return globalPool
}

/**
 * Create a custom connection pool with specific configuration
 * Use this when you need control over pool size or connection creation
 * 
 * @param options - Pool configuration options
 * @returns New ConnectionPool instance
 * 
 * @example
 * ```ts
 * import { createConnectionPool } from '@connector-kit/connector/headless'
 * import { Connection } from '@solana/web3.js'
 * 
 * const pool = createConnectionPool({
 *   maxSize: 20,
 *   createConnection: (cluster) => {
 *     return new Connection(cluster.endpoint, {
 *       commitment: 'confirmed',
 *       wsEndpoint: cluster.wsEndpoint
 *     })
 *   }
 * })
 * ```
 */
export function createConnectionPool(options?: ConnectionPoolOptions): ConnectionPool {
	return new ConnectionPool(options)
}

