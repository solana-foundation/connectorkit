import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { x25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { decodeBase64, encodeBase64 } from '../../../remote/protocol';
import type { AssociationEnvelope } from './protocol';
import { NATIVE_ASSOCIATION_PROTOCOL_VERSION } from './protocol';

const NONCE_LENGTH = 12;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface AssociationKeyPair {
    secretKey: Uint8Array;
    publicKeyBase64: string;
}

export interface AssociationCrypto {
    generateKeyPair(): AssociationKeyPair;
    deriveHandshakeKey(input: {
        secretKey: Uint8Array;
        walletPublicKeyBase64: string;
        handshakeId: string;
        origin: string;
    }): Uint8Array;
    deriveSessionKey(input: { sessionTokenBase64: string; sessionId: string; origin: string }): Uint8Array;
    sealJson(keyId: string, key: Uint8Array, payload: unknown): AssociationEnvelope;
    openJson<T>(key: Uint8Array, envelope: AssociationEnvelope): T;
    randomUUID(): string;
    now(): Date;
}

export function createAssociationCrypto(): AssociationCrypto {
    return {
        generateKeyPair() {
            const secretKey = x25519.utils.randomSecretKey();
            return {
                secretKey,
                publicKeyBase64: encodeBase64(x25519.getPublicKey(secretKey)),
            };
        },

        deriveHandshakeKey({ secretKey, walletPublicKeyBase64, handshakeId, origin }) {
            const walletPublicKey = decodeBase64(walletPublicKeyBase64);
            if (walletPublicKey.length !== 32) {
                throw new Error('Invalid wallet public key');
            }
            const sharedSecret = x25519.getSharedSecret(secretKey, walletPublicKey);
            return deriveKey(sharedSecret, `native-wallet-association-v2:${origin}:${handshakeId}`, 'handshake');
        },

        deriveSessionKey({ sessionTokenBase64, sessionId, origin }) {
            const sessionToken = decodeBase64(sessionTokenBase64);
            if (sessionToken.length === 0) {
                throw new Error('Invalid session token');
            }
            return deriveKey(sessionToken, `native-wallet-association-v2:${origin}:${sessionId}`, 'session');
        },

        sealJson(keyId, key, payload) {
            const plaintext = textEncoder.encode(JSON.stringify(payload));
            const nonce = randomBytes(NONCE_LENGTH);
            const ciphertext = chacha20poly1305(key, nonce).encrypt(plaintext);
            return {
                protocolVersion: NATIVE_ASSOCIATION_PROTOCOL_VERSION,
                keyId,
                sealedBoxBase64: encodeBase64(concatBytes(nonce, ciphertext)),
            };
        },

        openJson<T>(key: Uint8Array, envelope: AssociationEnvelope): T {
            const combined = decodeBase64(envelope.sealedBoxBase64);
            if (combined.length <= NONCE_LENGTH) {
                throw new Error('Invalid association envelope');
            }
            const nonce = combined.slice(0, NONCE_LENGTH);
            const ciphertext = combined.slice(NONCE_LENGTH);
            const plaintext = chacha20poly1305(key, nonce).decrypt(ciphertext);
            return JSON.parse(textDecoder.decode(plaintext)) as T;
        },

        randomUUID() {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }
            return `${Date.now().toString(36)}-${encodeBase64(randomBytes(16)).replace(/[^a-zA-Z0-9]/g, '')}`;
        },

        now() {
            return new Date();
        },
    };
}

function deriveKey(inputKeyMaterial: Uint8Array, salt: string, info: string): Uint8Array {
    return hkdf(sha256, inputKeyMaterial, textEncoder.encode(salt), textEncoder.encode(info), 32);
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
    const length = parts.reduce((total, part) => total + part.length, 0);
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
        bytes.set(part, offset);
        offset += part.length;
    }
    return bytes;
}

function randomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes);
        return bytes;
    }
    throw new Error('Secure random values are unavailable');
}
