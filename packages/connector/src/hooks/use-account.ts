/**
 * useAccount hook
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useConnector } from '../ui/connector-provider';
import { copyAddressToClipboard, formatAddress, ClipboardErrorType, type ClipboardResult } from '../utils';
import type { AccountInfo } from '../types/accounts';
import { COPY_FEEDBACK_DURATION_MS } from '../lib/constants';

export interface UseAccountReturn {
    /** The connected wallet address */
    address: string | null;
    /** Full account info object */
    account: AccountInfo | null;
    /** Whether a wallet is connected */
    connected: boolean;
    /** Shortened formatted address for display */
    formatted: string;
    /** Copy the address to clipboard with enhanced result */
    copy: () => Promise<ClipboardResult>;
    /** Whether the address was recently copied */
    copied: boolean;
    /** All available accounts from the connected wallet */
    accounts: AccountInfo[];
    /** Select a different account from the connected wallet */
    selectAccount: (address: string) => Promise<void>;
}

export function useAccount(): UseAccountReturn {
    const { selectedAccount, accounts, connected, selectAccount } = useConnector();
    const [copied, setCopied] = useState(false);
    const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const account = useMemo(
        () => accounts.find((a: AccountInfo) => a.address === selectedAccount) ?? null,
        [accounts, selectedAccount],
    );

    const formatted = useMemo(() => (selectedAccount ? formatAddress(selectedAccount) : ''), [selectedAccount]);

    const copy = useCallback(async (): Promise<ClipboardResult> => {
        if (!selectedAccount) {
            return {
                success: false,
                error: ClipboardErrorType.EMPTY_VALUE,
                errorMessage: 'No account selected',
            };
        }

        if (copyTimeoutRef.current) {
            clearTimeout(copyTimeoutRef.current);
        }

        const result = await copyAddressToClipboard(selectedAccount, {
            onSuccess: () => {
                setCopied(true);
                copyTimeoutRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
            },
        });

        return result;
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
