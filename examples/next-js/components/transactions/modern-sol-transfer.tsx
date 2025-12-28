'use client';

import { useState } from 'react';
import {
    address,
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
    type TransactionSigner,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { useKitTransactionSigner, useCluster, useConnectorClient, LAMPORTS_PER_SOL } from '@solana/connector';
import { TransactionForm } from './transaction-form';
import { TransactionResult } from './transaction-result';
import {
    getBase58SignatureFromSignedTransaction,
    getBase64EncodedWireTransaction,
    getWebSocketUrlForRpcUrl,
    isRpcProxyUrl,
    waitForSignatureConfirmation,
} from './rpc-utils';

/**
 * Modern SOL Transfer Component
 *
 * Demonstrates using @solana/kit (web3.js 2.0) with modular packages.
 * This shows the modern, type-safe approach to Solana development using
 * connector-kit's kit-compatible TransactionSigner.
 */
export function ModernSolTransfer() {
    const { signer, ready } = useKitTransactionSigner();
    const { cluster } = useCluster();
    const client = useConnectorClient();
    const [signature, setSignature] = useState<string | null>(null);

    async function handleTransfer(recipientAddress: string, amount: number) {
        if (!signer || !client) {
            throw new Error('Wallet not connected or client not available');
        }

        // Get RPC URL from connector client
        const rpcUrl = client.getRpcUrl();
        if (!rpcUrl) {
            throw new Error('No RPC endpoint configured');
        }

        // Create RPC client using web3.js 2.0
        const rpc = createSolanaRpc(rpcUrl);

        // Create addresses using gill's address() API
        const senderAddress = signer.address;

        // Get recent blockhash using web3.js 2.0 RPC
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

        // Convert SOL to lamports using kit's helper and constant
        const amountInLamports = lamports(BigInt(Math.floor(amount * Number(LAMPORTS_PER_SOL))));

        // Create transfer instruction using @solana/kit's modern API
        // Cast to TransactionSigner for compatibility with instruction builders
        const transferInstruction = getTransferSolInstruction({
            source: signer as TransactionSigner,
            destination: address(recipientAddress),
            amount: amountInLamports,
        });

        // Build transaction message with fee payer and lifetime
        const transactionMessage = pipe(
            createTransactionMessage({ version: 0 }),
            tx => setTransactionMessageFeePayerSigner(signer, tx),
            tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
            tx => appendTransactionMessageInstructions([transferInstruction], tx),
        );

        console.log('🚀 Modern SOL Transfer: Starting transaction signing');

        let signedTransaction;
        try {
            signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
            console.log('✅ Modern SOL Transfer: Transaction signed successfully', {
                signatures: Object.keys(signedTransaction.signatures),
            });
        } catch (error) {
            console.error('❌ Modern SOL Transfer: Signing failed', error);
            throw new Error(`Failed to sign transaction: ${error instanceof Error ? error.message : String(error)}`);
        }

        const signatureBase58 = getBase58SignatureFromSignedTransaction(signedTransaction);
        setSignature(signatureBase58);

        // Track transaction in debugger early so it shows up even if confirmation fails later
        client.trackTransaction({
            signature: createSignature(signatureBase58),
            status: 'pending',
            method: 'sendTransaction',
            feePayer: senderAddress,
        });

        console.log('📡 Modern SOL Transfer: Sending and confirming transaction');
        try {
            // Assert transaction has blockhash lifetime (we set it above with setTransactionMessageLifetimeUsingBlockhash)
            assertIsTransactionWithBlockhashLifetime(signedTransaction);

            if (isRpcProxyUrl(rpcUrl)) {
                // Next.js `/api/rpc` proxy is HTTP-only; confirm via polling (no WebSocket).
                const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction);
                await rpc.sendTransaction(encodedTransaction, { encoding: 'base64' }).send();
                await waitForSignatureConfirmation({
                    signature: signatureBase58,
                    commitment: 'confirmed',
                    getSignatureStatuses: async sig => await rpc.getSignatureStatuses([createSignature(sig)]).send(),
                });
            } else {
                const rpcSubscriptions = createSolanaRpcSubscriptions(getWebSocketUrlForRpcUrl(rpcUrl));
                await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signedTransaction, {
                    commitment: 'confirmed',
                });
            }

            console.log('✅ Modern SOL Transfer: Transaction confirmed');
        } catch (error) {
            console.error('❌ Modern SOL Transfer: Send/confirm failed', error);
            client.updateTransactionStatus(
                createSignature(signatureBase58),
                'failed',
                error instanceof Error ? error.message : String(error),
            );
            throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : String(error)}`);
        }

        console.log('🎉 Modern SOL Transfer: Transaction complete!', { signature: signatureBase58 });

        client.updateTransactionStatus(createSignature(signatureBase58), 'confirmed');
    }

    return (
        <div className="space-y-4">
            <TransactionForm
                title="Modern SOL Transfer"
                description="Using modern @solana/kit with gill-compatible signer"
                onSubmit={handleTransfer}
                disabled={!ready}
                defaultRecipient="DemoWa11et1111111111111111111111111111111111"
            />
            {signature && <TransactionResult signature={signature} cluster={cluster?.id || 'devnet'} />}
        </div>
    );
}
