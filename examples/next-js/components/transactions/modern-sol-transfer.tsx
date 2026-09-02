'use client';

import { useCallback, useMemo } from 'react';
import { lamports } from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { useCluster, useConnectorClient } from '@solana/connector';
import { getSolanaExplorerUrl } from '@solana/connector/headless';
import { PipelineHeaderButton, PipelineVisualization } from '@/components/pipeline';
import { Alert } from '@/components/ui/alert';
import { VisualPipeline } from '@/lib/visual-pipeline';
import { useKitClient } from '@/lib/kit-client';
import { useExampleCardHeaderActions } from '@/components/playground/example-card-actions';

/**
 * Modern Self Transfer Component
 *
 * Self-transfers 1 lamport with a @solana/kit plugin client. The connected
 * wallet fills the client's payer and identity roles, and `sendTransaction`
 * plans the instruction into a transaction message, estimates its compute
 * budget, signs, sends, and confirms it in one call.
 */
export function ModernSolTransfer() {
    const { client: kitClient, ready, canSendTransactions } = useKitClient();
    const { cluster } = useCluster();
    const connectorClient = useConnectorClient();

    const visualPipeline = useMemo(
        () =>
            new VisualPipeline('modern-self-transfer', [
                { name: 'Build instruction', type: 'instruction' },
                { name: 'Self transfer', type: 'transaction' },
            ]),
        [],
    );

    const getExplorerUrl = useCallback(
        (signature: string) => getSolanaExplorerUrl(signature, { cluster: cluster?.id.replace('solana:', '') }),
        [cluster?.id],
    );

    const executeSelfTransfer = useCallback(async () => {
        if (!kitClient) return;

        try {
            await visualPipeline.execute(async () => {
                visualPipeline.setStepState('Build instruction', { type: 'building' });
                visualPipeline.setStepState('Self transfer', { type: 'building' });

                // 1 lamport self-transfer (net effect: only pay fees)
                const transferInstruction = getTransferSolInstruction({
                    source: kitClient.payer,
                    destination: kitClient.payer.address,
                    amount: lamports(1n),
                });

                visualPipeline.setStepState('Self transfer', { type: 'sending' });

                const { context } = await kitClient.sendTransaction([transferInstruction]);
                const signature = context.signature;

                connectorClient?.trackTransaction({
                    signature,
                    status: 'confirmed',
                    method: 'sendTransaction',
                    feePayer: kitClient.payer.address,
                });

                visualPipeline.setStepState('Build instruction', { type: 'confirmed', signature, cost: 0 });
                visualPipeline.setStepState('Self transfer', { type: 'confirmed', signature, cost: 0.000005 });
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
                onExecute={executeSelfTransfer}
            />
        ),
        [canSendTransactions, executeSelfTransfer, ready, visualPipeline],
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
