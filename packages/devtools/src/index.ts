/**
 * @solana/devtools
 *
 * Framework-agnostic devtools for @solana/connector
 *
 * Usage:
 * ```typescript
 * import { ConnectorDevtools } from '@solana/devtools';
 *
 * const devtools = new ConnectorDevtools();
 * devtools.mount(document.body);
 *
 * // Later, to cleanup
 * devtools.unmount();
 * ```
 */

// Main export
export { ConnectorDevtools } from './core';

// Types
export type {
    ConnectorDevtoolsInit,
    ConnectorDevtoolsConfig,
    ConnectorDevtoolsPlugin,
    PluginContext,
    DevtoolsPosition,
    DevtoolsTheme,
    DevtoolsPersistedState,
} from './types';

// Plugin creators (for custom plugins or extending defaults)
export { createOverviewPlugin } from './plugins/overview';
export { createEventsPlugin } from './plugins/events';
export { createTransactionsPlugin } from './plugins/transactions';
export { createIdlPlugin } from './plugins/idl';
