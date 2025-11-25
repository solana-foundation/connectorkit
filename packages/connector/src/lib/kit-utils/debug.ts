/**
 * @solana/connector - Kit Debug Utilities
 *
 * Simplified debug logging utilities for the connector.
 * Replaces gill's debug system with a connector-specific implementation.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

declare global {
    /**
     * Whether or not to enable debug mode. When enabled, default log level of `info`
     */
    // eslint-disable-next-line no-var
    var __CONNECTOR_DEBUG__: boolean | undefined;
    /**
     * Set the a desired level of logs to be output in the application
     *
     * - Default: `info`
     * - Options: `debug` | `info` | `warn` | `error`
     */
    // eslint-disable-next-line no-var
    var __CONNECTOR_DEBUG_LEVEL__: LogLevel | undefined;
}

/**
 * Get the minimum log level from environment or global settings
 */
function getMinLogLevel(): LogLevel {
    if (typeof process !== 'undefined' && process.env?.CONNECTOR_DEBUG_LEVEL) {
        return process.env.CONNECTOR_DEBUG_LEVEL as LogLevel;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as typeof globalThis & { __CONNECTOR_DEBUG_LEVEL__?: LogLevel }).__CONNECTOR_DEBUG_LEVEL__) {
        return (globalThis as typeof globalThis & { __CONNECTOR_DEBUG_LEVEL__?: LogLevel }).__CONNECTOR_DEBUG_LEVEL__!;
    }
    if (typeof window !== 'undefined' && (window as Window & { __CONNECTOR_DEBUG_LEVEL__?: LogLevel }).__CONNECTOR_DEBUG_LEVEL__) {
        return (window as Window & { __CONNECTOR_DEBUG_LEVEL__?: LogLevel }).__CONNECTOR_DEBUG_LEVEL__!;
    }
    return 'info';
}

/**
 * Check if the connector debug logger is enabled or not
 *
 * Enable debugging by setting any of the following to `true`:
 * - `process.env.CONNECTOR_DEBUG`
 * - `globalThis.__CONNECTOR_DEBUG__`
 * - `window.__CONNECTOR_DEBUG__`
 */
export function isDebugEnabled(): boolean {
    if (typeof process !== 'undefined') {
        if (process.env?.CONNECTOR_DEBUG_LEVEL) return true;
        if (process.env?.CONNECTOR_DEBUG === 'true' || process.env?.CONNECTOR_DEBUG === '1') return true;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as typeof globalThis & { __CONNECTOR_DEBUG__?: boolean }).__CONNECTOR_DEBUG__ === true) {
        return true;
    }
    if (typeof window !== 'undefined' && (window as Window & { __CONNECTOR_DEBUG__?: boolean }).__CONNECTOR_DEBUG__ === true) {
        return true;
    }
    return false;
}

/**
 * Log debug messages based on the desired application's logging level.
 *
 * @param message - the message contents to be logged
 * @param level - default: `info` (see: {@link LOG_LEVELS})
 * @param prefix - default: `[Connector]`
 *
 * To enable connector's debug logger, set any of the following to `true`:
 * - `process.env.CONNECTOR_DEBUG`
 * - `globalThis.__CONNECTOR_DEBUG__`
 * - `window.__CONNECTOR_DEBUG__`
 *
 * To set a desired level of logs to be output in the application, set the value of one of the following:
 * - `process.env.CONNECTOR_DEBUG_LEVEL`
 * - `globalThis.__CONNECTOR_DEBUG_LEVEL__`
 * - `window.__CONNECTOR_DEBUG_LEVEL__`
 */
export function debug(message: unknown, level: LogLevel = 'info', prefix: string = '[Connector]'): void {
    if (!isDebugEnabled()) return;

    if (LOG_LEVELS[level] < LOG_LEVELS[getMinLogLevel()]) return;

    const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message, null, 2);

    switch (level) {
        case 'debug':
            console.log(prefix, formattedMessage);
            break;
        case 'info':
            console.info(prefix, formattedMessage);
            break;
        case 'warn':
            console.warn(prefix, formattedMessage);
            break;
        case 'error':
            console.error(prefix, formattedMessage);
            break;
    }
}

