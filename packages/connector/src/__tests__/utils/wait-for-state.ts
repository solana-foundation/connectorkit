/**
 * State waiting utilities
 *
 * Helpers for waiting for state changes in tests
 */

import type { ConnectorClient } from '../../lib/core/connector-client';
import type { ConnectorState } from '../../types/connector';

/**
 * Wait for a specific state change
 */
export async function waitForStateChange(
    client: ConnectorClient,
    predicate: (state: ConnectorState) => boolean,
    options: {
        timeout?: number;
        interval?: number;
    } = {},
): Promise<ConnectorState> {
    const { timeout = 5000, interval = 50 } = options;

    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        let timeoutId: NodeJS.Timeout;

        const check = () => {
            const state = client.getSnapshot();

            if (predicate(state)) {
                clearTimeout(timeoutId);
                resolve(state);
                return;
            }

            if (Date.now() - startTime > timeout) {
                clearTimeout(timeoutId);
                reject(new Error('Timeout waiting for state change'));
                return;
            }

            timeoutId = setTimeout(check, interval);
        };

        check();
    });
}

/**
 * Wait for connection state
 */
export function waitForConnection(client: ConnectorClient, timeout = 5000): Promise<ConnectorState> {
    return waitForStateChange(client, state => state.connected === true, { timeout });
}

/**
 * Wait for disconnection state
 */
export function waitForDisconnection(client: ConnectorClient, timeout = 5000): Promise<ConnectorState> {
    return waitForStateChange(client, state => state.connected === false, { timeout });
}

/**
 * Wait for wallet selection
 */
export function waitForWalletSelection(
    client: ConnectorClient,
    walletName: string,
    timeout = 5000,
): Promise<ConnectorState> {
    return waitForStateChange(client, state => state.selectedWallet === walletName, { timeout });
}

/**
 * Wait for account selection
 */
export function waitForAccountSelection(
    client: ConnectorClient,
    address: string,
    timeout = 5000,
): Promise<ConnectorState> {
    return waitForStateChange(client, state => state.selectedAccount === address, { timeout });
}
