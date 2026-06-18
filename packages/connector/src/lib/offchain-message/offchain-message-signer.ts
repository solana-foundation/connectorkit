/**
 * Off-chain message signing (OCMS) abstraction.
 *
 * Bridges the connected wallet's `solana:signOffchainMessage` feature to a small,
 * dapp-facing API. The wallet owns serialization of the canonical bytes; this module
 * recompiles the same bytes with `@solana/kit`'s codec and asserts they match what the
 * wallet signed, so a buggy or malicious wallet cannot sign different bytes than were
 * requested.
 */

import {
    bytesEqual,
    compileOffchainMessageV1Envelope,
    verifyOffchainMessageEnvelope,
    type Address,
    type OffchainMessageEnvelope,
    type ReadonlyUint8Array,
    type SignatureBytes,
} from '@solana/kit';
import type { Wallet, WalletAccount } from '@wallet-standard/base';

import { SolanaSignOffchainMessage, type SolanaSignOffchainMessageFeature } from '@solana/wallet-standard-features';

import { Errors, TransactionError } from '../errors';

type OffchainMessageFeature = SolanaSignOffchainMessageFeature[typeof SolanaSignOffchainMessage];

/** Configuration for creating an off-chain message signer. */
export interface OffchainMessageSignerConfig {
    /** The Wallet Standard wallet instance. */
    wallet: Wallet;
    /** The specific account to sign with. */
    account: WalletAccount;
}

/** Options for signing an off-chain message. */
export interface SignOffchainMessageOptions {
    /** Signal used to abort the request before it is handed to the wallet. */
    abortSignal?: AbortSignal;
}

/** Result of signing an off-chain message. */
export interface SignedOffchainMessage {
    /** Ed25519 signature produced by the connected account. */
    signature: ReadonlyUint8Array;
    /** Full preamble and body bytes the wallet constructed and signed. */
    signedOffchainMessage: ReadonlyUint8Array;
    /** Compiled envelope with the connected account's signature merged in. */
    envelope: OffchainMessageEnvelope;
}

/** Signs off-chain messages through a connected wallet. */
export interface OffchainMessageSigner {
    /** The wallet address that will sign. */
    readonly address: string;
    /** Whether the wallet advertises the `solana:signOffchainMessage` feature. */
    readonly canSignOffchainMessage: boolean;
    /** Off-chain message specification versions the wallet can sign. */
    readonly supportedMessageVersions: readonly number[];
    /** Sign a UTF-8 message body as a v1 off-chain message. */
    signOffchainMessage(message: string, options?: SignOffchainMessageOptions): Promise<SignedOffchainMessage>;
}

export function createOffchainMessageSigner(config: OffchainMessageSignerConfig): OffchainMessageSigner | null {
    const { wallet, account } = config;

    if (!wallet || !account) {
        return null;
    }

    const feature = (wallet.features as Record<string, unknown>)[SolanaSignOffchainMessage] as
        | OffchainMessageFeature
        | undefined;
    const signerAddress = account.address as Address;

    return {
        address: account.address,
        canSignOffchainMessage: Boolean(feature),
        supportedMessageVersions: feature?.supportedMessageVersions ?? [],

        async signOffchainMessage(message, options = {}): Promise<SignedOffchainMessage> {
            const { abortSignal } = options;

            abortSignal?.throwIfAborted();

            if (!feature) {
                throw Errors.featureNotSupported('off-chain message signing');
            }

            const envelope = compileOffchainMessageV1Envelope({
                version: 1,
                content: message,
                requiredSignatories: [{ address: signerAddress }],
            });

            let output;
            try {
                [output] = await feature.signOffchainMessage({
                    account,
                    message,
                    messageVersion: 1,
                    requiredSigners: [account.publicKey],
                });
            } catch (error) {
                throw new TransactionError(
                    'SIGNING_FAILED',
                    'Failed to sign off-chain message',
                    undefined,
                    error as Error,
                );
            }

            abortSignal?.throwIfAborted();

            if (!output) {
                throw new TransactionError('SIGNING_FAILED', 'Wallet returned no off-chain message signature');
            }

            if (!bytesEqual(output.signedOffchainMessage, envelope.content)) {
                throw new TransactionError('SIGNING_FAILED', 'Wallet produced non-canonical off-chain message bytes');
            }

            const signedEnvelope: OffchainMessageEnvelope = {
                ...envelope,
                signatures: {
                    ...envelope.signatures,
                    [signerAddress]: output.signature as SignatureBytes,
                },
            };

            await verifyOffchainMessageEnvelope(signedEnvelope);

            return {
                signature: output.signature,
                signedOffchainMessage: output.signedOffchainMessage,
                envelope: signedEnvelope,
            };
        },
    };
}
