'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
// TODO FIX THESE ERRORS


import { useState } from 'react';
import { address, createSolanaRpc, signature as createSignature, type Address, pipe, createTransactionMessage, setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash, appendTransactionMessageInstructions, sendAndConfirmTransactionFactory,getSignatureFromTransaction, signTransactionMessageWithSigners, createSolanaRpcSubscriptions } from 'gill';
import { getTransferSolInstruction } from 'gill/programs';
import { useTransactionSigner, useCluster, useConnectorClient } from '@connector-kit/connector';
import { TransactionForm } from './transaction-form';
import { TransactionResult } from './transaction-result';


/**
 * Modern SOL Transfer Component
 * 
 * Demonstrates using @solana/kit (web3.js 2.0) with modular packages.
 * This shows the modern, type-safe approach to Solana development.
 */
export function ModernSolTransfer() {
    const { signer } = useTransactionSigner();
    const { cluster, rpcUrl } = useCluster();
    const client = useConnectorClient();
    const [signature, setSignature] = useState<string | null>(null);

    async function handleTransfer(recipientAddress: string, amount: number) {
        if (!signer || !rpcUrl) {
            throw new Error('Wallet not connected or cluster not selected');
        }

        if (!signer.address) {
            throw new Error('Wallet address not available');
        }

        // Create RPC client using web3.js 2.0
        // this shouldn't happen client-side
        const rpc = createSolanaRpc(rpcUrl);
        const rpcSubscriptions = createSolanaRpcSubscriptions(rpcUrl.replace('http', 'ws'));

        // Create addresses using the new address() API
        const senderAddress = address(signer.address);

        // Get recent blockhash using web3.js 2.0 RPC
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

        // Modern transfer instruction (not used in legacy transaction below, but shown for reference)
        const transferInstruction = getTransferSolInstruction({
            // @ts-expect-error TODO Need to fix the upstream any types
            source: signer, // the upstream types are 'any' - need to fix.
            // should we be using https://github.com/anza-xyz/kit/blob/369898c905f7cd9f715260c2c992cdd1c2946557/packages/react/README.md?plain=1#L96
            destination: address(recipientAddress),
            amount,
        });

        const transactionMessage = pipe(
            createTransactionMessage({ version: 0 }),
            // @ts-expect-error TODO Need to fix the upstream any types
            (tx) => setTransactionMessageFeePayerSigner(signer, tx),
            (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
            (tx) => appendTransactionMessageInstructions([transferInstruction], tx)
        );



        // Sign using the connector-kit signer
        const capabilities = signer.getCapabilities();
        if (!capabilities.canSign) {
            throw new Error('Wallet does not support transaction signing');
        }

        // const signedTx = await signer.signTransaction(transactionMessage);

        // For sending, we'll use the legacy Connection for now since we have a legacy transaction
        // In a fully modern implementation, you'd compile the transaction message and use web3.js 2.0's sendTransaction

        const signedTransaction =
            await signTransactionMessageWithSigners(transactionMessage);
        await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(
            signedTransaction,
            { commitment: "confirmed" }
        );
        const transactionSignature = getSignatureFromTransaction(signedTransaction);


        setSignature(transactionSignature);

        // Track transaction in debugger
        if (client) {
            (client as unknown as {
                trackTransaction: (tx: {
                    signature: string;
                    status: 'pending';
                    method: string;
                    feePayer: Address;
                }) => void;
                updateTransactionStatus: (sig: string, status: string, error?: string) => void;
            }).trackTransaction({
                signature: transactionSignature,
                status: 'pending',
                method: '@solana/kit RPC with legacy signer',
                feePayer: senderAddress,
            });
        }

        // Wait for confirmation using web3.js 2.0 RPC
        try {
            // Poll for confirmation using web3.js 2.0 APIs
            let confirmed = false;
            const maxAttempts = 30;
            let attempts = 0;
            const signatureObj = createSignature(transactionSignature);

            while (!confirmed && attempts < maxAttempts) {
                const { value: statuses } = await rpc.getSignatureStatuses([signatureObj]).send();

                if (statuses[0]?.confirmationStatus === 'confirmed' || statuses[0]?.confirmationStatus === 'finalized') {
                    confirmed = true;
                    break;
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }

            if (!confirmed) {
                throw new Error('Transaction confirmation timeout');
            }

            // Update status to confirmed
            if (client) {
                (client as unknown as {
                    updateTransactionStatus: (sig: string, status: string, error?: string) => void;
                }).updateTransactionStatus(transactionSignature, 'confirmed');
            }
        } catch (confirmError) {
            // Update status to failed if confirmation fails
            if (client) {
                (client as unknown as {
                    updateTransactionStatus: (sig: string, status: string, error?: string) => void;
                }).updateTransactionStatus(transactionSignature, 'failed',
                    confirmError instanceof Error ? confirmError.message : 'Confirmation failed'
                );
            }
            throw confirmError;
        }
    }

    return (
        <div className="space-y-4">
            <TransactionForm
                title="Modern SOL Transfer"
                description="Using modern @solana/kit"
                onSubmit={handleTransfer}
                disabled={!signer}
                defaultRecipient="DemoWa11et1111111111111111111111111111111111"
            />
            {signature && <TransactionResult signature={signature} cluster={cluster?.id || 'devnet'} />}
        </div>
    );
}

