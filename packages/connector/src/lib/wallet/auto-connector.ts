import type { Wallet, WalletInfo } from '../../types/wallets';
import type { StorageAdapter } from '../../types/storage';
import type { WalletDetector, LegacyPublicKey } from './detector';
import type { ConnectionManager } from './connection-manager';
import type { StateManager } from '../core/state-manager';
import { getWalletsRegistry } from './standard-shim';
import { createLogger } from '../utils/secure-logger';

const logger = createLogger('AutoConnector');

const MIN_ADDRESS_LENGTH = 30;

interface LegacyConnectResult {
    publicKey?: LegacyPublicKey;
    accounts?: unknown[];
}

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

    async attemptAutoConnect(): Promise<boolean> {
        const instantSuccess = await this.attemptInstantConnect();
        if (instantSuccess) return true;

        await this.attemptStandardConnect();
        return this.stateManager.getSnapshot().connected;
    }

    private async attemptInstantConnect(): Promise<boolean> {
        const storedWalletName = this.walletStorage?.get();
        if (!storedWalletName) return false;

        const directWallet = this.walletDetector.detectDirectWallet(storedWalletName);
        if (!directWallet) return false;

        if (this.debug) {
            logger.info('Instant auto-connect: found wallet directly in window', { walletName: storedWalletName });
        }

        try {
            const features: Record<string, Record<string, (...args: unknown[]) => unknown>> = {};

            if (directWallet.connect) {
                features['standard:connect'] = {
                    connect: async (...args: unknown[]) => {
                        const options = args[0] as Record<string, unknown> | undefined;
                        const result = await directWallet.connect!(options);

                        if (this.debug) {
                            logger.debug('Direct wallet connect result', { result });
                            logger.debug('Direct wallet publicKey property', { publicKey: directWallet.publicKey });
                        }

                        if (
                            result &&
                            typeof result === 'object' &&
                            'accounts' in result &&
                            Array.isArray(result.accounts)
                        ) {
                            return result;
                        }

                        const legacyResult = result as LegacyConnectResult | undefined;
                        if (legacyResult?.publicKey && typeof legacyResult.publicKey.toString === 'function') {
                            const address = legacyResult.publicKey.toString();
                            const publicKeyBytes = legacyResult.publicKey.toBytes
                                ? legacyResult.publicKey.toBytes()
                                : new Uint8Array();

                            return {
                                accounts: [
                                    {
                                        address,
                                        publicKey: publicKeyBytes,
                                        chains: ['solana:mainnet', 'solana:devnet', 'solana:testnet'] as const,
                                        features: [],
                                    },
                                ],
                            };
                        }

                        if (directWallet.publicKey && typeof directWallet.publicKey.toString === 'function') {
                            const address = directWallet.publicKey.toString();
                            const publicKeyBytes = directWallet.publicKey.toBytes
                                ? directWallet.publicKey.toBytes()
                                : new Uint8Array();

                            if (this.debug) {
                                logger.debug('Using legacy wallet pattern - publicKey from wallet object');
                            }
                            return {
                                accounts: [
                                    {
                                        address,
                                        publicKey: publicKeyBytes,
                                        chains: ['solana:mainnet', 'solana:devnet', 'solana:testnet'] as const,
                                        features: [],
                                    },
                                ],
                            };
                        }

                        const publicKeyResult = result as LegacyPublicKey | undefined;
                        if (
                            publicKeyResult &&
                            typeof publicKeyResult.toString === 'function' &&
                            publicKeyResult.toString().length > MIN_ADDRESS_LENGTH
                        ) {
                            const address = publicKeyResult.toString();
                            const publicKeyBytes = publicKeyResult.toBytes
                                ? publicKeyResult.toBytes()
                                : new Uint8Array();

                            return {
                                accounts: [
                                    {
                                        address,
                                        publicKey: publicKeyBytes,
                                        chains: ['solana:mainnet', 'solana:devnet', 'solana:testnet'] as const,
                                        features: [],
                                    },
                                ],
                            };
                        }

                        if (this.debug) {
                            logger.error('Legacy wallet: No valid publicKey found in any expected location');
                        }
                        return { accounts: [] };
                    },
                };
            }

            if (directWallet.disconnect) {
                const disconnectFn = directWallet.disconnect;
                features['standard:disconnect'] = {
                    disconnect: () => disconnectFn.call(directWallet),
                };
            }

            if (directWallet.signTransaction) {
                const signTransactionFn = directWallet.signTransaction;
                features['solana:signTransaction'] = {
                    signTransaction: (tx: unknown) => signTransactionFn.call(directWallet, tx),
                };
            }

            if (directWallet.signMessage) {
                const signMessageFn = directWallet.signMessage;
                features['solana:signMessage'] = {
                    signMessage: (...args: unknown[]) => {
                        const msg = args[0] as Uint8Array;
                        return signMessageFn.call(directWallet, msg);
                    },
                };
            }

            if (directWallet.features) {
                Object.assign(features, directWallet.features);
            }

            const walletIcon =
                directWallet.icon ||
                directWallet._metadata?.icon ||
                directWallet.adapter?.icon ||
                directWallet.metadata?.icon ||
                directWallet.iconUrl;

            const wallet: Wallet = {
                version: '1.0.0' as const,
                name: storedWalletName,
                icon: walletIcon as Wallet['icon'],
                chains: (directWallet.chains || [
                    'solana:mainnet',
                    'solana:devnet',
                    'solana:testnet',
                ]) as readonly `${string}:${string}`[],
                features,
                accounts: [] as const,
            };

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

            // Check if wallet is already in registry - use that instead for better compatibility
            const walletsApi = getWalletsRegistry();
            const standardWallets = walletsApi.get();
            const registryWallet = standardWallets.find(w => w.name === storedWalletName);

            const walletToUse = registryWallet || wallet;

            if (this.debug) {
                logger.info('Attempting to connect via instant auto-connect', {
                    walletName: storedWalletName,
                    usingRegistry: !!registryWallet,
                });
            }

            await this.connectionManager.connect(walletToUse, storedWalletName);

            if (this.debug) {
                logger.info('Instant auto-connect successful', { walletName: storedWalletName });
            }

            setTimeout(() => {
                const ws = walletsApi.get();

                if (this.debug) {
                    logger.debug('Checking for wallet standard update', {
                        wsLength: ws.length,
                        currentWalletsLength: this.stateManager.getSnapshot().wallets.length,
                        shouldUpdate: ws.length > 1,
                    });
                }

                if (ws.length > 1) {
                    this.walletDetector.initialize();
                }
            }, 500);

            return true;
        } catch (error) {
            if (this.debug) {
                logger.error('Instant auto-connect failed', {
                    walletName: storedWalletName,
                    error: error instanceof Error ? error.message : error,
                });
            }
            return false;
        }
    }

    private async attemptStandardConnect(): Promise<void> {
        try {
            if (this.stateManager.getSnapshot().connected) {
                if (this.debug) {
                    logger.info('Auto-connect: Already connected, skipping fallback auto-connect');
                }
                return;
            }

            const storedWalletName = this.walletStorage?.get();
            if (this.debug) {
                logger.debug('Auto-connect: stored wallet', { storedWalletName });
                logger.debug('Auto-connect: available wallets', {
                    wallets: this.stateManager.getSnapshot().wallets.map((w: WalletInfo) => w.wallet.name),
                });
            }

            if (!storedWalletName) return;

            const wallets = this.stateManager.getSnapshot().wallets;
            const walletInfo = wallets.find((w: WalletInfo) => w.wallet.name === storedWalletName);

            if (walletInfo) {
                if (this.debug) {
                    logger.info('Auto-connect: Found stored wallet, connecting');
                }
                await this.connectionManager.connect(walletInfo.wallet, storedWalletName);
            } else {
                setTimeout(() => {
                    const retryWallets = this.stateManager.getSnapshot().wallets;
                    const retryWallet = retryWallets.find((w: WalletInfo) => w.wallet.name === storedWalletName);
                    if (retryWallet) {
                        if (this.debug) {
                            logger.info('Auto-connect: Retry successful');
                        }
                        this.connectionManager.connect(retryWallet.wallet, storedWalletName).catch(err => {
                            logger.error('Auto-connect retry connection failed', { error: err });
                        });
                    }
                }, 1000);
            }
        } catch (e) {
            if (this.debug) {
                logger.error('Auto-connect failed', { error: e });
            }
            this.walletStorage?.set(undefined);
        }
    }
}
