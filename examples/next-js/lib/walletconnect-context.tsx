'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface WalletConnectContextValue {
    uri: string | null;
    setUri: (uri: string | null) => void;
    clearUri: () => void;
}

const WalletConnectContext = createContext<WalletConnectContextValue | null>(null);

export function WalletConnectProvider({ children }: { children: ReactNode }) {
    const [uri, setUriState] = useState<string | null>(null);

    // Debug: log when URI changes
    useEffect(() => {
        console.log('[WalletConnectContext] URI state changed:', uri ? uri.substring(0, 50) + '...' : 'null');
    }, [uri]);

    const setUri = useCallback((newUri: string | null) => {
        console.log('[WalletConnectContext] setUri called with:', newUri ? newUri.substring(0, 50) + '...' : 'null');
        setUriState(newUri);
    }, []);

    const clearUri = useCallback(() => {
        console.log('[WalletConnectContext] clearUri called');
        setUriState(null);
    }, []);

    return (
        <WalletConnectContext.Provider value={{ uri, setUri, clearUri }}>
            {children}
        </WalletConnectContext.Provider>
    );
}

export function useWalletConnectUri() {
    const context = useContext(WalletConnectContext);
    if (!context) {
        throw new Error('useWalletConnectUri must be used within a WalletConnectProvider');
    }
    return context;
}
