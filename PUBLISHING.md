# Publishing ConnectorKit Packages to NPM

This document explains how to publish the ConnectorKit packages to npm using GitHub Actions.

## Prerequisites

Before you can publish packages, you'll need to:

1. **Create an npm account** at [npmjs.com](https://npmjs.com)
2. **Generate an npm access token** with publishing permissions
3. **Configure GitHub secrets** in your repository

## Setting up NPM Access Token

1. Log into your npm account at [npmjs.com](https://npmjs.com)
2. Go to your account settings → Access Tokens
3. Click "Generate New Token" and select "Automation" type
4. Copy the generated token (it starts with `npm_`)

## Configuring GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret" and add:
   - **Name**: `NPM_TOKEN`
   - **Value**: Your npm access token from above

## Configuring GitHub Environment (Optional but Recommended)

For additional security, you can create a GitHub environment:

1. Go to Settings → Environments
2. Click "New environment" and name it `npm-publish`
3. Add environment protection rules if desired (e.g., required reviewers)
4. Add the `NPM_TOKEN` secret to this environment

## Package Versions

Before publishing, make sure to update the version numbers in all package.json files:

- `packages/connector/package.json`
- `packages/sdk/package.json`
- `packages/jupiter/package.json`
- `packages/providers/package.json`

You can use the changesets workflow:
```bash
pnpm changeset
pnpm version-packages
```

## Publishing Methods

### 1. Automatic Publishing via Git Tags

The most common method is to create a git tag:

```bash
# Create a tag for the version (e.g., v0.1.0)
git tag v0.1.0
git push origin v0.1.0
```

This will trigger the publish workflow automatically.

### 2. Manual Publishing via GitHub Actions

You can also trigger publishing manually:

1. Go to Actions tab in your GitHub repository
2. Select "Publish Packages" workflow
3. Click "Run workflow"
4. Check "Publish @connectorkit packages to npm"
5. Click "Run workflow"

## Published Packages

The following packages will be published to npm:

- `@connector-kit/connector` - Headless wallet connector
- `@connector-kit/sdk` - React hooks for Solana development
- `@connector-kit/jupiter` - Jupiter integration
- `@connector-kit/providers` - Providers package

## Package Dependencies

The packages have the following dependency structure:
- `@connector-kit/sdk` depends on `@connector-kit/connector`
- `@connector-kit/jupiter` depends on `@connector-kit/sdk`
- `@connector-kit/providers` depends on both `@connector-kit/sdk` and `@connector-kit/jupiter`

The workflow will publish them in the correct order to handle these dependencies.

## Troubleshooting

### Common Issues:

1. **NPM_TOKEN not found**: Make sure you've added the secret to your repository
2. **Permission denied**: Ensure your npm token has publishing permissions
3. **Package already exists**: The version number must be unique; increment the version before publishing
4. **Build failures**: The workflow will run tests and builds before publishing; fix any failures first

### Testing Before Publishing:

You can test the build process locally:

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Check types
pnpm type-check

# Lint code
pnpm lint
```

## Using the Published Packages

Once published, users can install your packages:

```bash
# Install the main SDK
npm install @connector-kit/sdk

# Install the connector for headless usage
npm install @connector-kit/connector

# Install Jupiter integration
npm install @connector-kit/jupiter

# Install providers
npm install @connector-kit/providers
```

The packages are designed to work together as a complete Solana development toolkit.
