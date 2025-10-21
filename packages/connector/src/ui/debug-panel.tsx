/**
 * @solana/connector - Debug Panel (Deprecated)
 *
 * The debug panel has been moved to its own package: @solana/connector-debugger
 *
 * @deprecated This file is deprecated and will be removed in a future version.
 * Install @solana/connector-debugger and import from '@solana/connector-debugger/react' instead.
 *
 * Migration:
 * 1. Install: pnpm add @solana/connector-debugger
 * 2. Update imports:
 *    - FROM: import { ConnectorDebugPanel } from '@solana/connector/react'
 *    - TO:   import { ConnectorDebugPanel } from '@solana/connector-debugger/react'
 */

import { createLogger } from '../lib/utils/secure-logger';

const logger = createLogger('DebugPanel');

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    logger.warn(
        'Importing ConnectorDebugPanel from @solana/connector is deprecated. ' +
            'Please install @solana/connector-debugger and import from @solana/connector-debugger/react instead. ' +
            'This export will be removed in the next major version.',
    );
}
