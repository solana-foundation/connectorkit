/**
 * Connector Kit - Shared Constants
 *
 * Centralized constant values for timeouts, intervals, and other magic numbers
 * used throughout the connector library.
 */

// ============================================================================
// Timing Constants
// ============================================================================

/**
 * Auto-connect initialization delay in milliseconds
 * Allows wallet detection to complete before attempting connection
 */
export const AUTO_CONNECT_DELAY_MS = 100;

/**
 * State notification debounce delay in milliseconds
 * Batches rapid state updates to prevent excessive re-renders (one frame at 60fps)
 */
export const STATE_NOTIFY_DEBOUNCE_MS = 16;

/**
 * Clipboard "copied" indicator duration in milliseconds
 */
export const COPY_FEEDBACK_DURATION_MS = 2000;

// ============================================================================
// Polling Constants (for wallets without event support)
// ============================================================================

/**
 * Maximum number of polling attempts before giving up
 * At current intervals, this equals approximately 1 minute of polling
 */
export const MAX_POLL_ATTEMPTS = 20;

/**
 * Polling interval pattern with exponential backoff (in milliseconds)
 * Pattern: 1s, 2s, 3s, 5s, 5s (continues at 5s)
 */
export const POLL_INTERVALS_MS = [1000, 2000, 3000, 5000, 5000] as const;

// ============================================================================
// Configuration Defaults
// ============================================================================

/**
 * Default maximum retry attempts for error recovery
 */
export const DEFAULT_MAX_RETRIES = 3;

/**
 * Default maximum tracked transactions in debugger
 */
export const DEFAULT_MAX_TRACKED_TRANSACTIONS = 20;
