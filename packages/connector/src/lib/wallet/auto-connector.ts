import type { Wallet, WalletInfo } from '../../types/wallets';
import type { StorageAdapter, PersistedWalletState } from '../../types/storage';
import type { WalletConnectorId } from '../../types/session';
import { createConnectorId } from '../../types/session';
import type { WalletDetector, LegacyPublicKey } from './detector';
import type { ConnectionManager } from './connection-manager';
import type { StateManager } from '../core/state-manager';
import { getWalletsRegistry, ready } from './standard-shim';
import { createLogger } from '../utils/secure-logger';
import { applyWalletIconOverride } from './wallet-icon-overrides';

const logger = createLogger('AutoConnector');

const MIN_ADDRESS_LENGTH = 30;

interface LegacyConnectResult {
    publicKey?: LegacyPublicKey;
    accounts?: unknown[];
}

/** An account synthesized for a directly-detected (non-registry) wallet. */
type SynthesizedAccount = Wallet['accounts'][number];

export class AutoConnector {
    private walletDetector: WalletDetector;
    private connectionManager: ConnectionManager;
    private stateManager: StateManager;
    /** Legacy wallet name storage */
    private walletStorage?: StorageAdapter<string | undefined>;
    /** vNext wallet state storage (connector ID + account) */
    private walletStateStorage?: StorageAdapter<PersistedWalletState | null>;
    private debug: boolean;

    constructor(
        walletDetector: WalletDetector,
        connectionManager: ConnectionManager,
        stateManager: StateManager,
        walletStorage?: StorageAdapter<string | undefined>,
        debug = false,
        walletStateStorage?: StorageAdapter<PersistedWalletState | null>,
    ) {
        this.walletDetector = walletDetector;
        this.connectionManager = connectionManager;
        this.stateManager = stateManager;
        this.walletStorage = walletStorage;
        this.walletStateStorage = walletStateStorage;
        this.debug = debug;
    }

    async attemptAutoConnect(): Promise<boolean> {
        // First try vNext auto-connect with silent-first approach
        if (this.walletStateStorage) {
            const vNextSuccess = await this.attemptVNextAutoConnect();
            if (vNextSuccess) return true;
        }

        // Fall back to legacy auto-connect
        const instantSuccess = await this.attemptInstantConnect();
        if (instantSuccess) return true;

        await this.attemptStandardConnect();
        return this.stateManager.getSnapshot().connected;
    }

    /**
     * vNext auto-connect using stored connector ID with silent-first approach.
     * This won't prompt the user unless they explicitly initiated the connect.
     */
    private async attemptVNextAutoConnect(): Promise<boolean> {
        const walletState = this.walletStateStorage?.get();
        if (!walletState || !walletState.autoConnect) {
            if (this.debug) {
                logger.debug('vNext auto-connect: No stored wallet state or autoConnect disabled');
            }
            return false;
        }

        const { connectorId, lastAccount } = walletState;

        // Wait for registry to be ready
        await ready;

        // Try to get connector by ID
        const wallet = this.walletDetector.getConnectorById(connectorId as WalletConnectorId);
        if (!wallet) {
            if (this.debug) {
                logger.debug('vNext auto-connect: Connector not found', { connectorId });
            }
            return false;
        }

        try {
            if (this.debug) {
                logger.info('vNext auto-connect: Attempting silent connect', {
                    connectorId,
                    lastAccount,
                });
            }

            // Use silent-first connect (won't prompt user)
            await this.connectionManager.connectWallet(wallet, connectorId as WalletConnectorId, {
                silent: true,
                allowInteractiveFallback: false, // Don't prompt on auto-connect
                preferredAccount: lastAccount as import('@solana/addresses').Address | undefined,
            });

            if (this.debug) {
                logger.info('vNext auto-connect: Silent connect successful', { connectorId });
            }

            return true;
        } catch (error) {
            if (this.debug) {
                logger.debug('vNext auto-connect: Silent connect failed (expected for first-time or revoked)', {
                    connectorId,
                    error: error instanceof Error ? error.message : error,
                });
            }
            // Silent connect failed - this is normal for first-time connections
            // or when user revoked permissions. Don't clear state, let user retry.
            return false;
        }
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

            // Accounts resolved by the `standard:connect` shim below. The synthesized
            // wallet object is built before connect runs, so it exposes these through a
            // getter instead of the empty literal it used to ship: a wallet whose
            // `accounts` stay empty hands consumers an account it never issued, and the
            // wallet then throws when its own feature is called with it.
            const resolvedAccounts: SynthesizedAccount[] = [];

            const makeAccount = (address: string, publicKey: Uint8Array): SynthesizedAccount => ({
                address,
                publicKey,
                chains: ['solana:mainnet', 'solana:devnet', 'solana:testnet'] as const,
                // Wallet Standard scopes features per account and consumers gate on this
                // list (off-chain message signing reads `account.features` directly), so
                // an empty array silently disables every such capability check.
                features: Object.keys(features) as `${string}:${string}`[],
            });

            const resolveAccounts = (accounts: SynthesizedAccount[]) => {
                resolvedAccounts.splice(0, resolvedAccounts.length, ...accounts);
                return { accounts };
            };

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
                            // Still route through `resolveAccounts`: a provider that already
                            // speaks Wallet Standard is the one case where returning early
                            // would leave `wallet.accounts` empty.
                            return resolveAccounts(result.accounts as SynthesizedAccount[]);
                        }

