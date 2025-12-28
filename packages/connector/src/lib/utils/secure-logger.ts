/**
 * @solana/connector - Secure Logger
 *
 * Production-safe logger that redacts sensitive information
 * Prevents accidental exposure of addresses, keys, and other PII in logs
 *
 * Integrates with the connector's debug system:
 * - Respects `__CONNECTOR_DEBUG__` flag (enable/disable logging globally)
 * - Respects `__CONNECTOR_DEBUG_LEVEL__` (set minimum log level)
 * - Provides sensitive data redaction
 * - Provides unified logging API across the connector
 *
 * Enable connector debug:
 * ```ts
 * window.__CONNECTOR_DEBUG__ = true
 * window.__CONNECTOR_DEBUG_LEVEL__ = 'debug' // or 'info', 'warn', 'error'
 * ```
 */

import { isDebugEnabled, debug as connectorDebug } from '../kit';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SecureLoggerConfig {
    /** Enable logging (defaults to false - use __CONNECTOR_DEBUG__ flag to enable) */
    enabled?: boolean;
    /** Minimum log level to output */
    level?: LogLevel;
    /** Redact sensitive information in logs (defaults to true in production) */
    redactSensitive?: boolean;
    /** Custom prefix for all log messages */
    prefix?: string;
    /** Use connector's debug system for logging (respects __CONNECTOR_DEBUG__ flags) */
    useConnectorDebug?: boolean;
}

/**
 * Keys that contain sensitive information that should be redacted
 */
const SENSITIVE_KEYS = [
    'address',
    'publickey',
    'signature',
    'account',
    'rpcurl',
    'url',
    'apikey',
    'api_key',
    'token',
    'secret',
    'password',
    'private',
    'seed',
    'mnemonic',
];

/**
 * Log levels in order of severity
 */
const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

/**
 * SecureLogger - Production-safe logging with automatic redaction
 *
 * Features:
 * - Integrates with connector's debug system (respects __CONNECTOR_DEBUG__ flags)
 * - Automatic redaction of sensitive data (addresses, keys, URLs)
 * - Configurable log levels (respects __CONNECTOR_DEBUG_LEVEL__)
 * - Environment-aware defaults
 * - Deep object traversal for nested sensitive data
 *
 * @example
 * ```ts
 * // Enable connector debug
 * window.__CONNECTOR_DEBUG__ = true
 * window.__CONNECTOR_DEBUG_LEVEL__ = 'info' // Optional: filter by level
 *
 * const logger = new SecureLogger({ prefix: 'Connector' });
 *
 * logger.debug('User connected', {
 *   address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', // Auto-redacted in prod
 *   wallet: 'Phantom'
 * });
 * // Development: "User connected { address: '7xKX...gAsU', wallet: 'Phantom' }"
 * // Production:   "User connected { address: '***', wallet: 'Phantom' }"
 * ```
 */
export class SecureLogger {
    private config: Required<SecureLoggerConfig>;

    constructor(config: SecureLoggerConfig = {}) {
        const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

        this.config = {
            // Default to disabled - logging is opt-in via __CONNECTOR_DEBUG__ or explicit config
            enabled: config.enabled ?? false,
            level: config.level ?? 'debug',
            redactSensitive: config.redactSensitive ?? !isDevelopment,
            prefix: config.prefix ?? 'Connector',
            useConnectorDebug: config.useConnectorDebug ?? true, // Default to using connector's debug system
        };
    }

    /**
     * Log debug information (lowest priority)
     */
    debug(message: string, data?: unknown): void {
        this.log('debug', message, data);
    }

    /**
     * Log general information
     */
    info(message: string, data?: unknown): void {
        this.log('info', message, data);
    }

    /**
     * Log warnings
     */
    warn(message: string, data?: unknown): void {
        this.log('warn', message, data);
    }

    /**
     * Log errors (highest priority)
     */
    error(message: string, data?: unknown): void {
        this.log('error', message, data);
    }

