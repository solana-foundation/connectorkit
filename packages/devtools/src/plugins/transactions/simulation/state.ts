export type SimulationCommitment = 'processed' | 'confirmed' | 'finalized';

export interface SimulationWarning {
    severity: 'critical' | 'warning';
    shortMessage: string;
    message: string;
    account?: string;
}

export interface SimulationAccountInfoBase64 {
    lamports: bigint | null;
    owner: string | null;
    dataBase64: string | null;
    executable?: boolean;
    rentEpoch?: bigint | null;
}

export interface SimulationTokenAccountState {
    mint: string;
    owner: string;
    amount: bigint;
    delegate?: string | null;
    closeAuthority?: string | null;
}

export interface SimulationWritableAccountMeta {
    address: string;
    isSigner: boolean;
    isWritable: boolean;
}

export interface SimulationWritableAccount {
    address: string;
    isSigner: boolean;
    isWritable: boolean;
    changedInSimulation: boolean;
    pre: SimulationAccountInfoBase64;
    post: SimulationAccountInfoBase64;
    tokenPre?: SimulationTokenAccountState | null;
    tokenPost?: SimulationTokenAccountState | null;
}

export interface SimulationBalanceChange {
    kind: 'sol' | 'spl-token';
    address: string;
    owner?: string;
    amount: bigint;
    mint?: string;
    symbol?: string;
    decimals?: number;
}

export interface SimulationInstructionAccount {
    name?: string;
    address: string;
    isSigner: boolean;
    isWritable: boolean;
}

export interface SimulationInstructionDecoded {
    index: number;
    programAddress: string;
    programName?: string;
    parsed?: {
        name: string;
        args: unknown;
        accounts: SimulationInstructionAccount[];
    };
    raw: {
        dataHex: string;
        accounts: SimulationInstructionAccount[];
    };
}

export interface TransactionSimulationResult {
    key: string;
    signature: string | null;
    cluster: string | null;
    commitment: SimulationCommitment;
    includeSnapshots: boolean;
    wireTransactionBase64: string;
    messageBase64: string;
    explorerInspectorUrl: string;
    unitsConsumed: number | null;
    logs: string[] | null;
    error: unknown | null;
    warnings: SimulationWarning[];
    truncatedWritableAccounts: boolean;
    writableAccounts: SimulationWritableAccount[];
    balanceChanges: SimulationBalanceChange[];
    instructions: SimulationInstructionDecoded[];
    rawSimulation: unknown | null;
    startedAt: number;
    finishedAt: number;
}

export interface TransactionSimulationEntry {
    isLoading: boolean;
    error?: string;
    result: TransactionSimulationResult | null;
    requestId?: number;
    lastCommitment?: SimulationCommitment;
    lastIncludeSnapshots?: boolean;
    lastWireTransactionBase64?: string;
}

export interface TransactionSimulationState {
    entriesByKey: Map<string, TransactionSimulationEntry>;
    requestId: number;
}

export function createTransactionSimulationState(): TransactionSimulationState {
    return { entriesByKey: new Map(), requestId: 0 };
}
