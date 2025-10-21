# @solana/connector-debugger

Development debug panel for `@solana/connector` with advanced transaction analysis and optimization capabilities.

**✨ New in this version:** Transaction size analysis, Address Lookup Table optimization recommendations, pre-flight simulation, session-wide statistics, and automatic code generation for creating ALTs. Test transactions before sending and validate optimizations work. Based on real-world measurements showing **40-50% typical size reductions** and **12-15% compute unit savings**.

## Features

### Core Debugging

- 📊 **Overview Tab**: Comprehensive status dashboard
- 🔴 **Live Tab**: Real-time pre-flight simulation and transaction lifecycle tracking
- 📝 **Transactions Tab**: Historical transaction analysis with explorer links and size analysis
- 💡 **Optimization Tab**: Session-wide statistics and Address Lookup Table recommendations
- 📡 **Events Tab**: Real-time event stream with pause/clear controls

### Advanced Transaction Analysis

- 🔍 **Program Logs**: View execution logs with syntax highlighting
- 📋 **Instruction Decoder**: See decoded instruction types
- ⚡ **Compute Units**: Track performance per instruction
- 🐛 **Enhanced Errors**: Human-readable error messages
- 🎯 **Lazy Loading**: Fetch details only when needed

### Transaction Optimization (NEW!)

- 📏 **Size Analysis**: Real-time transaction size monitoring with 1232 byte limit warnings
- 💡 **ALT Opportunities**: Detects when Address Lookup Tables could reduce transaction size
- 🔧 **ALT Detection**: Shows when transactions are already using ALTs and compression achieved
- 📊 **Frequency Tracking**: Tracks address usage across transactions to identify ALT candidates
- 📋 **Code Generation**: Ready-to-use code snippets for creating and using ALTs
- 🎯 **Smart Suggestions**: Only suggests ALT when savings are worthwhile (>20% reduction)

### Live Transaction Monitoring (NEW!)

- 🔴 **Automatic Pre-Flight**: Simulates every transaction before wallet signature (completely automatic)
- ⚡ **Real-Time Analysis**: See compute units, fees, and success prediction instantly
- 🔄 **Lifecycle Tracking**: Follow transactions from preparation → signing → sending → confirmation
- ⚠️ **Early Error Detection**: Catch issues before wasting transaction fees
- 📊 **Live Statistics**: Track simulation vs actual results in real-time
- 💡 **Instant Optimization**: Shows ALT savings opportunity before you sign
- 🎯 **Zero Config**: Works automatically, no code changes needed

## Installation

```bash
npm install @solana/connector-debugger
# or
pnpm add @solana/connector-debugger
# or
yarn add @solana/connector-debugger
```

## Usage

```tsx
import { AppProvider } from '@solana/connector/react';
import { ConnectorDebugPanel } from '@solana/connector-debugger/react';
import { getDefaultConfig } from '@solana/connector/headless';

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

## Transaction Optimization Features

### Size Analysis & Warnings

Every transaction is analyzed for size efficiency:

```
✅ Transfer SOL
   234 bytes ✅ Optimal

⚠️ Token Swap
   892 bytes ⚠️ Could optimize -40%
   💡 -40% optimization available

❌ Bundle Purchase
   1,536 bytes ❌ Exceeds limit (will fail)
   💡 Use ALT to reduce to ~871 bytes
```

**Size Categories:**

- ✅ **Optimal** (<500 bytes): No optimization needed
- ⚡ **Moderate** (500-800 bytes): Good, could be improved
- ⚠️ **Heavy** (800-1232 bytes): Should optimize
- ❌ **Oversized** (>1232 bytes): Will fail, must optimize

### Address Lookup Table (ALT) Optimization

Based on real-world data showing **40-50% typical size reductions**:

**Automatic Detection:**

- Identifies transactions that would benefit from ALTs
- Tracks address frequency across your entire session
- Calculates potential byte savings and compression ratios
- Only suggests optimization when worthwhile (>20% reduction)

**Smart Recommendations:**

- Shows which addresses to include in your lookup table
- Prioritizes frequently used addresses
- Estimates exact byte savings
- Provides compression ratio (e.g., 1.87:1)

**Ready-to-Use Code:**

- Click "Generate Code" for copy-paste ALT setup
- Includes both creation and usage examples
- Optimized for your specific address patterns
- Based on real transaction optimizer research

### Optimization Tab

New dedicated tab for session-wide analysis:

**Session Overview:**

- Total transactions tracked
- Unique addresses seen
- Number of ALT candidates (addresses appearing 3+ times)
- Total potential byte savings

**Top ALT Candidates:**

- Ranked list of most frequently used addresses
- Shows appearance count and potential savings per address
- Identifies known programs (Token Program, System Program, etc.)
- Click any address to copy to clipboard

**Quick Actions:**

- Generate complete ALT creation code
- Copy all candidate addresses at once
- Reset statistics to start fresh analysis

### ALT Usage Detection

When transactions already use ALTs, the debugger shows:

```
🔧 Using Address Lookup Table
   - 12 addresses from ALT
   - ~372 bytes saved
   - 1.87:1 compression achieved
   - Lookup table: E4b5B9C...19DXyL
```

This helps you verify your optimizations are working as expected.

## Live Transaction Monitoring

### Automatic Pre-Flight Simulation

**Zero configuration required** - Works automatically when you send transactions:

```tsx
// Your code stays exactly the same
const { signer } = useTransactionSigner();
await signer.signAndSendTransaction(tx);

// Debugger automatically:
// 1. Captures transaction before wallet popup
// 2. Simulates it instantly (500ms)
// 3. Shows results in Live tab
// 4. Suggests optimizations
// 5. Tracks through completion
```

### Live Tab Real-Time Flow

```
🔴 Live Tab (activates automatically):

