'use client';

import { useCallback, useMemo } from 'react';
import { TransactionBuilder, diagnoseError } from '@pipeit/core';
import { getTitanSwapPlan, titanInstructionToKit } from '@pipeit/actions/titan';
import { createSolanaRpc, signature as createSignature } from '@solana/kit';
import { useKitTransactionSigner, useCluster, useConnectorClient } from '@solana/connector';
import { PipelineHeaderButton, PipelineVisualization } from '@/components/pipeline';
import { VisualPipeline } from '@/lib/visual-pipeline';
import { useExampleCardHeaderActions } from '@/components/playground/example-card-actions';
import { waitForSignatureConfirmation } from './rpc-utils';

// Token addresses
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Proxy through Next.js API route to avoid CORS (add ?region=jp1 or ?region=de1 to switch)
const TITAN_PROXY_URL = '/api/titan';

/**
 * Example: Titan Swap using @pipeit/actions
 *
 * This demonstrates using the new InstructionPlan-first approach with Titan,
 * including ALT (Address Lookup Table) support for optimal transaction packing.
 */
export function TitanSwap() {
    const { signer, ready } = useKitTransactionSigner();
    const { cluster } = useCluster();
    const client = useConnectorClient();

    const visualPipeline = useMemo(
        () =>
            new VisualPipeline('titan-swap', [
                { name: 'Build swap plan', type: 'instruction' },
                { name: 'Swap transaction', type: 'transaction' },
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

    const executeSwap = useCallback(async () => {
        if (!signer || !client) return;

        const rpcUrl = client.getRpcUrl();
        if (!rpcUrl) throw new Error('No RPC endpoint configured');

        const rpc = createSolanaRpc(rpcUrl);
        let signatureBase58: string | null = null;
        let typedSignature: ReturnType<typeof createSignature> | null = null;

        try {
            await visualPipeline.execute(async () => {
                visualPipeline.setStepState('Build swap plan', { type: 'building' });
                visualPipeline.setStepState('Swap transaction', { type: 'building' });

                const swapResult = await getTitanSwapPlan(
                    {
                        swap: {
                            inputMint: SOL_MINT,
                            outputMint: USDC_MINT,
                            amount: 10_000_000n, // 0.01 SOL
                            slippageBps: 50,
                        },
                        transaction: {
                            userPublicKey: signer.address,
                            createOutputTokenAccount: true,
                        },
                    },
                    {
                        clientConfig: { baseUrl: TITAN_PROXY_URL },
                    },
                );

                const instructions = swapResult.route.instructions.map(titanInstructionToKit);
                const computeUnitsSafe = swapResult.route.computeUnitsSafe
                    ? Number(swapResult.route.computeUnitsSafe)
                    : 400_000;
                const computeUnits = Math.min(Math.max(computeUnitsSafe, 200_000), 1_400_000);

                visualPipeline.setStepState('Swap transaction', { type: 'signing' });

                const exportedTransaction = await new TransactionBuilder({
                    rpc,
                    computeUnits,
                    priorityFee: 'none',
                    autoRetry: false,
                    lookupTableAddresses: swapResult.lookupTableAddresses.length > 0 ? swapResult.lookupTableAddresses : undefined,
                })
                    .setFeePayerSigner(signer)
                    .addInstructions(instructions)
                    .export('base64');

                if (exportedTransaction.format !== 'base64') throw new Error('Unexpected transaction export format');

                visualPipeline.setStepState('Swap transaction', { type: 'sending' });

                const sentSignature = await rpc.sendTransaction(exportedTransaction.data, { encoding: 'base64' }).send();
                signatureBase58 = String(sentSignature);
                typedSignature = createSignature(signatureBase58);

                client.trackTransaction({
                    signature: typedSignature,
                    status: 'pending',
                    method: 'sendTransaction',
                    feePayer: signer.address,
                });

                // We can show the signature immediately; confirmation happens next.
                visualPipeline.setStepState('Build swap plan', { type: 'confirmed', signature: signatureBase58, cost: 0 });

                await waitForSignatureConfirmation({
                    signature: signatureBase58,
                    commitment: 'confirmed',
                    getSignatureStatuses: async sig => await rpc.getSignatureStatuses([createSignature(sig)]).send(),
                });

                visualPipeline.setStepState('Swap transaction', { type: 'confirmed', signature: signatureBase58, cost: 0 });
                client.updateTransactionStatus(typedSignature, 'confirmed');
            });
        } catch (error) {
            const diagnosis = diagnoseError(error);
            console.error('[TitanSwap] failed', diagnosis, error);
            if (typedSignature) {
                client.updateTransactionStatus(typedSignature, 'failed', diagnosis.summary);
            }
        }
    }, [client, signer, visualPipeline]);

    const headerAction = useMemo(
        () => (
            <PipelineHeaderButton visualPipeline={visualPipeline} disabled={!ready || !client} onExecute={executeSwap} />
        ),
        [client, executeSwap, ready, visualPipeline],
    );

    useExampleCardHeaderActions(headerAction);

    return <PipelineVisualization visualPipeline={visualPipeline} strategy="sequential" getExplorerUrl={getExplorerUrl} />;
}

export const titanSwapCode = `import { getTitanSwapPlan, TITAN_DEMO_BASE_URLS } from '@pipeit/actions/titan'
import { TransactionBuilder } from '@pipeit/core'
import { titanInstructionToKit } from '@pipeit/actions/titan'

// Token addresses
const SOL = 'So11111111111111111111111111111111111111112'
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

// Server-side: use Titan directly
// const titanBaseUrl = TITAN_DEMO_BASE_URLS.us1
// Browser: proxy through your API to avoid CORS
const titanBaseUrl = '/api/titan'

// Get a swap plan from Titan
// Returns an InstructionPlan + ALT addresses for compression
const { route, lookupTableAddresses, quote, providerId } = await getTitanSwapPlan(
  {
    swap: {
      inputMint: SOL,
      outputMint: USDC,
      amount: 10_000_000n, // 0.01 SOL in lamports
      slippageBps: 50,     // 0.5% slippage tolerance
    },
    transaction: {
      userPublicKey: signer.address,
      createOutputTokenAccount: true,
    },
  },
  {
    clientConfig: { baseUrl: titanBaseUrl },
  },
)

console.log(\`Swapping for ~\${quote.outputAmount} USDC via \${providerId}\`)

const instructions = route.instructions.map(titanInstructionToKit)

const exported = await new TransactionBuilder({
  rpc,
  computeUnits: 400_000,
  priorityFee: 'none',
  lookupTableAddresses,
})
  .setFeePayerSigner(signer)
  .addInstructions(instructions)
  .export('base64')

// Send + confirm without WebSocket subscriptions
const signature = await rpc.sendTransaction(exported.data, { encoding: 'base64' }).send()

console.log('Swap executed:', signature)`;
