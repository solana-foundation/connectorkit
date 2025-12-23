'use client';

import {
    LegacySolTransfer,
    ModernSolTransfer,
    KitSignerDemo,
    ChainUtilitiesDemo,
    ConnectionAbstractionDemo,
} from '@/components/transactions';
import { ExampleCard, type ExampleConfig } from './example-card';

const transactionExamples: ExampleConfig[] = [
    {
        id: 'legacy-sol-transfer',
        name: 'Legacy SOL Transfer',
        description:
            'Transfer SOL using @solana/web3.js v1 with the wallet adapter compatibility layer. Shows how ConnectorKit integrates with existing legacy codebases.',
        code: `import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWalletAdapterCompat } from '@solana/connector/compat';
import { useTransactionSigner, useConnector, useCluster, useConnectorClient } from '@solana/connector';

function LegacySolTransfer() {
    const { signer } = useTransactionSigner();
    const { disconnect } = useConnector();
    const { cluster } = useCluster();
    const client = useConnectorClient();

    // Create wallet adapter compatible interface
    const walletAdapter = useWalletAdapterCompat(signer, disconnect);

    async function handleTransfer(recipient: string, amount: number) {
        const rpcUrl = client.getRpcUrl();
        const connection = new Connection(rpcUrl, 'confirmed');
        
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        const transaction = new Transaction({
            feePayer: new PublicKey(walletAdapter.publicKey),
            blockhash,
            lastValidBlockHeight,
        }).add(
            SystemProgram.transfer({
                fromPubkey: new PublicKey(walletAdapter.publicKey),
                toPubkey: new PublicKey(recipient),
                lamports: amount * LAMPORTS_PER_SOL,
            })
        );

        const signature = await walletAdapter.sendTransaction(transaction, connection);
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
    }

    return <TransactionForm onSubmit={handleTransfer} disabled={!walletAdapter.connected} />;
}`,
        render: () => <LegacySolTransfer />,
    },
    {
        id: 'modern-sol-transfer',
        name: 'Modern SOL Transfer',
        description:
            'Transfer SOL using @solana/kit (web3.js 2.0) with the modern pipe-based transaction builder. Type-safe and fully compatible with Kit signers.',
        code: `import { 
    address, createSolanaRpc, pipe, createTransactionMessage,
    setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash,
    appendTransactionMessageInstructions, signTransactionMessageWithSigners,
    sendAndConfirmTransactionFactory, getSignatureFromTransaction, lamports
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { useKitTransactionSigner, useCluster, useConnectorClient, LAMPORTS_PER_SOL } from '@solana/connector';

function ModernSolTransfer() {
    const { signer, ready } = useKitTransactionSigner();
    const { cluster } = useCluster();
    const client = useConnectorClient();

    async function handleTransfer(recipient: string, amount: number) {
        const rpc = createSolanaRpc(client.getRpcUrl());
        const rpcSubscriptions = createSolanaRpcSubscriptions(client.getRpcUrl().replace('http', 'ws'));
        
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
        
        const transferInstruction = getTransferSolInstruction({
            source: signer,
            destination: address(recipient),
            amount: lamports(BigInt(amount * Number(LAMPORTS_PER_SOL))),
        });

        const transactionMessage = pipe(
            createTransactionMessage({ version: 0 }),
            tx => setTransactionMessageFeePayerSigner(signer, tx),
            tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
            tx => appendTransactionMessageInstructions([transferInstruction], tx),
        );

        const signedTx = await signTransactionMessageWithSigners(transactionMessage);
        await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signedTx, { commitment: 'confirmed' });
    }

    return <TransactionForm onSubmit={handleTransfer} disabled={!ready} />;
}`,
        render: () => <ModernSolTransfer />,
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
import { useConnector, useConnectorClient } from '@solana/connector';

function KitSignerDemo() {
    const { selectedWallet, accounts, selectedAccount, cluster } = useConnector();
    const client = useConnectorClient();
    
    const account = accounts.find(acc => acc.address === selectedAccount)?.raw;

    // Create Kit-compatible signers from wallet
    const kitSigners = useMemo(() => {
        if (!selectedWallet || !account || !cluster) return null;
        const connection = new Connection(client.getRpcUrl());
        return createKitSignersFromWallet(selectedWallet, account, connection);
    }, [selectedWallet, account, cluster, client]);

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
                        Transaction
                    </span>
                </div>
                <h2 className="text-h3 font-diatype-medium text-sand-1500 mb-2">Interactive Real Examples</h2>
                <p className="text-body-lg font-inter text-sand-700 max-w-2xl">
                    Test real-world transactions on devnet or mainnet. Compare legacy web3.js patterns with modern Kit-based
                    approaches using ConnectorKit&apos;s unified signer interface.
                </p>
            </div>

            {/* Transaction Examples */}
            {transactionExamples.map(example => (
                <ExampleCard key={example.id} example={example} requiresConnection={true} />
            ))}
        </section>
    );
}
