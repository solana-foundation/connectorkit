/**
 * @solana/connector - useWalletInfo hook
 *
 * React hook for getting information about the connected wallet
 */

'use client';

import { useMemo } from 'react';
import { useConnector } from '../ui/connector-provider';
import type { WalletInfo } from '../types/wallets';
import type { WalletConnectorId, WalletConnectorMetadata } from '../types/session';
import { createConnectorId } from '../types/session';

/**
 * Simplified wallet information for display purposes
 */
export interface WalletDisplayInfo {
    /** Wallet name */
    name: string;
    /** Stable connector ID for vNext API */
    connectorId: WalletConnectorId;
    /** Wallet icon/logo URL if available */
    icon?: string;
    /** Whether the wallet extension is installed */
    installed: boolean;
    /** Whether the wallet supports Solana connections */
    connectable?: boolean;
}

/**
 * Return value from useWalletInfo hook
 */
export interface UseWalletInfoReturn {
    /** Name of the connected wallet (e.g., 'Phantom', 'Solflare') */
    name: string | null;
    /** Wallet icon/logo URL if available */
    icon: string | null;
    /** Whether the wallet extension is installed */
    installed: boolean;
    /** Whether the wallet supports Solana connections */
    connectable: boolean;
    /** Whether currently connected to the wallet */
    connected: boolean;
    /** Whether a connection attempt is in progress */
    connecting: boolean;
    /** All available wallets */
    wallets: WalletDisplayInfo[];
}

/**
 * Hook for getting information about the connected wallet
 * Provides wallet metadata, connection status, and capabilities
 *
 * @example
 * ```tsx
 * function WalletBadge() {
 *   const { name, icon, connected, connecting } = useWalletInfo()
 *
 *   if (connecting) return <p>Connecting...</p>
 *   if (!connected) return <p>No wallet connected</p>
 *
 *   return (
 *     <div>
 *       {icon && <img src={icon} alt={name} />}
 *       <span>{name}</span>
 *     </div>
 *   )
 * }
 * ```
 */
export function useWalletInfo(): UseWalletInfoReturn {
    const { selectedWallet, wallets, connected, connecting } = useConnector();

    // Map WalletInfo[] to WalletDisplayInfo[] for simplified consumption
    const mappedWallets = useMemo<WalletDisplayInfo[]>(
        () =>
            wallets.map(
                (walletInfo: WalletInfo): WalletDisplayInfo => ({
                    name: walletInfo.wallet.name,
                    connectorId: createConnectorId(walletInfo.wallet.name),
                    icon: walletInfo.wallet.icon,
                    installed: walletInfo.installed,
                    connectable: walletInfo.connectable,
                }),
            ),
        [wallets],
    );

    // Extract information about the currently selected wallet
    const selectedWalletInfo = useMemo(() => {
        if (!selectedWallet) {
            return {
                name: null,
                icon: null,
                installed: false,
                connectable: false,
            };
        }

        // Find the WalletInfo for the selected wallet
        const walletInfo = wallets.find((w: WalletInfo) => w.wallet.name === selectedWallet.name);

        return {
            name: selectedWallet.name,
            icon: selectedWallet.icon ?? null,
            installed: walletInfo?.installed ?? false,
            connectable: walletInfo?.connectable ?? false,
        };
    }, [selectedWallet, wallets]);

    return useMemo(
        () => ({
            ...selectedWalletInfo,
            connected,
            connecting,
            wallets: mappedWallets,
        }),
        [selectedWalletInfo, connected, connecting, mappedWallets],
    );
}
