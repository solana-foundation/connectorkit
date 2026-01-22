/**
 * Wallet Session Types - Framework-kit-inspired connector/session abstraction
 *
 * Provides stable connector identity, explicit session management, and
 * a clear status state machine for wallet connections.
 */

import type { Wallet, WalletAccount } from '@wallet-standard/base';
import type { Address } from '@solana/addresses';

// ============================================================================
// Connector Identity
// ============================================================================

/**
 * Branded string type for stable wallet connector identification.
 * Format: `wallet-standard:{kebab-cased-wallet-name}` or `walletconnect`
 *
 * @example
 * - 'wallet-standard:phantom'
 * - 'wallet-standard:solflare'
 * - 'walletconnect'
 */
export type WalletConnectorId = string & { readonly __brand: 'WalletConnectorId' };

/**
 * Create a connector ID from a wallet name
 */
export function createConnectorId(walletName: string): WalletConnectorId {
    const kebab = walletName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return `wallet-standard:${kebab}` as WalletConnectorId;
}

/**
 * Check if a string is a valid WalletConnectorId
 *
 * Valid formats:
 * - `wallet-standard:<adapter-name>` - Wallet Standard adapters (e.g., 'wallet-standard:phantom')
 * - `walletconnect` - WalletConnect connector
 * - `mwa:<adapter-name>` - Mobile Wallet Adapter (MWA) connectors for mobile wallets
 *   (e.g., 'mwa:phantom')
 *
 * The 'mwa:' prefix identifies connectors using the Solana Mobile Wallet Adapter protocol,
 * which enables communication with mobile wallet apps on iOS and Android devices.
 */
export function isWalletConnectorId(value: string): value is WalletConnectorId {
    return (
        typeof value === 'string' &&
        (value.startsWith('wallet-standard:') || value === 'walletconnect' || value.startsWith('mwa:'))
    );
}

/**
 * Extract the wallet name from a connector ID (for display purposes)
 */
