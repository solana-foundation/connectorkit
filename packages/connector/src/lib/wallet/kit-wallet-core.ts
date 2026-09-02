/**
 * Kit wallet core
 *
 * Backs the connector's wallet discovery, connection lifecycle, persistence,
 * and auto-connect with `@solana/kit-plugin-wallet`'s `client.wallet` store.
 * Projects the plugin's state into the connector's `ConnectorState` shape
 * (both the vNext `WalletStatus` machine and the legacy fields) and emits
 * the connector's events, so all public hooks keep their contracts.
 */

import { createClient } from '@solana/kit';
import { isWalletWarmingUp, walletSigner } from '@solana/kit-plugin-wallet';
import type {
    ClientWithWallet,
    WalletState as KitWalletState,
    WalletStorage as KitWalletStorage,
} from '@solana/kit-plugin-wallet';
import { getWallets } from '@wallet-standard/app';
import type { UiWallet } from '@wallet-standard/ui';
import { getWalletAccountForUiWalletAccount, getWalletForHandle } from '@wallet-standard/ui-registry';
import type { Address } from '@solana/addresses';

import type { StateManager } from '../core/state-manager';
import type { EventEmitter } from '../core/event-emitter';
import type { StorageAdapter } from '../../types/storage';
import type { WalletDisplayConfig } from '../../types/connector';
import type { Wallet, WalletInfo, WalletName } from '../../types/wallets';
import type {
    ConnectOptions,
    SessionAccount,
    WalletConnectorId,
    WalletConnectorMetadata,
    WalletSession,
    WalletStatus,
} from '../../types/session';
import { createConnectorId, INITIAL_WALLET_STATUS } from '../../types/session';
import { createLogger } from '../utils/secure-logger';
import { applyWalletIconOverride } from './wallet-icon-overrides';

const logger = createLogger('KitWalletCore');

/** Key the kit wallet plugin persists the active connection under */
const KIT_WALLET_STORAGE_KEY = 'connector-kit:v1:kit-wallet';

/** Chains wallet-standard wallets commonly advertise */
const STANDARD_WALLET_CHAINS = ['solana:mainnet', 'solana:devnet', 'solana:testnet', 'solana:localnet'] as const;

/**
 * Map a cluster id to a chain a wallet-standard wallet can advertise, or null
 * when there is no such chain. Signing against the wrong chain makes a wallet
 * prompt and simulate on a different network than the dapp is using, so
 * callers that build signers must treat null as "no signer available" rather
 * than substituting a default.
 */
export function toStandardWalletChain(clusterId: string | null | undefined): `solana:${string}` | null {
    if (clusterId && (STANDARD_WALLET_CHAINS as readonly string[]).includes(clusterId)) {
        return clusterId as `solana:${string}`;
    }
    return null;
}

/**
 * Map a cluster id to a chain the wallet layer can filter and discover on.
 * Custom cluster ids fall back to mainnet so wallet discovery still works;
 * this fallback is only safe because nothing is signed with it.
 */
export function normalizeWalletChain(clusterId: string | null | undefined): string {
    return toStandardWalletChain(clusterId) ?? 'solana:mainnet';
}

function disposeClient(client: KitWalletClient): void {
    const dispose = (Symbol as { dispose?: symbol }).dispose;
    if (dispose) client[dispose]?.();
}

function normalizeWalletName(value: string): string {
    return value.trim().toLowerCase();
}

/**
 * Adapt the connector's single-slot wallet storage adapter to the keyed
 * interface the kit wallet plugin persists through. The adapter already owns
 * the key it writes under, so the key the plugin supplies is ignored.
 */
function toKitWalletStorage(
    adapter: StorageAdapter<string | undefined>,
    suppressRemove?: () => boolean,
): KitWalletStorage {
    return {
        getItem: () => {
            const value = adapter.get() ?? null;
            // Pre-plugin versions persisted the bare wallet name under the
            // same adapter. The plugin erases any value that does not parse as
            // `<name>:<address>`, so hand it null instead: it settles
            // disconnected without touching storage, the legacy value
            // survives, and the next connect overwrites it in the new format.
            // (An explicit disconnect still clears it via removeItem.)
            if (value !== null && parsePersistedWalletName(value) === null) return null;
            return value;
        },
        removeItem: () => {
            if (suppressRemove?.()) return;
            const withClear = adapter as StorageAdapter<string | undefined> & { clear?: () => void };
            if (typeof withClear.clear === 'function') {
                withClear.clear();
            } else {
                adapter.set(undefined);
            }
        },
        setItem: (_key, value) => adapter.set(value),
    };
}

