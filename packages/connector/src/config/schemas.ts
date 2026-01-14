/**
 * @solana/connector - Configuration Schemas
 *
 * Zod schemas for runtime validation of configuration options.
 * These schemas provide type-safe validation with helpful error messages.
 */

import { z } from 'zod/v4';

// ============================================================================
// Primitive Schemas
// ============================================================================

/**
 * Valid Solana network values
 */
export const solanaNetworkSchema = z.enum(['mainnet', 'mainnet-beta', 'devnet', 'testnet', 'localnet']);

/**
 * Solana cluster ID format (e.g., 'solana:mainnet', 'solana:devnet')
 */
export const solanaClusterIdSchema = z.string().regex(/^solana:(mainnet|devnet|testnet|localnet|[a-zA-Z0-9-]+)$/, {
    message: 'Cluster ID must be in format "solana:<network>" (e.g., "solana:mainnet")',
});

/**
 * URL validation with protocol check
 */
export const urlSchema = z.string().url('Invalid URL format');

/**
 * Optional URL that allows undefined
 */
export const optionalUrlSchema = urlSchema.optional();

// ============================================================================
// CoinGecko Configuration
// ============================================================================

export const coinGeckoConfigSchema = z
    .strictObject({
        apiKey: z.string().optional(),
        isPro: z.boolean().optional(),
        maxRetries: z.number().int().positive().max(10).optional(),
        baseDelay: z.number().int().positive().max(30000).optional(),
        maxTimeout: z.number().int().positive().max(120000).optional(),
    })
    .optional();

// ============================================================================
// WalletConnect Configuration
// ============================================================================

/**
 * WalletConnect metadata schema
 */
export const walletConnectMetadataSchema = z.object({
    name: z.string().min(1, 'WalletConnect app name is required'),
    description: z.string(),
    url: urlSchema,
    icons: z.array(z.string()),
});

/**
 * WalletConnect detailed object configuration schema
 */
export const walletConnectObjectConfigSchema = z.object({
    enabled: z.boolean().optional(),
    projectId: z.string().min(1, 'WalletConnect projectId is required'),
    metadata: walletConnectMetadataSchema,
    defaultChain: z.enum(['solana:mainnet', 'solana:devnet', 'solana:testnet']).optional(),
    onDisplayUri: z.custom<(uri: string) => void>(val => typeof val === 'function').optional(),
    onSessionEstablished: z.custom<() => void>(val => typeof val === 'function').optional(),
    onSessionDisconnected: z.custom<() => void>(val => typeof val === 'function').optional(),
    relayUrl: urlSchema.optional(),
});

/**
 * WalletConnect configuration schema
 * Accepts either:
 * - `true` (boolean shorthand to enable with defaults)
 * - Detailed object configuration with projectId and metadata
 */
export const walletConnectConfigSchema = z.union([z.literal(true), walletConnectObjectConfigSchema]).optional();

// ============================================================================
// Storage Configuration
// ============================================================================

/**
 * Storage adapter interface schema (validates shape, not implementation)
 */
export const storageAdapterSchema = z.looseObject({
    get: z.custom<(...args: unknown[]) => unknown>((val: unknown) => typeof val === 'function'),
    set: z.custom<(...args: unknown[]) => unknown>((val: unknown) => typeof val === 'function'),
});

export const storageConfigSchema = z
    .object({
        account: storageAdapterSchema,
        cluster: storageAdapterSchema,
        wallet: storageAdapterSchema,
    })
    .optional();

// ============================================================================
// Cluster Configuration
// ============================================================================

/**
 * SolanaCluster object schema
 */
export const solanaClusterSchema = z.object({
    id: solanaClusterIdSchema,
    label: z.string().min(1, 'Cluster label cannot be empty'),
    url: urlSchema,
    urlWs: urlSchema.optional(),
});

export const clusterConfigSchema = z
    .object({
        clusters: z.array(solanaClusterSchema).optional(),
        persistSelection: z.boolean().optional(),
        initialCluster: solanaClusterIdSchema.optional(),
    })
    .optional();

// ============================================================================
// Default Config Options
// ============================================================================

