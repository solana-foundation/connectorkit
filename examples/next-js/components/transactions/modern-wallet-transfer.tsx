'use client';

import { useCallback, useMemo } from 'react';
import { address, lamports } from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { useCluster, useConnectorClient } from '@solana/connector';
import { getSolanaExplorerUrl } from '@solana/connector/headless';
import { PipelineHeaderButton, PipelineVisualization } from '@/components/pipeline';
import { Alert } from '@/components/ui/alert';
import { VisualPipeline } from '@/lib/visual-pipeline';
import { useKitClient } from '@/lib/kit-client';
import { useExampleCardHeaderActions } from '@/components/playground/example-card-actions';

// Destination wallet address
const DESTINATION_ADDRESS = address('A7Xmq3qqt4uvw3GELHw9HHNFbwZzHDJNtmk6fe2p5b5s');

/**
 * Modern Wallet Transfer Component
 *
 * Transfers 1 lamport to another wallet with a @solana/kit plugin client. The
 * connected wallet fills the client's payer and identity roles, and
 * `sendTransaction` plans the instruction into a transaction message, estimates
 * its compute budget, signs, sends, and confirms it in one call.
 */
export function ModernWalletTransfer() {
    const { client: kitClient, ready, canSendTransactions } = useKitClient();
    const { cluster } = useCluster();
    const connectorClient = useConnectorClient();

    const visualPipeline = useMemo(
        () =>
            new VisualPipeline('modern-wallet-transfer', [
                { name: 'Build instruction', type: 'instruction' },
                { name: 'Transfer SOL', type: 'transaction' },
            ]),
        [],
    );

    const getExplorerUrl = useCallback(
        (signature: string) => getSolanaExplorerUrl(signature, { cluster: cluster?.id.replace('solana:', '') }),
        [cluster?.id],
    );

    const executeWalletTransfer = useCallback(async () => {
        if (!kitClient) return;

        try {
            await visualPipeline.execute(async () => {
                visualPipeline.setStepState('Build instruction', { type: 'building' });
                visualPipeline.setStepState('Transfer SOL', { type: 'building' });

                const transferInstruction = getTransferSolInstruction({
                    source: kitClient.payer,
                    destination: DESTINATION_ADDRESS,
                    amount: lamports(1n),
                });

                visualPipeline.setStepState('Transfer SOL', { type: 'sending' });

                const { context } = await kitClient.sendTransaction([transferInstruction]);
                const signature = context.signature;

                connectorClient?.trackTransaction({
                    signature,
                    status: 'confirmed',
                    method: 'sendTransaction',
                    feePayer: kitClient.payer.address,
                });

                visualPipeline.setStepState('Build instruction', { type: 'confirmed', signature, cost: 0 });
                visualPipeline.setStepState('Transfer SOL', { type: 'confirmed', signature, cost: 0.000005 });
            });
        } catch {
            // The pipeline marks its own steps as failed and renders the error.
        }
    }, [connectorClient, kitClient, visualPipeline]);

    const headerAction = useMemo(
        () => (
            <PipelineHeaderButton
                visualPipeline={visualPipeline}
                disabled={!ready || !canSendTransactions}
                onExecute={executeWalletTransfer}
            />
        ),
        [canSendTransactions, executeWalletTransfer, ready, visualPipeline],
    );

    useExampleCardHeaderActions(headerAction);

    return (
        <>
            {ready && !canSendTransactions && (
                <Alert className="mb-3">
                    This cluster is served by the HTTP-only <code>/api/rpc</code> proxy, which cannot deliver the
                    signature subscription kit uses to confirm sends. Switch to devnet or testnet to run this example.
                </Alert>
            )}
            <PipelineVisualization
                visualPipeline={visualPipeline}
                strategy="sequential"
                getExplorerUrl={getExplorerUrl}
            />
        </>
    );
}
