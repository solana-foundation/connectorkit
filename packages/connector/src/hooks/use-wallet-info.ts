/**
 * @connector-kit/connector - useWalletInfo hook
 *
 * React hook for getting information about the connected wallet
 */

'use client';

import { useMemo } from 'react';
import { useConnector } from '../ui/connector-provider';
import { WalletInfo } from '../types/wallets';

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
    wallets: Array<{
        name: string;
        icon?: string;
        installed: boolean;
        connectable?: boolean;
    }>;
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

    const mappedWallets = useMemo(
        () =>
            wallets.map((w: WalletInfo) => ({
                name: w.wallet.name,
                icon: w.wallet.icon,
                installed: w.installed,
                connectable: w.connectable,
            })),
        [wallets],
    );

    const walletInfo = useMemo(() => {
        if (!selectedWallet) {
            return {
                name: null,
                icon: null,
                installed: false,
                connectable: false,
            };
        }

        const info = wallets.find((w: WalletInfo) => w.wallet.name === selectedWallet.name);

        return {
            name: selectedWallet.name,
            icon: selectedWallet.icon ?? null,
            installed: info?.installed ?? false,
            connectable: info?.connectable ?? false,
        };
    }, [selectedWallet, wallets]);

    return useMemo(
        () => ({
            ...walletInfo,
            connected,
            connecting,
            wallets: mappedWallets,
        }),
        [walletInfo, connected, connecting, mappedWallets],
    );
}
