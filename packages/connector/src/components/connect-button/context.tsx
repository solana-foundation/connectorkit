'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useConnector } from '../../ui/connector-provider';
import { useAccount } from '../../hooks/use-account';
import { useWalletInfo } from '../../hooks/use-wallet-info';

export interface ConnectButtonContextValue {
    // Connection state
    connected: boolean;
    connecting: boolean;
    
    // Modal/dropdown state for connection
    isConnectOpen: boolean;
    setConnectOpen: (open: boolean) => void;
    
    // Dropdown/sheet state for connected wallet
    isWalletOpen: boolean;
    setWalletOpen: (open: boolean) => void;
    
    // Wallet actions
    select: (walletName: string) => Promise<void>;
    disconnect: () => Promise<void>;
    
    // Account info
    address: string | null;
    formatted: string;
    copy: () => Promise<{ success: boolean }>;
    copied: boolean;
    
    // Wallet info
    walletName: string | null;
    walletIcon: string | null;
    wallets: Array<{
        name: string;
        icon?: string;
        installed: boolean;
    }>;
}

const ConnectButtonContext = createContext<ConnectButtonContextValue | null>(null);
ConnectButtonContext.displayName = 'ConnectButtonContext';

export interface ConnectButtonProviderProps {
    children: ReactNode;
    /** Default open state for connect UI */
    defaultConnectOpen?: boolean;
    /** Default open state for wallet UI */
    defaultWalletOpen?: boolean;
    /** Callback when connect modal/dropdown opens or closes */
    onConnectOpenChange?: (open: boolean) => void;
    /** Callback when wallet dropdown/sheet opens or closes */
    onWalletOpenChange?: (open: boolean) => void;
}

export function ConnectButtonProvider({
    children,
    defaultConnectOpen = false,
    defaultWalletOpen = false,
    onConnectOpenChange,
    onWalletOpenChange,
}: ConnectButtonProviderProps) {
    const { connected, connecting, select, disconnect, wallets: connectorWallets } = useConnector();
    const { address, formatted, copy, copied } = useAccount();
    const { name: walletName, icon: walletIcon, wallets: walletInfoList } = useWalletInfo();
    
    const [isConnectOpen, setConnectOpenInternal] = useState(defaultConnectOpen);
    const [isWalletOpen, setWalletOpenInternal] = useState(defaultWalletOpen);
    
    const setConnectOpen = useCallback((open: boolean) => {
        setConnectOpenInternal(open);
        onConnectOpenChange?.(open);
    }, [onConnectOpenChange]);
    
    const setWalletOpen = useCallback((open: boolean) => {
        setWalletOpenInternal(open);
        onWalletOpenChange?.(open);
    }, [onWalletOpenChange]);
    
    // Map wallet info to simplified format
    const wallets = useMemo(() => 
        walletInfoList.map(w => ({
            name: w.name,
            icon: w.icon,
            installed: w.installed,
        })),
    [walletInfoList]);
    
    const value = useMemo<ConnectButtonContextValue>(() => ({
        connected,
        connecting,
        isConnectOpen,
        setConnectOpen,
        isWalletOpen,
        setWalletOpen,
        select,
        disconnect,
        address,
        formatted,
        copy,
        copied,
        walletName,
        walletIcon,
        wallets,
    }), [
        connected,
        connecting,
        isConnectOpen,
        setConnectOpen,
        isWalletOpen,
        setWalletOpen,
        select,
        disconnect,
        address,
        formatted,
        copy,
        copied,
        walletName,
        walletIcon,
        wallets,
    ]);
    
    return (
        <ConnectButtonContext.Provider value={value}>
            {children}
        </ConnectButtonContext.Provider>
    );
}

export function useConnectButtonContext(): ConnectButtonContextValue {
    const context = useContext(ConnectButtonContext);
    if (!context) {
        throw new Error(
            'ConnectButton compound components must be used within ConnectButton.Root. ' +
            'Wrap your components with <ConnectButton.Root> or use the preset <ConnectButton />.'
        );
    }
    return context;
}
