'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { useWalletInfo, type WalletDisplayInfo } from '../../hooks/use-wallet-info';
import { useConnector } from '../../ui/connector-provider';
import type { WalletConnectorId } from '../../types/session';

export interface WalletListElementRenderProps {
    wallets: WalletDisplayInfo[];
    installedWallets: WalletDisplayInfo[];
    /** @deprecated Use `connectById` for vNext API */
    select: (walletName: string) => Promise<void>;
    /** Connect by connector ID (vNext API) */
    connectById: (connectorId: WalletConnectorId) => Promise<void>;
    connecting: boolean;
}

export interface WalletListElementWalletProps {
    wallet: WalletDisplayInfo;
    /** @deprecated Use `connect` for clearer naming */
    select: () => Promise<void>;
    /** Connect to this wallet (vNext API) */
    connect: () => Promise<void>;
    connecting: boolean;
}

export interface WalletListElementProps {
    /** Filter to only show installed wallets */
    installedOnly?: boolean;
    /** Custom className */
    className?: string;
    /** Layout variant */
    variant?: 'list' | 'grid' | 'compact';
    /** Show wallet status badge */
    showStatus?: boolean;
    /** @deprecated Use `onConnect` for vNext API */
    onSelect?: (walletName: string) => void;
    /** Callback when a wallet is connected (vNext API) */
    onConnect?: (connectorId: WalletConnectorId) => void;
    /** Custom render function for full control */
    render?: (props: WalletListElementRenderProps) => ReactNode;
    /** Custom render function for individual wallet items */
    renderWallet?: (props: WalletListElementWalletProps) => ReactNode;
}

/**
 * Element for displaying available wallets and selecting one to connect.
 *
 * @example Basic usage
 * ```tsx
 * <WalletListElement />
 * ```
 *
 * @example Installed wallets only (most common)
 * ```tsx
 * <WalletListElement installedOnly />
 * ```
 *
 * @example Grid layout
 * ```tsx
 * <WalletListElement variant="grid" installedOnly />
 * ```
 *
 * @example With custom wallet render
 * ```tsx
 * <WalletListElement
 *   installedOnly
 *   renderWallet={({ wallet, select }) => (
 *     <Button key={wallet.name} onClick={select}>
 *       <img src={wallet.icon} alt={wallet.name} />
 *       {wallet.name}
 *     </Button>
 *   )}
 * />
 * ```
 *
 * @example Full custom render
 * ```tsx
 * <WalletListElement
 *   render={({ installedWallets, select, connecting }) => (
 *     <div className="grid grid-cols-2 gap-2">
 *       {installedWallets.map(w => (
 *         <button key={w.name} onClick={() => select(w.name)} disabled={connecting}>
 *           {w.name}
 *         </button>
 *       ))}
 *     </div>
 *   )}
 * />
 * ```
 */
