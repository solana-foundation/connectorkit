'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';

interface WalletConnectContextValue {
    uri: string | null;
    setUri: (uri: string | null) => void;
    clearUri: () => void;
}

const WalletConnectContext = createContext<WalletConnectContextValue | null>(null);

export function WalletConnectProvider({ children }: { children: ReactNode }) {
    const [uri, setUriState] = useState<string | null>(null);

    const isMountedRef = useRef(false);
    const pendingUriRef = useRef<string | null>(null);

    useEffect(() => {
        isMountedRef.current = true;

        if (pendingUriRef.current !== null) {
            setUriState(pendingUriRef.current);
            pendingUriRef.current = null;
        }

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const setUri = useCallback((newUri: string | null) => {
        if (!isMountedRef.current) {
            pendingUriRef.current = newUri;
            return;
        }
        setUriState(newUri);
    }, []);

    const clearUri = useCallback(() => {
        pendingUriRef.current = null;
        if (!isMountedRef.current) return;
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