/**
 * Extract the wallet name from a value persisted by the kit wallet plugin,
 * which stores the active connection as `<wallet name>:<account address>`.
 * A wallet name may itself contain a colon, so the address is everything after
 * the last one. Returns null for a value that does not match the format.
 */
function parsePersistedWalletName(value: string): string | null {
    const separatorIndex = value.lastIndexOf(':');
    return separatorIndex === -1 ? null : value.slice(0, separatorIndex);
}

/**
 * Apply allow/deny/featured wallet display rules to a wallet list.
 * Deny wins over allow and featured; featured only reorders.
 */
export function applyWalletDisplayConfig<T extends { name: string }>(
    wallets: readonly T[],
    config: WalletDisplayConfig | undefined,
): T[] {
    if (!config) return [...wallets];

    const allowList = (config.allowList ?? []).map(normalizeWalletName).filter(Boolean);
    const denyList = (config.denyList ?? []).map(normalizeWalletName).filter(Boolean);
    const featured = (config.featured ?? []).map(normalizeWalletName).filter(Boolean);

    const allowSet = new Set(allowList);
    const denySet = new Set(denyList);

    const filtered = wallets.filter(wallet => {
        const name = normalizeWalletName(wallet.name);
        if (denySet.has(name)) return false;
        if (allowSet.size > 0 && !allowSet.has(name)) return false;
        return true;
    });

    if (featured.length === 0) return filtered;

    const byName = new Map<string, T>();
    for (const wallet of filtered) {
        byName.set(normalizeWalletName(wallet.name), wallet);
    }

    const featuredWallets: T[] = [];
    const featuredNames = new Set<string>();
    for (const name of featured) {
        if (featuredNames.has(name)) continue;
        const wallet = byName.get(name);
        if (!wallet) continue;
        featuredNames.add(name);
        featuredWallets.push(wallet);
    }

    const remaining = filtered.filter(wallet => !featuredNames.has(normalizeWalletName(wallet.name)));
    return [...featuredWallets, ...remaining];
}

function isRecoverableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
        message.includes('user rejected') ||
        message.includes('user denied') ||
        message.includes('cancelled') ||
        message.includes('canceled')
    );
}

function timestamp(): string {
    return new Date().toISOString();
}

type KitWalletClient = ClientWithWallet & { [key: symbol]: (() => void) | undefined };

interface KitWalletCoreOptions {
    /** Whether to silently reconnect to the persisted wallet account on startup */
    autoConnect?: boolean;
    /** Wallets to register into the wallet-standard registry in addition to discovered ones */
    additionalWallets?: Wallet[];
    /** Consumer-supplied adapter the wallet plugin persists the active connection through */
    walletStorage?: StorageAdapter<string | undefined>;
    /** Allow/deny/featured display rules */
    display?: WalletDisplayConfig;
    debug?: boolean;
}

/**
 * Wallet discovery + connection core built on `@solana/kit-plugin-wallet`.
 *
 * The plugin owns discovery (wallet-standard registry, chain + display
 * filtering), the connection lifecycle, signer creation, persistence, and
 * silent auto-connect. This class projects that state into `ConnectorState`
 * and the connector event stream.
 *
 * Persistence goes through the consumer's storage adapter when one is
 * supplied, and otherwise through the plugin's own localStorage default under
 * {@link KIT_WALLET_STORAGE_KEY}.
 */
export class KitWalletCore {
    private client: KitWalletClient | null = null;
    private storeUnsubscribe: (() => void) | null = null;
    private unregisterAdditionalWallets: (() => void) | null = null;

