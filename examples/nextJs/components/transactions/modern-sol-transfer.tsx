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
    getSignatureFromTransaction,
    signTransactionMessageWithSigners,
    createSolanaRpcSubscriptions,
    lamports,
    LAMPORTS_PER_SOL,
} from 'gill';
import { getTransferSolInstruction } from 'gill/programs';
import { useGillTransactionSigner, useCluster, useConnectorClient } from '@connector-kit/connector';
import { TransactionForm } from './transaction-form';
import { TransactionResult } from './transaction-result';

/**
 * Modern SOL Transfer Component
 *
 * Demonstrates using @solana/kit (web3.js 2.0) with modular packages.
 * This shows the modern, type-safe approach to Solana development using
 * connector-kit's gill-compatible TransactionSigner.
 */
export function ModernSolTransfer() {
    const { signer, ready } = useGillTransactionSigner();
    const { cluster, rpcUrl } = useCluster();
    const client = useConnectorClient();
    const [signature, setSignature] = useState<string | null>(null);

    async function handleTransfer(recipientAddress: string, amount: number) {
        if (!signer || !rpcUrl) {
            throw new Error('Wallet not connected or cluster not selected');
        }

        // Create RPC client using web3.js 2.0
        // this shouldn't happen client-side
        const rpc = createSolanaRpc(rpcUrl);
        const rpcSubscriptions = createSolanaRpcSubscriptions(rpcUrl.replace('http', 'ws'));

        // Create addresses using gill's address() API
        const senderAddress = signer.address;

        // Get recent blockhash using web3.js 2.0 RPC
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

        // Convert SOL to lamports using gill's helper and constant
        const amountInLamports = lamports(BigInt(Math.floor(amount * Number(LAMPORTS_PER_SOL))));

        // Create transfer instruction using gill's modern API
        // Now fully type-safe with gill-compatible signer!
        const transferInstruction = getTransferSolInstruction({
            source: signer,
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

        console.log('📡 Modern SOL Transfer: Sending and confirming transaction');
        try {
            await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signedTransaction, {
                commitment: 'confirmed',
            });
            console.log('✅ Modern SOL Transfer: Transaction confirmed');
        } catch (error) {
            console.error('❌ Modern SOL Transfer: Send/confirm failed', error);
            throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : String(error)}`);
        }

        const transactionSignature = getSignatureFromTransaction(signedTransaction);
        setSignature(transactionSignature);
        console.log('🎉 Modern SOL Transfer: Transaction complete!', { signature: transactionSignature });

        // Track transaction in debugger
        if (client) {
            client.trackTransaction({
                signature: transactionSignature,
                status: 'confirmed',
                method: '@solana/kit with gill-compatible signer',
                feePayer: senderAddress,
            });
        }
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
