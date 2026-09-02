import { getBase58Decoder } from '@solana/codecs';
import type { SignatureBytes } from '@solana/keys';

export function detectMessageModification(original: Uint8Array, modified: Uint8Array): boolean {
    if (original.length !== modified.length) {
        return true;
    }

    for (let i = 0; i < original.length; i++) {
        if (original[i] !== modified[i]) {
            return true;
        }
    }

    return false;
}

export function signatureBytesToBase58(bytes: SignatureBytes): string {
    try {
        if (bytes.length !== 64) {
            throw new Error(`Invalid signature length: expected 64 bytes, got ${bytes.length}`);
        }
        return getBase58Decoder().decode(bytes);
    } catch (error) {
        throw new Error(
            `Failed to encode signature to base58: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}
