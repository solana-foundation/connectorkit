/**
 * @solana/connector - useKitMessageSigner hook
 *
 * React hook for kit-compatible message signing.
 *
 * `useKitTransactionSigner` returns a `TransactionModifyingSigner`, which by
 * definition carries no message-signing member. The package already contains a
 * correct kit message signer (`createMessageSignerFromWallet`, composed by
 * `createKitSignersFromWallet` whenever the wallet advertises
 * `solana:signMessage`) but it was only reachable from the headless entry
 * point. This hook wires it into the React path.
 */

'use client';

import { useMemo } from 'react';
import type { MessageModifyingSigner } from '@solana/signers';
import type { SolanaClusterId } from '@wallet-ui/core';
import { useConnector } from '../ui/connector-provider';
import { createKitSignersFromWallet } from '../lib/kit/signer-integration';
import { getChainIdFromClusterId, getClusterTypeFromChainId } from '../utils/chain';

/**
 * Return value from useKitMessageSigner hook
 */
export interface UseKitMessageSignerReturn {
    /**
     * Kit-compatible MessageModifyingSigner instance.
     *
     * Null when no wallet is connected, or when the connected wallet does not
     * advertise the `solana:signMessage` feature.
     */
    signer: MessageModifyingSigner<string> | null;

    /**
     * Whether a message signer is available and ready to use.
     * Useful for disabling "sign message" buttons.
     */
    ready: boolean;

    /**
     * Current wallet address that will sign, or null if no wallet connected
     */
    address: string | null;
}

/**
 * The networks `createKitSignersFromWallet` can map to a Wallet Standard chain.
 * `localnet` and custom clusters have no canonical chain ID and resolve to
 * `undefined`, which leaves the signer on its own default.
 */
const MAPPABLE_NETWORKS = ['mainnet', 'devnet', 'testnet'] as const;

type MappableNetwork = (typeof MAPPABLE_NETWORKS)[number];

function toMappableNetwork(clusterId: string | undefined): MappableNetwork | undefined {
    if (!clusterId) return undefined;

    // Go through the chain utilities rather than `normalizeNetwork`, whose `default`
    // branch answers 'mainnet' for *any* unrecognized network - a custom cluster id
    // would otherwise be silently signed against mainnet. These return null instead.
    const chainId = getChainIdFromClusterId(clusterId as SolanaClusterId);
    if (!chainId) return undefined;

    const clusterType = getClusterTypeFromChainId(chainId);
    return MAPPABLE_NETWORKS.includes(clusterType as MappableNetwork) ? (clusterType as MappableNetwork) : undefined;
}

/**
 * Hook for kit-compatible message signing
 *
 * Builds the signer from the **wallet object** rather than from the connector's
 * own transaction signer, so it uses the wallet's genuine Wallet Standard
 * `solana:signMessage` feature and its real `WalletAccount`.
 *
 * @example
 * ```tsx
 * import { useKitMessageSigner } from '@solana/connector';
 *
 * function SignIn() {
 *   const { signer, ready } = useKitMessageSigner();
 *
 *   const handleSign = async () => {
 *     if (!signer) return;
 *     const [signed] = await signer.modifyAndSignMessages([
 *       { content: new TextEncoder().encode('Hello'), signatures: {} },
 *     ]);
 *     console.log(signed.signatures[signer.address]);
 *   };
 *
 *   return <button onClick={handleSign} disabled={!ready}>Sign message</button>;
 * }
 * ```
 */
export function useKitMessageSigner(): UseKitMessageSignerReturn {
    const { selectedWallet, selectedAccount, accounts, cluster, connected } = useConnector();

    const account = useMemo(
        () => accounts.find(a => a.address === selectedAccount)?.raw ?? null,
        [accounts, selectedAccount],
    );

    const signer = useMemo(() => {
        if (!connected || !selectedWallet || !account) {
            return null;
        }

        return createKitSignersFromWallet(selectedWallet, account, null, toMappableNetwork(cluster?.id)).messageSigner;
    }, [connected, selectedWallet, account, cluster]);

    return {
        signer,
        ready: Boolean(signer),
        address: selectedAccount,
    };
}
