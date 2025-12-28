'use client';

import { useState } from 'react';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { signature as createSignature, address } from '@solana/kit';
import { useWalletAdapterCompat } from '@solana/connector/compat';
import { useTransactionSigner, useConnector, useCluster, useConnectorClient } from '@solana/connector';
import { TransactionForm } from './transaction-form';
import { TransactionResult } from './transaction-result';
import { waitForSignatureConfirmation } from './rpc-utils';

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
    const [signature, setSignature] = useState<string | null>(null);

    // Create wallet adapter compatible interface
    const walletAdapter = useWalletAdapterCompat(signer, disconnect);

    async function handleTransfer(recipientAddress: string, amount: number) {
        if (!signer || !client) {
            throw new Error('Wallet not connected or client not available');
        }

        if (!walletAdapter.publicKey) {
            throw new Error('Wallet address not available');
        }

        // Get RPC URL from connector client
        const rpcUrl = client.getRpcUrl();
        if (!rpcUrl) {
            throw new Error('No RPC endpoint configured');
        }

        // Create connection to Solana network
        const connection = new Connection(rpcUrl, 'confirmed');

        // Create recipient public key
        const recipientPubkey = new PublicKey(recipientAddress);
        const senderPubkey = new PublicKey(walletAdapter.publicKey);

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        // Create transfer instruction using legacy SystemProgram API
        const transferInstruction = SystemProgram.transfer({
            fromPubkey: senderPubkey,
            toPubkey: recipientPubkey,
            lamports: amount * LAMPORTS_PER_SOL,
        });

        // Build transaction
        const transaction = new Transaction({
            feePayer: senderPubkey,
            blockhash,
            lastValidBlockHeight,
        }).add(transferInstruction);

        // Sign and send using wallet adapter compat layer
        const sig = await walletAdapter.sendTransaction(transaction, connection);
        const typedSignature = createSignature(sig);

        setSignature(sig);

        // Track transaction in debugger
        if (client) {
            client.trackTransaction({
                signature: typedSignature,
                status: 'pending' as const,
                method: 'sendTransaction',
                feePayer: address(walletAdapter.publicKey),
            });
        }

        // Wait for confirmation via HTTP polling (works with the Next.js `/api/rpc` proxy which has no WebSocket server)
        try {
            await waitForSignatureConfirmation({
                signature: sig,
                commitment: 'confirmed',
                getSignatureStatuses: async signature =>
                    await connection.getSignatureStatuses([signature], { searchTransactionHistory: true }),
            });

            // Update status to confirmed
            if (client) {
                client.updateTransactionStatus(typedSignature, 'confirmed');
            }
        } catch (confirmError) {
            // Update status to failed if confirmation fails
            if (client) {
                client.updateTransactionStatus(
                    typedSignature,
                    'failed',
                    confirmError instanceof Error ? confirmError.message : 'Confirmation failed',
                );
            }
            throw confirmError;
        }
    }

    return (
        <div className="space-y-4">
            <TransactionForm
                title="Legacy SOL Transfer"
                description="Using @solana/web3.js with wallet adapter compat layer"
                onSubmit={handleTransfer}
                disabled={!walletAdapter.connected}
                defaultRecipient="DemoWa11et1111111111111111111111111111111111"
            />
            {signature && <TransactionResult signature={signature} cluster={cluster?.id || 'devnet'} />}
        </div>
    );
}
