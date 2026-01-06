import { getContext, onDestroy } from 'svelte';
import type { ConnectorClient } from '../lib/core/connector-client';
import { CONNECTOR_CLIENT_CONTEXT_KEY, CONNECTOR_STORE_CONTEXT_KEY } from './constants';
import { ConnectorState } from '../types';
import { derived, Readable, writable } from 'svelte/store';
import { formatAddress } from '../utils/formatting';
import { copyAddressToClipboard } from '../utils/clipboard';

export const useConnectorClient = (): ConnectorClient => {
    const client = getContext<ConnectorClient>(CONNECTOR_CLIENT_CONTEXT_KEY);

    if (!client) {
        throw new Error('ConnectorProvider not found. Wrap your app in <ConnectionProvider />');
    }

    return client;
};

export const useConnector = () => {
    const client = useConnectorClient();
    const store = getContext<Readable<ConnectorState>>(CONNECTOR_STORE_CONTEXT_KEY);

    if (!store) {
        throw new Error('ConnectorStore not found. Wrap your app in <ConnectionProvider />');
    }

    return {
        // The raw store (usage: $store) if users want full access
        store,

        // Derived values (usage: $connected, $wallet)
        // These update automatically when the store changes
        connected: derived(store, $ => $.connected),
        wallet: derived(store, $ => $.selectedWallet),
        address: derived(store, $ => $.selectedAccount),
        wallets: derived(store, $ => $.wallets),
        cluster: derived(store, $ => $.cluster),

        // Actions bound to client so they don't need $ prefix
        select: client.select.bind(client),
        disconnect: client.disconnect.bind(client),
        selectAccount: client.selectAccount.bind(client),
    };
};

export const useAccount = () => {
    const { address, connected } = useConnector();

    // local state for copy feedback
    const copied = writable(false);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const formatted = derived(address, $addr => ($addr ? formatAddress($addr) : ''));

    const copy = async () => {
        // We have to subscribe to get the current value of the derived store inside a function
        // Or cleaner: leverage the connector client if we had access, but here we just rely on the store.
        let currentAddr: string | null = null;
        const unsub = address.subscribe(v => (currentAddr = v));
        unsub();

        if (currentAddr) {
            await copyAddressToClipboard(currentAddr);
            copied.set(true);
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => copied.set(false), 2000);
        }
    };

    onDestroy(() => clearTimeout(timeoutId));

    return {
        address,
        formatted,
        connected,
        copy,
        copied,
    };
};
