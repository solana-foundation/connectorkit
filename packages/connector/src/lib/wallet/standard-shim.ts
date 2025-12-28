import type {
    Wallet as BaseWallet,
    WalletAccount as BaseWalletAccount,
    WalletWithFeatures,
} from '@wallet-standard/base';
import type {
    StandardConnectFeature,
    StandardDisconnectFeature,
    StandardEventsFeature,
} from '@wallet-standard/features';

/*
 * @solana/connector - wallet-standard integration
 *
 * Simplified wallet standard types and registry access
 */

// Re-export wallet standard types for convenience
export type { BaseWallet as Wallet, BaseWalletAccount as WalletAccount, WalletWithFeatures };

// Common feature combinations
export type StandardFeatures = StandardConnectFeature & StandardDisconnectFeature & StandardEventsFeature;
export type WalletWithStandardFeatures = WalletWithFeatures<StandardFeatures>;

export interface WalletsRegistry {
    get(): readonly BaseWallet[];
    on(event: 'register' | 'unregister', callback: (wallet: BaseWallet) => void): () => void;
}

// Legacy aliases for backward compatibility
export type WalletStandardWallet = BaseWallet;
export type WalletStandardAccount = BaseWalletAccount;

// Simple registry reference
let registry: WalletsRegistry | null = null;

// Registry initialization state for the `ready` Promise
let registryInitPromise: Promise<void> | null = null;
let registryInitResolve: (() => void) | null = null;

/**
 * Promise that resolves when the wallet registry is initialized and ready.
 *
 * Use this when you need deterministic wallet detection (e.g., auto-reconnect,
 * checking if a specific wallet is installed before showing UI).
 *
 * Resolves immediately if the registry is already available.
 * Rejects only on fatal errors (e.g., module load failure in browser environment).
 *
 * @example
 * ```ts
 * import { ready, getWalletsRegistry } from '@solana/connector';
 *
 * // Wait for registry to be ready before detecting wallets
 * await ready;
 * const wallets = getWalletsRegistry().get();
 * ```
 */
export const ready: Promise<void> = new Promise((resolve, reject) => {
    // SSR: resolve immediately, no wallets available server-side
    if (typeof window === 'undefined') {
        resolve();
        return;
    }

    // Store resolver for deferred resolution
    registryInitResolve = resolve;

    // Check if navigator.wallets is already available (injected by wallet extensions)
    const nav = window.navigator as Navigator & { wallets?: WalletsRegistry };
    if (nav.wallets && typeof nav.wallets.get === 'function') {
        registry = nav.wallets;
        resolve();
        return;
    }

    // Fallback: dynamically import @wallet-standard/app
    // This handles cases where no wallet extension has set navigator.wallets
    registryInitPromise = import('@wallet-standard/app')
        .then(mod => {
            const walletStandardRegistry = mod.getWallets?.();
            if (walletStandardRegistry) {
                registry = walletStandardRegistry;
            }
            resolve();
        })
        .catch(err => {
            // Resolve anyway to allow graceful degradation - wallets just won't be detected
            // Only reject on truly fatal errors (extremely rare)
            console.warn('[standard-shim] Failed to load @wallet-standard/app:', err);
            resolve();
        });
});

/**
 * Get the wallets registry - simplified approach
 *
 * ⚠️ RACE CONDITION WARNING:
 * The dynamic import of '@wallet-standard/app' is asynchronous. If `window.navigator.wallets`
 * is not pre-populated by a wallet extension, the registry may be undefined briefly during
 * initial page load. Calls to `getWalletsRegistry().get()` during this window will return
 * an empty array as graceful degradation.
 *
 * For deterministic wallet detection (e.g., auto-reconnect, pre-checking wallet availability),
 * await the exported `ready` Promise before calling `get()`:
 *
 * @example
 * ```ts
 * await ready;
 * const wallets = getWalletsRegistry().get(); // Guaranteed to have registry loaded
 * ```
 */
export function getWalletsRegistry(): WalletsRegistry {
    if (typeof window === 'undefined') {
        return {
            get: () => [],
            on: () => () => {},
        };
    }

    // Trigger initialization if not already started (lazy init for sync callers)
    // Note: The `ready` Promise constructor already handles this, but this ensures
    // registry setup kicks off even if `ready` hasn't been imported yet.
    if (!registry && !registryInitPromise) {
        const nav = window.navigator as Navigator & { wallets?: WalletsRegistry };

        if (nav.wallets && typeof nav.wallets.get === 'function') {
            registry = nav.wallets;
            registryInitResolve?.();
        } else {
            // ASYNC: This import is asynchronous. Until it completes, `registry` remains null
            // and get() will return an empty array. This is expected graceful degradation.
            // Consumers needing deterministic detection should `await ready` first.
            registryInitPromise = import('@wallet-standard/app')
                .then(mod => {
                    const walletStandardRegistry = mod.getWallets?.();
                    if (walletStandardRegistry) {
                        registry = walletStandardRegistry;
                    }
                    registryInitResolve?.();
                })
                .catch(() => {
                    registryInitResolve?.();
                });
        }
    }

    return {
        get: () => {
            try {
                const nav = window.navigator as Navigator & { wallets?: WalletsRegistry };
                const activeRegistry = nav.wallets || registry;
                if (activeRegistry && typeof activeRegistry.get === 'function') {
                    const wallets = activeRegistry.get();
                    return Array.isArray(wallets) ? wallets : [];
                }
                return [];
            } catch {
                return [];
            }
        },
        on: (event, callback) => {
            try {
                const nav = window.navigator as Navigator & { wallets?: WalletsRegistry };
                const activeRegistry = nav.wallets || registry;
                if (activeRegistry && typeof activeRegistry.on === 'function') {
                    return activeRegistry.on(event, callback);
                }
                return () => {};
            } catch {
                return () => {};
            }
        },
    };
}

/**
 * Reset wallet registry cache
 * ⚠️ FOR TESTING ONLY - Do not use in production code
 * @internal
 */
export function __resetWalletRegistryForTesting(): void {
    registry = null;
    registryInitPromise = null;
    // Note: registryInitResolve is not reset as the original `ready` Promise
    // is already resolved/rejected and cannot be reset. Tests should reload
    // the module if they need a fresh `ready` Promise.
}
