import { isRecord } from './guards';
import type { AnchorIdlInstruction, AnchorIdlLike } from './types';

export function isModernAnchorIdl(idl: unknown): idl is AnchorIdlLike {
    if (!isRecord(idl)) return false;
    const maybe = idl as AnchorIdlLike;
    if (typeof maybe.address !== 'string') return false;
    const hasMetadata = Boolean(
        isRecord(maybe.metadata) &&
            (typeof maybe.metadata?.version === 'string' || typeof maybe.metadata?.spec === 'string'),
    );
    if (!hasMetadata) return false;
    return Array.isArray(maybe.instructions);
}

export function getInstructionList(idl: unknown): AnchorIdlInstruction[] {
    if (!isModernAnchorIdl(idl)) return [];
    return (idl.instructions ?? []).filter(ix => Boolean(ix && typeof ix.name === 'string'));
}
