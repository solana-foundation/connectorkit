<script lang="ts">
  import { 
    useConnector, 
    useConnectorClient, 
    useAccount,
    useWalletInfo,
    useCluster,
    useBalance,
    useTokens,
    useTransactions,
    useTransactionSigner,
    useKitTransactionSigner
  } from '@solana/connector/svelte';
  
  import { 
    address, 
    createSolanaRpc, 
    createSolanaRpcSubscriptions, 
    pipe, 
    createTransactionMessage, 
    setTransactionMessageFeePayerSigner, 
    setTransactionMessageLifetimeUsingBlockhash, 
    appendTransactionMessageInstructions, 
    signTransactionMessageWithSigners, 
    sendAndConfirmTransactionFactory, 
    getSignatureFromTransaction, 
    lamports 
  } from "@solana/kit";
  import { getTransferSolInstruction } from '@solana-program/system';

  const { connected, select, disconnect, wallets } = useConnector();
  const client = useConnectorClient();
  const { cluster, clusters, setCluster } = useCluster();

  const { formatted, address: userAddress, copy, copied } = useAccount();
  const { name: walletName, icon: walletIcon } = useWalletInfo();

  const { formattedSol, solBalance, refetch: refetchBalance, isLoading: balanceLoading } = useBalance({ refetchIntervalMs: 30000 });
  const { tokens, isLoading: tokensLoading } = useTokens();
  const { transactions, isLoading: txsLoading, refetch: refetchTxs } = useTransactions({ limit: 5 });

  const { signer: legacySigner } = useTransactionSigner(); // Legacy Interface
  const { signer: kitSigner } = useKitTransactionSigner(); // Modern Interface

  let recipient = '';
  let amount = 0.001;
  let status = '';
  let lastSignature = '';
  let isProcessing = false;

  
  async function handleSendTransaction() {
    if (!$kitSigner || !$userAddress) return;
    try {
      isProcessing = true;
      status = 'Preparing Transaction...';
      
      const rpcUrl = client.getRpcUrl();
      if (!rpcUrl) throw new Error("No RPC URL");
      
      const rpc = createSolanaRpc(rpcUrl);
      const rpcSubscriptions = createSolanaRpcSubscriptions(rpcUrl.replace('http', 'ws'));
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      const transferIx = getTransferSolInstruction({
        source: $kitSigner, 
        destination: address(recipient || $userAddress), // Send to self if empty
        amount: lamports(BigInt(Math.floor(amount * 1_000_000_000))),
      });

      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (tx: any) => setTransactionMessageFeePayerSigner($kitSigner, tx),
        (tx: any) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx: any) => appendTransactionMessageInstructions([transferIx], tx)
      );

      status = 'Signing...';
      const signedTx = await signTransactionMessageWithSigners(message as any);

      status = 'Sending...';
      const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });
      await sendAndConfirm(signedTx as any, { commitment: 'confirmed' } as any);

      lastSignature = getSignatureFromTransaction(signedTx);
      status = 'Confirmed!';
      
      refetchBalance();
      refetchTxs();
    } catch (e: any) {
      console.error(e);
      status = `Error: ${e.message}`;
    } finally {
      isProcessing = false;
    }
  }

  async function handleSignMessage() {
    if (!$legacySigner?.signMessage) {
        status = "Wallet does not support message signing";
        return;
    }
    try {
        isProcessing = true;
        const msg = new TextEncoder().encode(`Hello ConnectorKit! ${Date.now()}`);
        const sig = await $legacySigner.signMessage(msg);
        console.log('Message Signature:', sig);
        status = 'Message Signed (See Console)';
    } catch (e: any) {
        status = `Sign Error: ${e.message}`;
    } finally {
        isProcessing = false;
    }
  }
</script>

