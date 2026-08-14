/**
 * @solana/connector/kit
 *
 * Kit-native surface. Re-exports the building blocks for the plugin-client
 * pattern so consumers can adopt it directly alongside the connector APIs:
 *
 * ```tsx
 * import { createClient, walletSigner, solanaDevnetRpc, ClientProvider, useTrackedData } from '@solana/connector/kit';
 *
 * const client = createClient()
 *     .use(walletSigner({ chain: 'solana:devnet' }))
 *     .use(solanaDevnetRpc());
 *
 * <ClientProvider client={client}>...</ClientProvider>
 * ```
 */

// Plugin client entrypoint
export { createClient, extendClient } from '@solana/kit';

// React bindings: ClientProvider, data hooks (useRequest/useSubscription/useTrackedData),
// wallet-account signer hooks, and account-based useSignIn/useSignMessage.
// Also the client-capability hooks, which read a capability off the client the
// plugin chain installed: usePayer/useIdentity track client.payer and
// client.identity (reactively, when the client advertises subscribeToPayer /
// subscribeToIdentity), while useAirdrop, usePlanTransaction(s), and
// useSendTransaction(s) wrap the matching client method as a dispatchable
// action with isRunning/data/error state.
export * from '@solana/react';

// RPC plugins: solanaRpc/solanaDevnetRpc/solanaLocalRpc, connection plugins,
// rpcAirdrop, and the transaction planner/executor
export * from '@solana/kit-plugin-rpc';

// Wallet plugins: walletSigner/walletPayer/walletIdentity/walletWithoutSigner
// and the client.wallet store
export * from '@solana/kit-plugin-wallet';

// Wallet store React hooks. The store-based useSignIn/useSignMessage are not
// re-exported because @solana/react exports account-based hooks of the same
// name; import them from '@solana/kit-plugin-wallet/react' directly if needed.
export {
    useConnect,
    useConnectedWallet,
    useDisconnect,
    useIsWalletReady,
    useSelectAccount,
    useWallets,
    useWalletStatus,
    WalletReadyGate,
    type WalletReadyGateProps,
} from '@solana/kit-plugin-wallet/react';
