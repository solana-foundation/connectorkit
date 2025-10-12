import type { Wallet, WalletInfo } from '../../types/wallets';
import type { StorageAdapter } from '../../types/storage';
import type { WalletDetector } from './wallet-detector';
import type { ConnectionManager } from './connection-manager';
import type { StateManager } from '../core/state-manager';
import { getWalletsRegistry } from '../adapters/wallet-standard-shim';

/**
 * AutoConnector - Handles automatic wallet reconnection strategies
 *
 * Implements instant reconnection via direct detection and fallback via standard detection.
 */
export class AutoConnector {
    private walletDetector: WalletDetector;
    private connectionManager: ConnectionManager;
    private stateManager: StateManager;
    private walletStorage?: StorageAdapter<string | undefined>;
    private debug: boolean;

    constructor(
        walletDetector: WalletDetector,
        connectionManager: ConnectionManager,
        stateManager: StateManager,
        walletStorage?: StorageAdapter<string | undefined>,
        debug = false,
    ) {
        this.walletDetector = walletDetector;
        this.connectionManager = connectionManager;
        this.stateManager = stateManager;
        this.walletStorage = walletStorage;
        this.debug = debug;
    }

    /**
     * Attempt auto-connection using both instant and fallback strategies
     */
    async attemptAutoConnect(): Promise<boolean> {
        // Try instant connect first
        const instantSuccess = await this.attemptInstantConnect();
        if (instantSuccess) return true;

        // Fallback to standard detection
        await this.attemptStandardConnect();
        return this.stateManager.getSnapshot().connected;
    }

    /**
     * Attempt instant auto-connection using direct wallet detection
     * Bypasses wallet standard initialization for maximum speed
     */
    private async attemptInstantConnect(): Promise<boolean> {
        const storedWalletName = this.walletStorage?.get();
        if (!storedWalletName) return false;

        const directWallet = this.walletDetector.detectDirectWallet(storedWalletName);
        if (!directWallet) return false;

        if (this.debug) {
            console.log('⚡ Instant auto-connect: found', storedWalletName, 'directly in window');
        }

        try {
            // Create proper features object for direct wallet
            const features: Record<string, Record<string, (...args: unknown[]) => unknown>> = {};

            // Map direct wallet methods to wallet standard features
            if (directWallet.connect) {
                features['standard:connect'] = {
                    connect: async (options: Record<string, unknown> = {}) => {
                        const result = await directWallet.connect(options);

                        if (this.debug) {
                            console.log('🔍 Direct wallet connect result:', result);
                            console.log('🔍 Direct wallet publicKey property:', directWallet.publicKey);
                        }

                        // Strategy 1: Check if result has proper wallet standard format
                        if (result && result.accounts && Array.isArray(result.accounts)) {
                            return result;
                        }

                        // Strategy 2: Check if result has legacy publicKey format
                        if (result && result.publicKey && typeof result.publicKey.toString === 'function') {
                            return {
                                accounts: [
                                    {
                                        address: result.publicKey.toString(),
                                        publicKey: result.publicKey.toBytes
                                            ? result.publicKey.toBytes()
                                            : new Uint8Array(),
                                        chains: ['solana:mainnet', 'solana:devnet', 'solana:testnet'],
                                        features: [],
                                    },
                                ],
                            };
                        }

                        // Strategy 3: Legacy wallet pattern - publicKey on wallet object
                        if (directWallet.publicKey && typeof directWallet.publicKey.toString === 'function') {
                            const address = directWallet.publicKey.toString();
                            if (this.debug) {
                                console.log('🔧 Using legacy wallet pattern - publicKey from wallet object');
                            }
                            return {
                                accounts: [
                                    {
                                        address,
                                        publicKey: directWallet.publicKey.toBytes
                                            ? directWallet.publicKey.toBytes()
                                            : new Uint8Array(),
                                        chains: ['solana:mainnet', 'solana:devnet', 'solana:testnet'],
                                        features: [],
                                    },
                                ],
                            };
                        }

                        // Strategy 4: Check if result itself is a publicKey
                        if (result && typeof result.toString === 'function' && result.toString().length > 30) {
                            return {
                                accounts: [
                                    {
                                        address: result.toString(),
                                        publicKey: result.toBytes ? result.toBytes() : new Uint8Array(),
                                        chains: ['solana:mainnet', 'solana:devnet', 'solana:testnet'],
                                        features: [],
                                    },
                                ],
                            };
                        }

                        // No valid account found
                        if (this.debug) {
                            console.error('❌ Legacy wallet: No valid publicKey found in any expected location');
                        }
                        return { accounts: [] };
                    },
                };
            }

            if (directWallet.disconnect) {
                features['standard:disconnect'] = {
                    disconnect: directWallet.disconnect.bind(directWallet),
                };
            }

            if (directWallet.signTransaction) {
                features['standard:signTransaction'] = {
                    signTransaction: directWallet.signTransaction.bind(directWallet),
                };
            }

            if (directWallet.signMessage) {
                features['standard:signMessage'] = {
                    signMessage: directWallet.signMessage.bind(directWallet),
                };
            }

            // If wallet already has proper features, use them
            if (directWallet.features) {
                Object.assign(features, directWallet.features);
            }

            // Create a minimal wallet object for immediate connection
            const walletIcon =
                directWallet.icon ||
                directWallet._metadata?.icon ||
                directWallet.adapter?.icon ||
                directWallet.metadata?.icon ||
                ('iconUrl' in directWallet ? (directWallet.iconUrl as string | undefined) : undefined) ||
                undefined;

            const wallet: Wallet = {
                version: '1.0.0' as const,
                name: storedWalletName,
                icon: walletIcon,
                chains: directWallet.chains || ['solana:mainnet', 'solana:devnet', 'solana:testnet'],
                features,
                accounts: directWallet.accounts || [],
            };

            // Add to state immediately for instant UI feedback
            this.stateManager.updateState(
                {
                    wallets: [
                        {
                            wallet,
                            installed: true,
                            connectable: true,
                        },
                    ],
                },
                true,
            );

            // Connect immediately
            if (this.debug) {
                console.log('🔄 Attempting to connect to', storedWalletName, 'via instant auto-connect');
            }

            await this.connectionManager.connect(wallet, storedWalletName);

            if (this.debug) {
                console.log('✅ Instant auto-connect successful for', storedWalletName);
            }

            // Force wallet list update after successful connection to get proper icons
            setTimeout(() => {
                const walletsApi = getWalletsRegistry();
                const ws = walletsApi.get();

                if (this.debug) {
                    console.log('🔍 Checking for wallet standard update:', {
                        wsLength: ws.length,
                        currentWalletsLength: this.stateManager.getSnapshot().wallets.length,
                        shouldUpdate: ws.length > 1,
                    });
                }

                if (ws.length > 1) {
                    // Trigger detector update
                    this.walletDetector.initialize();
                }
            }, 500);

            return true;
        } catch (error) {
            if (this.debug) {
                console.error(
                    '❌ Instant auto-connect failed for',
                    storedWalletName + ':',
                    error instanceof Error ? error.message : error,
                );
            }
            return false;
        }
    }

