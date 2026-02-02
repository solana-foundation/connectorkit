'use client';

import { useCallback, useMemo } from 'react';
import {
    createSolanaRpc,
    pipe,
    createTransactionMessage,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    appendTransactionMessageInstructions,
    sendAndConfirmTransactionFactory,
    signTransactionMessageWithSigners,
    createSolanaRpcSubscriptions,
    lamports,
    assertIsTransactionWithBlockhashLifetime,
    signature as createSignature,
    address,
    type TransactionSigner,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { useKitTransactionSigner, useCluster, useConnectorClient } from '@solana/connector';
import { PipelineHeaderButton, PipelineVisualization } from '@/components/pipeline';
import {
    getBase58SignatureFromSignedTransaction,
    getBase64EncodedWireTransaction,
    getWebSocketUrlForRpcUrl,
    isRpcProxyUrl,
    waitForSignatureConfirmation,
} from './rpc-utils';
import { VisualPipeline } from '@/lib/visual-pipeline';
import { useExampleCardHeaderActions } from '@/components/playground/example-card-actions';

// Destination wallet address
const DESTINATION_ADDRESS = address('A7Xmq3qqt4uvw3GELHw9HHNFbwZzHDJNtmk6fe2p5b5s');

/**
 * Modern Wallet Transfer Component
 *
 * Demonstrates using @solana/kit (web3.js 2.0) to transfer SOL to another wallet.
 * This shows the modern, type-safe approach to Solana development using
 * connector-kit's kit-compatible TransactionSigner.
 */
export function ModernWalletTransfer() {
    const { signer, ready } = useKitTransactionSigner();
    const { cluster } = useCluster();
    const client = useConnectorClient();

    const visualPipeline = useMemo(
        () =>
            new VisualPipeline('modern-wallet-transfer', [
                { name: 'Build instruction', type: 'instruction' },
                { name: 'Transfer SOL', type: 'transaction' },
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

    const executeWalletTransfer = useCallback(async () => {
        if (!signer || !client) return;

        // Get RPC URL from connector client
        const rpcUrl = client.getRpcUrl();
        if (!rpcUrl) throw new Error('No RPC endpoint configured');

        // Create RPC client using web3.js 2.0
        const rpc = createSolanaRpc(rpcUrl);

        let signatureBase58: string | null = null;

        try {
            await visualPipeline.execute(async () => {
                visualPipeline.setStepState('Build instruction', { type: 'building' });
                visualPipeline.setStepState('Transfer SOL', { type: 'building' });

                // Get recent blockhash using web3.js 2.0 RPC
                const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

                // 1 lamport transfer to another wallet
                const amountInLamports = lamports(1n);

                // Create transfer instruction to destination wallet
                const transferInstruction = getTransferSolInstruction({
                    source: signer as TransactionSigner,
                    destination: DESTINATION_ADDRESS,
                    amount: amountInLamports,
                });

                // Build transaction message with fee payer and lifetime
                const transactionMessage = pipe(
                    createTransactionMessage({ version: 0 }),
                    tx => setTransactionMessageFeePayerSigner(signer, tx),
                    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                    tx => appendTransactionMessageInstructions([transferInstruction], tx),
                );

                visualPipeline.setStepState('Transfer SOL', { type: 'signing' });

                const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
                signatureBase58 = getBase58SignatureFromSignedTransaction(signedTransaction);

                // Track transaction in debugger
                client.trackTransaction({
                    signature: createSignature(signatureBase58),
                    status: 'pending',
                    method: 'sendTransaction',
                    feePayer: signer.address,
                });

                visualPipeline.setStepState('Build instruction', {
                    type: 'confirmed',
                    signature: signatureBase58,
                    cost: 0,
                });
                visualPipeline.setStepState('Transfer SOL', { type: 'sending' });

                // Assert transaction has blockhash lifetime (we set it above with setTransactionMessageLifetimeUsingBlockhash)
                assertIsTransactionWithBlockhashLifetime(signedTransaction);

                if (isRpcProxyUrl(rpcUrl)) {
                    // Next.js `/api/rpc` proxy is HTTP-only; confirm via polling (no WebSocket).
                    const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);
                    await rpc.sendTransaction(encodedTransaction, { encoding: 'base64' }).send();
                    await waitForSignatureConfirmation({
                        signature: signatureBase58,
                        commitment: 'confirmed',
                        getSignatureStatuses: async sig =>
                            await rpc.getSignatureStatuses([createSignature(sig)]).send(),
                    });
                } else {
                    const rpcSubscriptions = createSolanaRpcSubscriptions(getWebSocketUrlForRpcUrl(rpcUrl));
                    await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signedTransaction, {
                        commitment: 'confirmed',
                    });
                }

                visualPipeline.setStepState('Transfer SOL', {
                    type: 'confirmed',
                    signature: signatureBase58,
                    cost: 0.000005,
                });
                client.updateTransactionStatus(createSignature(signatureBase58), 'confirmed');
            });
        } catch (error) {
            if (signatureBase58) {
                client.updateTransactionStatus(
                    createSignature(signatureBase58),
                    'failed',
                    error instanceof Error ? error.message : String(error),
                );
            }
        }
    }, [client, signer, visualPipeline]);

    const headerAction = useMemo(
        () => (
            <PipelineHeaderButton
                visualPipeline={visualPipeline}
                disabled={!ready || !client}
                onExecute={executeWalletTransfer}
            />
        ),
        [client, executeWalletTransfer, ready, visualPipeline],
    );

    useExampleCardHeaderActions(headerAction);

    return (
        <PipelineVisualization visualPipeline={visualPipeline} strategy="sequential" getExplorerUrl={getExplorerUrl} />
    );
}
