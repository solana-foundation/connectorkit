import { getWalletsRegistry } from '../adapters/wallet-standard-shim';
import type { Wallet, WalletInfo } from '../../types/wallets';
import type { StateManager } from '../core/state-manager';
import type { EventEmitter } from '../core/event-emitter';

/**
 * Legacy wallet PublicKey interface
 */
export interface LegacyPublicKey {
    toString(): string;
    toBytes?(): Uint8Array;
}

/**
 * Direct wallet interface for legacy wallets
 */
export interface DirectWallet {
    connect?: (options?: Record<string, unknown>) => Promise<unknown>;
    disconnect?: () => Promise<void> | void;
    signTransaction?: (tx: unknown) => Promise<unknown>;
    signMessage?: (msg: Uint8Array) => Promise<{ signature: Uint8Array }>;
    publicKey?: LegacyPublicKey;
    features?: Record<string, unknown>;
    chains?: readonly string[];
    accounts?: readonly unknown[];
    icon?: string;
    _metadata?: { icon?: string };
    adapter?: { icon?: string };
    metadata?: { icon?: string };
    iconUrl?: string;
}

/**
 * Check if wallet has a specific feature
 */
function hasFeature(wallet: Wallet, featureName: string): boolean {
    return wallet.features != null && (wallet.features as Record<string, unknown>)[featureName] !== undefined;
}

/**
 * Verify if a wallet candidate matches the requested wallet name
 */
function verifyWalletName(wallet: DirectWallet | Record<string, unknown>, requestedName: string): boolean {
    const name = requestedName.toLowerCase();
    const walletObj = wallet as Record<string, unknown>;

    // Check various name properties (case-insensitive)
    const nameFields = [
        walletObj.name,
        walletObj.providerName,
        (walletObj.metadata as Record<string, unknown>)?.name,
    ].filter(Boolean) as string[];

    for (const field of nameFields) {
        if (typeof field === 'string' && field.toLowerCase().includes(name)) {
            return true;
        }
    }

    // Dynamically check for provider-specific flag pattern: is{WalletName}
    // e.g., isPhantom, isBackpack, isSolflare, etc.
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    const commonFlagPatterns = [
        `is${capitalizedName}`, // isPhantom, isBackpack
        `is${capitalizedName}Wallet`, // isCoinbaseWallet, isBraveWallet
    ];

    for (const flagName of commonFlagPatterns) {
        if (walletObj[flagName] === true) {
            return true;
        }
    }

    return false;
}

/**
 * WalletDetector - Handles wallet discovery and registry management
 *
 * Integrates with Wallet Standard registry and provides direct wallet detection.
 */
export class WalletDetector {
    private stateManager: StateManager;
    private eventEmitter: EventEmitter;
    private debug: boolean;
    private unsubscribers: Array<() => void> = [];

    constructor(stateManager: StateManager, eventEmitter: EventEmitter, debug = false) {
        this.stateManager = stateManager;
        this.eventEmitter = eventEmitter;
        this.debug = debug;
    }

    /**
     * Initialize wallet detection
     */
    initialize(): void {
        if (typeof window === 'undefined') return;

        try {
            const walletsApi = getWalletsRegistry();
            const update = () => {
                const ws = walletsApi.get();
                const previousCount = this.stateManager.getSnapshot().wallets.length;
                const newCount = ws.length;

                if (this.debug && newCount !== previousCount) {
                    console.log('🔍 WalletDetector: found wallets:', newCount);
                }

                const unique = this.deduplicateWallets(ws);

                // Update wallet list for UI
                this.stateManager.updateState({
                    wallets: unique.map(w => this.mapToWalletInfo(w)),
                });

                // Emit wallet detection event if count changed
                if (newCount !== previousCount && newCount > 0) {
                    this.eventEmitter.emit({
                        type: 'wallets:detected',
                        count: newCount,
                        timestamp: new Date().toISOString(),
                    });
                }
            };

            // Initial update for wallet discovery
            update();

            // Subscribe to wallet changes for discovery
            this.unsubscribers.push(walletsApi.on('register', update));
            this.unsubscribers.push(walletsApi.on('unregister', update));

            // Additional discovery pass after delay
            setTimeout(() => {
                if (!this.stateManager.getSnapshot().connected) {
                    update();
                }
            }, 1000);
        } catch (e) {
            // Init failed silently
        }
    }

    /**
     * Check if a specific wallet is available immediately via direct window object detection
     */
    detectDirectWallet(walletName: string): DirectWallet | null {
        if (typeof window === 'undefined') return null;

        const name = walletName.toLowerCase();

        // Use type-safe window access
        const windowObj = window as unknown as Record<string, unknown>;

        // Check common wallet injection patterns
        const checks = [
            () => windowObj[name], // window.phantom, window.backpack
            () => windowObj[`${name}Wallet`], // window.phantomWallet
            () => windowObj.solana, // Legacy Phantom injection
            () => {
                // Check for wallet in window keys
                const keys = Object.keys(window).filter(k => k.toLowerCase().includes(name));
                return keys.length > 0 ? windowObj[keys[0]] : null;
            },
        ];

        for (const check of checks) {
            try {
                const result = check();
                if (result && typeof result === 'object') {
                    // Cast to DirectWallet for type-safe checks
                    const wallet = result as DirectWallet;

                    // First, verify the candidate matches the requested wallet name
                    if (!verifyWalletName(wallet, walletName)) {
                        continue;
                    }

                    // Then verify it looks like a wallet with connect capabilities
                    const hasStandardConnect = wallet.features?.['standard:connect'];
                    const hasLegacyConnect = typeof wallet.connect === 'function';
                    if (hasStandardConnect || hasLegacyConnect) {
                        return wallet;
                    }
                }
            } catch (e) {
                continue;
            }
        }

        return null;
    }

    /**
     * Get currently detected wallets
     */
    getDetectedWallets(): WalletInfo[] {
        return this.stateManager.getSnapshot().wallets;
    }

    /**
     * Convert a Wallet Standard wallet to WalletInfo with capability checks
     */
    private mapToWalletInfo(wallet: Wallet): WalletInfo {
        const hasConnect = hasFeature(wallet, 'standard:connect');
        const hasDisconnect = hasFeature(wallet, 'standard:disconnect');
        const isSolana =
            Array.isArray(wallet.chains) && wallet.chains.some(c => typeof c === 'string' && c.includes('solana'));
        const connectable = hasConnect && hasDisconnect && isSolana;

        return {
            wallet,
            installed: true,
            connectable,
        };
    }

    /**
     * Deduplicate wallets by name (keeps first occurrence)
     */
    private deduplicateWallets(wallets: readonly Wallet[]): Wallet[] {
        const seen = new Map<string, Wallet>();
        for (const wallet of wallets) {
            if (!seen.has(wallet.name)) {
                seen.set(wallet.name, wallet);
            }
        }
        return Array.from(seen.values());
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        for (const unsubscribe of this.unsubscribers) {
            try {
                unsubscribe();
            } catch {}
        }
        this.unsubscribers = [];
    }
}
