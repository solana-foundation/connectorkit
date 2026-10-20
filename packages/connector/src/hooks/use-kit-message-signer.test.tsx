import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { generateKeyPair, getAddressFromPublicKey, signBytes, verifySignature } from '@solana/kit';
import { useKitMessageSigner } from './use-kit-message-signer';
import { useConnector } from '../ui/connector-provider';
import { createMockPhantomWallet } from '../__tests__/mocks/wallet-standard-mock';
import { createMockWalletAccount, TEST_ADDRESSES } from '../__tests__/fixtures/accounts';

vi.mock('../ui/connector-provider', async importOriginal => {
    const actual = await importOriginal<typeof import('../ui/connector-provider')>();
    return { ...actual, useConnector: vi.fn() };
});

function connectorState(accountFeatures: string[], overrides: Record<string, unknown> = {}) {
    const account = createMockWalletAccount(TEST_ADDRESSES.ACCOUNT_1, { features: accountFeatures });
    // The wallet advertises `solana:signMessage` either way; only the account decides.
    const wallet = createMockPhantomWallet({ accounts: [account] });
    return {
        connected: true,
        selectedWallet: wallet,
        selectedAccount: TEST_ADDRESSES.ACCOUNT_1,
        accounts: [{ address: TEST_ADDRESSES.ACCOUNT_1, raw: account }],
        cluster: null,
        ...overrides,
    } as unknown as ReturnType<typeof useConnector>;
}

describe('useKitMessageSigner', () => {
    beforeEach(() => {
        vi.mocked(useConnector).mockReset();
    });

    it('returns no signer when disconnected', () => {
        vi.mocked(useConnector).mockReturnValue(
            connectorState(['solana:signMessage'], { connected: false, selectedWallet: null }),
        );

        const { result } = renderHook(() => useKitMessageSigner());

        expect(result.current).toEqual({ signer: null, ready: false, reason: 'disconnected' });
    });

    it('returns no signer when the account omits solana:signMessage, even if the wallet advertises it', () => {
        vi.mocked(useConnector).mockReturnValue(connectorState(['solana:signTransaction']));

        const { result } = renderHook(() => useKitMessageSigner());

        expect(result.current).toEqual({ signer: null, ready: false, reason: 'signer-unavailable' });
    });

    it('is ready without a cluster, since message signing is not chain-scoped', () => {
        vi.mocked(useConnector).mockReturnValue(connectorState(['solana:signMessage']));

        const { result } = renderHook(() => useKitMessageSigner());

        expect(result.current.ready).toBe(true);
        expect(result.current.reason).toBeNull();
        expect(result.current.signer?.address).toBe(TEST_ADDRESSES.ACCOUNT_1);
    });

    it("signs through the wallet's solana:signMessage feature", async () => {
        const keyPair = await generateKeyPair();
        const walletAddress = await getAddressFromPublicKey(keyPair.publicKey);
        const account = createMockWalletAccount(walletAddress, { features: ['solana:signMessage'] });
        const wallet = createMockPhantomWallet({ accounts: [account] });
        (wallet.features as Record<string, unknown>)['solana:signMessage'] = {
            version: '1.0.0',
            signMessage: (...inputs: { message: Uint8Array }[]) =>
                Promise.all(
                    inputs.map(async ({ message }) => ({
                        signedMessage: message,
                        signature: new Uint8Array(await signBytes(keyPair.privateKey, message)),
                    })),
                ),
        };
        vi.mocked(useConnector).mockReturnValue({
            connected: true,
            selectedWallet: wallet,
            selectedAccount: walletAddress,
            accounts: [{ address: walletAddress, raw: account }],
            cluster: null,
        } as unknown as ReturnType<typeof useConnector>);

        const { result } = renderHook(() => useKitMessageSigner());
        const content = new TextEncoder().encode('hello');
        const [signed] = await result.current.signer!.modifyAndSignMessages([{ content, signatures: {} }]);

        const signature = signed.signatures[walletAddress];
        expect(signature).toBeDefined();
        await expect(verifySignature(keyPair.publicKey, signature!, content)).resolves.toBe(true);
    });
});
