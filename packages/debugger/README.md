# @connector-kit/debugger

Development debug panel for `@connector-kit/connector` with advanced transaction analysis capabilities.

## Features

### Core Debugging

- 📊 **Overview Tab**: Comprehensive status dashboard
- 📝 **Transactions Tab**: Real-time transaction tracking with explorer links
- 📡 **Events Tab**: Real-time event stream with pause/clear controls

### Advanced Transaction Analysis

- 🔍 **Program Logs**: View execution logs with syntax highlighting
- 📋 **Instruction Decoder**: See decoded instruction types
- ⚡ **Compute Units**: Track performance per instruction
- 🐛 **Enhanced Errors**: Human-readable error messages
- 🎯 **Lazy Loading**: Fetch details only when needed

## Installation

```bash
npm install @connector-kit/debugger
# or
pnpm add @connector-kit/debugger
# or
yarn add @connector-kit/debugger
```

## Usage

```tsx
import { AppProvider } from '@connector-kit/connector/react';
import { ConnectorDebugPanel } from '@connector-kit/debugger/react';
import { getDefaultConfig } from '@connector-kit/connector/headless';

function App() {
    const config = getDefaultConfig({
        appName: 'My App',
        appUrl: 'https://myapp.com',
    });

    return (
        <AppProvider connectorConfig={config}>
            {/* Your app */}

            {/* Debug panel - only visible in development */}
            {process.env.NODE_ENV === 'development' && <ConnectorDebugPanel />}
        </AppProvider>
    );
}
```

## Transaction Analysis

The debugger now includes powerful transaction analysis features extracted from Solana Explorer:

### Program Logs

View detailed execution logs for each transaction:

```
✅ Instruction #1 (Token Program)              2,452 CU
   > Program invoked: Token Program
   > Program logged: "Transfer 1000000"
   > Program returned success
```

- Color-coded messages (success, error, info, muted)
- Compute units per instruction
- Nested program call indentation
- Truncation warnings

### Instruction Decoding

See decoded instruction types instead of raw data:

```
#1: Transfer (Token Program)
    TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA

#2: Create Account (System Program)
    11111111111111111111111111111111
```

### Enhanced Errors

Get human-readable error messages:

```
❌ Instruction #0: insufficient funds for instruction
```

Instead of raw error objects.

## Props

```tsx
interface DebugPanelProps {
    /** Position of the debug panel on screen (default: 'bottom-right') */
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

    /** Whether to show the panel expanded by default (default: false) */
    defaultOpen?: boolean;

    /** Default tab to show (default: 'overview') */
    defaultTab?: 'overview' | 'transactions' | 'events';

    /** Custom styles for the panel container */
    style?: React.CSSProperties;

    /** z-index for the panel (default: 9999) */
    zIndex?: number;

    /** Maximum number of events to keep in history (default: 50) */
    maxEvents?: number;
}
```

## How It Works

### Lazy Loading

Transaction details are fetched on-demand to minimize RPC calls:

1. Transaction completes → Basic info displays immediately
2. User clicks "Program Logs" → Full transaction fetched from RPC
3. Logs parsed and displayed with syntax highlighting
4. Data cached for subsequent views

### Program Recognition

Recognizes 50+ common Solana programs including:

- Native programs (System, Token, Stake, Vote, etc.)
- SPL programs (Associated Token, Memo, etc.)
- Popular DeFi (Serum, Raydium, Orca, Jupiter, etc.)

### Error Parsing

Maps 50+ Solana error codes to readable descriptions:

- `InsufficientFunds` → "insufficient funds for instruction"
- `AccountNotExecutable` → "instruction expected an executable account"
- Custom program errors included

## Performance

- Bundle size: ~128KB (includes @solana/web3.js utilities)
- Lazy loading: Only fetches when user expands logs
- Efficient parsing: Logs parsed once, cached for display
- No impact on production builds (tree-shakeable)

## Important Notes

- **Development Only**: The debug panel should only be used in development environments
- **Requires Connector Provider**: Must be used within `AppProvider` or `ConnectorProvider` from `@connector-kit/connector`
- **RPC Access**: Transaction details require RPC access (uses cluster from connector config)

## Advanced Features

### Compute Unit Tracking

See exactly how many compute units each instruction consumed:

```
Total: 2,602 CU

Instruction #1: 2,452 CU
Instruction #2: 150 CU
```

Helpful for optimizing transaction costs.

### Syntax Highlighting

Logs are color-coded for easy scanning:

- 🟢 Green: Success messages
- 🔴 Red/Orange: Errors and warnings
- 🔵 Blue: Info messages (program invocations)
- ⚪ Gray: Muted messages (logs)

### Nested Program Calls

Properly indented to show call hierarchy:

```
> Program invoked: Token Program
  > Program invoked: Associated Token Program
  > Program returned success
> Program returned success
```

## Documentation

- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Technical details

## License

MIT

## Credits

Transaction analysis capabilities adapted from [Solana Explorer](https://github.com/solana-labs/explorer).