                        const legacyResult = result as LegacyConnectResult | undefined;
                        if (legacyResult?.publicKey && typeof legacyResult.publicKey.toString === 'function') {
                            const address = legacyResult.publicKey.toString();
                            const publicKeyBytes = legacyResult.publicKey.toBytes
                                ? legacyResult.publicKey.toBytes()
                                : new Uint8Array();

                            return resolveAccounts([makeAccount(address, publicKeyBytes)]);
                        }

                        if (directWallet.publicKey && typeof directWallet.publicKey.toString === 'function') {
                            const address = directWallet.publicKey.toString();
                            const publicKeyBytes = directWallet.publicKey.toBytes
                                ? directWallet.publicKey.toBytes()
                                : new Uint8Array();

                            if (this.debug) {
                                logger.debug('Using legacy wallet pattern - publicKey from wallet object');
                            }
                            return resolveAccounts([makeAccount(address, publicKeyBytes)]);
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

                            return resolveAccounts([makeAccount(address, publicKeyBytes)]);
                        }

                        if (this.debug) {
                            logger.error('Legacy wallet: No valid publicKey found in any expected location');
                        }
                        return resolveAccounts([]);
                    },
                };
            }

            if (directWallet.disconnect) {
                const disconnectFn = directWallet.disconnect;
                features['standard:disconnect'] = {
                    // Drop the synthesized accounts as well. This wallet object is held in
                    // state and reused for the next connect, so accounts left behind here
                    // make a *denied* reconnect look like a successful one to
                    // `ConnectionManager` - which then builds a session around an account
                    // the wallet never re-authorized.
                    disconnect: async () => {
                        try {
                            return await disconnectFn.call(directWallet);
                        } finally {
                            resolvedAccounts.length = 0;
                        }
                    },
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
                    // Callers invoke this Wallet Standard style - `signMessage({ account,
                    // message, chain })` - but the injected provider underneath takes raw
                    // bytes. Unwrap each input rather than forwarding the whole object, and
                    // return the array of outputs the standard (and every caller here)
                    // expects rather than a bare `{ signature }`.
                    //
                    // The standard method is variadic: one input per message to sign. Every
                    // input gets its own call to the legacy signer and contributes its own
                    // output, so a caller asking for N messages is not silently answered
                    // with one signature for the first.
                    signMessage: async (...args: unknown[]) => {
                        const outputs: unknown[] = [];

                        for (const input of args) {
                            const message =
                                input instanceof Uint8Array
                                    ? input
                                    : ((input as { message?: Uint8Array } | undefined)?.message ?? input);

                            const result = await signMessageFn.call(directWallet, message as Uint8Array);

                            if (Array.isArray(result)) {
                                outputs.push(...result);
                                continue;
                            }

                            const signature = (result as { signature?: Uint8Array } | undefined)?.signature ?? result;
                            outputs.push({ signature, signedMessage: message });
                        }

                        return outputs;
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
                // Populated by the `standard:connect` shim above once the wallet reports
                // its public key; a getter because the wallet object is built first.
                get accounts() {
                    return resolvedAccounts;
                },
            };

            const walletWithIcon = applyWalletIconOverride(wallet);

            this.stateManager.updateState(
                {
                    wallets: [
                        {
                            wallet: walletWithIcon,
                            installed: true,
                            connectable: true,
                        },
                    ],
                },
                true,
            );

            // Await registry initialization for deterministic wallet detection
            // This ensures we check the registry after it's fully populated
            await ready;

            // Check if wallet is already in registry - use that instead for better compatibility
            const walletsApi = getWalletsRegistry();
            const standardWallets = walletsApi.get();
            const registryWallet = standardWallets.find(w => w.name === storedWalletName);

            const walletToUse = applyWalletIconOverride(registryWallet || walletWithIcon);

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
