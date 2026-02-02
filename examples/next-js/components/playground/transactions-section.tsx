'use client';

import {
    LegacySolTransfer,
    ModernSolTransfer,
    ModernWalletTransfer,
    TitanSwap,
    titanSwapCode,
    KitSignerDemo,
    ChainUtilitiesDemo,
    ConnectionAbstractionDemo,
} from '@/components/transactions';
import { ExampleCard, type ExampleConfig } from './example-card';

const transactionExamples: ExampleConfig[] = [
    {
        id: 'legacy-sol-transfer',
        name: 'Legacy Self Transfer',
        description: 'Self-transfer 1 lamport using @solana/web3.js v1 with the wallet adapter compatibility layer.',
        fileName: 'components/transactions/legacy-sol-transfer.tsx',
        code: `'use client';

import { useCallback, useMemo } from 'react';
import { Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { signature as createSignature, address } from '@solana/kit';
import { useWalletAdapterCompat } from '@solana/connector/compat';
import { useTransactionSigner, useConnector, useCluster, useConnectorClient } from '@solana/connector';
import { PipelineHeaderButton, PipelineVisualization } from '@/components/pipeline';
import { VisualPipeline } from '@/lib/visual-pipeline';
import { waitForSignatureConfirmation } from './rpc-utils';
import { useExampleCardHeaderActions } from '@/components/playground/example-card-actions';

export function LegacySolTransfer() {
    const { signer } = useTransactionSigner();
    const { disconnectWallet } = useConnector();
    const { cluster } = useCluster();
    const client = useConnectorClient();

    // Create wallet adapter compatible interface
    const walletAdapter = useWalletAdapterCompat(signer, disconnectWallet);

    const visualPipeline = useMemo(
        () =>
            new VisualPipeline('legacy-self-transfer', [
                { name: 'Build transaction', type: 'instruction' },
                { name: 'Self transfer', type: 'transaction' },
            ]),
        [],
    );

    const getExplorerUrl = useCallback(
        (sig: string) => {
            const clusterSlug = cluster?.id?.replace('solana:', '');
            if (!clusterSlug || clusterSlug === 'mainnet' || clusterSlug === 'mainnet-beta') {
                return 'https://explorer.solana.com/tx/' + sig;
            }
            return 'https://explorer.solana.com/tx/' + sig + '?cluster=' + clusterSlug;
        },
        [cluster?.id],
    );

    const executeSelfTransfer = useCallback(async () => {
        if (!signer || !client) return;
        const walletPublicKey = walletAdapter.publicKey;
        if (!walletPublicKey) return;

        const rpcUrl = client.getRpcUrl();
        if (!rpcUrl) throw new Error('No RPC endpoint configured');

        const connection = new Connection(rpcUrl, 'confirmed');

        let sig: string | null = null;
        let typedSignature: ReturnType<typeof createSignature> | null = null;

        await visualPipeline.execute(async () => {
            visualPipeline.setStepState('Build transaction', { type: 'building' });
            visualPipeline.setStepState('Self transfer', { type: 'building' });

            const senderPubkey = new PublicKey(walletPublicKey);
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

            const transaction = new Transaction({
                feePayer: senderPubkey,
                blockhash,
                lastValidBlockHeight,
            }).add(
                SystemProgram.transfer({
                    fromPubkey: senderPubkey,
                    toPubkey: senderPubkey,
                    lamports: 1,
                }),
            );

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
    }, [client, signer, visualPipeline, walletAdapter]);

    useExampleCardHeaderActions(
        <PipelineHeaderButton
            visualPipeline={visualPipeline}
            disabled={!walletAdapter.connected || !client}
            onExecute={executeSelfTransfer}
        />,
    );

    return (
        <PipelineVisualization visualPipeline={visualPipeline} strategy="sequential" getExplorerUrl={getExplorerUrl} />
    );
}`,
        render: () => <LegacySolTransfer />,
    },
    {
        id: 'modern-sol-transfer',
        name: 'Modern Self Transfer',
        description: 'Self-transfer 1 lamport using @solana/kit with a kit-compatible signer.',
        fileName: 'components/transactions/modern-sol-transfer.tsx',
        code: `'use client';

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
    type TransactionSigner,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { useKitTransactionSigner, useCluster, useConnectorClient } from '@solana/connector';
import { PipelineHeaderButton, PipelineVisualization } from '@/components/pipeline';
import { VisualPipeline } from '@/lib/visual-pipeline';
import { useExampleCardHeaderActions } from '@/components/playground/example-card-actions';
import {
    getBase58SignatureFromSignedTransaction,
    getBase64EncodedWireTransaction,
    getWebSocketUrlForRpcUrl,
    isRpcProxyUrl,
    waitForSignatureConfirmation,
} from './rpc-utils';

export function ModernSolTransfer() {
    const { signer, ready } = useKitTransactionSigner();
    const { cluster } = useCluster();
    const client = useConnectorClient();

    const visualPipeline = useMemo(
        () =>
            new VisualPipeline('modern-self-transfer', [
                { name: 'Build instruction', type: 'instruction' },
                { name: 'Self transfer', type: 'transaction' },
            ]),
        [],
    );

    const getExplorerUrl = useCallback(
        (sig: string) => {
            const clusterSlug = cluster?.id?.replace('solana:', '');
            if (!clusterSlug || clusterSlug === 'mainnet' || clusterSlug === 'mainnet-beta') {
                return 'https://explorer.solana.com/tx/' + sig;
            }
            return 'https://explorer.solana.com/tx/' + sig + '?cluster=' + clusterSlug;
        },
        [cluster?.id],
    );

    const executeSelfTransfer = useCallback(async () => {
        if (!signer || !client) return;

        const rpcUrl = client.getRpcUrl();
        if (!rpcUrl) throw new Error('No RPC endpoint configured');
        const rpc = createSolanaRpc(rpcUrl);

        let signatureBase58: string | null = null;

        await visualPipeline.execute(async () => {
            visualPipeline.setStepState('Build instruction', { type: 'building' });
            visualPipeline.setStepState('Self transfer', { type: 'building' });

            const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
            const transferInstruction = getTransferSolInstruction({
                source: signer as TransactionSigner,
                destination: signer.address,
                amount: lamports(1n),
            });

            const transactionMessage = pipe(
                createTransactionMessage({ version: 0 }),
                tx => setTransactionMessageFeePayerSigner(signer, tx),
                tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                tx => appendTransactionMessageInstructions([transferInstruction], tx),
            );

            visualPipeline.setStepState('Self transfer', { type: 'signing' });

            const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
            signatureBase58 = getBase58SignatureFromSignedTransaction(signedTransaction);

            visualPipeline.setStepState('Build instruction', { type: 'confirmed', signature: signatureBase58, cost: 0 });
            visualPipeline.setStepState('Self transfer', { type: 'sending' });

            assertIsTransactionWithBlockhashLifetime(signedTransaction);

            if (isRpcProxyUrl(rpcUrl)) {
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

            visualPipeline.setStepState('Self transfer', { type: 'confirmed', signature: signatureBase58, cost: 0.000005 });
        });
    }, [client, signer, visualPipeline]);

    useExampleCardHeaderActions(
        <PipelineHeaderButton visualPipeline={visualPipeline} disabled={!ready || !client} onExecute={executeSelfTransfer} />,
    );

    return (
        <PipelineVisualization visualPipeline={visualPipeline} strategy="sequential" getExplorerUrl={getExplorerUrl} />
    );
}`,
        render: () => <ModernSolTransfer />,
    },
    {
        id: 'modern-wallet-transfer',
        name: 'Modern Wallet Transfer',
        description: 'Transfer 1 lamport to another wallet using @solana/kit with a kit-compatible signer.',
        fileName: 'components/transactions/modern-wallet-transfer.tsx',
        code: `'use client';

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
import { VisualPipeline } from '@/lib/visual-pipeline';
import { useExampleCardHeaderActions } from '@/components/playground/example-card-actions';
import {
    getBase58SignatureFromSignedTransaction,
    getBase64EncodedWireTransaction,
    getWebSocketUrlForRpcUrl,
    isRpcProxyUrl,
    waitForSignatureConfirmation,
} from './rpc-utils';

// Destination wallet address
const DESTINATION_ADDRESS = address('A7Xmq3qqt4uvw3GELHw9HHNFbwZzHDJNtmk6fe2p5b5s');

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
        (sig: string) => {
            const clusterSlug = cluster?.id?.replace('solana:', '');
            if (!clusterSlug || clusterSlug === 'mainnet' || clusterSlug === 'mainnet-beta') {
                return 'https://explorer.solana.com/tx/' + sig;
            }
            return 'https://explorer.solana.com/tx/' + sig + '?cluster=' + clusterSlug;
        },
        [cluster?.id],
    );

    const executeWalletTransfer = useCallback(async () => {
        if (!signer || !client) return;

        const rpcUrl = client.getRpcUrl();
        if (!rpcUrl) throw new Error('No RPC endpoint configured');
        const rpc = createSolanaRpc(rpcUrl);

        let signatureBase58: string | null = null;

        await visualPipeline.execute(async () => {
            visualPipeline.setStepState('Build instruction', { type: 'building' });
            visualPipeline.setStepState('Transfer SOL', { type: 'building' });

            const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
            
            // Transfer to another wallet instead of self
            const transferInstruction = getTransferSolInstruction({
                source: signer as TransactionSigner,
                destination: DESTINATION_ADDRESS,
                amount: lamports(1n),
            });

            const transactionMessage = pipe(
                createTransactionMessage({ version: 0 }),
                tx => setTransactionMessageFeePayerSigner(signer, tx),
                tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
                tx => appendTransactionMessageInstructions([transferInstruction], tx),
            );

            visualPipeline.setStepState('Transfer SOL', { type: 'signing' });

            const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
            signatureBase58 = getBase58SignatureFromSignedTransaction(signedTransaction);

            visualPipeline.setStepState('Build instruction', { type: 'confirmed', signature: signatureBase58, cost: 0 });
            visualPipeline.setStepState('Transfer SOL', { type: 'sending' });

            assertIsTransactionWithBlockhashLifetime(signedTransaction);

            if (isRpcProxyUrl(rpcUrl)) {
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

            visualPipeline.setStepState('Transfer SOL', { type: 'confirmed', signature: signatureBase58, cost: 0.000005 });
        });
    }, [client, signer, visualPipeline]);

    useExampleCardHeaderActions(
        <PipelineHeaderButton visualPipeline={visualPipeline} disabled={!ready || !client} onExecute={executeWalletTransfer} />,
    );

    return (
        <PipelineVisualization visualPipeline={visualPipeline} strategy="sequential" getExplorerUrl={getExplorerUrl} />
    );
}`,
        render: () => <ModernWalletTransfer />,
    },
    {
        id: 'titan-swap',
        name: 'Titan Swap (SOL → USDC)',
        description: 'Swap 0.01 SOL for USDC using Titan InstructionPlans and track the transaction(s) in Connector Devtools.',
        fileName: 'components/transactions/titan-swap.tsx',
        code: titanSwapCode,
        render: () => <TitanSwap />,
    },
    {
        id: 'kit-signer',
        name: 'Kit Signers',
        description:
            'Create framework-agnostic signers from wallet connections. Supports both transaction signing and message signing with modern Kit APIs.',
        code: `import { 
    createKitSignersFromWallet, 
    createMessageSignerFromWallet, 
    createSignableMessage 
} from '@solana/connector/headless';
import { useConnector, useCluster, useConnectorClient } from '@solana/connector';
import { Connection } from '@solana/web3.js';
import { useMemo } from 'react';

function KitSignerDemo() {
    const { walletStatus, connectorId } = useConnector();
    const { cluster } = useCluster();
    const client = useConnectorClient();
    
    // Get the active connector instance (Wallet Standard)
    const wallet = useMemo(() => {
        if (!client || !connectorId) return null;
        return client.getConnector(connectorId);
    }, [client, connectorId]);

    // Wallet Standard account (only available when connected)
    const account = walletStatus.status === 'connected'
        ? walletStatus.session.selectedAccount.account
        : null;

    // Create Kit-compatible signers from wallet
    const kitSigners = useMemo(() => {
        if (!wallet || !account || !cluster || !client) return null;
        const rpcUrl = client.getRpcUrl();
        const connection = rpcUrl ? new Connection(rpcUrl) : null;
        return createKitSignersFromWallet(wallet, account, connection, undefined);
    }, [wallet, account, cluster, client]);

    async function signMessage(message: string) {
        if (!kitSigners?.messageSigner) return;
        
        const messageBytes = new TextEncoder().encode(message);
        const signableMessage = createSignableMessage(messageBytes);
        const signedMessages = await kitSigners.messageSigner.modifyAndSignMessages([signableMessage]);
        
        return signedMessages[0].signatures;
    }

    return (
        <div>
            <input onChange={(e) => setMessage(e.target.value)} />
            <button onClick={() => signMessage(message)}>Sign</button>
        </div>
    );
}`,
        render: () => <KitSignerDemo />,
    },
    {
        id: 'chain-utilities',
        name: 'Chain Utilities',
        description:
            'Convert between Wallet Standard chain IDs and cluster types. Bidirectional utilities for working with different network identifiers.',
        code: `import { useConnector } from '@solana/connector';
import {
    getChainIdFromCluster,
    getClusterTypeFromChainId,
    getClusterIdFromChainId,
    isSolanaChain,
    isKnownSolanaChain,
    SOLANA_CHAIN_IDS,
} from '@solana/connector/headless';

function ChainUtilitiesDemo() {
    const { cluster, clusters } = useConnector();

    // Get chain ID from current cluster
    const currentChainId = cluster ? getChainIdFromCluster(cluster) : null;
    
    // Get cluster type from chain ID
    const currentClusterType = currentChainId 
        ? getClusterTypeFromChainId(currentChainId) 
        : null;

    // All standard chain IDs
    const allChainIds = Object.values(SOLANA_CHAIN_IDS);
    // { mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', devnet: '...', testnet: '...' }

    return (
        <div>
            <p>Current Chain: {currentChainId}</p>
            <p>Cluster Type: {currentClusterType}</p>
            <p>Is Solana Chain: {isSolanaChain(currentChainId)}</p>
        </div>
    );
}`,
        render: () => <ChainUtilitiesDemo />,
    },
    {
        id: 'connection-abstraction',
        name: 'Connection Abstraction',
        description:
            'Dual-architecture helpers that work with both legacy @solana/web3.js Connection and modern @solana/kit Rpc clients.',
        code: `import { useConnectorClient } from '@solana/connector';
import { getLatestBlockhash, isLegacyConnection, isKitConnection } from '@solana/connector/headless';
import { createSolanaRpc } from '@solana/kit';
import { Connection } from '@solana/web3.js';

function ConnectionAbstractionDemo() {
    const client = useConnectorClient();

    // Works with legacy Connection
    async function getBlockhashLegacy() {
        const connection = new Connection(client.getRpcUrl(), 'confirmed');
        console.log('Is Legacy:', isLegacyConnection(connection)); // true
        
        // Same helper works with both connection types!
        return await getLatestBlockhash(connection, 'confirmed');
    }

    // Works with Kit Rpc
    async function getBlockhashKit() {
        const rpc = createSolanaRpc(client.getRpcUrl());
        console.log('Is Kit:', isKitConnection(rpc)); // true
        
        // Same helper, different connection type
        return await getLatestBlockhash(rpc, 'confirmed');
    }

    return (
        <div>
            <button onClick={getBlockhashLegacy}>Legacy</button>
            <button onClick={getBlockhashKit}>Kit</button>
        </div>
    );
}`,
        render: () => <ConnectionAbstractionDemo />,
    },
];

export function TransactionsSection() {
    return (
        <section>
            {/* Section Header */}
            <div
                className="px-4 lg:px-6 py-8 border-b border-sand-200"
                style={{
                    backgroundImage: `repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 10px,
                        rgba(233, 231, 222, 0.5) 10px,
                        rgba(233, 231, 222, 0.5) 11px
                    )`,
                }}
            >
                <div className="inline-flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-rose-200 text-rose-900 text-xs font-inter-medium rounded">
                        Testing 1, 2, 3
                    </span>
                </div>
                <h2 className="text-h3 font-diatype-medium text-sand-1500 mb-2">Real Transaction Examples</h2>
                <p className="text-body-lg font-inter text-sand-700 max-w-2xl">
                    Test real-world transactions on devnet or mainnet. Compare legacy web3.js patterns with modern
                    Kit-based approaches using ConnectorKit&apos;s unified signer interface.
                </p>
            </div>

            {/* Transaction Examples */}
            {transactionExamples.map(example => (
                <ExampleCard key={example.id} example={example} requiresConnection={true} />
            ))}
        </section>
    );
}
