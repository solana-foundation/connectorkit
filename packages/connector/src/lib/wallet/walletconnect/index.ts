/**
 * WalletConnect Integration Module
 *
 * Provides WalletConnect support for ConnectorKit via Wallet Standard.
 *
 * @see https://docs.walletconnect.network/wallet-sdk/chain-support/solana
 */

export { createWalletConnectWallet } from './create-walletconnect-wallet';
export {
    createWalletConnectTransport,
    createMockWalletConnectTransport,
} from './universal-provider';
export {
    registerWalletConnectWallet,
    isWalletConnectAvailable,
    type WalletConnectRegistration,
} from './register-walletconnect';
