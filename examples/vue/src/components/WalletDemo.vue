<template>
    <div class="py-12">
        <div class="max-w-2xl mx-auto px-4">
            <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">ConnectorKit Vue Example</h1>
                <p class="text-gray-600">Demonstrating Solana wallet connection with Vue 3 + Headless Client</p>
            </div>

            <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <h2 class="text-xl font-semibold mb-4">Connection Status</h2>

                <div v-if="!state.connected">
                    <p class="text-gray-600 mb-4">Not connected</p>
                    <div class="space-y-2">
                        <button
                            v-for="wallet in state.wallets"
                            :key="wallet.wallet.name"
                            @click="connect(wallet.wallet.name)"
                            :disabled="state.connecting"
                            class="w-full p-3 text-left border rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center space-x-3"
                        >
                            <img
                                v-if="wallet.wallet.icon"
                                :src="wallet.wallet.icon"
                                :alt="wallet.wallet.name"
                                class="w-6 h-6"
                            />
                            <span>{{ wallet.wallet.name }}</span>
                            <span v-if="!wallet.installed" class="text-xs text-gray-500"> (Not Installed) </span>
                        </button>
                    </div>
                </div>

                <div v-else>
                    <p class="text-green-600 font-medium mb-2">✅ Connected</p>
                    <p class="text-sm text-gray-600 mb-2">Address: {{ state.account?.formatted }}</p>
                    <p class="text-sm text-gray-600 mb-4">Network: {{ state.cluster }}</p>
                    <button @click="disconnect" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                        Disconnect
                    </button>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow-sm border p-6">
                <h2 class="text-xl font-semibold mb-4">Available Wallets</h2>
                <div class="grid gap-3">
                    <div
                        v-for="wallet in state.wallets"
                        :key="wallet.wallet.name"
                        class="flex items-center justify-between p-3 border rounded-lg"
                    >
                        <div class="flex items-center space-x-3">
                            <img
                                v-if="wallet.wallet.icon"
                                :src="wallet.wallet.icon"
                                :alt="wallet.wallet.name"
                                class="w-6 h-6"
                            />
                            <span class="font-medium">{{ wallet.wallet.name }}</span>
                        </div>
                        <span
                            :class="[
                                'text-xs px-2 py-1 rounded',
                                wallet.installed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600',
                            ]"
                        >
                            {{ wallet.installed ? 'Installed' : 'Not Installed' }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, onUnmounted } from 'vue';
import { ConnectorClient, getDefaultConfig } from '@connector-kit/connector/headless';
import type { ConnectorState, WalletInfo } from '@connector-kit/connector';

// Reactive state
const state = reactive({
    wallets: [] as WalletInfo[],
    connected: false,
    connecting: false,
    account: null as { address: string; formatted: string } | null,
    cluster: 'devnet',
});

// Create client
const client = new ConnectorClient(
    getDefaultConfig({
        appName: 'ConnectorKit Vue Example',
        network: 'devnet', // Will create default clusters: mainnet, devnet, testnet
    }),
);

// Event listeners
let unsubscribers: Array<() => void> = [];

// Connect wallet
async function connect(walletName: string) {
    try {
        state.connecting = true;
        await client.select(walletName);
    } catch (error) {
        console.error('Connection failed:', error);
    } finally {
        state.connecting = false;
    }
}

// Disconnect wallet
async function disconnect() {
    try {
        await client.disconnect();
    } catch (error) {
        console.error('Disconnect failed:', error);
    }
}

// Subscribe to state changes
onMounted(() => {
    // Get initial state
    const currentState: ConnectorState = client.getSnapshot();
    Object.assign(state, {
        wallets: currentState.wallets,
        connected: currentState.connected,
        account: currentState.selectedAccount
            ? {
                  address: currentState.selectedAccount,
                  formatted:
                      currentState.selectedAccount?.slice(0, 4) + '...' + currentState.selectedAccount?.slice(-4),
              }
            : null,
        cluster: currentState.cluster?.id || 'devnet',
    });

    // Subscribe to all state changes
    unsubscribers.push(
        client.subscribe((newState: ConnectorState) => {
            state.wallets = newState.wallets;
            state.connected = newState.connected;
            state.account = newState.selectedAccount
                ? {
                      address: newState.selectedAccount,
                      formatted: newState.selectedAccount?.slice(0, 4) + '...' + newState.selectedAccount?.slice(-4),
                  }
                : null;
            state.cluster = newState.cluster?.id || 'devnet';
        }),
    );
});

// Cleanup
onUnmounted(() => {
    unsubscribers.forEach((unsubscribe: () => void) => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    client.destroy();
});
</script>
