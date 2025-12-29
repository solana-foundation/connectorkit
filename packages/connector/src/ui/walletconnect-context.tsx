'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';

/**
 * WalletConnect URI context value
 * Used to share the WalletConnect pairing URI between components
 */
export interface WalletConnectContextValue {
    /** The current WalletConnect URI for QR code display */
    uri: string | null;
    /** Set the URI (called internally when display_uri event fires) */
    setUri: (uri: string | null) => void;
    /** Clear the URI (called when session is established or disconnected) */
    clearUri: () => void;
}

const WalletConnectContext = createContext<WalletConnectContextValue | null>(null);

/**
 * Provider component for WalletConnect URI state
 * 
 * This is automatically wrapped by AppProvider when WalletConnect is enabled.
 * You typically don't need to use this directly.
 */
export function WalletConnectProvider({ children }: { children: ReactNode }) {
    const [uri, setUriState] = useState<string | null>(null);

    // Track mount state to avoid setting state before mount
    const isMountedRef = useRef(false);
    const pendingUriRef = useRef<string | null>(null);

    useEffect(() => {
        isMountedRef.current = true;

        // If a URI arrived before mount, apply it now
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
            // Store for later if not mounted yet
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

/**
 * Hook to access the WalletConnect URI for QR code display
 * 
 * @example
 * ```tsx
 * import { useWalletConnectUri } from '@solana/connector/react';
 * 
 * function WalletModal() {
 *   const { uri, clearUri } = useWalletConnectUri();
 *   
 *   return uri ? (
 *     <QRCodeSVG value={uri} />
 *   ) : (
 *     <Spinner />
 *   );
 * }
 * ```
 */
export function useWalletConnectUri(): WalletConnectContextValue {
    const context = useContext(WalletConnectContext);
    
    // Return a no-op context if not within provider (graceful fallback)
    // This allows the hook to be used even when WalletConnect is not enabled
    if (!context) {
        return {
            uri: null,
            setUri: () => {},
            clearUri: () => {},
        };
    }
    
    return context;
}
