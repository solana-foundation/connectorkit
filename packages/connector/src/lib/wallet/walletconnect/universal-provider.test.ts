import { describe, it, expect, vi, afterEach } from 'vitest';
import type { WalletConnectConfig } from '../../../types/walletconnect';
import { createWalletConnectTransport } from './universal-provider';
import UniversalProvider from '@walletconnect/universal-provider';

function createConfig(overrides: Partial<WalletConnectConfig> = {}): WalletConnectConfig {
    return {
        enabled: true,
        projectId: 'test-project-id',
        metadata: {
            name: 'Test App',
            description: 'Test',
            url: 'https://example.com',
            icons: ['https://example.com/icon.png'],
        },
        ...overrides,
    };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('createWalletConnectTransport', () => {
    it('should await the in-flight connect promise instead of no-oping', async () => {
        const config = createConfig();

        const provider = new (UniversalProvider as unknown as { new (): any })();
        let connectStartedResolve: (() => void) | null = null;
        const connectStarted = new Promise<void>(resolve => {
            connectStartedResolve = resolve;
        });
        let resolveConnect: (() => void) | null = null;
        const pending = new Promise<void>(resolve => {
            resolveConnect = resolve;
        });

        provider.connect = vi.fn(async () => {
            // emit a URI like the real provider would
            provider.emit?.('display_uri', 'wc:test-uri');
            connectStartedResolve?.();
            await pending;
            provider.session = {
                topic: 'mock-topic',
                namespaces: {
                    solana: {
                        accounts: [
                            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:HMJfh9P8FEF5eVHp3XypYWThUYCQ9sWNZZQQxVP2jjr1',
                        ],
                        chains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
                    },
                },
            };
            return provider.session;
        });

        vi.spyOn(UniversalProvider as unknown as { init: (opts: unknown) => Promise<any> }, 'init').mockResolvedValue(
            provider,
        );

        const transport = await createWalletConnectTransport(config);

        const p1 = transport.connect();
        const p2 = transport.connect();

        await connectStarted;
        expect(provider.connect).toHaveBeenCalledTimes(1);

        resolveConnect?.();
        await expect(Promise.all([p1, p2])).resolves.toBeDefined();
    });

    it('should cancel an in-flight pairing on disconnect and allow reconnect', async () => {
        const config = createConfig();

        const provider = new (UniversalProvider as unknown as { new (): any })();
        let connectStartedResolve: (() => void) | null = null;
        const connectStarted = new Promise<void>(resolve => {
            connectStartedResolve = resolve;
        });
        provider.abortPairingAttempt = vi.fn();
        provider.cleanupPendingPairings = vi.fn().mockResolvedValue(undefined);
        provider.disconnect = vi.fn().mockResolvedValue(undefined);

        // connect never resolves unless cancelled
        provider.connect = vi.fn(async () => {
            provider.emit?.('display_uri', 'wc:test-uri');
            connectStartedResolve?.();
            return await new Promise(() => {});
        });

        vi.spyOn(UniversalProvider as unknown as { init: (opts: unknown) => Promise<any> }, 'init').mockResolvedValue(
            provider,
        );

        const transport = await createWalletConnectTransport(config);

        const connectPromise = transport.connect();
        await connectStarted;
        await transport.disconnect();

        await expect(connectPromise).rejects.toThrow('Connection cancelled');

        // After cancellation, a new connect attempt should be allowed.
        provider.connect = vi.fn(async () => {
            provider.session = {
                topic: 'mock-topic',
                namespaces: {
                    solana: {
                        accounts: [
                            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:HMJfh9P8FEF5eVHp3XypYWThUYCQ9sWNZZQQxVP2jjr1',
                        ],
                        chains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
                    },
                },
            };
            return provider.session;
        });

        await expect(transport.connect()).resolves.toBeUndefined();
        expect(provider.abortPairingAttempt).toHaveBeenCalled();
        // We use deletePairings: false to avoid aggressive cleanup that can interfere with pairing
        expect(provider.cleanupPendingPairings).toHaveBeenCalledWith({ deletePairings: false });
    });

    it('should reset an existing non-Solana session and create a new pairing', async () => {
        const config = createConfig();

        const provider = new (UniversalProvider as unknown as { new (): any })();
        provider.cleanupPendingPairings = vi.fn().mockResolvedValue(undefined);
        provider.disconnect = vi.fn().mockResolvedValue(undefined);

        // simulate a restored session from another dapp / namespace
        provider.session = {
            topic: 'other-topic',
            namespaces: {
                eip155: { accounts: ['eip155:1:0xabc'] },
            },
        };

        provider.connect = vi.fn(async () => {
            provider.session = {
                topic: 'mock-topic',
                namespaces: {
                    solana: {
                        accounts: [
                            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:HMJfh9P8FEF5eVHp3XypYWThUYCQ9sWNZZQQxVP2jjr1',
                        ],
                        chains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
                    },
                },
            };
            return provider.session;
        });

        vi.spyOn(UniversalProvider as unknown as { init: (opts: unknown) => Promise<any> }, 'init').mockResolvedValue(
            provider,
        );

        const transport = await createWalletConnectTransport(config);
        await expect(transport.connect()).resolves.toBeUndefined();

        expect(provider.disconnect).toHaveBeenCalled();
        expect(provider.connect).toHaveBeenCalled();
    });
});
