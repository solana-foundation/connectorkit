# Contributing to ConnectorKit

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

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
    ```

## Project Structure

- `packages/connector/` - Core wallet connector with React hooks and headless client
- `packages/debugger/` - Development debug panel with transaction analysis
- `examples/next-js/` - Example Next.js application with shadcn/ui

## Development Workflow

### Running the Example

```bash
cd examples/next-js
pnpm dev
```

### Code Style

- Use TypeScript for all new code
- Follow the existing code style (Prettier + ESLint)
- Use functional and declarative patterns; avoid classes
- Prefer named exports for components

### Testing

- Add tests for new functionality
- Ensure all tests pass: `pnpm test`
- Uses Vitest for testing

### Before Submitting

```bash
pnpm lint        # Lint code
pnpm type-check  # Type check
pnpm build       # Build all packages
pnpm test        # Run tests
```

## Pull Request Guidelines

1. **Clear Description** - Explain what changes you made and why
2. **Link Issues** - Reference any related issues
3. **Small PRs** - Keep changes focused and atomic
4. **Tests** - Include tests for new functionality
5. **Documentation** - Update README/docs if needed

## Wallet Standard Guidelines

When working with wallet integration:

- Follow [Wallet Standard](https://github.com/wallet-standard/wallet-standard) best practices
- Ensure compatibility with all compliant wallets
- Test with multiple wallets (Phantom, Solflare, Backpack, etc.)
- Test on devnet before mainnet

## Bug Reports

Include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, browser, wallet)
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
- Check existing documentation in package READMEs
- Review [Wallet Standard specification](https://github.com/wallet-standard/wallet-standard)