export function WalletListElement({
    installedOnly = false,
    className,
    variant = 'list',
    showStatus = true,
    onSelect,
    onConnect,
    render,
    renderWallet,
}: WalletListElementProps) {
    const { wallets, connecting } = useWalletInfo();
    const { select } = useConnector();

    const installedWallets = wallets.filter(w => w.installed);
    const displayWallets = installedOnly ? installedWallets : wallets;

    // Legacy select by name
    const handleSelect = async (walletName: string) => {
        await select(walletName);
        onSelect?.(walletName);
    };

    // vNext connect by connector ID
    const handleConnectById = async (connectorId: WalletConnectorId) => {
        // Find wallet name for legacy select (until we fully migrate)
        const wallet = wallets.find(w => w.connectorId === connectorId);
        if (!wallet) {
            const availableConnectorIds = wallets.map(w => w.connectorId);
            console.warn(
                `[WalletListElement] Wallet not found for connectorId: ${connectorId}. Available connectorIds (${availableConnectorIds.length}):`,
                availableConnectorIds
            );
            return;
        }
        await select(wallet.name);
        onConnect?.(connectorId);
    };

    // Full custom render
    if (render) {
        return (
            <>
                {render({
                    wallets,
                    installedWallets,
                    select: handleSelect,
                    connectById: handleConnectById,
                    connecting,
                })}
            </>
        );
    }

    if (displayWallets.length === 0) {
        return (
            <div
                className={`ck-wallet-list-block ck-wallet-list-block--empty ${className || ''}`}
                data-slot="wallet-list-element"
                data-empty="true"
            >
                <div className="ck-wallet-list-empty" data-slot="wallet-list-empty">
                    <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="ck-wallet-list-empty-icon"
                        data-slot="wallet-list-empty-icon"
                    >
                        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                    </svg>
                    <p className="ck-wallet-list-empty-text" data-slot="wallet-list-empty-text">
                        {installedOnly ? 'No wallets detected' : 'No wallets available'}
                    </p>
                    <p className="ck-wallet-list-empty-hint" data-slot="wallet-list-empty-hint">
                        Install a Solana wallet extension to continue
                    </p>
                </div>
            </div>
        );
    }

    const walletIcon = (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ck-wallet-list-item-fallback-icon"
            data-slot="wallet-list-item-fallback-icon"
        >
            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
        </svg>
    );

    // Grid variant
    if (variant === 'grid') {
        return (
            <div
                className={`ck-wallet-list-block ck-wallet-list-block--grid ${className || ''}`}
                data-slot="wallet-list-element"
                data-variant="grid"
            >
                {displayWallets.map(wallet => {
                    const handleWalletConnect = () => handleConnectById(wallet.connectorId);
                    if (renderWallet) {
                        return (
                            <React.Fragment key={wallet.name}>
                                {renderWallet({
                                    wallet,
                                    select: handleWalletConnect,
                                    connect: handleWalletConnect,
                                    connecting,
                                })}
                            </React.Fragment>
                        );
                    }

                    return (
                        <button
                            key={wallet.name}
                            type="button"
                            className="ck-wallet-list-item ck-wallet-list-item--grid"
                            onClick={handleWalletConnect}
                            disabled={connecting || (!wallet.installed && installedOnly)}
                            data-slot="wallet-list-item"
                            data-wallet={wallet.name}
                            data-connector-id={wallet.connectorId}
                            data-installed={wallet.installed}
                        >
                            <div className="ck-wallet-list-item-icon" data-slot="wallet-list-item-icon">
                                {wallet.icon ? <img src={wallet.icon} alt={wallet.name} /> : walletIcon}
                            </div>
                            <span className="ck-wallet-list-item-name" data-slot="wallet-list-item-name">
                                {wallet.name}
                            </span>
                            {showStatus && !wallet.installed && (
                                <span className="ck-wallet-list-item-status" data-slot="wallet-list-item-status">
                                    Not installed
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    }

    // Compact variant
    if (variant === 'compact') {
        return (
            <div
                className={`ck-wallet-list-block ck-wallet-list-block--compact ${className || ''}`}
                data-slot="wallet-list-element"
                data-variant="compact"
            >
                {displayWallets.map(wallet => {
                    const handleWalletConnect = () => handleConnectById(wallet.connectorId);
                    if (renderWallet) {
                        return (
                            <React.Fragment key={wallet.name}>
                                {renderWallet({
                                    wallet,
                                    select: handleWalletConnect,
                                    connect: handleWalletConnect,
                                    connecting,
                                })}
                            </React.Fragment>
                        );
                    }

                    return (
                        <button
                            key={wallet.name}
                            type="button"
                            className="ck-wallet-list-item ck-wallet-list-item--compact"
                            onClick={handleWalletConnect}
                            disabled={connecting || (!wallet.installed && installedOnly)}
                            data-slot="wallet-list-item"
                            data-wallet={wallet.name}
                            data-connector-id={wallet.connectorId}
                            data-installed={wallet.installed}
                        >
                            <div className="ck-wallet-list-item-icon" data-slot="wallet-list-item-icon">
                                {wallet.icon ? <img src={wallet.icon} alt={wallet.name} /> : walletIcon}
                            </div>
                            <span className="ck-wallet-list-item-name" data-slot="wallet-list-item-name">
                                {wallet.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        );
    }

    // List variant (default)
    return (
        <div
            className={`ck-wallet-list-block ck-wallet-list-block--list ${className || ''}`}
            data-slot="wallet-list-element"
            data-variant="list"
        >
            {displayWallets.map(wallet => {
                const handleWalletConnect = () => handleConnectById(wallet.connectorId);
                if (renderWallet) {
                    return (
                        <React.Fragment key={wallet.name}>
                            {renderWallet({
                                wallet,
                                select: handleWalletConnect,
                                connect: handleWalletConnect,
                                connecting,
                            })}
                        </React.Fragment>
                    );
                }

                return (
                    <button
                        key={wallet.name}
                        type="button"
                        className="ck-wallet-list-item ck-wallet-list-item--list"
                        onClick={handleWalletConnect}
                        disabled={connecting || (!wallet.installed && installedOnly)}
                        data-slot="wallet-list-item"
                        data-wallet={wallet.name}
                        data-connector-id={wallet.connectorId}
                        data-installed={wallet.installed}
                    >
                        <div className="ck-wallet-list-item-icon" data-slot="wallet-list-item-icon">
                            {wallet.icon ? <img src={wallet.icon} alt={wallet.name} /> : walletIcon}
                        </div>
                        <div className="ck-wallet-list-item-info" data-slot="wallet-list-item-info">
                            <span className="ck-wallet-list-item-name" data-slot="wallet-list-item-name">
                                {wallet.name}
                            </span>
                            {showStatus && (
                                <span
                                    className="ck-wallet-list-item-status"
                                    data-slot="wallet-list-item-status"
                                    data-installed={wallet.installed}
                                >
                                    {wallet.installed ? 'Detected' : 'Not installed'}
                                </span>
                            )}
                        </div>
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="ck-wallet-list-item-arrow"
                            data-slot="wallet-list-item-arrow"
                        >
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                );
            })}
        </div>
    );
}

WalletListElement.displayName = 'WalletListElement';