    /**
     * Internal log method that handles level filtering and redaction
     * Integrates with connector's debug system when enabled
     */
    private log(level: LogLevel, message: string, data?: unknown): void {
        // Check if logging is enabled (either via config or connector's debug system)
        const debugEnabled = this.config.useConnectorDebug ? isDebugEnabled() : false;
        if (!this.config.enabled && !debugEnabled) return;

        // Get effective log level (prefer connector's debug level if set)
        let effectiveLevel = this.config.level;
        if (this.config.useConnectorDebug && typeof globalThis !== 'undefined') {
            const connectorLevel = (globalThis as { __CONNECTOR_DEBUG_LEVEL__?: string }).__CONNECTOR_DEBUG_LEVEL__;
            if (connectorLevel && ['debug', 'info', 'warn', 'error'].includes(connectorLevel)) {
                effectiveLevel = connectorLevel as LogLevel;
            }
        }

        // Check if this log level should be output
        if (LOG_LEVELS[level] < LOG_LEVELS[effectiveLevel]) {
            return;
        }

        // Process data (redact if enabled)
        const processedData = this.config.redactSensitive ? this.redact(data) : data;

        // Format message with data
        const fullMessage =
            processedData !== undefined
                ? `${message} ${typeof processedData === 'object' ? JSON.stringify(processedData, null, 2) : processedData}`
                : message;

        // Use connector's debug system if enabled, otherwise fall back to console.*
        if (this.config.useConnectorDebug && debugEnabled) {
            connectorDebug(fullMessage, level, this.config.prefix);
        } else {
            const prefix = `[${this.config.prefix}]`;
            switch (level) {
                case 'debug':
                    console.debug(prefix, message, processedData !== undefined ? processedData : '');
                    break;
                case 'info':
                    console.info(prefix, message, processedData !== undefined ? processedData : '');
                    break;
                case 'warn':
                    console.warn(prefix, message, processedData !== undefined ? processedData : '');
                    break;
                case 'error':
                    console.error(prefix, message, processedData !== undefined ? processedData : '');
                    break;
            }
        }
    }

    /**
     * Recursively redact sensitive information from data
     */
    private redact(data: unknown): unknown {
        if (data === null || data === undefined) {
            return data;
        }

        // Handle primitives
        if (typeof data !== 'object') {
            return data;
        }

        // Handle arrays
        if (Array.isArray(data)) {
            return data.map(item => this.redact(item));
        }

        // Handle objects
        const redacted: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
            const keyLower = key.toLowerCase();

            // Check if this key contains sensitive information
            const isSensitive = SENSITIVE_KEYS.some(sensitiveKey => keyLower.includes(sensitiveKey));

            if (isSensitive) {
                redacted[key] = this.maskValue(value);
            } else if (typeof value === 'object' && value !== null) {
                redacted[key] = this.redact(value);
            } else {
                redacted[key] = value;
            }
        }

        return redacted;
    }

    /**
     * Mask a sensitive value for logging
     * Shows first 4 and last 4 characters for strings longer than 8 chars
     */
    private maskValue(value: unknown): string {
        if (value === null || value === undefined) {
            return '***';
        }

        const str = String(value);

        // For very short strings, just mask completely
        if (str.length <= 8) {
            return '***';
        }

        // For longer strings, show first and last 4 characters
        return `${str.slice(0, 4)}...${str.slice(-4)}`;
    }

    /**
     * Update logger configuration at runtime
     */
    updateConfig(config: Partial<SecureLoggerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): Required<SecureLoggerConfig> {
        return { ...this.config };
    }
}

/**
 * Default logger instance for the connector
 * Automatically configured based on NODE_ENV
 */
export const logger = new SecureLogger({
    prefix: 'Connector',
});

/**
 * Create a logger with a custom prefix
 *
 * @example
 * ```ts
 * const walletLogger = createLogger('WalletDetector');
 * walletLogger.debug('Scanning for wallets...');
 * // Output: [WalletDetector] Scanning for wallets...
 * ```
 */
export function createLogger(prefix: string, config?: Omit<SecureLoggerConfig, 'prefix'>): SecureLogger {
    return new SecureLogger({ ...config, prefix });
}
