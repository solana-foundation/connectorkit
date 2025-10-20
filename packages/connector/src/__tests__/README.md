# Testing Guide for @connector-kit/connector

This guide explains how to write, run, and contribute tests for the `@connector-kit/connector` package.

## Table of Contents

- [Overview](#overview)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Mocks and Fixtures](#mocks-and-fixtures)
- [Best Practices](#best-practices)
- [Contributing](#contributing)

## Overview

The connector package uses **Vitest** as its test runner, along with Testing Library for React component testing. Tests are co-located with source files for easy discovery and maintenance.

### Test Coverage Goals

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 75%
- **Statements**: 80%

## Running Tests

### Basic Commands

```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI (recommended for development)
pnpm test:ui

# Generate coverage report
pnpm test:coverage
```

### Running Specific Tests

```bash
# Run tests for a specific file
pnpm test state-manager.test.ts

# Run tests matching a pattern
pnpm test connection

# Run only tests with a specific name
pnpm test -t "should connect to wallet"
```

## Test Structure

### File Organization

Tests are co-located with source files:

```
src/
├── lib/
│   ├── core/
│   │   ├── state-manager.ts
│   │   └── state-manager.test.ts          # Unit tests
│   └── connection/
│       ├── connection-manager.ts
│       └── connection-manager.test.ts     # Unit tests
├── hooks/
│   ├── use-account.ts
│   └── use-account.test.tsx               # React hook tests
├── utils/
│   ├── formatting.ts
│   └── formatting.test.ts                 # Utility tests
└── __tests__/
    ├── setup.ts                           # Global test setup
    ├── mocks/                             # Mock implementations
    ├── fixtures/                          # Test data
    ├── utils/                             # Test helpers
    └── integration/                       # Integration tests
```

### Test Categories

1. **Unit Tests**: Test individual classes and functions in isolation
2. **Integration Tests**: Test complete workflows and interactions
3. **React Tests**: Test hooks and components with Testing Library
4. **Utility Tests**: Test helper functions and utilities

## Writing Tests

### Unit Tests

Unit tests should be placed next to the source file with a `.test.ts` extension:

```typescript
// src/lib/core/state-manager.test.ts
import { describe, it, expect } from 'vitest';
import { StateManager } from './state-manager';

describe('StateManager', () => {
    it('should update state correctly', () => {
        const manager = new StateManager(initialState);
        manager.updateState({ connected: true });

        expect(manager.getSnapshot().connected).toBe(true);
    });
});
```

### React Component/Hook Tests

Use Testing Library for React tests:

```typescript
// src/hooks/use-account.test.tsx
import { renderHook } from '@testing-library/react';
import { useAccount } from './use-account';
import { createHookWrapper } from '../__tests__/utils/react-helpers';

describe('useAccount', () => {
    it('should return account information', () => {
        const { result } = renderHook(() => useAccount(), {
            wrapper: createHookWrapper(),
        });

        expect(result.current.address).toBeDefined();
    });
});
```

### Integration Tests

Integration tests should test complete workflows:

```typescript
// src/__tests__/integration/connector-flow.test.ts
import { ConnectorClient } from '../../lib/core/connector-client';

describe('Connector Flow', () => {
    it('should complete connection workflow', async () => {
        const client = new ConnectorClient();
        await client.init();
        await client.select('Phantom');

        const state = client.getSnapshot();
        expect(state.connected).toBe(true);
    });
});
```

## Mocks and Fixtures

### Available Mocks

#### Wallet Standard Mock

Mock wallet implementations for testing:

```typescript
import { createMockPhantomWallet, createMockSolflareWallet } from '../mocks/wallet-standard-mock';

const wallet = createMockPhantomWallet({
    connectBehavior: 'success', // or 'error', 'timeout'
});
```

#### Storage Mock

In-memory storage for testing:

```typescript
import { MockStorageAdapter } from '../mocks/storage-mock';

const storage = new MockStorageAdapter<string>('test-key');
await storage.set('value');
const value = await storage.get();
```

#### Window/Browser API Mocks

Mock browser APIs:

```typescript
import { setupMockWindow, createMockClipboard } from '../mocks/window-mock';

const clipboard = createMockClipboard('success');
setupMockWindow({ navigator: { clipboard } });
```

### Test Fixtures

Pre-configured test data:

```typescript
import { createTestAccounts, TEST_ADDRESSES } from '../fixtures/accounts';
import { createTestWallets } from '../fixtures/wallets';
import { createConnectedEvent } from '../fixtures/events';

const accounts = createTestAccounts(3);
const wallets = createTestWallets();
const event = createConnectedEvent('Phantom');
```

### Test Helpers

Utility functions for testing:

```typescript
import { waitForCondition, createEventCollector } from '../utils/test-helpers';
import { waitForConnection } from '../utils/wait-for-state';

// Wait for a condition
await waitForCondition(() => state.connected, { timeout: 5000 });

// Collect and assert events
const collector = createEventCollector();
client.on(collector.collect);
collector.assertEventEmitted('connected');

// Wait for specific state
await waitForConnection(client, 5000);
```

## Best Practices

### 1. Test Structure

- **Arrange, Act, Assert**: Structure tests clearly
- **One assertion per test**: Keep tests focused
- **Descriptive names**: Use clear, descriptive test names

```typescript
it('should update state when wallet connects successfully', async () => {
    // Arrange
    const client = new ConnectorClient();
    const wallet = createMockPhantomWallet();

    // Act
    await client.select(wallet.name);

    // Assert
    expect(client.getSnapshot().connected).toBe(true);
});
```

### 2. Async Testing

Use async/await properly:

```typescript
it('should handle async operations', async () => {
    const result = await someAsyncOperation();
    expect(result).toBeDefined();
});
```

### 3. Cleanup

Always clean up after tests:

```typescript
import { beforeEach, afterEach } from 'vitest';

afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    client?.destroy();
});
```

### 4. Mocking

Mock external dependencies, not internal logic:

```typescript
// Good: Mock external API
const mockWallet = createMockPhantomWallet();

// Bad: Don't mock internal methods you're testing
vi.spyOn(stateManager, 'updateState'); // Avoid this
```

### 5. Error Cases

Test both success and failure paths:

```typescript
describe('connect', () => {
    it('should connect successfully', async () => {
        // Test success case
    });

    it('should handle connection errors', async () => {
        const failingWallet = createMockWallet({
            connectBehavior: 'error',
        });

        await expect(client.select(failingWallet.name)).rejects.toThrow();
    });
});
```

### 6. Type Safety

Maintain type safety in tests:

```typescript
// Good: Type-safe test data
const account: AccountInfo = createMockAccountInfo();

// Bad: Using 'any' or type assertions excessively
const account = {} as any; // Avoid
```

## Contributing

### Adding New Tests

1. **Create test file** next to source file with `.test.ts` or `.test.tsx` extension
2. **Import necessary utilities** from `vitest` and test helpers
3. **Follow existing patterns** in similar test files
4. **Ensure tests pass** locally before submitting

### Test Requirements

- All new features must include tests
- Bug fixes should include regression tests
- Maintain or improve coverage percentage
- Tests must pass in CI

### Running Pre-commit Checks

```bash
# Type check
pnpm type-check

# Run tests
pnpm test

# Check coverage
pnpm test:coverage
```

## Common Patterns

### Testing State Changes

```typescript
it('should update state', () => {
    const initialState = manager.getSnapshot();
    manager.updateState({ connected: true });
    const newState = manager.getSnapshot();

    expect(newState).not.toBe(initialState);
    expect(newState.connected).toBe(true);
});
```

### Testing Events

```typescript
it('should emit events', () => {
    const collector = createEventCollector();
    emitter.on(collector.collect);

    emitter.emit(createConnectedEvent());

    collector.assertEventEmitted('connected');
});
```

### Testing React Hooks

```typescript
it('should update on state change', async () => {
    const { result, rerender } = renderHook(() => useAccount(), {
        wrapper: createHookWrapper(),
    });

    // Trigger state change
    await act(async () => {
        await client.select('Phantom');
    });

    expect(result.current.connected).toBe(true);
});
```

## Troubleshooting

### Tests Hanging

- Check for missing `await` on async operations
- Ensure timers are cleaned up
- Verify no infinite loops in test setup

### Flaky Tests

- Add proper wait conditions
- Avoid relying on specific timing
- Use `waitFor` helpers instead of fixed delays

### Mock Issues

- Verify mocks are reset between tests
- Check mock return values match expected types
- Ensure mocks are set up before usage

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Wallet Standard](https://github.com/wallet-standard/wallet-standard)

## Getting Help

- Check existing tests for examples
- Review this guide for patterns
- Ask in team discussions for guidance
