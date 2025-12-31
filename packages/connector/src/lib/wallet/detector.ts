import { getWalletsRegistry, ready } from './standard-shim';
import type { Wallet, WalletInfo } from '../../types/wallets';
import type { WalletConnectorId, WalletConnectorMetadata } from '../../types/session';
import { createConnectorId } from '../../types/session';
import { BaseCollaborator } from '../core/base-collaborator';
import { WalletAuthenticityVerifier } from './authenticity-verifier';
import { createLogger } from '../utils/secure-logger';
import { applyWalletIconOverride } from './wallet-icon-overrides';

const logger = createLogger('WalletDetector');

function isSolanaWallet(wallet: Wallet): boolean {
    return (
        Array.isArray(wallet.chains) &&
        wallet.chains.some(chain => typeof chain === 'string' && chain.startsWith('solana:'))
    );
}

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

    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    const commonFlagPatterns = [`is${capitalizedName}`, `is${capitalizedName}Wallet`];

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
 * Supports additional wallets (e.g., remote signers) via `setAdditionalWallets()`.
 * Maintains a stable connector ID -> Wallet mapping for vNext APIs.
 */
export class WalletDetector extends BaseCollaborator {
    private unsubscribers: Array<() => void> = [];
    private additionalWallets: Wallet[] = [];
    /** Map from stable connector ID to Wallet reference (not stored in state) */
    private connectorRegistry = new Map<WalletConnectorId, Wallet>();

    constructor(
        stateManager: import('../core/state-manager').StateManager,
        eventEmitter: import('../core/event-emitter').EventEmitter,
        debug = false,
    ) {
        super({ stateManager, eventEmitter, debug }, 'WalletDetector');
    }

    /**
     * Set additional wallets to include alongside Wallet Standard wallets.
     * These wallets (e.g., remote signers) will be merged with detected wallets.
     *
     * @param wallets - Array of Wallet Standard compatible wallets
     */
    setAdditionalWallets(wallets: Wallet[]): void {
        this.additionalWallets = wallets;
        // Re-run detection to merge new wallets
        this.refreshWallets();
    }

    /**
     * Get additional wallets that have been configured
     */
    getAdditionalWallets(): Wallet[] {
        return this.additionalWallets;
    }

    /**
     * Refresh wallet list (re-detect and merge)
     */
    private refreshWallets(): void {
        if (typeof window === 'undefined') return;

        try {
            const walletsApi = getWalletsRegistry();
            const ws = walletsApi.get();

            // - Only include Solana wallets (Wallet Standard supports multi-chain registries)
            // - If multiple wallets share the same name (e.g. multi-chain variants), prefer the Solana one
            //   by filtering to solana:* first, then deduplicating by name.
            const registryWallets = ws.filter(isSolanaWallet);
            const additionalWallets = this.additionalWallets.filter(isSolanaWallet);
            const unique = this.deduplicateWallets([...registryWallets, ...additionalWallets]);

            // Update connector registry (connectorId -> Wallet map)
            this.updateConnectorRegistry(unique);

            this.stateManager.updateState({
                wallets: unique.map(w => this.mapToWalletInfo(w)),
                connectors: unique.map(w => this.mapToConnectorMetadata(w)),
            });

            this.log('🔍 WalletDetector: refreshed wallets', {
                registry: registryWallets.length,
                additional: additionalWallets.length,
                total: unique.length,
            });
        } catch {
            // Ignore errors during refresh
        }
    }

    /**
     * Initialize wallet detection (synchronous)
     *
     * Sets up registry listeners immediately. Due to the async nature of registry initialization,
     * the initial call to `get()` may return an empty array if called before the registry is ready.
     * Event listeners will fire as wallets register, providing eventual consistency.
     *
     * For deterministic detection where you need all wallets available immediately,
     * use `initializeAsync()` instead.
     */
    initialize(): void {
        if (typeof window === 'undefined') return;

        try {
            const walletsApi = getWalletsRegistry();
            const update = () => {
                const ws = walletsApi.get();
                const previousCount = this.getState().wallets.length;

                // - Only include Solana wallets (Wallet Standard supports multi-chain registries)
                // - If multiple wallets share the same name (e.g. multi-chain variants), prefer the Solana one
                //   by filtering to solana:* first, then deduplicating by name.
                const registryWallets = ws.filter(isSolanaWallet);
                const additionalWallets = this.additionalWallets.filter(isSolanaWallet);
                const unique = this.deduplicateWallets([...registryWallets, ...additionalWallets]);
                const newCount = unique.length;

                if (newCount !== previousCount) {
                    this.log('🔍 WalletDetector: found wallets:', {
                        registry: registryWallets.length,
                        additional: additionalWallets.length,
                        total: newCount,
                    });
                }

                // Update connector registry (connectorId -> Wallet map)
                this.updateConnectorRegistry(unique);

                // Update state with both legacy WalletInfo[] and vNext connectors[]
                this.stateManager.updateState({
                    wallets: unique.map(w => this.mapToWalletInfo(w)),
                    connectors: unique.map(w => this.mapToConnectorMetadata(w)),
                });

                if (newCount !== previousCount && newCount > 0) {
                    this.eventEmitter.emit({
                        type: 'wallets:detected',
                        count: newCount,
                        timestamp: new Date().toISOString(),
                    });
                }
            };

            update();

            this.unsubscribers.push(walletsApi.on('register', update));
            this.unsubscribers.push(walletsApi.on('unregister', update));

            setTimeout(() => {
                if (!this.getState().connected) {
                    update();
                }
            }, 1000);
        } catch {}
    }

