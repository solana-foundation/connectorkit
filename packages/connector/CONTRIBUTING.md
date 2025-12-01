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
│   │   ├── adapters/     # Storage and wallet adapters
│   │   ├── kit-signers/  # @solana/kit transaction signers
│   │   ├── kit-utils/    # @solana/kit utilities
│   │   ├── errors/       # Error types and handling
│   │   └── utils/        # Internal utilities
│   ├── hooks/            # React hooks
│   ├── components/       # React components (elements)
│   ├── ui/               # UI providers and error boundaries
│   ├── config/           # Configuration utilities
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Public utility functions
│   └── __tests__/        # Test utilities and fixtures
└── dist/                 # Build output (gitignored)
```

## Development Workflow

### Running the Example App

```bash
# From repository root
cd examples/next-js
pnpm dev
```

### Code Style

- Use TypeScript for all new code
- Follow the existing code style (Prettier + ESLint)
- Use functional and declarative patterns; avoid classes
- Prefer named exports for components
- Use descriptive variable names with auxiliary verbs (e.g., `isLoading`, `hasError`)

### Testing

- Tests are co-located with source files (`.test.ts` or `.test.tsx`)
- Run tests: `pnpm test`
- Watch mode: `pnpm test:watch`
- Uses Vitest

### Before Submitting

```bash
# From packages/connector
pnpm lint        # Lint code
pnpm type-check  # Type check
pnpm build       # Build
pnpm test        # Run tests
```

## Pull Request Guidelines

1. **Clear Description** - Explain what changes you made and why
2. **Link Issues** - Reference any related issues (e.g., "Fixes #123")
3. **Small PRs** - Keep changes focused - one feature or fix per PR
4. **Tests** - Include tests for new functionality
5. **Documentation** - Update README.md if needed

### PR Checklist

- [ ] Code follows the project's style guidelines
- [ ] Tests added/updated and passing
- [ ] TypeScript types are correct
- [ ] Documentation updated if needed
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
- Ensure proper error handling
- Test transaction signing with real wallets on devnet

## Bug Reports

Include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, package version, browser, wallet)
- Relevant error messages

## Feature Requests

- Check existing issues first
- Provide clear use case and requirements
- Consider Wallet Standard compatibility
- Think about impact on both React and headless usage

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions

- Open an issue for questions
- Check existing documentation in README.md
- Review [Wallet Standard specification](https://github.com/wallet-standard/wallet-standard)
- Check the [Next.js example](../../examples/next-js) for usage patterns

Thank you for contributing to ConnectorKit!
