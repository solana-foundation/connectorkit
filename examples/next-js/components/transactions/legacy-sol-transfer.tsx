'use client';

import { useCallback, useMemo } from 'react';
import { Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { signature as createSignature, address } from '@solana/kit';
import { useWalletAdapterCompat } from '@solana/connector/compat';
import { useTransactionSigner, useConnector, useCluster, useConnectorClient } from '@solana/connector';
import { PipelineHeaderButton, PipelineVisualization } from '@/components/pipeline';
import { waitForSignatureConfirmation } from './rpc-utils';
import { VisualPipeline } from '@/lib/visual-pipeline';
import { useExampleCardHeaderActions } from '@/components/playground/example-card-actions';

/**
 * Legacy SOL Transfer Component
 *
 * Demonstrates using @solana/web3.js (v1) with the wallet adapter compat layer.
 * This shows how connector-kit can seamlessly integrate with existing code
 * that was written for @solana/wallet-adapter.
 */
export function LegacySolTransfer() {
    const { signer } = useTransactionSigner();
    const { disconnect } = useConnector();
    const { cluster } = useCluster();
    const client = useConnectorClient();

    // Create wallet adapter compatible interface
    const walletAdapter = useWalletAdapterCompat(signer, disconnect);

    const visualPipeline = useMemo(
        () =>
            new VisualPipeline('legacy-self-transfer', [
                { name: 'Build transaction', type: 'instruction' },
                { name: 'Self transfer', type: 'transaction' },
            ]),
        [],
    );

    const getExplorerUrl = useCallback(
        (signature: string) => {
            const clusterSlug = cluster?.id?.replace('solana:', '');
            if (!clusterSlug || clusterSlug === 'mainnet' || clusterSlug === 'mainnet-beta') {
                return `https://explorer.solana.com/tx/${signature}`;
            }
            return `https://explorer.solana.com/tx/${signature}?cluster=${clusterSlug}`;
        },
        [cluster?.id],
    );

    const executeSelfTransfer = useCallback(async () => {
        if (!signer || !client) return;
        const walletPublicKey = walletAdapter.publicKey;
        if (!walletPublicKey) return;

        // Get RPC URL from connector client
        const rpcUrl = client.getRpcUrl();
        if (!rpcUrl) throw new Error('No RPC endpoint configured');

        const connection = new Connection(rpcUrl, 'confirmed');

        let sig: string | null = null;
        let typedSignature: ReturnType<typeof createSignature> | null = null;

        try {
            await visualPipeline.execute(async () => {
                visualPipeline.setStepState('Build transaction', { type: 'building' });
                visualPipeline.setStepState('Self transfer', { type: 'building' });

                const senderPubkey = new PublicKey(walletPublicKey);

                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

                // 1 lamport self-transfer (net effect: only pay fees)
                const transferInstruction = SystemProgram.transfer({
                    fromPubkey: senderPubkey,
                    toPubkey: senderPubkey,
                    lamports: 1,
                });

                const transaction = new Transaction({
                    feePayer: senderPubkey,
                    blockhash,
                    lastValidBlockHeight,
                }).add(transferInstruction);

                visualPipeline.setStepState('Self transfer', { type: 'signing' });

                sig = await walletAdapter.sendTransaction(transaction, connection);
                typedSignature = createSignature(sig);

                client.trackTransaction({
                    signature: typedSignature,
                    status: 'pending',
                    method: 'sendTransaction',
                    feePayer: address(walletPublicKey.toString()),
                });

                visualPipeline.setStepState('Build transaction', { type: 'confirmed', signature: sig, cost: 0 });
                visualPipeline.setStepState('Self transfer', { type: 'sending' });

                await waitForSignatureConfirmation({
                    signature: sig,
                    commitment: 'confirmed',
                    getSignatureStatuses: async signature =>
                        await connection.getSignatureStatuses([signature], { searchTransactionHistory: true }),
                });

                visualPipeline.setStepState('Self transfer', { type: 'confirmed', signature: sig, cost: 0.000005 });
                client.updateTransactionStatus(typedSignature, 'confirmed');
            });
        } catch (error) {
            if (typedSignature) {
                client.updateTransactionStatus(
                    typedSignature,
                    'failed',
                    error instanceof Error ? error.message : String(error),
                );
            }
        }
    }, [client, signer, visualPipeline, walletAdapter]);

    const headerAction = useMemo(
        () => (
            <PipelineHeaderButton
                visualPipeline={visualPipeline}
                disabled={!walletAdapter.connected || !client}
                onExecute={executeSelfTransfer}
            />
        ),
        [client, executeSelfTransfer, visualPipeline, walletAdapter.connected],
    );

    useExampleCardHeaderActions(headerAction);

    return (
        <PipelineVisualization visualPipeline={visualPipeline} strategy="sequential" getExplorerUrl={getExplorerUrl} />
    );
}
