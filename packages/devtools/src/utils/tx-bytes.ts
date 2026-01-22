import { getBase64Decoder, getBase64Encoder } from '@solana/kit';

const base64Decoder = getBase64Decoder();
const base64Encoder = getBase64Encoder();

export function bytesToBase64(bytes: Uint8Array): string {
    return base64Decoder.decode(bytes);
}

export function base64ToBytes(base64: string): Uint8Array {
    // Kit codecs return a ReadonlyUint8Array; copy into a standard Uint8Array for consumers.
    return new Uint8Array(base64Encoder.encode(base64));
}

export function bytesToHexPreview(bytes: Uint8Array, maxBytes = 32): string {
    const len = Math.min(bytes.length, maxBytes);
    let out = '';
    for (let i = 0; i < len; i++) {
        out += bytes[i].toString(16).padStart(2, '0');
    }
    if (bytes.length > len) out += '…';
    return out;
}

export function formatByteSize(size: number): string {
    if (!Number.isFinite(size) || size < 0) return 'N/A';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