    private chain: string = 'solana:mainnet';
    private chainSwap = 0;
    private started = false;
    private lastError: { error: Error; connectorId?: WalletConnectorId; recoverable: boolean } | null = null;
    private connectingConnectorId: WalletConnectorId | null = null;
    private previousConnection: { walletName: string; address: string } | null = null;
    private lastDetectedCount = 0;
    private lastKitStatus: KitWalletState['status'] | null = null;
    private lastNotifiedAccountsKey: string | null = null;
    private accountsChangedListeners = new Set<(accounts: SessionAccount[]) => void>();

    constructor(
        private stateManager: StateManager,
        private eventEmitter: EventEmitter,
        private options: KitWalletCoreOptions = {},
    ) {}

    /**
     * Register additional wallets and build the kit wallet client.
     * Browser-only; call from an environment-guarded initialization path.
     */
    start(chain: string): void {
        if (this.started) return;
        this.started = true;
        this.chain = chain;

        if (this.options.additionalWallets && this.options.additionalWallets.length > 0) {
            this.unregisterAdditionalWallets = getWallets().register(...this.options.additionalWallets);
        }

        this.attachClient(this.buildClient(chain));
    }

    /**
     * Rebuild the wallet client for a new chain. The previous client (and its
     * connection state) stays live until the replacement finishes its silent
     * reconnect warm-up, so the UI does not flash a disconnected state.
     */
    async setChain(chain: string): Promise<void> {
        if (!this.started || chain === this.chain) {
            this.chain = chain;
            return;
        }
        this.chain = chain;
        const swap = ++this.chainSwap;

        // When a session is live, the replacement client must silently
        // reconnect it (via the plugin's own persistence) or the chain switch
        // would drop the user's wallet.
        const hasLiveSession = Boolean(this.client?.wallet.getState().connected);
        let warming = true;
        const next = this.buildClient(chain, {
            autoConnect: hasLiveSession || undefined,
            // A failed silent reconnect makes the plugin clear its persisted
            // account. During a chain swap that would turn a mere network
            // switch into a permanent logout, so the replacement client must
            // not remove anything while it warms up. The old client (an
            // explicit disconnect) and the attached client afterwards clear
            // normally, and a genuinely revoked session is still cleared by
            // the next startup reconnect at rest.
            suppressRemove: () => warming,
        });
        try {
            await next.wallet.whenReady();
        } catch (error) {
            // A disposed or failed warm-up still settles; proceed with the swap
            if (this.options.debug) logger.warn('Chain-swap warm-up failed', { chain, error });
        } finally {
            warming = false;
        }

        // The warm-up spans a destroy() or a newer switch, either of which
        // makes this client obsolete; attaching it would leave a live
        // subscription nothing owns.
        if (!this.started || swap !== this.chainSwap) {
            disposeClient(next);
            return;
        }
        this.attachClient(next);
    }

    destroy(): void {
        // Invalidate any in-flight setChain warm-up: after a later start() the
        // staleness guard would otherwise pass (started is true again, counter
        // unchanged) and attach a client built for the pre-destroy chain.
        this.chainSwap++;
        this.detachClient();
        this.unregisterAdditionalWallets?.();
        this.unregisterAdditionalWallets = null;
        this.accountsChangedListeners.clear();
        this.started = false;
    }

    // ========================================================================
    // Actions
    // ========================================================================

    /** Resolve a connector id to the underlying wallet-standard wallet */
    getConnectorById(connectorId: WalletConnectorId): Wallet | undefined {
        const uiWallet = this.findUiWalletById(connectorId);
        return uiWallet ? (getWalletForHandle(uiWallet) as Wallet) : undefined;
    }

    async connectWallet(connectorId: WalletConnectorId, options?: ConnectOptions): Promise<void> {
        const client = this.requireClient();
        const uiWallet = this.findUiWalletById(connectorId);
        if (!uiWallet) {
            throw new Error(`Connector ${connectorId} not found`);
        }

        this.lastError = null;
        this.connectingConnectorId = connectorId;
        this.eventEmitter.emit({
            type: 'connecting',
            wallet: uiWallet.name as WalletName,
            timestamp: timestamp(),
        });

        try {
            await client.wallet.connect(uiWallet);
            if (options?.preferredAccount) {
                this.trySelectPreferredAccount(options.preferredAccount);
            }
        } catch (cause) {
            const error = cause instanceof Error ? cause : new Error(String(cause));
            this.lastError = { error, connectorId, recoverable: isRecoverableError(error) };
            this.eventEmitter.emit({
                type: 'connection:failed',
                wallet: uiWallet.name as WalletName,
                error: error.message,
                timestamp: timestamp(),
            });
            this.eventEmitter.emit({ type: 'error', error, context: 'connect', timestamp: timestamp() });
            this.sync();
            throw error;
        } finally {
            this.connectingConnectorId = null;
        }
        this.sync();
    }

