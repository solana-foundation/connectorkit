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
 * @connector-kit/connector - wallet-standard integration
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

function normalizeWallet(wallet: Partial<BaseWallet>): BaseWallet {
    return {
        version: wallet?.version ?? ('1.0.0' as const),
        name: wallet?.name ?? 'Unknown Wallet',
        icon: wallet?.icon as BaseWallet['icon'],
        chains: wallet?.chains ?? [],
        features: wallet?.features ?? {},
        accounts: wallet?.accounts ?? [],
    };
}

/**
 * Get the wallets registry - simplified approach
 */
export function getWalletsRegistry(): WalletsRegistry {
    if (typeof window === 'undefined') {
        return {
            get: () => [],
            on: () => () => {},
        };
    }

    // Initialize wallet standard if not available
    if (!registry) {
        const nav = window.navigator as Navigator & { wallets?: WalletsRegistry };

        // Try direct registry first
        if (nav.wallets && typeof nav.wallets.get === 'function') {
            registry = nav.wallets;
        } else {
            // Initialize wallet standard
            import('@wallet-standard/app')
                .then(mod => {
                    const walletStandardRegistry = mod.getWallets?.();
                    if (walletStandardRegistry) {
                        registry = walletStandardRegistry;
                    }
                })
                .catch(() => {
                    // Wallet standard unavailable - not critical since we have instant auto-connect
                });
        }
    }

    // Return simplified registry interface
    return {
        get: () => {
            try {
                const nav = window.navigator as Navigator & { wallets?: WalletsRegistry };
                const activeRegistry = nav.wallets || registry;
                if (activeRegistry && typeof activeRegistry.get === 'function') {
                    const wallets = activeRegistry.get();
                    return Array.isArray(wallets) ? wallets.map(normalizeWallet) : [];
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
                    return activeRegistry.on(event, (wallet: BaseWallet) => callback(normalizeWallet(wallet)));
                }
                return () => {};
            } catch {
                return () => {};
            }
        },
    };
}
