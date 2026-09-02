interface SignatureStatus {
    confirmationStatus?: string | null;
    err: unknown | null;
}

interface GetSignatureStatusesResponse {
    value: readonly (SignatureStatus | null)[];
}

/**
 * Poll `getSignatureStatuses` until a signature reaches the target commitment.
 *
 * For demos whose RPC endpoint has no WebSocket transport, so kit's
 * subscription-based confirmation is unavailable.
 */
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
