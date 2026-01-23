export type IdlSource = 'program-metadata' | 'anchor-idl' | 'paste' | 'file';

export interface AnchorIdlInstructionAccount {
    name: string;
    isMut?: boolean;
    isSigner?: boolean;
    optional?: boolean;
    /** Optional PDA definition (Anchor >= 0.30) */
    pda?: unknown;
    /** Optional fixed address (some IDLs include this) */
    address?: string;
}

export interface AnchorIdlInstructionAccountGroup {
    name: string;
    accounts: AnchorIdlInstructionAccountItem[];
}

export type AnchorIdlInstructionAccountItem = AnchorIdlInstructionAccount | AnchorIdlInstructionAccountGroup;

export interface AnchorIdlInstructionArg {
    name: string;
    type: unknown;
}

export interface AnchorIdlInstruction {
    name: string;
    accounts?: AnchorIdlInstructionAccountItem[];
    args?: AnchorIdlInstructionArg[];
}

export interface AnchorIdlLike {
    address?: string;
    metadata?: { name?: string; version?: string; spec?: string };
    instructions?: AnchorIdlInstruction[];
}

export interface IdlPluginState {
    source: IdlSource;
    programIdInput: string;
    pasteJson: string;
    isFetchingIdl: boolean;
    fetchError: string | null;
    idl: unknown | null;
    idlKind: 'anchor' | 'unsupported' | null;
    selectedIxName: string | null;
    /** Keyed as `${ixName}.${fieldName}` */
    accountValues: Record<string, string>;
    /** Keyed as `${ixName}.${argName}` */
    argValues: Record<string, string>;
    /**
     * Tracks last auto-filled values, keyed by field key.
     * If a user edits a field to something else, we stop auto-updating it.
     */
    autoFilled: Record<string, string>;
    /** When true, PDA fields auto-filled by devtools are read-only. */
    lockPdas: boolean;
    isExecuting: boolean;
    executeError: string | null;
    lastSignature: string | null;
}
