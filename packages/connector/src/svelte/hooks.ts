import { getContext, onDestroy } from 'svelte';
import type { ConnectorClient } from '../lib/core/connector-client';
import { CONNECTOR_CLIENT_CONTEXT_KEY, CONNECTOR_STORE_CONTEXT_KEY } from './constants';
import { ConnectorEvent, ConnectorState } from '../types';
import { derived, get, Readable, writable } from 'svelte/store';
import { formatAddress, formatLamportsToSolSafe } from '../utils/formatting';
import { copyAddressToClipboard } from '../utils/clipboard';
import { getClusterExplorerUrl } from '../utils/cluster';
import { createKitTransactionSigner, createSolanaClient, createTransactionSigner } from '../headless';
import { address as toAddress } from '@solana/addresses';
import { createQuery } from './query';

export const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

export const useConnectorClient = (): ConnectorClient => {
    const client = getContext<ConnectorClient>(CONNECTOR_CLIENT_CONTEXT_KEY);

    if (!client) {
        throw new Error('ConnectorProvider not found. Wrap your app in <ConnectorProvider />');
    }

    return client;
};

export const useConnector = () => {
    const client = useConnectorClient();
    const store = getContext<Readable<ConnectorState>>(CONNECTOR_STORE_CONTEXT_KEY);

    if (!store) {
        throw new Error('ConnectorStore not found. Wrap your app in <ConnectorProvider />');
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
        const currentAddr = get(address);

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

export const useCluster = () => {
    const { cluster: clusterStore, store } = useConnector();
    const client = useConnectorClient();

    // derived stores for convenience
    const activeCluster = derived(clusterStore, $cluster => $cluster);
    const allClusters = derived(store, $store => $store.clusters);

    const explorerUrl = derived(clusterStore, $cluster => ($cluster ? getClusterExplorerUrl($cluster) : ''));

    return {
        cluster: activeCluster,
        clusters: allClusters,
        explorerUrl,
        setCluster: client.setCluster.bind(client),
    };
};

export const useWalletInfo = () => {
    const { wallet, wallets, connected, store } = useConnector();

    return {
        // current wallet info
        name: derived(wallet, $wallet => $wallet?.name ?? null),
        icon: derived(wallet, $wallet => $wallet?.icon ?? null),

        // connection status
        connected,
        connecting: derived(store, $store => $store.connecting),

        // all wallets
        wallets,
    };
};

export const useTransactionSigner = () => {
    const { wallet, address, cluster, connected } = useConnector();
    const client = useConnectorClient();

    // derived store that generates signer
    const signer = derived([wallet, address, cluster, connected], ([$wallet, $address, $cluster, $connected]) => {
        if (!$connected || !$wallet || !$address) return null;

        const rawAccount = client.getSnapshot().accounts.find(a => a.address === $address)?.raw;
        if (!rawAccount) return null;

        return createTransactionSigner({
            wallet: $wallet,
            account: rawAccount,
            cluster: $cluster ?? undefined,

            eventEmitter: { emit: e => client.emitEvent(e as ConnectorEvent) },
        });
    });

    const capabilities = derived(
        signer,
        $signer =>
            $signer?.getCapabilities() ?? {
                canSign: false,
                canSend: false,
                supportsBatchSigning: false,
            },
    );

    return {
        signer,
        capabilities,
    };
};

export const useKitTransactionSigner = () => {
    const { signer } = useTransactionSigner();

    const kitSigner = derived(signer, $signer => {
        if (!$signer) return null;
        return createKitTransactionSigner($signer);
    });

    return {
        signer: kitSigner,
    };
};

interface UseWalletAssetsOptions {
    enabled?: boolean;
    refetchIntervalMs?: number;
    staleTimeMs?: number;
}

export const useWalletAssets = (options: UseWalletAssetsOptions = {}) => {
    const { address, connected } = useConnector();
    const { cluster } = useCluster();
    const client = useConnectorClient();

    // create a reactive key - if this string changes, the query must re-fetch
    const key = derived([connected, address, cluster], ([$connected, $address, $cluster]) => {
        const rpcUrl = client.getRpcUrl();

        if (options.enabled === false) return null;
        if (!$connected || !$address || !$cluster || !rpcUrl) return null;

        return JSON.stringify(['wallet-assets', rpcUrl, $address]);
    });

    const queryFn = async () => {
        const currentAddressStr = get(address);
        const rpcUrl = client.getRpcUrl();

        if (!currentAddressStr || !rpcUrl) return { lamports: 0n, tokenAccounts: [] };

        // lightweight rpc client for this specific request
        const tempClient = createSolanaClient({ urlOrMoniker: rpcUrl });
        const walletAddress = toAddress(currentAddressStr);

        const [balanceResult, tokenAccountsResult, token2022AccountsResult] = await Promise.all([
            tempClient.rpc.getBalance(walletAddress).send(),

            tempClient.rpc
                .getTokenAccountsByOwner(
                    walletAddress,
                    { programId: toAddress(TOKEN_PROGRAM_ID) },
                    { encoding: 'jsonParsed' },
                )
                .send(),

            tempClient.rpc
                .getTokenAccountsByOwner(
                    walletAddress,
                    { programId: toAddress(TOKEN_2022_PROGRAM_ID) },
                    { encoding: 'jsonParsed' },
                )
                .send(),
        ]);

        const parseAccount = (t: any, programId: 'token' | 'token-2022') => {
            const info = t.account.data.parsed?.info;
            if (!info) return null;

            return {
                pubkey: t.pubkey,
                mint: info.mint,
                owner: info.owner,
                amount: BigInt(info.tokenAmount.amount),
                decimals: info.tokenAmount.decimals,
                isFrozen: info.state === 'frozen',
                programId,
            };
        };

        const tokenAccounts = [
            ...tokenAccountsResult.value.map(t => parseAccount(t, 'token')),
            ...token2022AccountsResult.value.map(t => parseAccount(t, 'token-2022')),
        ].filter((t): t is NonNullable<typeof t> => t !== null);

        return {
            lamports: balanceResult.value,
            tokenAccounts,
        };
    };

    return createQuery(key, queryFn, options);
};

export const useBalance = (options: UseWalletAssetsOptions = {}) => {
    const assetsQuery = useWalletAssets(options);

    const solBalance = derived(assetsQuery, $q => ($q.data ? Number($q.data.lamports) / 1_000_000_000 : 0));

    const formattedSol = derived(assetsQuery, $q =>
        $q.data ? formatLamportsToSolSafe($q.data.lamports, { suffix: true }) : '0 SOL',
    );

    return {
        ...assetsQuery,
        solBalance,
        formattedSol,
        isLoading: derived(assetsQuery, $q => $q.status === 'loading'),
    };
};

export const useTokens = (options: UseWalletAssetsOptions = {}) => {
    const assetsQuery = useWalletAssets(options);

    const tokens = derived(assetsQuery, $q => $q.data?.tokenAccounts ?? []);

    return {
        ...assetsQuery,
        tokens,
        isLoading: derived(assetsQuery, $q => $q.status === 'loading'),
    };
};

export const useTransactions = (options: { limit?: number } & UseWalletAssetsOptions) => {
    const { address, connected } = useConnector();
    const { cluster } = useCluster();
    const client = useConnectorClient();
    const limit = options.limit ?? 10;

    // create a reactive key - if this string changes, the query must re-fetch
    const key = derived([connected, address, cluster], ([$connected, $address, $cluster]) => {
        const rpcUrl = client.getRpcUrl();
        if (options.enabled === false) return null;
        if (!$connected || !$address || !$cluster || !rpcUrl) return null;

        return JSON.stringify(['wallet-transactions', rpcUrl, $address, $cluster, limit]);
    });

    const queryFn = async () => {
        const currentAddressStr = get(address);
        const rpcUrl = client.getRpcUrl();

        if (!currentAddressStr || !rpcUrl) return [];

        const tempClient = createSolanaClient({ urlOrMoniker: rpcUrl });
        const walletAddress = toAddress(currentAddressStr);

        const signatures = await tempClient.rpc.getSignaturesForAddress(walletAddress, { limit }).send();

        return signatures.map(sig => ({
            signature: sig.signature,
            slot: Number(sig.slot),
            blockTime: Number(sig.blockTime),
            status: sig.err ? 'failed' : 'success',
            err: sig.err,
        }));
    };

    const query = createQuery(key, queryFn, options);

    return {
        ...query,
        transactions: derived(query, $q => $q.data ?? []),
        isLoading: derived(query, $q => $q.status === 'loading'),
    };
};
