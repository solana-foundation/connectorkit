import type { Address } from '@solana/addresses';
import type { SignatureBytes } from '@solana/keys';
import type { SignatureDictionary } from '@solana/signers';
import bs58 from 'bs58';

function toSignatureBytes(bytes: Uint8Array): SignatureBytes {
    return bytes as SignatureBytes;
}

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

export function updateSignatureDictionary(
    original: Uint8Array,
    signed: Uint8Array,
    originalSignatures: SignatureDictionary,
    address: Address<string>,
    signature: Uint8Array,
): SignatureDictionary {
    const wasModified = detectMessageModification(original, signed);

    const signatureBytes = signature as unknown as SignatureBytes;

    const newSignatures = {} as Record<string, SignatureBytes>;
    newSignatures[address as string] = signatureBytes;

    if (wasModified) {
        return newSignatures as SignatureDictionary;
    }

    const merged = {
        ...originalSignatures,
        ...newSignatures,
    };
    
    return merged as SignatureDictionary;
}

export function freezeSigner<T extends object>(signer: T): Readonly<T> {
    return Object.freeze(signer);
}

export function base58ToSignatureBytes(signature: string): SignatureBytes {
    try {
        const bytes = bs58.decode(signature);
        if (bytes.length !== 64) {
            throw new Error(`Invalid signature length: expected 64 bytes, got ${bytes.length}`);
        }
        return new Uint8Array(bytes) as SignatureBytes;
    } catch (error) {
        throw new Error(`Failed to decode base58 signature: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function signatureBytesToBase58(bytes: SignatureBytes): string {
    try {
        if (bytes.length !== 64) {
            throw new Error(`Invalid signature length: expected 64 bytes, got ${bytes.length}`);
        }
        return bs58.encode(bytes);
    } catch (error) {
        throw new Error(`Failed to encode signature to base58: ${error instanceof Error ? error.message : String(error)}`);
    }
}

