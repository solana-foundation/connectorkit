/**
 * @connector-kit/connector - useAccount hook
 *
 * React hook for working with the connected wallet account
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useConnector } from '../ui/connector-provider';
import { copyAddressToClipboard, formatAddress } from '../utils';
import type { AccountInfo } from '../types/accounts';

export interface UseAccountReturn {
    /** The connected wallet address */
    address: string | null;
    /** Full account info object */
    account: AccountInfo | null;
    /** Whether a wallet is connected */
    connected: boolean;
    /** Shortened formatted address for display */
    formatted: string;
    /** Copy the address to clipboard */
    copy: () => Promise<boolean>;
    /** Whether the address was recently copied */
    copied: boolean;
    /** All available accounts from the connected wallet */
    accounts: AccountInfo[];
    /** Select a different account from the connected wallet */
    selectAccount: (address: string) => Promise<void>;
}

/**
 * Hook for working with the connected wallet account
 * Provides formatted address, clipboard copying, and account selection
 *
 * @example
 * ```tsx
 * function AccountDisplay() {
 *   const { address, formatted, copy, copied, connected } = useAccount()
 *
 *   if (!connected) return <p>Not connected</p>
 *
 *   return (
 *     <button onClick={copy}>
 *       {formatted} {copied && '✓'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useAccount(): UseAccountReturn {
    const { selectedAccount, accounts, connected, selectAccount } = useConnector();
    const [copied, setCopied] = useState(false);
    const copyTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

    const account = useMemo(
        () => accounts.find((a: AccountInfo) => a.address === selectedAccount) ?? null,
        [accounts, selectedAccount],
    );

    const formatted = useMemo(() => (selectedAccount ? formatAddress(selectedAccount) : ''), [selectedAccount]);

    const copy = useCallback(async () => {
        if (!selectedAccount) return false;

        if (copyTimeoutRef.current) {
            clearTimeout(copyTimeoutRef.current);
        }

        const success = await copyAddressToClipboard(selectedAccount);
        if (success) {
            setCopied(true);
            copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
        }
        return success;
    }, [selectedAccount]);

    React.useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    return useMemo(
        () => ({
            address: selectedAccount,
            account,
            connected,
            formatted,
            copy,
            copied,
            accounts,
            selectAccount,
        }),
        [selectedAccount, account, connected, formatted, copy, copied, accounts, selectAccount],
    );
}
