import { generateNameVariations, normalizePatternKey } from './naming';

const KNOWN_PATTERN_TO_ADDRESS: Map<string, string> = (() => {
    const map = new Map<string, string>();

    function add(address: string, patterns: string[]) {
        patterns.forEach(p => map.set(normalizePatternKey(p), address));
    }

    // Common program ids / sysvars
    add('11111111111111111111111111111111', generateNameVariations(['system', 'program'], ['system']));
    add('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', generateNameVariations(['token', 'program'], ['token']));
    add('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', [
        ...generateNameVariations(['associated', 'token', 'program'], ['associatedToken', 'associated']),
        ...generateNameVariations(['ata', 'program'], ['ata']),
    ]);
    add(
        'ComputeBudget111111111111111111111111111111',
        generateNameVariations(['compute', 'budget', 'program'], ['computeBudget', 'computeBudgetProgram']),
    );
    add('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', generateNameVariations(['memo', 'program'], ['memo']));

    add('SysvarRent111111111111111111111111111111111', generateNameVariations(['rent'], ['rentSysvar', 'sysvarRent']));
    add(
        'SysvarC1ock11111111111111111111111111111111',
        generateNameVariations(['clock'], ['clockSysvar', 'sysvarClock']),
    );
    add(
        'Sysvar1nstructions1111111111111111111111111',
        generateNameVariations(['instructions'], ['instructionsSysvar', 'sysvarInstructions']),
    );

    // Known non-program accounts
    add(
        'So11111111111111111111111111111111111111112',
        generateNameVariations(['wsol', 'mint'], ['wsol', 'wrappedSol', 'nativeMint']),
    );

    return map;
})();

export function findKnownAddressForAccountName(accountName: string): string | null {
    return KNOWN_PATTERN_TO_ADDRESS.get(normalizePatternKey(accountName)) ?? null;
}

export function isPrefilledAccountName(accountName: string): boolean {
    return KNOWN_PATTERN_TO_ADDRESS.has(normalizePatternKey(accountName));
}

const WALLET_PATTERN_KEYS = new Set(
    [
        ...generateNameVariations(['authority']),
        ...generateNameVariations(['owner']),
        ...generateNameVariations(['payer'], ['feePayer']),
        ...generateNameVariations(['signer']),
        ...generateNameVariations(['user']),
    ].map(normalizePatternKey),
);

export function isWalletAccountName(accountName: string): boolean {
    return WALLET_PATTERN_KEYS.has(normalizePatternKey(accountName));
}
