/**
 * ConnectButton - Compound component for wallet connection
 * 
 * Provides both a preset component and compound components for full customization.
 * 
 * @example Preset usage (zero config)
 * ```tsx
 * import { ConnectButton } from '@solana/connector/react';
 * 
 * function App() {
 *   return <ConnectButton />;
 * }
 * ```
 * 
 * @example Compound components (full control)
 * ```tsx
 * import { ConnectButton } from '@solana/connector/react';
 * 
 * function App() {
 *   return (
 *     <ConnectButton.Root>
 *       <ConnectButton.Trigger />
 *       <ConnectButton.Disconnected>
 *         <WalletModal />
 *       </ConnectButton.Disconnected>
 *       <ConnectButton.Connected>
 *         <WalletDropdown>
 *           <BalanceBlock />
 *           <DisconnectBlock />
 *         </WalletDropdown>
 *       </ConnectButton.Connected>
 *     </ConnectButton.Root>
 *   );
 * }
 * ```
 */

export { ConnectButton, type ConnectButtonProps, type ConnectWithType, type ConnectedWithType } from './connect-button';
export { ConnectButtonRoot, type ConnectButtonRootProps } from './root';
export { ConnectButtonTrigger, type ConnectButtonTriggerProps } from './trigger';
export { 
    ConnectButtonConnected, 
    ConnectButtonDisconnected,
    type ConnectButtonConnectedProps,
    type ConnectButtonDisconnectedProps,
} from './connected';
export { 
    ConnectButtonProvider, 
    useConnectButtonContext,
    type ConnectButtonContextValue,
    type ConnectButtonProviderProps,
} from './context';
