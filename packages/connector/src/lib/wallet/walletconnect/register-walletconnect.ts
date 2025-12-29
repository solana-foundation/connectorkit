/**
 * WalletConnect Registration Helper
 *
 * Registers the WalletConnect wallet shim into the Wallet Standard registry,
 * making it available to ConnectorKit's wallet detection system.
 */

import type { Wallet } from '@wallet-standard/base';
import type { WalletConnectConfig } from '../../../types/walletconnect';
import { createWalletConnectWallet } from './create-walletconnect-wallet';
import { createWalletConnectTransport } from './universal-provider';
import { createLogger } from '../../utils/secure-logger';

const logger = createLogger('WalletConnectRegistration');

/**
 * Result of registering the WalletConnect wallet
 */
export interface WalletConnectRegistration {
    /** The registered wallet instance */
    wallet: Wallet;
    /** Function to unregister the wallet from the registry */
    unregister: () => void;
}

/**
 * Register a WalletConnect wallet into the Wallet Standard registry
 *
 * This function:
 * 1. Creates a WalletConnect transport adapter
 * 2. Creates a Wallet Standard-compatible wallet shim
 * 3. Registers the wallet with the Wallet Standard registry
 *
 * The wallet will appear in ConnectorKit's wallet list as "WalletConnect"
 * and can be selected like any other wallet.
 *
 * @param config - WalletConnect configuration
 * @returns Registration result with wallet and unregister function
 *
 * @example
 * ```typescript
 * const { wallet, unregister } = await registerWalletConnectWallet({
 *   projectId: 'your-project-id',
 *   metadata: {
 *     name: 'My App',
 *     description: 'My Solana App',
 *     url: 'https://myapp.com',
 *     icons: ['https://myapp.com/icon.png'],
 *   },
 *   onDisplayUri: (uri) => {
 *     // Show QR code with this URI
 *   },
 * });
 *
 * // Later, to remove from registry:
 * unregister();
 * ```
 */
export async function registerWalletConnectWallet(
    config: WalletConnectConfig,
): Promise<WalletConnectRegistration> {
    if (typeof window === 'undefined') {
        throw new Error('WalletConnect registration can only be done in a browser environment');
    }

    logger.debug('Registering WalletConnect wallet', {
        projectId: config.projectId.substring(0, 8) + '...',
        defaultChain: config.defaultChain,
    });

    // Create the transport adapter
    const transport = await createWalletConnectTransport(config);

    // Create the Wallet Standard wallet shim
    const wallet = createWalletConnectWallet(config, transport);

    // Get the Wallet Standard registry and register the wallet
    const { getWallets } = await import('@wallet-standard/app');
    const wallets = getWallets();
    const unregister = wallets.register(wallet);

    logger.info('WalletConnect wallet registered successfully');

    return {
        wallet,
        unregister,
    };
}

/**
 * Check if WalletConnect dependencies are available
 *
 * This function checks if @walletconnect/universal-provider can be imported.
 * Useful for conditionally showing WalletConnect options in UI.
 */
export async function isWalletConnectAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        await import('@walletconnect/universal-provider');
        return true;
    } catch {
        return false;
    }
}