    /** Connect by wallet display name (legacy `select()` path) */
    async connectByName(walletName: string): Promise<void> {
        const uiWallet = this.listUiWallets().find(w => w.name === walletName);
        if (!uiWallet) {
            throw new Error(`Wallet ${walletName} not found`);
        }
        await this.connectWallet(createConnectorId(uiWallet.name));
    }

    async disconnect(): Promise<void> {
        this.lastError = null;
        this.connectingConnectorId = null;
        const client = this.client;
        if (!client) return;
        await client.wallet.disconnect();
        this.sync();
    }

    async selectAccount(address: string): Promise<void> {
        const client = this.requireClient();
        const connected = client.wallet.getState().connected;
        if (!connected) {
            throw new Error('No wallet connected');
        }
        if (!address || address.length < 5) {
            throw new Error('Invalid address format');
        }
        const uiAccount = connected.wallet.accounts.find(account => account.address === address);
        if (!uiAccount) {
            throw new Error('Requested account not available');
        }
        client.wallet.selectAccount(uiAccount);
        this.sync();
    }

    // ========================================================================
    // Client lifecycle
    // ========================================================================

    private buildClient(
        chain: string,
        opts?: { autoConnect?: boolean; suppressRemove?: () => boolean },
    ): KitWalletClient {
        const display = this.options.display;
        const walletStorage = this.options.walletStorage;
        return createClient().use(
            walletSigner({
                autoConnect: opts?.autoConnect ?? this.options.autoConnect ?? false,
                chain: chain as `${string}:${string}`,
                filter: display ? wallet => applyWalletDisplayConfig([wallet], display).length > 0 : undefined,
                storage: walletStorage ? toKitWalletStorage(walletStorage, opts?.suppressRemove) : undefined,
                storageKey: KIT_WALLET_STORAGE_KEY,
            }),
        ) as unknown as KitWalletClient;
    }

    private attachClient(next: KitWalletClient): void {
        this.detachClient();
        this.client = next;
        this.storeUnsubscribe = next.wallet.subscribe(() => this.sync());
        this.sync();
    }

    private detachClient(): void {
        this.storeUnsubscribe?.();
        this.storeUnsubscribe = null;
        if (this.client) {
            disposeClient(this.client);
            this.client = null;
        }
    }

    private requireClient(): KitWalletClient {
        if (!this.client) {
            throw new Error('Wallet client not initialized');
        }
        return this.client;
    }

    // ========================================================================
    // State projection
    // ========================================================================

    private sync(): void {
        const client = this.client;
        if (!client) return;
        const kitState = client.wallet.getState();

        // A failed connect attempt to another wallet leaves the plugin's
        // existing connection in place; a live connection always wins over a
        // stale error so state, events, and the wallet itself stay agreed.
        if (kitState.connected) {
            this.lastError = null;
        }

        // The plugin swallows silent-reconnect rejections, so the only signal
        // that a persisted session failed to restore is this transition.
        if (
            this.options.debug &&
            this.lastKitStatus !== null &&
            isWalletWarmingUp(this.lastKitStatus) &&
            kitState.status === 'disconnected'
        ) {
            logger.warn('Silent reconnect did not restore a session', {
                persistedConnectorId: this.readPersistedConnectorId(),
            });
        }
        this.lastKitStatus = kitState.status;

        try {
            this.project(kitState);
        } catch (error) {
            logger.error('Wallet state projection failed', { error });
            this.eventEmitter.emit({
                type: 'error',
                error: error instanceof Error ? error : new Error(String(error)),
                context: 'sync',
                timestamp: timestamp(),
            });
        }
    }

