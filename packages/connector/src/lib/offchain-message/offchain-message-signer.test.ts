import { describe, it, expect, vi } from 'vitest';
import {
    compileOffchainMessageV1Envelope,
    generateKeyPair,
    getAddressDecoder,
    getAddressEncoder,
    getAddressFromPublicKey,
    signBytes,
    verifyOffchainMessageEnvelope,
    type Address,
    type ReadonlyUint8Array,
} from '@solana/kit';
import type { Wallet, WalletAccount } from '@wallet-standard/base';

import {
    SolanaSignOffchainMessage,
    type SolanaSignOffchainMessageInputV1,
    type SolanaSignOffchainMessageOutput,
} from '@solana/wallet-standard-features';

import { createOffchainMessageSigner } from './offchain-message-signer';

async function createKeyedAccount() {
    const keyPair = await generateKeyPair();
    const address = await getAddressFromPublicKey(keyPair.publicKey);
    const publicKey = getAddressEncoder().encode(address);
    const account: WalletAccount = { address, publicKey, chains: ['solana:devnet'], features: [] };
    return { keyPair, address, account };
}

/**
 * Mock wallet whose `signOffchainMessage` builds the canonical v1 bytes with the same
 * codec the signer uses, then signs them with `keyPair` — producing a real Ed25519
 * signature the signer can verify.
 */
function createOffchainMessageWallet(
    keyPair: CryptoKeyPair,
    overrideSignedBytes?: (input: SolanaSignOffchainMessageInputV1) => ReadonlyUint8Array,
): Wallet {
    const signOffchainMessage = vi.fn(
        async (input: SolanaSignOffchainMessageInputV1): Promise<readonly SolanaSignOffchainMessageOutput[]> => {
            const addressDecoder = getAddressDecoder();
            const envelope = compileOffchainMessageV1Envelope({
                version: 1,
                content: input.message,
                requiredSignatories: input.requiredSigners.map(pk => ({ address: addressDecoder.decode(pk) })),
            });
            const signedOffchainMessage = overrideSignedBytes ? overrideSignedBytes(input) : envelope.content;
            const signature = await signBytes(keyPair.privateKey, signedOffchainMessage);
            return [{ signedOffchainMessage, signature }];
        },
    );

    return {
        version: '1.0.0',
        name: 'Mock OCMS Wallet',
        icon: 'data:image/svg+xml,<svg></svg>',
        chains: ['solana:devnet'],
        accounts: [],
        features: {
            [SolanaSignOffchainMessage]: {
                version: '1.0.0',
                supportedMessageVersions: [1],
                signOffchainMessage,
            },
        },
    } as unknown as Wallet;
}

function createWalletWithoutOffchainMessage(): Wallet {
    return {
        version: '1.0.0',
        name: 'No OCMS Wallet',
        icon: 'data:image/svg+xml,<svg></svg>',
        chains: ['solana:devnet'],
        accounts: [],
        features: {},
    } as unknown as Wallet;
}

describe('createOffchainMessageSigner', () => {
    it('returns null without a wallet or account', () => {
        expect(
            createOffchainMessageSigner({ wallet: null as unknown as Wallet, account: {} as WalletAccount }),
        ).toBeNull();
    });

    it('signs a v1 off-chain message and returns a verifiable envelope', async () => {
        const { keyPair, address, account } = await createKeyedAccount();
        const signer = createOffchainMessageSigner({ wallet: createOffchainMessageWallet(keyPair), account })!;

        expect(signer.canSignOffchainMessage).toBe(true);
        expect(signer.supportedMessageVersions).toEqual([1]);

        const result = await signer.signOffchainMessage('Hello, Solana');

        expect(result.signature).toHaveLength(64);
        expect(result.envelope.signatures[address]).toBeTruthy();
        await expect(verifyOffchainMessageEnvelope(result.envelope)).resolves.toBeUndefined();
    });

    it('reports no capability and rejects when the wallet lacks the feature', async () => {
        const { account } = await createKeyedAccount();
        const signer = createOffchainMessageSigner({ wallet: createWalletWithoutOffchainMessage(), account })!;

        expect(signer.canSignOffchainMessage).toBe(false);
        expect(signer.supportedMessageVersions).toEqual([]);
        await expect(signer.signOffchainMessage('hi')).rejects.toMatchObject({ code: 'FEATURE_NOT_SUPPORTED' });
    });

    it('rejects when the wallet signs non-canonical bytes', async () => {
        const { keyPair, account } = await createKeyedAccount();
        const wallet = createOffchainMessageWallet(
            keyPair,
            input =>
                compileOffchainMessageV1Envelope({
                    version: 1,
                    content: `tampered:${input.message}`,
                    requiredSignatories: [{ address: account.address as Address }],
                }).content,
        );
        const signer = createOffchainMessageSigner({ wallet, account })!;

        await expect(signer.signOffchainMessage('original')).rejects.toMatchObject({ code: 'SIGNING_FAILED' });
    });

    it('rejects an already-aborted request before contacting the wallet', async () => {
        const { keyPair, account } = await createKeyedAccount();
        const wallet = createOffchainMessageWallet(keyPair);
        const signer = createOffchainMessageSigner({ wallet, account })!;

        await expect(signer.signOffchainMessage('hi', { abortSignal: AbortSignal.abort() })).rejects.toThrow();
        expect(
            (wallet.features as Record<string, { signOffchainMessage: ReturnType<typeof vi.fn> }>)[
                SolanaSignOffchainMessage
            ].signOffchainMessage,
        ).not.toHaveBeenCalled();
    });
});