<div class="app-container">
  <header>
    <h1>ConnectorKit Svelte</h1>
    <div class="cluster-select">
      <select 
        value={$cluster?.id} 
        on:change={(e) => setCluster(e.currentTarget.value as `solana:${string}`)}
        disabled={!$connected}
      >
        {#each $clusters as c}
          <option value={c.id}>{c.label} ({c.id})</option>
        {/each}
      </select>
    </div>
  </header>

  <main>
    {#if $connected}
      <!-- 1. WALLET CARD -->
      <section class="card profile">
        <div class="wallet-header">
            {#if $walletIcon}
                <img src={$walletIcon} alt="wallet" class="wallet-icon" />
            {/if}
            <h2>{$walletName}</h2>
            <button class="disconnect-btn" on:click={() => disconnect()}>Disconnect</button>
        </div>
        
        <div class="address-row">
            <code title={$userAddress}>{$formatted}</code>
            <button on:click={copy} class="copy-btn">{$copied ? '✓' : 'Copy'}</button>
        </div>
        
        <div class="balance-row">
            <span class="label">Balance:</span>
            <span class="value">{$balanceLoading ? '...' : $formattedSol}</span>
            <button class="refresh-btn" on:click={() => refetchBalance()}>↻</button>
        </div>
      </section>

      <div class="grid-layout">
        <!-- 2. ACTIONS CARD -->
        <section class="card actions">
            <h3>Actions</h3>
            <div class="input-group">
                <input type="text" placeholder="Recipient (default: self)" bind:value={recipient} />
                <input type="number" step="0.001" bind:value={amount} />
            </div>
            
            <div class="button-group">
                <button on:click={handleSendTransaction} disabled={isProcessing}>
                    Send Transaction (Kit)
                </button>
                <button on:click={handleSignMessage} disabled={isProcessing} class="secondary">
                    Sign Message (Legacy)
                </button>
            </div>
            
            {#if status}
                <div class="status-box" class:error={status.includes('Error')}>
                    {status}
                </div>
            {/if}
            
            {#if lastSignature}
                <a href={`https://explorer.solana.com/tx/${lastSignature}?cluster=devnet`} target="_blank" class="explorer-link">
                    View Transaction ↗
                </a>
            {/if}
        </section>

        <!-- 3. DATA CARDS -->
        <div class="data-column">
            <!-- Tokens -->
            <section class="card list-card">
                <div class="card-header">
                    <h3>Tokens ({$tokens.length})</h3>
                    {#if $tokensLoading}<span class="spinner"></span>{/if}
                </div>
                <div class="scroll-list">
                    {#if $tokens.length === 0}
                        <p class="empty">No tokens found</p>
                    {:else}
                        {#each $tokens as t}
                            <div class="list-item">
                                <span class="mint" title={t.mint}>{t.mint.slice(0, 4)}...{t.mint.slice(-4)}</span>
                                <span class="amount">{Number(t.amount) / Math.pow(10, t.decimals)}</span>
                            </div>
                        {/each}
                    {/if}
                </div>
            </section>

            <!-- Transactions -->
            <section class="card list-card">
                <div class="card-header">
                    <h3>Recent Txs</h3>
                    <button on:click={() => refetchTxs()} class="tiny-refresh">↻</button>
                </div>
                <div class="scroll-list">
                    {#if $txsLoading && $transactions.length === 0}
                        <p class="empty">Loading history...</p>
                    {:else if $transactions.length === 0}
                        <p class="empty">No history</p>
                    {:else}
                        {#each $transactions as tx}
                            <div class="list-item tx-item">
                                <a href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`} target="_blank">
                                    {tx.signature.slice(0, 8)}...
                                </a>
                                <span class={`badge ${tx.status}`}>{tx.status}</span>
                            </div>
                        {/each}
                    {/if}
                </div>
            </section>
        </div>
      </div>

    {:else}
      <!-- DISCONNECTED STATE -->
      <section class="connect-container">
        <h2>Connect Wallet</h2>
        <div class="wallet-grid">
            {#each $wallets as w}
                <button class="connect-wallet-btn" on:click={() => select(w.wallet.name)}>
                    {#if w.wallet.icon}
                        <img src={w.wallet.icon} alt="" />
                    {/if}
                    <span>{w.wallet.name}</span>
                </button>
            {/each}
        </div>
      </section>
    {/if}
  </main>
</div>

<style>
  :global(body) { margin: 0; background: #f9fafb; font-family: -apple-system, system-ui, sans-serif; }
  
  .app-container { max-width: 800px; margin: 0 auto; padding: 20px; }
  
  header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
  h1 { margin: 0; font-size: 1.5rem; color: #111; }
  
  .card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  
  /* Profile */
  .wallet-header { display: flex; align-items: center; gap: 10px; margin-bottom: 1rem; }
  .wallet-icon { width: 32px; height: 32px; }
  .wallet-header h2 { margin: 0; flex: 1; font-size: 1.2rem; }
  .disconnect-btn { background: #fee2e2; color: #991b1b; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
  
  .address-row { background: #f3f4f6; padding: 8px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; font-family: monospace; margin-bottom: 1rem; }
  .copy-btn { border: none; background: transparent; cursor: pointer; color: #4b5563; font-weight: bold; }
  
  .balance-row { display: flex; align-items: center; gap: 10px; font-size: 1.2rem; }
  .refresh-btn { border: none; background: transparent; cursor: pointer; font-size: 1.2rem; color: #6b7280; }
  
  /* Grid Layout */
  .grid-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  @media (max-width: 600px) { .grid-layout { grid-template-columns: 1fr; } }
  
  /* Actions */
  .input-group { display: flex; flex-direction: column; gap: 10px; margin-bottom: 1rem; }
  input { padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; }
  .button-group { display: flex; flex-direction: column; gap: 10px; }
  button { padding: 10px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; background: #2563eb; color: white; }
  button:disabled { opacity: 0.5; }
  button.secondary { background: #e5e7eb; color: #374151; }
  
  .status-box { margin-top: 1rem; padding: 10px; background: #f0f9ff; color: #0369a1; border-radius: 6px; font-size: 0.9rem; }
  .status-box.error { background: #fef2f2; color: #b91c1c; }
  .explorer-link { display: block; margin-top: 10px; font-size: 0.9rem; color: #2563eb; text-decoration: none; }

  /* Data Lists */
  .data-column { display: flex; flex-direction: column; gap: 1.5rem; }
  .list-card { padding: 1rem; max-height: 200px; display: flex; flex-direction: column; }
  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .card-header h3 { margin: 0; font-size: 1rem; color: #374151; }
  .scroll-list { overflow-y: auto; flex: 1; }
  .list-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 0.9rem; }
  .badge { font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
  .badge.success { background: #dcfce7; color: #166534; }
  .badge.failed { background: #fee2e2; color: #991b1b; }
  .empty { color: #9ca3af; font-style: italic; text-align: center; margin-top: 1rem; }
  
  /* Connect */
  .connect-container { text-align: center; margin-top: 4rem; }
  .wallet-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 2rem; }
  .connect-wallet-btn { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 1.5rem; background: white; border: 1px solid #e5e7eb; color: #111; }
  .connect-wallet-btn img { width: 40px; height: 40px; }
  .connect-wallet-btn:hover { border-color: #2563eb; background: #eff6ff; }
</style>