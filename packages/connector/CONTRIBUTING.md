# Contributing to @solana/connector

Thank you for your interest in contributing! This document provides guidelines for contributing to the connector package.

## Getting Started

1. **Fork the repository**

2. **Clone your fork**

    ```bash
    git clone https://github.com/your-username/connectorkit.git
    cd connectorkit
    ```

3. **Install dependencies**

    ```bash
    pnpm install
    ```

4. **Create a branch**

    ```bash
    git checkout -b feature/your-feature-name
    # or
    git checkout -b fix/your-bug-fix
    ```

## Project Structure

```
packages/connector/
├── src/
│   ├── lib/              # Core functionality
│   │   ├── core/         # State management, events, client
│   │   ├── connection/   # Wallet connection logic
│   │   ├── transaction/  # Transaction signing
│   │   ├── cluster/      # Network/cluster management
│   │   ├── health/       # Health checks and diagnostics
│   │   └── adapters/     # Storage and wallet adapters
│   ├── hooks/            # React hooks
│   ├── components/       # React components (elements)
│   ├── ui/               # UI providers and error boundaries
│   ├── config/           # Configuration utilities
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── __tests__/            # Test utilities and fixtures
├── examples/             # Example implementations
└── dist/                 # Build output (gitignored)
```

## Development Workflow

### Code Style

- Use TypeScript for all new code
- Follow the existing code style (Prettier + ESLint)
- Use functional and declarative programming patterns; avoid classes
- Prefer named exports for components
- Use descriptive variable names with auxiliary verbs (e.g., `isLoading`, `hasError`)
- Write meaningful commit messages following [Conventional Commits](https://www.conventionalcommits.org/)

### Testing

- Add tests for new functionality
- Tests are co-located with source files (`.test.ts` or `.test.tsx`)
- Ensure all tests pass: `pnpm test`
- Run tests in watch mode during development: `pnpm test:watch`
- Maintain or improve code coverage (target: 80%+)
- Use Vitest for testing

### Before Submitting

```bash
# From the repository root
cd packages/connector

# Format code
pnpm format

# Lint code
pnpm lint

# Type check
pnpm type-check

# Build
pnpm build

# Run tests
pnpm test

# Check bundle size
pnpm size
```

### Running Examples

Test your changes with the example app:

```bash
# From repository root
cd examples/next-js
pnpm dev
```

## Pull Request Guidelines

1. **Clear Description**: Explain what changes you made and why
2. **Link Issues**: Reference any related issues (e.g., "Fixes #123")
3. **Small PRs**: Keep changes focused and atomic - one feature or fix per PR
4. **Tests**: Include tests for new functionality
5. **Documentation**: Update README.md if needed
6. **Type Safety**: Ensure TypeScript types are correct and exported properly
7. **Bundle Size**: Be mindful of bundle size impact (check with `pnpm size`)

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Tests added/updated and passing
- [ ] TypeScript types are correct
- [ ] Documentation updated (README.md, code comments)
- [ ] Bundle size impact considered
- [ ] No breaking changes (or clearly documented if intentional)

## Development Guidelines

### Wallet Standard Compliance

- Follow the [Wallet Standard](https://github.com/wallet-standard/wallet-standard) specification
- Ensure compatibility with all Wallet Standard compliant wallets
- Test with multiple wallets (Phantom, Solflare, Backpack, etc.)

### Framework Support

- **React**: Use hooks and follow React best practices
- **Headless**: Keep headless core framework-agnostic
- **TypeScript**: Maintain full type safety

### Transaction Signing

- Support both `@solana/kit` (modern) and `@solana/web3.js` (legacy) APIs
- Ensure proper error handling and user feedback
- Test transaction signing with real wallets on devnet

### Storage

- Use enhanced storage adapters with validation
- Ensure SSR compatibility
- Handle storage errors gracefully (private browsing, quota exceeded)

### Performance

- Minimize re-renders in React hooks
- Use proper memoization where needed
- Keep bundle size small (check with `pnpm size`)

## Bug Reports

Include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details:
  - Node.js version
  - Package version
  - Browser/OS
  - Wallet(s) tested
- Relevant logs or error messages
- Minimal reproduction if possible

## Feature Requests

- Check existing issues first
- Provide clear use case and requirements
- Consider Wallet Standard compatibility
- Think about impact on both React and headless usage
- Consider bundle size implications
- Think about backward compatibility

## Testing Guidelines

### Writing Tests

- Co-locate test files with source files
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies (wallets, storage, etc.)
- Use test fixtures for common data structures

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { YourFunction } from './your-file';

describe('YourFunction', () => {
    it('should handle success case', () => {
        // Test implementation
    });

    it('should handle error case', () => {
        // Test implementation
    });
});
```

### React Hook Testing

```typescript
import { renderHook } from '@testing-library/react';
import { useYourHook } from './use-your-hook';
import { createHookWrapper } from '../__tests__/utils/react-helpers';

describe('useYourHook', () => {
    it('should return expected values', () => {
        const { result } = renderHook(() => useYourHook(), {
            wrapper: createHookWrapper(),
        });
        expect(result.current).toBeDefined();
    });
});
```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Include code examples in documentation
- Keep examples in sync with actual usage

## Code Review Process

1. All PRs require at least one approval
2. Address review comments promptly
3. Keep PRs up to date with main branch
4. Squash commits before merging (if requested)

## Wallet Standard Guidelines

When working with wallet integration:

- Follow Wallet Standard best practices
- Ensure compatibility with all compliant wallets
- Handle wallet detection and connection errors gracefully
- Support multi-account wallets properly
- Test on devnet before mainnet

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions

- Open an issue for questions
- Check existing documentation in README.md
- Review [Wallet Standard specification](https://github.com/wallet-standard/wallet-standard)
- Check examples in `examples/next-js` directory

## Thank You!

Your contributions help make ConnectorKit better for everyone. Thank you for taking the time to contribute!