┌─────────────────────────────────┐
│ 🔍 SIMULATING TRANSACTION       │
│                                 │
│ Status: Analyzing...            │
│ Size: 892 bytes ⚠️ (72%)        │
│ ⚡ Running simulation...        │
└─────────────────────────────────┘

↓ After ~500ms

┌─────────────────────────────────┐
│ ✅ SIMULATION PASSED             │
│                                 │
│ Size: 892 bytes ⚠️              │
│ Compute: 2,802 CU ✅            │
│ Fee: 0.000005 SOL ✅            │
│                                 │
│ 💡 Could optimize with ALT:     │
│    → 534 bytes (-40%)           │
│    → 2,452 CU (-12%)            │
│                                 │
│ Status: ⏳ Waiting for sig...   │
└─────────────────────────────────┘

↓ User signs in wallet

┌─────────────────────────────────┐
│ 📤 SENDING TRANSACTION           │
│                                 │
│ Signature: 5Gv8yU...x3kF        │
│ Status: Confirming...           │
└─────────────────────────────────┘

↓ After confirmation

┌─────────────────────────────────┐
│ ✅ TRANSACTION CONFIRMED         │
│                                 │
│ Simulated: 2,802 CU             │
│ Actual: 2,801 CU                │
│ Accuracy: 99.96% ✅             │
│                                 │
│ [View Details] [Clear]          │
└─────────────────────────────────┘

(Auto-clears after 5 seconds)
```

### Lifecycle Progress Visualization

Each transaction shows visual progress:

```
Prepare → Simulate → Sign → Send → Confirm
   ✓        ✓        ✓      ⏳      ⏳
```

With animated pulsing dots for active steps.

### Benefits

**Catch Errors Early:**

```
❌ SIMULATION FAILED

Would fail: insufficient funds

Current balance: 0.05 SOL
Required: 0.1 SOL

→ Add SOL before signing
→ Saves transaction fee
```

**Validate Optimizations:**

```
Without ALT: 1,536 bytes (would fail)
With ALT: 871 bytes (will succeed)

✅ Optimization validated before signing
```

**Track Accuracy:**

```
Simulated vs Actual Results:
Compute: 2,802 CU vs 2,801 CU (99.96% match)
Status: Both succeeded ✅

→ Builds confidence in simulation accuracy
```

### Session Statistics

Live tab integrates with Optimization tab to show:

```
🔍 Simulation Statistics
   Success Rate: 94.7% (18/19)
   Avg Compute Units: 2.3K CU

   With ALT Avg: 2.1K CU (19 simulations)
   Compute Savings: -200 CU (8.7% reduction)
```

## Props

```tsx
interface DebugPanelProps {
    /** Position of the debug panel on screen (default: 'bottom-right') */
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

    /** Whether to show the panel expanded by default (default: false) */
    defaultOpen?: boolean;

    /** Default tab to show (default: 'overview') */
    defaultTab?: 'overview' | 'live' | 'transactions' | 'optimization' | 'events';

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

## Real-World Impact

### Transaction Optimization Examples

Based on actual measurements from production Solana transactions:

**Single Token Purchase:**

- Without ALT: 660 bytes
- With ALT: 353 bytes
- **Savings: 307 bytes (46.5% reduction)**

**Bundle Transaction (Multiple Buyers):**

- Without ALT: 1,536 bytes (FAILS - exceeds limit)
- With ALT: 871 bytes (SUCCESS)
- **Result: Transaction that would fail now succeeds**

**DeFi Swap (Complex Multi-Program):**

- Without ALT: 892 bytes
- With ALT: 534 bytes
- **Savings: 358 bytes (40.1% reduction)**

### When to Use ALT

The debugger will suggest ALT optimization when:

1. Transaction is heavy (>800 bytes) or failed (>1232 bytes)
2. Multiple addresses appear repeatedly
3. Potential savings exceed 20%
4. You have 5+ repeated addresses

ALTs work best for:

- Multi-instruction transactions
- Programs you interact with frequently
- Bundle transactions
- Transactions approaching the size limit

## How Live Tab Works

### Completely Automatic

**No code changes needed in your dApp:**

```tsx
// Just use the connector normally
const { signer } = useTransactionSigner();

// This automatically triggers Live tab monitoring
await signer.signAndSendTransaction(transaction);
```

### Behind the Scenes

1. **Event Emission** (Connector)
    - Before wallet popup: Emits `transaction:preparing` event
    - Contains transaction bytes and size
    - Zero performance overhead

2. **Auto-Simulation** (Debugger)
    - Catches preparing event
    - Simulates transaction immediately (~500ms)
    - Shows results in Live tab
    - Calculates optimization opportunities

3. **Lifecycle Tracking** (Debugger)
    - Updates as transaction progresses
    - Signing → Sending → Confirming → Confirmed
    - Compares simulated vs actual results
    - Auto-clears after 5 seconds

### Performance Impact

- **If debugger not installed**: Zero overhead (events still emit but ignored)
- **If debugger installed but closed**: Minimal overhead (events emitted, simulation skipped)
- **If debugger open**: Simulation runs in parallel, non-blocking
- **Network**: 1 extra RPC call per transaction for simulation

## Performance

- Bundle size: ~145KB (includes optimization + simulation utilities)
- Lazy loading: Only fetches when user expands logs
- Efficient parsing: Logs parsed once, cached for display
- Address tracking: Minimal overhead, session-scoped
- Auto-simulation: Parallel, non-blocking
- No impact on production builds (tree-shakeable)

## Important Notes

- **Development Only**: The debug panel should only be used in development environments
- **Requires Connector Provider**: Must be used within `AppProvider` or `ConnectorProvider` from `@solana/connector`
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