/**
 * Wallet Standard wallet schema (shallow validation - just check it's an object with required fields)
 */
export const walletSchema = z.custom<import('@wallet-standard/base').Wallet>(
    (val: unknown) =>
        typeof val === 'object' &&
        val !== null &&
        'name' in val &&
        'version' in val &&
        'features' in val &&
        'chains' in val,
    { message: 'Invalid Wallet Standard wallet object' },
);

/**
 * Wallet list controls for Wallet Standard auto-discovery.
 * Matches by wallet display name (case-insensitive, exact match after trimming).
 */
export const walletDisplayConfigSchema = z
    .object({
        allowList: z.array(z.string()).optional(),
        denyList: z.array(z.string()).optional(),
        featured: z.array(z.string()).optional(),
    })
    .optional();

export const defaultConfigOptionsSchema = z.object({
    // Required
    appName: z.string().min(1, 'Application name is required'),

    // Optional strings
    appUrl: optionalUrlSchema,
    imageProxy: z.string().optional(),
    clusterStorageKey: z.string().optional(),

    // Optional booleans
    autoConnect: z.boolean().optional(),
    debug: z.boolean().optional(),
    enableMobile: z.boolean().optional(),
    persistClusterSelection: z.boolean().optional(),
    enableErrorBoundary: z.boolean().optional(),

    // Network
    network: solanaNetworkSchema.optional(),

    // Numbers
    maxRetries: z.number().int().positive().max(10).optional(),

    // Complex types
    storage: storageConfigSchema,
    clusters: z.array(solanaClusterSchema).optional(),
    customClusters: z.array(solanaClusterSchema).optional(),
    programLabels: z.record(z.string(), z.string()).optional(),
    coingecko: coinGeckoConfigSchema,
    walletConnect: walletConnectConfigSchema,

    // Additional wallets (remote signers, etc.)
    additionalWallets: z.array(walletSchema).optional(),

    // Wallet display controls
    wallets: walletDisplayConfigSchema,

    // Functions (can't validate implementation, just existence)
    onError: z.custom<(...args: unknown[]) => unknown>((val: unknown) => typeof val === 'function').optional(),
});

// ============================================================================
// Connector Config (for ConnectorClient)
// ============================================================================

export const connectorConfigSchema = z
    .strictObject({
        autoConnect: z.boolean().optional(),
        debug: z.boolean().optional(),
        wallets: walletDisplayConfigSchema,
        storage: storageConfigSchema,
        cluster: clusterConfigSchema,
        imageProxy: z.string().optional(),
        programLabels: z.record(z.string(), z.string()).optional(),
        coingecko: coinGeckoConfigSchema,
        walletConnect: walletConnectConfigSchema,
        additionalWallets: z.array(walletSchema).optional(),
    })
    .optional();

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type SolanaNetworkInput = z.input<typeof solanaNetworkSchema>;
export type SolanaClusterIdInput = z.input<typeof solanaClusterIdSchema>;
export type CoinGeckoConfigInput = z.input<typeof coinGeckoConfigSchema>;
export type WalletConnectConfigInput = z.input<typeof walletConnectConfigSchema>;
export type DefaultConfigOptionsInput = z.input<typeof defaultConfigOptionsSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate configuration options and return a result with helpful errors
 *
 * @example
 * ```ts
 * const result = validateConfigOptions({
 *   appName: 'My App',
 *   network: 'mainnet',
 * });
 *
 * if (!result.success) {
 *   console.error('Config validation failed:', result.error.format());
 * }
 * ```
 */
export function validateConfigOptions(options: unknown): z.ZodSafeParseResult<DefaultConfigOptionsInput> {
    return defaultConfigOptionsSchema.safeParse(options);
}

/**
 * Parse and validate config options, throwing on error with formatted message
 *
 * @throws {z.ZodError} If validation fails
 *
 * @example
 * ```ts
 * try {
 *   const validOptions = parseConfigOptions(userInput);
 *   // validOptions is typed and validated
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.error(error.format());
 *   }
 * }
 * ```
 */
export function parseConfigOptions(options: unknown): DefaultConfigOptionsInput {
    return defaultConfigOptionsSchema.parse(options);
}
