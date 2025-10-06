# Debug Panel - Modular Architecture

A modular, performance-focused implementation of the Connector Debug Panel.

## Structure

```
debug-panel/
├── index.tsx                 # Main component and orchestration
├── types.ts                  # TypeScript interfaces and types
├── icons.tsx                 # Icon components
├── ui-components.tsx         # Reusable UI primitives
├── tabs/                     # Individual tab components
│   ├── index.tsx            # Tab exports
│   ├── overview-tab.tsx     # Connection status & health
│   ├── signer-tab.tsx       # Transaction signer info
│   ├── events-tab.tsx       # Event stream viewer
│   ├── wallet-tab.tsx       # Wallet features & details
│   ├── perf-tab.tsx         # Performance metrics
│   └── storage-tab.tsx      # Storage management
└── README.md                # This file
```

## Architecture Benefits

### 🎯 Modularity
- **Separation of Concerns**: Each tab is self-contained with its own logic
- **Easy to Test**: Individual components can be tested in isolation
- **Clear Dependencies**: Import only what you need

### ⚡ Performance
- **Reduced Bundle Size**: Tree-shakeable exports
- **Better Code Splitting**: Each tab can be lazy-loaded if needed
- **Optimized Re-renders**: Isolated state management per tab

### 🛠️ Maintainability
- **Single Responsibility**: Each file has one clear purpose
- **Easier Navigation**: Find specific functionality quickly
- **Simpler Updates**: Modify one tab without affecting others

### 📈 Scalability
- **Easy to Extend**: Add new tabs by creating new components
- **Consistent Patterns**: All tabs follow the same structure
- **Type Safety**: Centralized types ensure consistency

## Component Guidelines

### UI Components (`ui-components.tsx`)
Reusable presentational components:
- `Section` - Labeled content sections
- `Divider` - Visual separators
- `Badge` - Status indicators
- `Button` - Interactive buttons
- `TabButton` - Tab navigation buttons

### Tab Components (`tabs/`)
Each tab component:
- Receives focused props (no unnecessary data)
- Handles its own internal state
- Returns a consistent layout structure
- Implements proper TypeScript interfaces

### Main Component (`index.tsx`)
Orchestrates the debug panel:
- Manages global state (open/closed, active tab)
- Coordinates hooks and data fetching
- Handles event subscriptions
- Renders tab navigation and panels

## Usage

```tsx
import { ConnectorDebugPanel } from '@connector-kit/connector/react'

function App() {
  return (
    <ConnectorProvider config={config}>
      {process.env.NODE_ENV === 'development' && (
        <ConnectorDebugPanel 
          position="bottom-right"
          defaultOpen={false}
          defaultTab="overview"
          maxEvents={50}
        />
      )}
      <YourApp />
    </ConnectorProvider>
  )
}
```

## Adding a New Tab

1. Create a new file in `tabs/` (e.g., `my-tab.tsx`)
2. Export your component from `tabs/index.tsx`
3. Add tab config to `TABS` array in `index.tsx`
4. Add the tab render case in the main component
5. Update `TabId` type in `types.ts`

## Performance Considerations

- **Memoization**: Use `useMemo` for expensive computations
- **Event Handlers**: Use `useCallback` for stable function references
- **Conditional Rendering**: Only render active tab content
- **Development Only**: Entire panel excluded in production builds

## Backward Compatibility

The old `debug-panel.tsx` file now re-exports from this modular structure, ensuring existing imports continue to work.

## File Sizes (Estimated)

| File | Lines | Purpose |
|------|-------|---------|
| `index.tsx` | ~320 | Main orchestration |
| `types.ts` | ~45 | Type definitions |
| `icons.tsx` | ~40 | Icon components |
| `ui-components.tsx` | ~130 | UI primitives |
| `overview-tab.tsx` | ~145 | Overview tab |
| `signer-tab.tsx` | ~65 | Signer tab |
| `events-tab.tsx` | ~95 | Events tab |
| `wallet-tab.tsx` | ~105 | Wallet tab |
| `perf-tab.tsx` | ~65 | Performance tab |
| `storage-tab.tsx` | ~85 | Storage tab |

**Total**: ~1095 lines (same functionality, better organized)

## Migration from Monolithic File

The refactor maintains 100% feature parity while improving:
- Code organization and readability
- Developer experience (easier to find and modify code)
- Build-time tree-shaking potential
- Type safety and IDE autocomplete

No breaking changes to the public API.

