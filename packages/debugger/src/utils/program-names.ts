/**
 * Program name registry
 * Maps program IDs to human-readable names
 */

// Common program names
const PROGRAM_NAMES = {
    // Native built-ins
    SYSTEM: 'System Program',
    TOKEN: 'Token Program',
    TOKEN_2022: 'Token-2022 Program',
    ASSOCIATED_TOKEN: 'Associated Token Program',
    STAKE: 'Stake Program',
    VOTE: 'Vote Program',
    COMPUTE_BUDGET: 'Compute Budget Program',
    ADDRESS_LOOKUP_TABLE: 'Address Lookup Table Program',
    CONFIG: 'Config Program',

    // Native precompiles
    ED25519: 'Ed25519 SigVerify',
    SECP256K1: 'Secp256k1 SigVerify',

    // SPL Programs
    MEMO: 'Memo Program',
    MEMO_1: 'Memo Program v1',
    NAME: 'Name Service',
    ACCOUNT_COMPRESSION: 'State Compression',

    // DeFi
    SERUM_3: 'Serum DEX v3',
    OPENBOOK_DEX: 'OpenBook DEX',
    RAYDIUM_AMM: 'Raydium AMM',
    ORCA_SWAP: 'Orca Swap',
    JUPITER: 'Jupiter Aggregator',

    // Loaders
    BPF_LOADER: 'BPF Loader',
    BPF_LOADER_2: 'BPF Loader 2',
    BPF_UPGRADEABLE: 'BPF Upgradeable Loader',
} as const;

// Program ID to name mapping
const PROGRAM_INFO_BY_ID: { [address: string]: string } = {
    // Native built-ins
    '11111111111111111111111111111111': PROGRAM_NAMES.SYSTEM,
    Stake11111111111111111111111111111111111111: PROGRAM_NAMES.STAKE,
    Vote111111111111111111111111111111111111111: PROGRAM_NAMES.VOTE,
    Config1111111111111111111111111111111111111: PROGRAM_NAMES.CONFIG,
    ComputeBudget111111111111111111111111111111: PROGRAM_NAMES.COMPUTE_BUDGET,
    AddressLookupTab1e1111111111111111111111111: PROGRAM_NAMES.ADDRESS_LOOKUP_TABLE,

    // Precompiles
    Ed25519SigVerify111111111111111111111111111: PROGRAM_NAMES.ED25519,
    KeccakSecp256k11111111111111111111111111111: PROGRAM_NAMES.SECP256K1,

    // SPL
    TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: PROGRAM_NAMES.TOKEN,
    TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: PROGRAM_NAMES.TOKEN_2022,
    ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: PROGRAM_NAMES.ASSOCIATED_TOKEN,
    MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: PROGRAM_NAMES.MEMO,
    Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo: PROGRAM_NAMES.MEMO_1,
    namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX: PROGRAM_NAMES.NAME,
    cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK: PROGRAM_NAMES.ACCOUNT_COMPRESSION,

    // DeFi
    '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin': PROGRAM_NAMES.SERUM_3,
    srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX: PROGRAM_NAMES.OPENBOOK_DEX,
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': PROGRAM_NAMES.RAYDIUM_AMM,
    '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP': PROGRAM_NAMES.ORCA_SWAP,

    // Loaders
    BPFLoader1111111111111111111111111111111111: PROGRAM_NAMES.BPF_LOADER,
    BPFLoader2111111111111111111111111111111111: PROGRAM_NAMES.BPF_LOADER_2,
    BPFLoaderUpgradeab1e11111111111111111111111: PROGRAM_NAMES.BPF_UPGRADEABLE,
};

// Sysvar IDs
const SYSVAR_IDS: { [key: string]: string } = {
    Sysvar1111111111111111111111111111111111111: 'SYSVAR',
    Sysvar1nstructions1111111111111111111111111: 'Sysvar: Instructions',
    SysvarC1ock11111111111111111111111111111111: 'Sysvar: Clock',
    SysvarEpochSchedu1e111111111111111111111111: 'Sysvar: Epoch Schedule',
    SysvarFees111111111111111111111111111111111: 'Sysvar: Fees',
    SysvarRecentB1ockHashes11111111111111111111: 'Sysvar: Recent Blockhashes',
    SysvarRent111111111111111111111111111111111: 'Sysvar: Rent',
    SysvarRewards111111111111111111111111111111: 'Sysvar: Rewards',
    SysvarS1otHashes111111111111111111111111111: 'Sysvar: Slot Hashes',
    SysvarS1otHistory11111111111111111111111111: 'Sysvar: Slot History',
    SysvarStakeHistory1111111111111111111111111: 'Sysvar: Stake History',
};

// Special account IDs
const SPECIAL_IDS: { [key: string]: string } = {
    '1nc1nerator11111111111111111111111111111111': 'Incinerator',
};

/**
 * Get human-readable program name from address
 */
export function getProgramName(address: string, cluster: string = 'mainnet'): string {
    const name = PROGRAM_INFO_BY_ID[address] || SYSVAR_IDS[address] || SPECIAL_IDS[address];

    if (name) {
        return name;
    }

    // Return shortened address if unknown
    return `Unknown (${address.slice(0, 4)}...${address.slice(-4)})`;
}

/**
 * Check if address is a known program
 */
export function isKnownProgram(address: string): boolean {
    return !!(PROGRAM_INFO_BY_ID[address] || SYSVAR_IDS[address] || SPECIAL_IDS[address]);
}

/**
 * Get short display name for program (for compact UI)
 */
export function getShortProgramName(address: string): string {
    const fullName = getProgramName(address);

    // Remove "Program" suffix for brevity
    return fullName.replace(/ Program$/, '').replace(/ v\d+$/, '');
}
