/**
 * Optional peer dependency shims for TypeScript.
 *
 * These provider adapters use dynamic `import()` so the runtime dependency is only
 * required when that provider is configured. However, TypeScript still needs the
 * module specifiers to resolve during type-checking in environments where the
 * optional peer deps are not installed.
 *
 * We declare the modules as empty to satisfy module resolution without overriding
 * real typings when the packages are installed (this becomes a no-op augmentation).
 */
declare module '@solana/keychain-fireblocks' {}
declare module '@solana/keychain-privy' {}