export function getWalletNameFromConnectorId(connectorId: WalletConnectorId): string {
    if (connectorId === 'walletconnect') return 'WalletConnect';
    if (connectorId.startsWith('mwa:')) return connectorId.slice(4);
    if (connectorId.startsWith('wallet-standard:')) {
        // Convert kebab-case to Title Case
        const kebab = connectorId.slice('wallet-standard:'.length);
        return kebab
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    return connectorId;
}

// ============================================================================
// Connector Metadata
// ============================================================================

/**
 * Serializable metadata about a wallet connector.
 * This is what gets stored in state (not the Wallet itself).
 */
export interface WalletConnectorMetadata {
    /** Stable connector identifier */
    id: WalletConnectorId;
    /** Human-readable display name */
    name: string;
    /** Wallet icon (data URI or URL) */
    icon: string;
    /** Whether this connector is ready to connect */
    ready: boolean;
    /** Supported Solana chains (e.g., 'solana:mainnet', 'solana:devnet') */
    chains: readonly string[];
    /** Supported wallet standard features */
    features: readonly string[];
}

/**
 * Full wallet connector with methods (not stored in state, kept in registry)
 */
export interface WalletConnector extends WalletConnectorMetadata {
    /** The underlying Wallet Standard wallet (reference, not serialized) */
    readonly wallet: Wallet;

    /**
     * Connect to the wallet
     * @param options Connection options
     * @returns Session with accounts
     */
    connect(options?: ConnectOptions): Promise<WalletSession>;

    /**
     * Disconnect from the wallet
     */
    disconnect(): Promise<void>;

    /**
     * Check if this connector supports a specific feature
     */
    supportsFeature(feature: string): boolean;
}

// ============================================================================
// Connection Options
// ============================================================================

/**
 * Options for connecting to a wallet
 */
export interface ConnectOptions {
    /**
     * Attempt silent connection without user prompt.
     * If the wallet has previously authorized this app, it may connect
     * without showing a popup.
     * @default false
     */
    silent?: boolean;

    /**
     * If silent connection fails, allow falling back to interactive connection.
     * @default true (when silent is true)
     */
    allowInteractiveFallback?: boolean;

    /**
     * Preferred account address to select after connection.
     * If not available, the first account will be selected.
     */
    preferredAccount?: Address;
}

// ============================================================================
// Session
// ============================================================================

/**
 * Account information within a session
 */
export interface SessionAccount {
    /** Account address */
    address: Address;
    /** Display label (if provided by wallet) */
    label?: string;
    /** Wallet standard account reference */
    readonly account: WalletAccount;
}

/**
 * Active wallet session with signing capabilities.
 * Created after successful connection.
 */
export interface WalletSession {
    /** Connector that created this session */
    connectorId: WalletConnectorId;

    /** All available accounts in this session */
    accounts: SessionAccount[];

    /** Currently selected account */
    selectedAccount: SessionAccount;

    /**
     * Subscribe to account changes within the session.
     * Returns unsubscribe function.
     */
    onAccountsChanged(listener: (accounts: SessionAccount[]) => void): () => void;

    /**
     * Select a different account within the session
     */
    selectAccount(address: Address): void;
}

// ============================================================================
// Wallet Status State Machine
// ============================================================================

/**
 * Disconnected state - no wallet connected
 */
export interface WalletStatusDisconnected {
    status: 'disconnected';
}

/**
 * Connecting state - connection in progress
 */
export interface WalletStatusConnecting {
    status: 'connecting';
    /** Connector being connected to */
    connectorId: WalletConnectorId;
}

/**
 * Connected state - wallet successfully connected
 */
export interface WalletStatusConnected {
    status: 'connected';
    /** Active session */
    session: WalletSession;
}

/**
 * Error state - connection or session error
 */
export interface WalletStatusError {
    status: 'error';
    /** Error that occurred */
    error: Error;
    /** Connector that failed (if known) */
    connectorId?: WalletConnectorId;
    /** Whether this error is recoverable */
    recoverable: boolean;
}

/**
 * Union of all wallet status states.
 * Use discriminated union pattern for type narrowing.
 *
 * @example
 * ```ts
 * if (wallet.status === 'connected') {
 *   // TypeScript knows wallet.session exists
 *   console.log(wallet.session.selectedAccount.address);
 * }
 * ```
 */
export type WalletStatus =
    | WalletStatusDisconnected
    | WalletStatusConnecting
    | WalletStatusConnected
    | WalletStatusError;

// ============================================================================
// Type Guards
// ============================================================================

export function isDisconnected(status: WalletStatus): status is WalletStatusDisconnected {
    return status.status === 'disconnected';
}

export function isConnecting(status: WalletStatus): status is WalletStatusConnecting {
    return status.status === 'connecting';
}

export function isConnected(status: WalletStatus): status is WalletStatusConnected {
    return status.status === 'connected';
}

export function isStatusError(status: WalletStatus): status is WalletStatusError {
    return status.status === 'error';
}

/**
 * @deprecated Use isStatusError instead. This alias is kept for backward compatibility.
 */
export const isWalletStatusError = isStatusError;

// ============================================================================
// Initial State
// ============================================================================

/**
 * Initial disconnected wallet status
 */
export const INITIAL_WALLET_STATUS: WalletStatusDisconnected = {
    status: 'disconnected',
};

// ============================================================================
// Legacy Compatibility
// ============================================================================

/**
 * Extract legacy-style state from WalletStatus.
 * Useful for backwards compatibility during migration.
 *
 * @deprecated Use the new WalletStatus discriminated union directly
 */
export function toLegacyWalletState(wallet: WalletStatus): {
    connected: boolean;
    connecting: boolean;
    selectedAccount: Address | null;
    accounts: Array<{ address: Address; label?: string }>;
} {
    switch (wallet.status) {
        case 'disconnected':
            return { connected: false, connecting: false, selectedAccount: null, accounts: [] };
        case 'connecting':
            return { connected: false, connecting: true, selectedAccount: null, accounts: [] };
        case 'connected':
            return {
                connected: true,
                connecting: false,
                selectedAccount: wallet.session.selectedAccount.address,
                accounts: wallet.session.accounts.map(a => ({ address: a.address, label: a.label })),
            };
        case 'error':
            return { connected: false, connecting: false, selectedAccount: null, accounts: [] };
    }
}
