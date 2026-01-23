/**
 * IDL utilities for @solana/devtools
 *
 * Chain-first IDL fetch mirrors Solana Explorer's Program Metadata IDL flow:
 * - Fetch metadata via seeds (authority:null, seed:"idl")
 * - Unpack + fetch referenced content
 * - Parse JSON
 */

import { address, createSolanaRpc } from '@solana/kit';
import { fetchMetadataFromSeeds, unpackAndFetchData } from '@solana-program/program-metadata';

export interface FetchProgramMetadataIdlParams {
    rpcUrl: string;
    programId: string;
    seed?: string;
}

const DEFAULT_IDL_SEED = 'idl';

export async function fetchProgramMetadataIdl({
    rpcUrl,
    programId,
    seed = DEFAULT_IDL_SEED,
}: FetchProgramMetadataIdlParams): Promise<unknown> {
    if (!rpcUrl) throw new Error('RPC URL is required');
    if (!programId) throw new Error('Program id is required');

    const rpc = createSolanaRpc(rpcUrl);

    let metadata;
    try {
        metadata = await fetchMetadataFromSeeds(rpc, {
            authority: null,
            program: address(programId),
            seed,
        });
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to fetch program metadata');
    }

    let content: string;
    try {
        content = await unpackAndFetchData({ rpc, ...metadata.data });
    } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to unpack program metadata');
    }

    try {
        return JSON.parse(content) as unknown;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`IDL JSON parse failed: ${msg}`);
    }
}
