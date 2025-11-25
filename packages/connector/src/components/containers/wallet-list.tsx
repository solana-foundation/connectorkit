'use client';

import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useConnector } from '../../ui/connector-provider';
import type { WalletInfo } from '../../types/wallets';

export interface WalletItemProps {
    /** Wallet name */
    name: string;
    /** Wallet icon URL */
    icon?: string;
    /** Whether the wallet is installed */
    installed: boolean;
    /** Whether this wallet is currently connecting */
    isConnecting: boolean;
    /** Whether any connection is in progress */
    isDisabled: boolean;
    /** Click handler to connect this wallet */
    onSelect: () => void;
    /** Click handler to install this wallet */
    onInstall?: () => void;
}

export interface WalletListProps {
    /** Custom className */
    className?: string;
    /** Render function for each wallet item */
    renderItem?: (props: WalletItemProps) => ReactNode;
    /** Render function for empty state (no wallets) */
    renderEmpty?: () => ReactNode;
    /** Render function for loading state */
    renderLoading?: () => ReactNode;
    /** Callback when a wallet is successfully connected */
    onConnect?: () => void;
    /** Callback when connection fails */
    onError?: (error: Error) => void;
    /** Whether to show wallets that aren't installed */
    showNotInstalled?: boolean;
    /** Maximum number of not-installed wallets to show */
    maxNotInstalled?: number;
    /** Custom install URLs for wallets */
    installUrls?: Record<string, string>;
}

const DEFAULT_INSTALL_URLS: Record<string, string> = {
    phantom: 'https://phantom.app',
    solflare: 'https://solflare.com',
    backpack: 'https://backpack.app',
    glow: 'https://glow.app',
};

function getInstallUrl(walletName: string, customUrls?: Record<string, string>): string {
    const name = walletName.toLowerCase();
    if (customUrls) {
        for (const [key, url] of Object.entries(customUrls)) {
            if (name.includes(key.toLowerCase())) return url;
        }
    }
    for (const [key, url] of Object.entries(DEFAULT_INSTALL_URLS)) {
        if (name.includes(key)) return url;
    }
    return 'https://phantom.app';
}

/**
 * Headless wallet list component.
 * Renders a list of available wallets with connection handling.
 * 
 * @example Default usage
 * ```tsx
 * <WalletList onConnect={() => setModalOpen(false)} />
 * ```
 * 
 * @example Custom rendering
 * ```tsx
 * <WalletList
 *   renderItem={({ name, icon, installed, isConnecting, onSelect }) => (
 *     <button onClick={onSelect} disabled={isConnecting}>
 *       <img src={icon} alt={name} />
 *       {name}
 *     </button>
 *   )}
 * />
 * ```
 */
export function WalletList({
    className,
    renderItem,
    renderEmpty,
    renderLoading,
    onConnect,
    onError,
    showNotInstalled = true,
    maxNotInstalled = 3,
    installUrls,
}: WalletListProps) {
    const { wallets, select, connecting } = useConnector();
    const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => {
        setIsClient(true);
    }, []);
    
    const handleSelect = async (walletName: string) => {
        setConnectingWallet(walletName);
        try {
            await select(walletName);
            onConnect?.();
        } catch (error) {
            onError?.(error as Error);
        } finally {
            setConnectingWallet(null);
        }
    };
    
    const handleInstall = (walletName: string) => {
        const url = getInstallUrl(walletName, installUrls);
        window.open(url, '_blank');
    };
    
    // Loading state
    if (!isClient) {
        if (renderLoading) return <>{renderLoading()}</>;
        return (
            <div className={className} data-slot="wallet-list" data-state="loading">
                <div className="ck-wallet-list-loading">
                    <span className="ck-spinner" />
                    <span>Detecting wallets...</span>
                </div>
            </div>
        );
    }
    
    // Split wallets
    const installedWallets = wallets.filter(w => w.installed);
    const notInstalledWallets = showNotInstalled 
        ? wallets.filter(w => !w.installed).slice(0, maxNotInstalled)
        : [];
    
    // Empty state
    if (wallets.length === 0) {
        if (renderEmpty) return <>{renderEmpty()}</>;
        return (
            <div className={className} data-slot="wallet-list" data-state="empty">
                <div className="ck-wallet-list-empty">
                    <p>No wallets detected</p>
                    <p>Install a Solana wallet to get started</p>
                </div>
            </div>
        );
    }
    
    // Default item renderer
    const defaultRenderItem = (props: WalletItemProps) => (
        <button
            key={props.name}
            className="ck-wallet-item"
            onClick={props.installed ? props.onSelect : props.onInstall}
            disabled={props.isDisabled}
            data-slot="wallet-item"
            data-installed={props.installed}
            data-connecting={props.isConnecting}
        >
            {props.icon && (
                <img 
                    src={props.icon} 
                    alt={props.name}
                    className="ck-wallet-item-icon"
                    data-slot="wallet-item-icon"
                />
            )}
            <div className="ck-wallet-item-info" data-slot="wallet-item-info">
                <span className="ck-wallet-item-name" data-slot="wallet-item-name">
                    {props.name}
                </span>
                <span className="ck-wallet-item-status" data-slot="wallet-item-status">
                    {props.isConnecting 
                        ? 'Connecting...' 
                        : props.installed 
                            ? 'Ready to connect' 
                            : 'Not installed'
                    }
                </span>
            </div>
            {props.isConnecting && <span className="ck-spinner" />}
        </button>
    );
    
    const itemRenderer = renderItem || defaultRenderItem;
    
    return (
        <div className={className} data-slot="wallet-list">
            {/* Installed wallets */}
            {installedWallets.length > 0 && (
                <div className="ck-wallet-list-section" data-slot="wallet-list-installed">
                    <div className="ck-wallet-list-header" data-slot="wallet-list-header">
                        <span>Available Wallets</span>
                        <span className="ck-wallet-list-count">{installedWallets.length}</span>
                    </div>
                    <div className="ck-wallet-list-items" data-slot="wallet-list-items">
                        {installedWallets.map((walletInfo: WalletInfo) => 
                            itemRenderer({
                                name: walletInfo.wallet.name,
                                icon: walletInfo.wallet.icon,
                                installed: true,
                                isConnecting: connectingWallet === walletInfo.wallet.name,
                                isDisabled: connecting || connectingWallet !== null,
                                onSelect: () => handleSelect(walletInfo.wallet.name),
                                onInstall: () => handleInstall(walletInfo.wallet.name),
                            })
                        )}
                    </div>
                </div>
            )}
            
            {/* Not installed wallets */}
            {notInstalledWallets.length > 0 && (
                <div className="ck-wallet-list-section" data-slot="wallet-list-not-installed">
                    <div className="ck-wallet-list-header" data-slot="wallet-list-header">
                        <span>{installedWallets.length > 0 ? 'Other Wallets' : 'Popular Wallets'}</span>
                    </div>
                    <div className="ck-wallet-list-items" data-slot="wallet-list-items">
                        {notInstalledWallets.map((walletInfo: WalletInfo) => 
                            itemRenderer({
                                name: walletInfo.wallet.name,
                                icon: walletInfo.wallet.icon,
                                installed: false,
                                isConnecting: false,
                                isDisabled: false,
                                onSelect: () => handleSelect(walletInfo.wallet.name),
                                onInstall: () => handleInstall(walletInfo.wallet.name),
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

WalletList.displayName = 'WalletList';