    /**
     * Attempt auto-connection via standard wallet detection (fallback)
     */
    private async attemptStandardConnect(): Promise<void> {
        try {
            // Skip if already connected (e.g., via instant auto-connect)
            if (this.stateManager.getSnapshot().connected) {
                if (this.debug) {
                    console.log('🔄 Auto-connect: Already connected, skipping fallback auto-connect');
                }
                return;
            }

            const storedWalletName = this.walletStorage?.get();
            if (this.debug) {
                console.log('🔄 Auto-connect: stored wallet =', storedWalletName);
                console.log(
                    '🔄 Auto-connect: available wallets =',
                    this.stateManager.getSnapshot().wallets.map((w: WalletInfo) => w.wallet.name),
                );
            }

            if (!storedWalletName) return;

            const wallets = this.stateManager.getSnapshot().wallets;
            const walletInfo = wallets.find((w: WalletInfo) => w.wallet.name === storedWalletName);

            if (walletInfo) {
                if (this.debug) {
                    console.log('✅ Auto-connect: Found stored wallet, connecting');
                }
                await this.connectionManager.connect(walletInfo.wallet, storedWalletName);
            } else {
                // Single shorter retry - wallets usually register within 1-2 seconds
                setTimeout(() => {
                    const retryWallets = this.stateManager.getSnapshot().wallets;
                    const retryWallet = retryWallets.find((w: WalletInfo) => w.wallet.name === storedWalletName);
                    if (retryWallet) {
                        if (this.debug) {
                            console.log('✅ Auto-connect: Retry successful');
                        }
                        this.connectionManager.connect(retryWallet.wallet, storedWalletName).catch(console.error);
                    }
                }, 1000);
            }
        } catch (e) {
            if (this.debug) {
                console.error('❌ Auto-connect failed:', e);
            }
            // Remove stored wallet on failure
            this.walletStorage?.set(undefined);
        }
    }
}
