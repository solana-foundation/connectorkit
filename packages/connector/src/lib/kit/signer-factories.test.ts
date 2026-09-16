/**
 * Kit signer factory tests
 *
 * Focused on how wallet failures are classified on the way out: the signer is the
 * layer that decides whether the UI shows "this wallet does not support this
 * feature", "you cancelled", or a generic signing failure.
 */

import { describe, it, expect } from 'vitest';
import type { Address } from '@solana/addresses';
import type { SignableMessage } from '@solana/signers';
import { createMessageSignerFromWallet } from './signer-factories';
import { Errors } from '../errors';

const WALLET_ADDRESS = '11111111111111111111111111111111' as Address<string>;

function message(text: string): SignableMessage {
    return { content: new TextEncoder().encode(text), signatures: {} } as unknown as SignableMessage;
}

describe('createMessageSignerFromWallet', () => {
    it('signs a single message', async () => {
        const signature = new Uint8Array(64).fill(7);
        const signer = createMessageSignerFromWallet(WALLET_ADDRESS, async () => signature);

        const [signed] = await signer.modifyAndSignMessages([message('hello')]);

        expect(signed.signatures[WALLET_ADDRESS]).toBeDefined();
    });

    it('passes a ConnectorError from the wallet through instead of rewrapping it', async () => {
        const signer = createMessageSignerFromWallet(WALLET_ADDRESS, async () => {
            throw Errors.featureNotSupported('message signing');
        });

        await expect(signer.modifyAndSignMessages([message('hello')])).rejects.toMatchObject({
            code: 'FEATURE_NOT_SUPPORTED',
        });
    });

    it('classifies a plain-object wallet rejection as a user rejection', async () => {
        const signer = createMessageSignerFromWallet(WALLET_ADDRESS, async () => {
            // The shape every EIP-1193-style injected provider rejects with.
            throw { code: 4001, message: 'User rejected the request.' };
        });

        await expect(signer.modifyAndSignMessages([message('hello')])).rejects.toMatchObject({
            code: 'USER_REJECTED',
        });
    });

    it('keeps the wallet message visible on an unclassified failure', async () => {
        const signer = createMessageSignerFromWallet(WALLET_ADDRESS, async () => {
            throw new Error('Wallet is locked');
        });

        await expect(signer.modifyAndSignMessages([message('hello')])).rejects.toMatchObject({
            code: 'SIGNING_FAILED',
            message: 'Failed to sign message: Wallet is locked',
        });
    });

    it('rejects a batch of more than one message', async () => {
        const signer = createMessageSignerFromWallet(WALLET_ADDRESS, async () => new Uint8Array(64));

        await expect(signer.modifyAndSignMessages([message('a'), message('b')])).rejects.toMatchObject({
            code: 'INVALID_FORMAT',
        });
    });
});
