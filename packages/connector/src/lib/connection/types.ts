import type { Connection } from '@solana/web3.js';

export type Commitment = 'processed' | 'confirmed' | 'finalized';

export type KitRpc = {
    getLatestBlockhash(options?: { commitment?: Commitment }): {
        send(): Promise<{ value: { blockhash: string; lastValidBlockHeight: number } }>;
    };
    sendTransaction(bytes: Uint8Array | string, options?: any): {
        send(): Promise<string>;
    };
    send?: () => unknown;
};

export type DualConnection = Connection | KitRpc;

export function isLegacyConnection(conn: DualConnection): conn is Connection {
    return 'rpcEndpoint' in conn && typeof (conn as Connection).rpcEndpoint === 'string';
}

export function isKitConnection(conn: DualConnection): conn is KitRpc {
    if ('rpcEndpoint' in conn) {
        return false;
    }
    
    const asKitRpc = conn as KitRpc;
    return (
        typeof asKitRpc.getLatestBlockhash === 'function' &&
        typeof asKitRpc.sendTransaction === 'function'
    );
}

