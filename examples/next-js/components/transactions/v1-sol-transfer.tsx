'use client';

import { useCallback, useMemo } from 'react';
import { lamports } from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { useCluster, useConnector, useConnectorClient, walletSupportsTransactionVersion } from '@solana/connector';
import type { TransactionPlannerConfig } from '@solana/connector/kit';
import { getSolanaExplorerUrl } from '@solana/connector/headless';
import { PipelineHeaderButton, PipelineVisualization } from '@/components/pipeline';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VisualPipeline } from '@/lib/visual-pipeline';
import { useKitClient } from '@/lib/kit-client';
import { useExampleCardHeaderActions } from '@/components/playground/example-card-actions';

// Opt the planner into version 1 (SIMD-0296): 4096-byte size limit, resource
// budget embedded in the transaction config. The priority fee is a total
// lamport amount for the transaction — not a micro-lamports-per-CU price as
// in legacy/v0 — and compute/data-size limits are estimated via simulation
// (unset v1 config fields budget zero, not a default).
const V1_TRANSACTION_CONFIG: TransactionPlannerConfig = {
    priorityFeeLamports: lamports(5_000n),
    version: 1,
};

// v1 is live on devnet/testnet; mainnet activation ships with Agave v4.2.
const V1_CLUSTERS = ['solana:devnet', 'solana:testnet', 'solana:localnet'];

/**
 * V1 Self Transfer Component
 *
 * Self-transfers 1 lamport as a version 1 (SIMD-0296) transaction. Identical
 * plumbing to the modern transfer demo, but the kit client's planner is
 * configured with `{ version: 1 }`, and the send button is gated on a cluster
 * where v1 is active and a wallet that advertises v1 support (the burner
 * wallet does; extension wallets don't yet).
 */
export function V1SolTransfer() {
    const {
        client: kitClient,
        ready,
        canSendTransactions,
    } = useKitClient({ transactionConfig: V1_TRANSACTION_CONFIG });
    const { cluster } = useCluster();
    const { connectorId } = useConnector();
    const connectorClient = useConnectorClient();

    const wallet = useMemo(() => {
        if (!connectorClient || !connectorId) return null;
        return connectorClient.getConnector(connectorId);
    }, [connectorClient, connectorId]);

    const clusterSupportsV1 = cluster ? V1_CLUSTERS.includes(cluster.id) : false;
    // The kit client signs via the wallet's solana:signTransaction feature, so
    // gate on that operation's declared versions specifically.
    const walletSupportsV1 = wallet ? walletSupportsTransactionVersion(wallet, 1, 'solana:signTransaction') : false;

    const visualPipeline = useMemo(
        () =>
            new VisualPipeline('v1-self-transfer', [
                { name: 'Build instruction', type: 'instruction' },
                { name: 'v1 self transfer', type: 'transaction' },
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
                visualPipeline.setStepState('v1 self transfer', { type: 'building' });

                // 1 lamport self-transfer (net effect: only pay fees)
                const transferInstruction = getTransferSolInstruction({
                    source: kitClient.payer,
                    destination: kitClient.payer.address,
                    amount: lamports(1n),
                });

                visualPipeline.setStepState('v1 self transfer', { type: 'sending' });

                // The planner compiles a version 1 message, sets the embedded
                // config (CU limit + loaded accounts data size via simulation,
                // priority fee from the client config), signs, sends, confirms.
                const { context } = await kitClient.sendTransaction([transferInstruction]);
                const signature = context.signature;

                connectorClient?.trackTransaction({
                    signature,
                    status: 'confirmed',
                    method: 'sendTransaction',
                    feePayer: kitClient.payer.address,
                });

                visualPipeline.setStepState('Build instruction', { type: 'confirmed', signature, cost: 0 });
                visualPipeline.setStepState('v1 self transfer', { type: 'confirmed', signature, cost: 0.000005 });
            });
        } catch {
            // The pipeline marks its own steps as failed and renders the error.
        }
    }, [connectorClient, kitClient, visualPipeline]);

    const canExecute = ready && canSendTransactions && clusterSupportsV1 && walletSupportsV1;

    const headerAction = useMemo(
        () => (
            <PipelineHeaderButton
                visualPipeline={visualPipeline}
                disabled={!canExecute}
                onExecute={executeSelfTransfer}
            />
        ),
        [canExecute, executeSelfTransfer, visualPipeline],
    );

    useExampleCardHeaderActions(headerAction);

    // At most one gating message, in priority order: cluster, then wallet,
    // then confirmation transport.
    const gateMessage = !clusterSupportsV1 ? (
        <>
            Version 1 transactions are not active on this cluster yet. Switch to devnet or testnet (mainnet activation
            ships with Agave v4.2).
        </>
    ) : !walletSupportsV1 ? (
        <>
            The connected wallet does not advertise v1 transaction support (<code>supportedTransactionVersions</code>).
            Connect the burner wallet to run this example.
        </>
    ) : !canSendTransactions ? (
        <>
            This cluster is served by the HTTP-only <code>/api/rpc</code> proxy, which cannot deliver the signature
            subscription kit uses to confirm sends. Switch to devnet or testnet to run this example.
        </>
    ) : null;

    return (
        <div className="w-full flex flex-col">
            {ready && gateMessage && (
                <Alert className="mb-3">
                    <AlertDescription>{gateMessage}</AlertDescription>
                </Alert>
            )}
            <PipelineVisualization
                visualPipeline={visualPipeline}
                strategy="sequential"
                getExplorerUrl={getExplorerUrl}
            />
        </div>
    );
}
