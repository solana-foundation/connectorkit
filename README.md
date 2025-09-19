# Connector Kit

A framework agnostic wallet connection and state management development kit for Solana applications.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **pnpm**: 9.12.3 or higher (recommended package manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/connector-kit.git
   cd connector-kit
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

## 📦 Available Packages

This monorepo contains several packages:

- **@connectorkit/sdk** - Core React hooks and utilities for Solana development
- **@connectorkit/connector** - Wallet connector components and context management
- **@connectorkit/providers** - Provider templates and configurations
- **@connectorkit/jupiter** - Jupiter DEX integration
- **@connectorkit/ui-primitives** - Headless UI component primitives

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev              # Start all apps in development mode
pnpm build            # Build all packages and apps
pnpm test             # Run tests across all packages
pnpm lint             # Lint all code
pnpm type-check       # Run TypeScript type checking
pnpm format           # Format code with Biome

# Package management
pnpm changeset        # Create a changeset for releases
pnpm version-packages # Version packages based on changesets
pnpm release          # Build and publish packages
```

### Development Workflow

1. **Start the docs site** (includes all examples and demos)
   ```bash
   cd apps/docs
   pnpm dev
   ```
   Visit http://localhost:3000 to see the documentation and interactive examples.

2. **Work on a specific package**
   ```bash
   cd packages/sdk
   pnpm dev    # Start development mode
   pnpm test   # Run tests
   ```

3. **Build everything**
   ```bash
   pnpm build  # From root - builds all packages
   ```

## 🏗️ Project Structure

```
connector-kit/
├── apps/
│   └── docs/              # Documentation site with enhanced navigation
├── packages/
│   ├── sdk/               # Core React hooks and Solana utilities
│   ├── connector/         # Wallet connection components and theming
│   ├── providers/         # Provider configurations and templates
│   ├── jupiter/           # Jupiter DEX integration
│   └── ui-primitives/     # Headless UI component library
└── examples/              # Example applications and demos
```

## 📚 Enhanced Documentation

The documentation site features a modern, collapsible sidebar navigation system with:

- **Collapsible sections** - Click chevron icons to expand/collapse documentation sections
- **Smart defaults** - Most sections open by default, architecture sections collapsed for cleaner initial view
- **Active page highlighting** - Current section automatically stays expanded
- **Responsive design** - Works seamlessly across desktop and mobile devices

### Documentation Features

- **Interactive examples** for all hooks and components
- **TypeScript definitions** with complete API documentation
- **Copy-paste code samples** for quick implementation
- **Live demos** of wallet connections and transactions
- **Architecture guides** for understanding the system design

Visit the [documentation](./apps/docs) for detailed guides and examples.

## 🔧 Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
cd packages/sdk
pnpm test

# Run tests in watch mode
pnpm test --watch
```

## ✨ Recent Improvements

### Documentation Experience
- **Collapsible sidebar navigation** with smooth animations
- **Intelligent section management** - relevant sections stay expanded
- **Clean, modern interface** with improved visual hierarchy
- **Enhanced accessibility** with proper ARIA labels and keyboard navigation

### Developer Experience
- **Framework agnostic design** - works with React, Vue, Angular, and vanilla JavaScript
- **TypeScript-first** - comprehensive type definitions for better DX
- **Modular architecture** - use only what you need
- **Extensible theming system** - customize appearance to match your brand

## 🚀 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.