    private project(kitState: KitWalletState): void {
        const orderedWallets = this.orderWallets(kitState.wallets);
        const connectors = orderedWallets.map(uiWallet => this.toConnectorMetadata(uiWallet));
        const walletInfos = orderedWallets.map(uiWallet => this.toWalletInfo(uiWallet));

        if (connectors.length !== this.lastDetectedCount && connectors.length > 0) {
            this.eventEmitter.emit({ type: 'wallets:detected', count: connectors.length, timestamp: timestamp() });
        }
        this.lastDetectedCount = connectors.length;

        const { wallet, legacy, session } = this.projectStatus(kitState);
        this.stateManager.updateState(
            { wallet, connectors, wallets: walletInfos, ...legacy } as Parameters<StateManager['updateState']>[0],
            true,
        );

        this.emitConnectionEvents(kitState);
        const accountsKey = session ? session.accounts.map(account => String(account.address)).join(',') : null;
        if (session && accountsKey !== this.lastNotifiedAccountsKey && this.accountsChangedListeners.size > 0) {
            for (const listener of this.accountsChangedListeners) {
                listener(session.accounts);
            }
        }
        this.lastNotifiedAccountsKey = accountsKey;
    }

    private projectStatus(kitState: KitWalletState): {
        wallet: WalletStatus;
        legacy: Record<string, unknown>;
        session: WalletSession | null;
    } {
        const legacyReset = {
            accounts: [],
            connected: false,
            connecting: false,
            selectedAccount: null,
            selectedWallet: null,
        };

        if (this.lastError) {
            return {
                wallet: {
                    status: 'error',
                    error: this.lastError.error,
                    connectorId: this.lastError.connectorId,
                    recoverable: this.lastError.recoverable,
                },
                legacy: legacyReset,
                session: null,
            };
        }

        if (kitState.status === 'connecting' && this.connectingConnectorId) {
            return {
                wallet: { status: 'connecting', connectorId: this.connectingConnectorId },
                legacy: { connected: false, connecting: true },
                session: null,
            };
        }

        if (kitState.connected) {
            const session = this.buildSession(kitState.connected);
            return {
                wallet: { status: 'connected', session },
                legacy: {
                    accounts: session.accounts.map(account => ({
                        address: account.address,
                        icon: account.account.icon,
                        raw: account.account,
                    })),
                    connected: true,
                    connecting: false,
                    selectedAccount: session.selectedAccount.address,
                    selectedWallet: applyWalletIconOverride(getWalletForHandle(kitState.connected.wallet) as Wallet),
                },
                session,
            };
        }

        if (isWalletWarmingUp(kitState.status)) {
            const persistedId = this.readPersistedConnectorId();
            if (persistedId) {
                return {
                    wallet: { status: 'connecting', connectorId: persistedId },
                    legacy: { connected: false, connecting: true },
                    session: null,
                };
            }
        }

        return { wallet: INITIAL_WALLET_STATUS, legacy: legacyReset, session: null };
    }

    private buildSession(connected: NonNullable<KitWalletState['connected']>): WalletSession {
        const uiWallet = connected.wallet;
        const connectorId = createConnectorId(uiWallet.name);

        const accounts: SessionAccount[] = uiWallet.accounts.map(uiAccount => {
            const raw = getWalletAccountForUiWalletAccount(uiAccount);
            return { address: raw.address as Address, label: raw.label, account: raw };
        });

        const selectedRaw = getWalletAccountForUiWalletAccount(connected.account);
        const selectedAccount =
            accounts.find(account => account.address === selectedRaw.address) ??
            ({ address: selectedRaw.address as Address, label: selectedRaw.label, account: selectedRaw } as const);

        return {
            accounts,
            connectorId,
            onAccountsChanged: listener => {
                this.accountsChangedListeners.add(listener);
                return () => this.accountsChangedListeners.delete(listener);
            },
            selectAccount: address => {
                void this.selectAccount(String(address)).catch((cause: unknown) => {
                    const error = cause instanceof Error ? cause : new Error(String(cause));
                    logger.error('selectAccount failed', { error });
                    this.eventEmitter.emit({ type: 'error', error, context: 'selectAccount', timestamp: timestamp() });
                });
            },
            selectedAccount,
        };
    }