    /**
     * Initialize wallet detection with deterministic registry availability (async)
     *
     * Awaits the registry `ready` Promise before performing initial detection,
     * ensuring all registered wallets are available on the first `get()` call.
     *
     * Use this when you need guaranteed wallet availability before proceeding
     * (e.g., auto-reconnect logic, checking if a specific wallet is installed).
     *
     * @example
     * ```ts
     * await walletDetector.initializeAsync();
     * const wallets = walletDetector.getDetectedWallets(); // Guaranteed populated
     * ```
     */
    async initializeAsync(): Promise<void> {
        if (typeof window === 'undefined') return;

        // Wait for registry to be ready before initial detection
        await ready;

        // Now initialize with guaranteed registry availability
        this.initialize();
    }

    /**
     * Check if a specific wallet is available immediately via direct window object detection
     */
    detectDirectWallet(walletName: string): DirectWallet | null {
        if (typeof window === 'undefined') return null;

        const name = walletName.toLowerCase();
        const windowObj = window as unknown as Record<string, unknown>;

        const checks = [
            () => windowObj[name],
            () => windowObj[`${name}Wallet`],
            () => windowObj.solana,
            () => {
                const keys = Object.keys(window).filter(k => k.toLowerCase().includes(name));
                return keys.length > 0 ? windowObj[keys[0]] : null;
            },
        ];

        for (const check of checks) {
            try {
                const result = check();
                if (result && typeof result === 'object') {
                    const wallet = result as DirectWallet;

                    if (!verifyWalletName(wallet, walletName)) {
                        continue;
                    }

                    // Verify wallet authenticity before returning
                    const verification = WalletAuthenticityVerifier.verify(wallet, walletName);

                    if (!verification.authentic) {
                        logger.warn('Rejecting potentially malicious wallet', {
                            name: walletName,
                            reason: verification.reason,
                            confidence: verification.confidence,
                        });
                        continue;
                    }

                    if (verification.warnings.length > 0) {
                        logger.warn('Wallet verification warnings', {
                            name: walletName,
                            warnings: verification.warnings,
                        });
                    }

                    const hasStandardConnect = wallet.features?.['standard:connect'];
                    const hasLegacyConnect = typeof wallet.connect === 'function';
                    if (hasStandardConnect || hasLegacyConnect) {
                        logger.debug('Authentic wallet detected', {
                            name: walletName,
                            confidence: verification.confidence,
                        });
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
     * Get currently detected wallets (legacy)
     * @deprecated Use getConnectors() for vNext API
     */
    getDetectedWallets(): WalletInfo[] {
        return this.getState().wallets;
    }

    /**
     * Get all available connectors (vNext API)
     */
    getConnectors(): WalletConnectorMetadata[] {
        return this.getState().connectors;
    }

    /**
     * Get a wallet by its stable connector ID (vNext API)
     * Returns the Wallet reference for connection operations
     */
    getConnectorById(connectorId: WalletConnectorId): Wallet | undefined {
        return this.connectorRegistry.get(connectorId);
    }

    /**
     * Get connector metadata by ID
     */
    getConnectorMetadata(connectorId: WalletConnectorId): WalletConnectorMetadata | undefined {
        return this.getState().connectors.find(c => c.id === connectorId);
    }

    /**
     * Update the connector registry map
     */
    private updateConnectorRegistry(wallets: Wallet[]): void {
        // Clear and rebuild to handle unregistered wallets
        this.connectorRegistry.clear();
        for (const wallet of wallets) {
            const connectorId = createConnectorId(wallet.name);
            this.connectorRegistry.set(connectorId, wallet);
        }
    }

    /**
     * Convert a Wallet Standard wallet to WalletConnectorMetadata (serializable)
     */
    private mapToConnectorMetadata(wallet: Wallet): WalletConnectorMetadata {
        const walletWithIcon = applyWalletIconOverride(wallet);
        const hasConnect = hasFeature(walletWithIcon, 'standard:connect');
        const isSolana = isSolanaWallet(walletWithIcon);
        // Wallet UI considers a wallet "available" if it's in the registry and supports Solana.
        // We additionally require standard:connect so the UX doesn't offer unconnectable wallets.
        // Do NOT require standard:disconnect; some wallets omit it but still connect fine.
        const ready = hasConnect && isSolana;

        return {
            id: createConnectorId(wallet.name),
            name: wallet.name,
            icon: typeof walletWithIcon.icon === 'string' ? walletWithIcon.icon : '',
            ready,
            chains: walletWithIcon.chains ?? [],
            features: Object.keys(walletWithIcon.features ?? {}),
        };
    }

    /**
     * Convert a Wallet Standard wallet to WalletInfo with capability checks (legacy)
     */
    private mapToWalletInfo(wallet: Wallet): WalletInfo {
        const walletWithIcon = applyWalletIconOverride(wallet);
        const hasConnect = hasFeature(walletWithIcon, 'standard:connect');
        const isSolana = isSolanaWallet(walletWithIcon);
        const connectable = hasConnect && isSolana;

        return {
            wallet: walletWithIcon,
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
            } catch (error) {
                logger.warn('Error during unsubscribe cleanup', { error });
            }
        }
        this.unsubscribers = [];
    }
}
