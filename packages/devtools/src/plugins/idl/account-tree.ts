import { isRecord } from './guards';
import type { AnchorIdlInstructionAccountGroup, AnchorIdlInstructionAccountItem } from './types';

export function isAccountGroup(item: AnchorIdlInstructionAccountItem): item is AnchorIdlInstructionAccountGroup {
    return isRecord(item) && Array.isArray((item as any).accounts);
}