    private emitConnectionEvents(kitState: KitWalletState): void {
        const next = kitState.connected
            ? { address: kitState.connected.account.address, walletName: kitState.connected.wallet.name }
            : null;
        const previous = this.previousConnection;

        if (next && (!previous || previous.walletName !== next.walletName)) {
            // Switching wallets ends the previous session; consumers that track
            // sessions off the event stream need to see it close.
            if (previous) {
                this.endSessionListeners();
                this.eventEmitter.emit({ type: 'wallet:disconnected', timestamp: timestamp() });
            }
            this.eventEmitter.emit({
                type: 'wallet:connected',
                wallet: next.walletName as WalletName,
                account: next.address as Address,
                timestamp: timestamp(),
            });
        } else if (next && previous && previous.address !== next.address) {
            this.eventEmitter.emit({
                type: 'account:changed',
                account: next.address as Address,
                timestamp: timestamp(),
            });
        } else if (!next && previous) {
            this.endSessionListeners();
            this.eventEmitter.emit({ type: 'wallet:disconnected', timestamp: timestamp() });
        }

        this.previousConnection = next;
    }

    /**
     * `onAccountsChanged` subscriptions belong to the session that handed them
     * out; dropping them when it ends keeps a dead session's listeners from
     * firing with the next session's accounts. (Runs before the notify loop in
     * `project`, so a wallet switch never dispatches to the old set.)
     */
    private endSessionListeners(): void {
        this.accountsChangedListeners.clear();
        this.lastNotifiedAccountsKey = null;
    }

    // ========================================================================
    // Wallet list projection
    // ========================================================================

    private listUiWallets(): UiWallet[] {
        const client = this.client;
        if (!client) return [];
        return this.orderWallets(client.wallet.getState().wallets);
    }

    private orderWallets(wallets: readonly UiWallet[]): UiWallet[] {
        const ordered = applyWalletDisplayConfig(wallets, this.options.display);

        // Connector ids derive from the wallet name, so two registered wallets
        // sharing a name resolve to one id. Keep the first so consumers never
        // receive two connectors under the same id.
        const byConnectorId = new Map<WalletConnectorId, UiWallet>();
        for (const uiWallet of ordered) {
            const connectorId = createConnectorId(uiWallet.name);
            if (!byConnectorId.has(connectorId)) {
                byConnectorId.set(connectorId, uiWallet);
            }
        }

        return [...byConnectorId.values()];
    }

    private findUiWalletById(connectorId: WalletConnectorId): UiWallet | undefined {
        return this.listUiWallets().find(uiWallet => createConnectorId(uiWallet.name) === connectorId);
    }

    private toConnectorMetadata(uiWallet: UiWallet): WalletConnectorMetadata {
        const raw = applyWalletIconOverride(getWalletForHandle(uiWallet) as Wallet);
        return {
            chains: uiWallet.chains,
            features: uiWallet.features,
            icon: typeof raw.icon === 'string' ? raw.icon : '',
            id: createConnectorId(uiWallet.name),
            name: uiWallet.name,
            ready: true,
        };
    }

    private toWalletInfo(uiWallet: UiWallet): WalletInfo {
        return {
            connectable: true,
            installed: true,
            wallet: applyWalletIconOverride(getWalletForHandle(uiWallet) as Wallet),
        };
    }

    // ========================================================================
    // Persistence helpers
    // ========================================================================

    private trySelectPreferredAccount(preferredAccount: Address): void {
        const client = this.client;
        const connected = client?.wallet.getState().connected;
        if (!client || !connected) return;
        const uiAccount = connected.wallet.accounts.find(account => account.address === String(preferredAccount));
        if (uiAccount && uiAccount.address !== connected.account.address) {
            client.wallet.selectAccount(uiAccount);
        }
    }

    /**
     * Best-effort read of the wallet the plugin will silently reconnect to, so
     * the warm-up can be projected as a connect attempt against a known
     * connector. Reads the same storage the plugin persists through.
     */
    private readPersistedConnectorId(): WalletConnectorId | null {
        try {
            const storage = this.options.walletStorage;
            const value = storage ? storage.get() : localStorage.getItem(KIT_WALLET_STORAGE_KEY);
            if (!value) return null;
            const walletName = parsePersistedWalletName(value);
            return walletName ? createConnectorId(walletName) : null;
        } catch {
            return null;
        }
    }
}
