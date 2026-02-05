# @solana/devtools

Framework-agnostic devtools for `@solana/connector`. Works with any web framework via the imperative DOM API.

## Features

- **Framework-agnostic**: Pure DOM-based UI using Web Components
- **Auto-detection**: Automatically finds `window.__connectorClient` when available
- **TanStack-style API**: Simple `mount(el)` / `unmount()` lifecycle
- **Plugin system**: Built-in Overview, Events, Transactions, and IDL tabs
- **In-flight transactions**: Captures `transaction:preparing` before a signature exists and progresses through signing → sent
- **Transaction inspection**: Decodes wire bytes (fee payer, size, compute budget) and fetches RPC details (status/confirmations + `getTransaction` JSON/logs)
- **IDL interaction**: Fetch Program Metadata IDLs (seed: `idl`) and execute modern Anchor instructions from the devtools panel
- **Persistent settings + cache**: Remembers panel state and persists a devtools cache (clearable from the UI)

## Installation

```bash
npm install @solana/devtools
```

## Usage

### Basic Usage (with auto-detection)

When using `@solana/connector/react` with `ConnectorProvider`, the client is automatically exposed on `window.__connectorClient`:

```typescript
import { ConnectorDevtools } from '@solana/devtools';

// Create devtools instance (auto-detects client from window.__connectorClient)
const devtools = new ConnectorDevtools();

// Mount to DOM
const container = document.createElement('div');
document.body.appendChild(container);
devtools.mount(container);

// Later, to cleanup
devtools.unmount();
```

### Manual Client Injection

If you're using the headless API or want explicit control:

```typescript
import { ConnectorDevtools } from '@solana/devtools';
import { ConnectorClient } from '@solana/connector/headless';

const client = new ConnectorClient({ debug: true });

const devtools = new ConnectorDevtools({
    client, // explicit client reference
    config: {
        position: 'bottom-right',
        theme: 'dark',
        defaultOpen: true,
    },
});

devtools.mount(document.body);
```

### Next.js Integration

```tsx
'use client';

import { useEffect } from 'react';

export function DevtoolsLoader() {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;

        let devtools: any;

        import('@solana/devtools').then(({ ConnectorDevtools }) => {
            devtools = new ConnectorDevtools();
            const container = document.createElement('div');
            container.id = 'connector-devtools';
            document.body.appendChild(container);
            devtools.mount(container);
        });

        return () => {
            devtools?.unmount();
            document.getElementById('connector-devtools')?.remove();
        };
    }, []);

    return null;
}
```

### IDL Tab (Interact with program instructions)

The **IDL** tab lets you fetch a program’s IDL from **Program Metadata** or **Anchor IDL** and execute instructions using the currently connected wallet.

- **Fetch from chain**: Enter a program id, select **Program Metadata** or **Anchor IDL**, and click **Fetch** (requires an RPC URL via `config.rpcUrl` or the connector cluster).
- **Local override**: Use **Paste JSON** / **Upload JSON** to load an IDL from your codebase during development.
- **Execute**: Select an instruction, fill accounts/args, then click **Execute**.
- **Auto-prefill (Explorer-like)**:
    - Known program accounts (System/Token/Associated Token, etc.) are filled when detected by name.
    - Wallet-controlled accounts (authority/owner/payer/signer patterns) are filled with the connected wallet.
    - PDA accounts are computed when seeds are available and filled automatically (locked by default; toggle **PDAs: Locked/Editable**).
    - Use **Reset** to clear inputs and re-apply prefills.
- **Safety**: On mainnet, you’ll be prompted before sending a real transaction.

Note: v1 supports **modern Anchor IDLs**.

## Configuration

```typescript
interface ConnectorDevtoolsConfig {
    /** Position of the trigger button */
    position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
    /** Color theme */
    theme?: 'dark' | 'light' | 'system';
    /** Start with panel open */
    defaultOpen?: boolean;
    /** Initial panel height in pixels */
    panelHeight?: number;
    /** Hide the trigger button */
    triggerHidden?: boolean;
    /** Maximum events to keep in memory */
    maxEvents?: number;
    /** Maximum transactions to track */
    maxTransactions?: number;
    /**
     * Optional RPC URL used by the Transactions tab for RPC fetches.
     * If omitted, devtools uses the connector's current cluster RPC URL.
     */
    rpcUrl?: string;
    /**
     * Optional session/build id for scoping the persisted devtools cache.
     * If this value changes between page loads, the cached history is discarded.
     */
    persistSessionId?: string;
}
```

## API Reference

### `ConnectorDevtools`

```typescript
class ConnectorDevtools {
    constructor(init?: ConnectorDevtoolsInit);
    mount(el: HTMLElement): void;
    unmount(): void;
    setConfig(config: Partial<ConnectorDevtoolsConfig>): void;
}
```

### `ConnectorDevtoolsInit`

```typescript
interface ConnectorDevtoolsInit {
    /** ConnectorClient instance (auto-detected if not provided) */
    client?: ConnectorClient;
    /** Initial configuration */
    config?: Partial<ConnectorDevtoolsConfig>;
    /** Custom plugins (in addition to built-in ones) */
    plugins?: ConnectorDevtoolsPlugin[];
}
```

### Plugin API

```typescript
interface ConnectorDevtoolsPlugin {
    /** Unique plugin identifier */
    id: string;
    /** Display name for the tab */
    name: string;
    /** Render function called when tab is activated */
    render: (el: HTMLElement, ctx: PluginContext) => void;
    /** Cleanup function called when unmounting */
    destroy?: () => void;
}

interface PluginContext {
    client: ConnectorClient;
    theme: 'dark' | 'light';
    subscribe: (callback: () => void) => () => void;
    getConfig: () => ConnectorDevtoolsConfig;
    getCache?: () => DevtoolsCacheV1;
    subscribeCache?: (callback: () => void) => () => void;
    updateCache?: (updater: (cache: DevtoolsCacheV1) => DevtoolsCacheV1) => void;
    clearCache?: (scope?: 'all' | 'events' | 'transactions') => void;
}
```

## License

MIT
