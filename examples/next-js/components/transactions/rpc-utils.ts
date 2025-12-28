import type { Base64EncodedWireTransaction } from '@solana/kit';
import { signatureBytesToBase58 } from '@solana/connector/headless';

interface SignatureStatus {
    confirmationStatus?: string | null;
    err: unknown | null;
}

interface GetSignatureStatusesResponse {
    value: readonly (SignatureStatus | null)[];
}

function encodeShortVecLength(value: number): Uint8Array {
    const bytes: number[] = [];
    let remaining = value;

    while (remaining >= 0x80) {
        bytes.push((remaining & 0x7f) | 0x80);
        remaining >>= 7;
    }
    bytes.push(remaining);

    return new Uint8Array(bytes);
}

function bytesToBase64(bytes: Uint8Array): string {
    // btoa expects a binary string; transactions are small (< 1232 bytes) so this is safe.
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function getNumRequiredSigners(messageBytes: Uint8Array): number {
    let offset = 0;

    if (messageBytes.length < 4) {
        throw new Error('Invalid message: too short for header');
    }

    // Versioned messages have a version prefix (0x80 | version). Legacy messages do not.
    if ((messageBytes[0] & 0x80) !== 0) {
        offset = 1;
    }

    if (offset >= messageBytes.length) {
        throw new Error('Invalid message: incomplete header');
    }

    return messageBytes[offset];
}

export function getBase58SignatureFromSignedTransaction(transaction: unknown): string {
    if (!transaction || typeof transaction !== 'object') {
        throw new Error('Invalid signed transaction');
    }

    const tx = transaction as { messageBytes?: Uint8Array; signatures?: Record<string, Uint8Array> };
    const messageBytes = tx.messageBytes;
    const signatures = tx.signatures;

    if (!(messageBytes instanceof Uint8Array) || !signatures || typeof signatures !== 'object') {
        throw new Error('Signed transaction missing messageBytes/signatures');
    }

    const numSigners = getNumRequiredSigners(messageBytes);
    if (numSigners !== 1) {
        throw new Error(
            `This demo currently supports single-signer transactions (found ${numSigners} required signers)`,
        );
    }

    const firstSig = Object.values(signatures)[0];

    if (!(firstSig instanceof Uint8Array) || firstSig.length !== 64) {
        throw new Error('Signed transaction missing first signature');
    }

    return signatureBytesToBase58(firstSig as unknown as Parameters<typeof signatureBytesToBase58>[0]);
}

export function getBase64EncodedWireTransaction(transaction: unknown): Base64EncodedWireTransaction {
    if (!transaction || typeof transaction !== 'object') {
        throw new Error('Invalid signed transaction');
    }

    const tx = transaction as { messageBytes?: Uint8Array; signatures?: Record<string, Uint8Array> };
    const messageBytes = tx.messageBytes;
    const signatures = tx.signatures;

    if (!(messageBytes instanceof Uint8Array) || !signatures || typeof signatures !== 'object') {
        throw new Error('Signed transaction missing messageBytes/signatures');
    }

    const numSigners = getNumRequiredSigners(messageBytes);
    if (numSigners !== 1) {
        throw new Error(
            `This demo currently supports single-signer transactions (found ${numSigners} required signers)`,
        );
    }

    const signatureCountPrefix = encodeShortVecLength(numSigners);

    const firstSig = Object.values(signatures)[0];
    if (!(firstSig instanceof Uint8Array) || firstSig.length !== 64) {
        throw new Error('Signed transaction missing first signature');
    }

    const wireBytes = new Uint8Array(signatureCountPrefix.length + firstSig.length + messageBytes.length);
    wireBytes.set(signatureCountPrefix, 0);
    wireBytes.set(firstSig, signatureCountPrefix.length);
    wireBytes.set(messageBytes, signatureCountPrefix.length + firstSig.length);

    return bytesToBase64(wireBytes) as Base64EncodedWireTransaction;
}

export function isRpcProxyUrl(rpcUrl: string): boolean {
    try {
        return new URL(rpcUrl).pathname === '/api/rpc';
    } catch {
        return false;
    }
}

export function getWebSocketUrlForRpcUrl(rpcUrl: string): string {
    const url = new URL(rpcUrl);
    url.protocol = url.protocol.replace('http', 'ws');

    // solana-test-validator defaults to HTTP 8899 and WS 8900
    if ((url.hostname === 'localhost' || url.hostname.startsWith('127')) && (url.port === '8899' || url.port === '')) {
        url.port = '8900';
    }

    return url.toString();
}

export async function waitForSignatureConfirmation({
    signature,
    getSignatureStatuses,
    commitment = 'confirmed',
    pollIntervalMs = 500,
    timeoutMs = 60_000,
}: {
    signature: string;
    getSignatureStatuses: (signature: string) => Promise<GetSignatureStatusesResponse>;
    commitment?: 'confirmed' | 'finalized';
    pollIntervalMs?: number;
    timeoutMs?: number;
}): Promise<void> {
    const startMs = Date.now();

    while (Date.now() - startMs < timeoutMs) {
        const { value } = await getSignatureStatuses(signature);
        const status = value[0];

        if (status?.err) {
            const message = typeof status.err === 'string' ? status.err : JSON.stringify(status.err);
            throw new Error(message || 'Transaction failed');
        }

        if (status?.confirmationStatus) {
            const isConfirmed =
                commitment === 'finalized'
                    ? status.confirmationStatus === 'finalized'
                    : status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized';

            if (isConfirmed) return;
        }

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error('Timed out waiting for transaction confirmation');
}
